###############################################################################
# modules/networking/main.tf
#
# Creates:
#   • VPC
#   • Public subnets  (ALB, NAT Gateways)
#   • Private subnets (Compute / App)
#   • DB subnets      (RDS / TimescaleDB, ElastiCache Redis Streams)
#   • Internet Gateway
#   • NAT Gateway (one per AZ in production, one shared in staging)
#   • Route tables
#   • Security Groups (ALB, App, DB, Redis)
#   • Explicit cross-tier SG rules (app → db:5432, app → redis:6379)
###############################################################################

###############################################################################
# VPC
###############################################################################
resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${var.name_prefix}-vpc" }
}

###############################################################################
# Internet Gateway
###############################################################################
resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = "${var.name_prefix}-igw" }
}

###############################################################################
# Public Subnets
###############################################################################
resource "aws_subnet" "public" {
  count = length(var.public_subnet_cidrs)

  vpc_id                  = aws_vpc.this.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = false # ALB handles public IP assignment

  tags = { Name = "${var.name_prefix}-public-${var.availability_zones[count.index]}" }
}

###############################################################################
# Private (App) Subnets
###############################################################################
resource "aws_subnet" "private" {
  count = length(var.private_subnet_cidrs)

  vpc_id            = aws_vpc.this.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = { Name = "${var.name_prefix}-private-${var.availability_zones[count.index]}" }
}

###############################################################################
# Database Subnets
###############################################################################
resource "aws_subnet" "database" {
  count = length(var.database_subnet_cidrs)

  vpc_id            = aws_vpc.this.id
  cidr_block        = var.database_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = { Name = "${var.name_prefix}-db-${var.availability_zones[count.index]}" }
}

###############################################################################
# Elastic IPs + NAT Gateways
# nat_gateway_count = 1 (staging) or length(AZs) (production)
###############################################################################
resource "aws_eip" "nat" {
  count  = var.nat_gateway_count
  domain = "vpc"

  tags = { Name = "${var.name_prefix}-nat-eip-${count.index}" }

  depends_on = [aws_internet_gateway.this]
}

resource "aws_nat_gateway" "this" {
  count         = var.nat_gateway_count
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = { Name = "${var.name_prefix}-nat-${count.index}" }

  depends_on = [aws_internet_gateway.this]
}

###############################################################################
# Route Tables — Public
###############################################################################
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }

  tags = { Name = "${var.name_prefix}-rt-public" }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

###############################################################################
# Route Tables — Private (one per NAT GW; if only 1 NAT, all private subnets
# share it — staging cost optimisation)
###############################################################################
resource "aws_route_table" "private" {
  count  = var.nat_gateway_count
  vpc_id = aws_vpc.this.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.this[count.index].id
  }

  tags = { Name = "${var.name_prefix}-rt-private-${count.index}" }
}

resource "aws_route_table_association" "private" {
  count = length(aws_subnet.private)

  subnet_id = aws_subnet.private[count.index].id

  # When nat_gateway_count == 1, index 0 is always used (staging).
  # When nat_gateway_count == length(AZs), each private subnet maps to its AZ NAT.
  route_table_id = aws_route_table.private[min(count.index, var.nat_gateway_count - 1)].id
}

###############################################################################
# Route Tables — Database (no internet route; stays in VPC only)
###############################################################################
resource "aws_route_table" "database" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = "${var.name_prefix}-rt-database" }
}

resource "aws_route_table_association" "database" {
  count          = length(aws_subnet.database)
  subnet_id      = aws_subnet.database[count.index].id
  route_table_id = aws_route_table.database.id
}

###############################################################################
# Security Group — ALB (internet-facing)
###############################################################################
resource "aws_security_group" "alb" {
  name        = "${var.name_prefix}-sg-alb"
  description = "ALB: allow HTTP/HTTPS from internet"
  vpc_id      = aws_vpc.this.id

  ingress {
    description = "HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound to app layer"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.name_prefix}-sg-alb" }
}

