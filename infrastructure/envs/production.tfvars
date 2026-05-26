###############################################################################
# envs/production.tfvars
#
# Usage (from infrastructure/ directory):
#   terraform workspace select production
#   terraform plan  -var-file="envs/production.tfvars"
#   terraform apply -var-file="envs/production.tfvars"
#
# Design philosophy:
#   • One NAT Gateway per AZ  → HA; no cross-AZ NAT traffic
#   • Production-grade instance sizes
#   • Multi-AZ for RDS and Redis  → zero-downtime failover
#   • Deletion protection on       → prevent accidental data loss
#   • Performance Insights on      → observability
###############################################################################

aws_region = "us-east-1"

# ── Networking ────────────────────────────────────────────────────────────────
vpc_cidr = "10.20.0.0/16"

availability_zones = [
  "us-east-1a",
  "us-east-1b",
  "us-east-1c",
]

public_subnet_cidrs = [
  "10.20.0.0/24",
  "10.20.1.0/24",
  "10.20.2.0/24",
]

private_subnet_cidrs = [
  "10.20.10.0/24",
  "10.20.11.0/24",
  "10.20.12.0/24",
]

database_subnet_cidrs = [
  "10.20.20.0/24",
  "10.20.21.0/24",
  "10.20.22.0/24",
]

# One NAT GW per AZ for full HA (eliminates single-AZ NAT SPOF)
nat_gateway_count = 3

# ── Application ───────────────────────────────────────────────────────────────
app_port          = 8080
health_check_path = "/health"

# Replace with your production ACM certificate ARN
acm_certificate_arn = "arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/PROD-CERT-ID"

# ── Compute ───────────────────────────────────────────────────────────────────
instance_type       = "m6i.large"
root_volume_size_gb = 30

asg_min_size         = 2
asg_max_size         = 10
asg_desired_capacity = 3

scale_out_cpu_threshold = 65
scale_in_cpu_threshold  = 25

# ── Database ──────────────────────────────────────────────────────────────────
db_instance_class           = "db.m6i.large"
db_name                     = "stellarkraal"
db_username                 = "skadmin"
db_allocated_storage_gb     = 100
db_max_allocated_storage_gb = 500
db_multi_az                 = true # standby in a separate AZ
db_backup_retention_days    = 30
db_deletion_protection      = true # require manual override to delete

db_enable_performance_insights     = true
db_max_connections_alarm_threshold = 500

# ── Redis ─────────────────────────────────────────────────────────────────────
redis_node_type                  = "cache.r6g.large"
redis_num_cache_nodes            = 2 # primary + replica in separate AZs
redis_automatic_failover_enabled = true
redis_multi_az_enabled           = true
redis_snapshot_retention_days    = 7
