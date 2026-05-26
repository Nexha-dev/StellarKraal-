###############################################################################
# modules/redis/main.tf
#
# Creates:
#   • KMS key for ElastiCache encryption
#   • ElastiCache Subnet Group
#   • ElastiCache Parameter Group
#   • ElastiCache Replication Group (Redis cluster with optional Multi-AZ)
#   • Random auth token stored in Secrets Manager
###############################################################################

###############################################################################
# KMS key for ElastiCache encryption at rest
###############################################################################
resource "aws_kms_key" "redis" {
  description             = "${var.name_prefix} ElastiCache Redis encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

resource "aws_kms_alias" "redis" {
  name          = "alias/${var.name_prefix}-redis"
  target_key_id = aws_kms_key.redis.key_id
}

###############################################################################
# Auth Token — stored in Secrets Manager
###############################################################################
resource "random_password" "redis_auth_token" {
  length  = 64
  special = false # ElastiCache auth tokens cannot contain special chars
}

resource "aws_secretsmanager_secret" "redis_auth_token" {
  name                    = "${var.name_prefix}/redis/auth-token"
  description             = "ElastiCache Redis AUTH token for ${var.name_prefix}"
  kms_key_id              = aws_kms_key.redis.arn
  recovery_window_in_days = 30
}

resource "aws_secretsmanager_secret_version" "redis_auth_token" {
  secret_id     = aws_secretsmanager_secret.redis_auth_token.id
  secret_string = random_password.redis_auth_token.result
}

###############################################################################
# ElastiCache Subnet Group
###############################################################################
resource "aws_elasticache_subnet_group" "this" {
  name        = "${var.name_prefix}-redis-subnet-group"
  description = "ElastiCache Redis subnet group for ${var.name_prefix}"
  subnet_ids  = var.database_subnet_ids

  tags = { Name = "${var.name_prefix}-redis-subnet-group" }
}

###############################################################################
# ElastiCache Parameter Group
###############################################################################
resource "aws_elasticache_parameter_group" "this" {
  name        = "${var.name_prefix}-redis7"
  family      = "redis7"
  description = "Custom Redis 7 parameters for ${var.name_prefix}"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "" # disable keyspace notifications (security best practice)
  }

  tags = { Name = "${var.name_prefix}-redis7-params" }
}

###############################################################################
# ElastiCache Replication Group (Redis)
###############################################################################
resource "aws_elasticache_replication_group" "this" {
  replication_group_id = "${var.name_prefix}-redis"
  description          = "StellarKraal Redis cluster — ${var.name_prefix}"

  # Engine
  engine               = "redis"
  engine_version       = var.engine_version
  node_type            = var.node_type
  parameter_group_name = aws_elasticache_parameter_group.this.name
  port                 = 6379

  # Cluster configuration
  num_cache_clusters = var.num_cache_nodes # 1 = staging, 2+ = production

  # Network
  subnet_group_name  = aws_elasticache_subnet_group.this.name
  security_group_ids = [var.redis_security_group_id]

  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth_token.result
  kms_key_id                 = aws_kms_key.redis.arn

  # High Availability (automatic failover requires num_cache_clusters >= 2)
  automatic_failover_enabled = var.automatic_failover_enabled
  multi_az_enabled           = var.multi_az_enabled

  # Maintenance & snapshots
  maintenance_window       = "tue:05:00-tue:06:00"
  snapshot_window          = "04:00-05:00"
  snapshot_retention_limit = var.snapshot_retention_days

  # Auto minor version upgrades
  auto_minor_version_upgrade = true

  apply_immediately = false

  tags = { Name = "${var.name_prefix}-redis" }

  lifecycle {
    ignore_changes = [
      auth_token, # managed by Secrets Manager rotation
    ]
  }
}

###############################################################################
# CloudWatch Alarms
###############################################################################
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${var.name_prefix}-redis-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 120
  statistic           = "Average"
  threshold           = 70
  alarm_description   = "ElastiCache Redis CPU utilization exceeded 70%"

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.this.id
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "${var.name_prefix}-redis-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 120
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ElastiCache Redis memory usage exceeded 80%"

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.this.id
  }
}