###############################################################################
# Security Group — App / Compute (ingress from ALB; egress explicit per tier)
#
# IMPORTANT: egress rules are NOT defined inline here. They are added as
# separate aws_security_group_rule resources below to avoid the Terraform
# circular dependency that arises when App → DB and DB → App reference
# each other in the same plan cycle.
###############################################################################
resource "aws_security_group" "app" {
  name        = "${var.name_prefix}-sg-app"
  description = "App: ingress from ALB only; egress to DB, Redis, and AWS APIs"
  vpc_id      = aws_vpc.this.id

  ingress {
    description     = "App port from ALB"
    from_port       = var.app_port
    to_port         = var.app_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # No inline egress block — see aws_security_group_rule resources below.
  # Terraform removes the default allow-all egress when any egress rule exists,
  # so all required egress paths are listed explicitly.

  tags = { Name = "${var.name_prefix}-sg-app" }
}

###############################################################################
# Security Group — RDS / TimescaleDB (ingress from App SG on port 5432 only)
###############################################################################
resource "aws_security_group" "db" {
  name        = "${var.name_prefix}-sg-db"
  description = "DB: allow PostgreSQL/TimescaleDB traffic from App SG only"
  vpc_id      = aws_vpc.this.id

  # Ingress is managed via aws_security_group_rule below to keep
  # all cross-SG rules in one place and avoid circular references.

  # DB instances do not initiate outbound connections; no egress needed.

  tags = { Name = "${var.name_prefix}-sg-db" }
}

###############################################################################
# Security Group — Redis Streams / ElastiCache (ingress from App SG on 6379)
###############################################################################
resource "aws_security_group" "redis" {
  name        = "${var.name_prefix}-sg-redis"
  description = "Redis: allow traffic from App security group only"
  vpc_id      = aws_vpc.this.id

  # Ingress is managed via aws_security_group_rule below.
  # Redis nodes do not initiate outbound connections; no egress needed.

  tags = { Name = "${var.name_prefix}-sg-redis" }
}

###############################################################################
# Cross-Tier Security Group Rules
#
# All rules involving TWO security groups are defined here as standalone
# aws_security_group_rule resources. This avoids the Terraform plan-time
# circular dependency that inline blocks would create.
#
# App egress paths (explicit, least-privilege):
#   ──────────────────────────────────────────────────
#   TCP 443 (HTTPS) → 0.0.0.0/0  (AWS SDK calls, external APIs via NAT)
#   UDP 53  (DNS)   → VPC CIDR   (VPC resolver)
#   TCP 53  (DNS)   → VPC CIDR   (VPC resolver fallback)
#   TCP 5432 (PG)   → db SG      (TimescaleDB / PostgreSQL)
#   TCP 6379 (Redis)→ redis SG   (Redis Streams)
#
# DB ingress:
#   TCP 5432 from app SG
#
# Redis ingress:
#   TCP 6379 from app SG
###############################################################################

# ── App → Internet: HTTPS (AWS SDK, Secrets Manager, external APIs) ─────────
resource "aws_security_group_rule" "app_egress_https" {
  type              = "egress"
  security_group_id = aws_security_group.app.id
  description       = "HTTPS to internet (AWS APIs, external services via NAT)"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
}

# ── App → VPC DNS resolver (UDP) ──────────────────────────────────────
resource "aws_security_group_rule" "app_egress_dns_udp" {
  type              = "egress"
  security_group_id = aws_security_group.app.id
  description       = "DNS (UDP) to VPC resolver"
  from_port         = 53
  to_port           = 53
  protocol          = "udp"
  cidr_blocks       = [aws_vpc.this.cidr_block]
}

resource "aws_security_group_rule" "app_egress_dns_tcp" {
  type              = "egress"
  security_group_id = aws_security_group.app.id
  description       = "DNS (TCP) to VPC resolver"
  from_port         = 53
  to_port           = 53
  protocol          = "tcp"
  cidr_blocks       = [aws_vpc.this.cidr_block]
}

# ── App → DB: TimescaleDB / PostgreSQL on port 5432 ──────────────────────
resource "aws_security_group_rule" "app_egress_timescaledb" {
  type                     = "egress"
  security_group_id        = aws_security_group.app.id
  description              = "TimescaleDB/PostgreSQL egress from App to DB tier"
  from_port                = var.db_port
  to_port                  = var.db_port
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.db.id
}

resource "aws_security_group_rule" "db_ingress_from_app" {
  type                     = "ingress"
  security_group_id        = aws_security_group.db.id
  description              = "TimescaleDB/PostgreSQL ingress from App tier"
  from_port                = var.db_port
  to_port                  = var.db_port
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.app.id
}

# ── App → Redis: Redis Streams on port 6379 ────────────────────────────
resource "aws_security_group_rule" "app_egress_redis" {
  type                     = "egress"
  security_group_id        = aws_security_group.app.id
  description              = "Redis Streams egress from App to Redis tier"
  from_port                = var.redis_port
  to_port                  = var.redis_port
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.redis.id
}

resource "aws_security_group_rule" "redis_ingress_from_app" {
  type                     = "ingress"
  security_group_id        = aws_security_group.redis.id
  description              = "Redis Streams ingress from App tier"
  from_port                = var.redis_port
  to_port                  = var.redis_port
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.app.id
}
