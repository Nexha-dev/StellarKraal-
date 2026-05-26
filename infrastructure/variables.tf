###############################################################################
# infrastructure/variables.tf — Root variables
#
# All variables have descriptions and sensible defaults.
# Environment-specific values are supplied via envs/staging.tfvars or
# envs/production.tfvars at plan/apply time.
###############################################################################

###############################################################################
# General
###############################################################################
variable "aws_region" {
  description = "AWS region where all resources are deployed."
  type        = string
  default     = "us-east-1"
}

###############################################################################
# Networking
###############################################################################
variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
}

variable "availability_zones" {
  description = "List of Availability Zones to use. Minimum 2 for production."
  type        = list(string)
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets — one per AZ. Order must match availability_zones."
  type        = list(string)
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private (app) subnets — one per AZ."
  type        = list(string)
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets — one per AZ."
  type        = list(string)
}

variable "nat_gateway_count" {
  description = "Number of NAT Gateways. 1 = cost-optimised staging; length(AZs) = HA production."
  type        = number
  default     = 1
}

###############################################################################
# Application
###############################################################################
variable "app_port" {
  description = "TCP port the application process listens on."
  type        = number
  default     = 8080
}

variable "health_check_path" {
  description = "HTTP path used for ALB target group health checks."
  type        = string
  default     = "/health"
}

variable "acm_certificate_arn" {
  description = "ARN of the ACM TLS certificate used by the ALB HTTPS listener."
  type        = string
}

###############################################################################
# Compute
###############################################################################
variable "instance_type" {
  description = "EC2 instance type for app servers (e.g. t3.small, m6i.large)."
  type        = string
}

variable "root_volume_size_gb" {
  description = "Root EBS volume size in GB."
  type        = number
  default     = 20
}

variable "asg_min_size" {
  description = "Minimum number of instances in the Auto Scaling Group."
  type        = number
  default     = 1
}

variable "asg_max_size" {
  description = "Maximum number of instances in the Auto Scaling Group."
  type        = number
  default     = 4
}

variable "asg_desired_capacity" {
  description = "Desired number of instances at launch."
  type        = number
  default     = 2
}

variable "scale_out_cpu_threshold" {
  description = "CPU % threshold that triggers ASG scale-out."
  type        = number
  default     = 70
}

variable "scale_in_cpu_threshold" {
  description = "CPU % threshold that triggers ASG scale-in."
  type        = number
  default     = 30
}

###############################################################################
# Database
###############################################################################
variable "db_instance_class" {
  description = "RDS instance class (e.g. db.t3.micro, db.m6i.large)."
  type        = string
}

variable "db_name" {
  description = "Name of the application database."
  type        = string
  default     = "stellarkraal"
}

variable "db_username" {
  description = "RDS master username."
  type        = string
  default     = "skadmin"
}

variable "db_allocated_storage_gb" {
  description = "Initial RDS storage allocation in GB."
  type        = number
  default     = 20
}

variable "db_max_allocated_storage_gb" {
  description = "Maximum RDS autoscaling storage ceiling in GB."
  type        = number
  default     = 100
}

variable "db_multi_az" {
  description = "Enable RDS Multi-AZ deployment. Recommended true for production."
  type        = bool
  default     = false
}

variable "db_backup_retention_days" {
  description = "RDS automated backup retention in days."
  type        = number
  default     = 7
}

variable "db_deletion_protection" {
  description = "Enable RDS deletion protection. Should be true for production."
  type        = bool
  default     = false
}

variable "db_enable_performance_insights" {
  description = "Enable RDS Performance Insights."
  type        = bool
  default     = false
}

variable "db_max_connections_alarm_threshold" {
  description = "Connection count threshold for the high-connections CloudWatch alarm."
  type        = number
  default     = 100
}

###############################################################################
# Redis
###############################################################################
variable "redis_node_type" {
  description = "ElastiCache node type (e.g. cache.t3.micro, cache.r6g.large)."
  type        = string
}

variable "redis_num_cache_nodes" {
  description = "Number of Redis nodes. Use 1 for staging, 2+ for production failover."
  type        = number
  default     = 1
}

variable "redis_automatic_failover_enabled" {
  description = "Enable automatic Redis failover. Requires redis_num_cache_nodes >= 2."
  type        = bool
  default     = false
}

variable "redis_multi_az_enabled" {
  description = "Enable Multi-AZ for the Redis replication group."
  type        = bool
  default     = false
}

variable "redis_snapshot_retention_days" {
  description = "Number of days to retain Redis snapshots."
  type        = number
  default     = 1
}
