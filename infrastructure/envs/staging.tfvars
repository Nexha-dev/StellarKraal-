###############################################################################
# envs/staging.tfvars
#
# Usage (from infrastructure/ directory):
#   terraform workspace select staging
#   terraform plan  -var-file="envs/staging.tfvars"
#   terraform apply -var-file="envs/staging.tfvars"
#
# Design philosophy:
#   • Single NAT Gateway  → lower cost
#   • Smallest viable instance sizes
#   • No Multi-AZ          → acceptable downtime risk
#   • Deletion protection off → easy teardown
###############################################################################

aws_region = "us-east-1"

# ── Networking ────────────────────────────────────────────────────────────────
vpc_cidr = "10.10.0.0/16"

availability_zones = [
  "us-east-1a",
  "us-east-1b",
]

public_subnet_cidrs = [
  "10.10.0.0/24",
  "10.10.1.0/24",
]

private_subnet_cidrs = [
  "10.10.10.0/24",
  "10.10.11.0/24",
]

database_subnet_cidrs = [
  "10.10.20.0/24",
  "10.10.21.0/24",
]

# Single NAT GW — cost saving for non-critical staging environment
nat_gateway_count = 1

# ── Application ───────────────────────────────────────────────────────────────
app_port          = 8080
health_check_path = "/health"

# Replace with your staging ACM certificate ARN
acm_certificate_arn = "arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/STAGING-CERT-ID"

# ── Compute ───────────────────────────────────────────────────────────────────
instance_type       = "t3.small"
root_volume_size_gb = 20

asg_min_size         = 1
asg_max_size         = 2
asg_desired_capacity = 1

scale_out_cpu_threshold = 70
scale_in_cpu_threshold  = 30

# ── Database ──────────────────────────────────────────────────────────────────
db_instance_class           = "db.t3.micro"
db_name                     = "stellarkraal"
db_username                 = "skadmin"
db_allocated_storage_gb     = 20
db_max_allocated_storage_gb = 50
db_multi_az                 = false
db_backup_retention_days    = 3
db_deletion_protection      = false

db_enable_performance_insights     = false
db_max_connections_alarm_threshold = 50

# ── Redis ─────────────────────────────────────────────────────────────────────
redis_node_type                  = "cache.t3.micro"
redis_num_cache_nodes            = 1
redis_automatic_failover_enabled = false
redis_multi_az_enabled           = false
redis_snapshot_retention_days    = 0
