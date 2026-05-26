###############################################################################
# modules/database/variables.tf
###############################################################################

variable "name_prefix" {
  description = "Prefix applied to all resource names."
  type        = string
}

variable "database_subnet_ids" {
  description = "List of database subnet IDs for the DB Subnet Group."
  type        = list(string)
}

variable "db_security_group_id" {
  description = "Security Group ID restricting access to the RDS instance."
  type        = string
}

variable "db_name" {
  description = "Name of the initial database to create in the RDS instance."
  type        = string
  default     = "stellarkraal"
}

variable "db_username" {
  description = "Master username for the RDS instance. Do NOT use 'admin' or 'root'."
  type        = string
  default     = "skadmin"
}

variable "engine_version" {
  description = "PostgreSQL engine version (e.g. '15.6')."
  type        = string
  default     = "15.6"
}

variable "instance_class" {
  description = "RDS instance class (e.g. db.t3.micro for staging, db.m6i.large for production)."
  type        = string
}

variable "allocated_storage_gb" {
  description = "Initial storage allocation in GB."
  type        = number
  default     = 20
}

variable "max_allocated_storage_gb" {
  description = "Maximum storage in GB for autoscaling. Set to 0 to disable."
  type        = number
  default     = 100
}

variable "multi_az" {
  description = "Enable Multi-AZ deployment for high availability. Recommended true for production."
  type        = bool
  default     = false
}

variable "backup_retention_days" {
  description = "Number of days to retain automated backups. 0 disables backups."
  type        = number
  default     = 7
}

variable "deletion_protection" {
  description = "Prevents the DB from being accidentally deleted. Should be true for production."
  type        = bool
  default     = false
}

variable "enable_performance_insights" {
  description = "Enable RDS Performance Insights (recommended for production)."
  type        = bool
  default     = false
}

variable "max_connections_alarm_threshold" {
  description = "Number of DB connections that triggers the high-connections CloudWatch alarm."
  type        = number
  default     = 100
}
