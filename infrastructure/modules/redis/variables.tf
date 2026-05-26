###############################################################################
# modules/redis/variables.tf
###############################################################################

variable "name_prefix" {
  description = "Prefix applied to all resource names."
  type        = string
}

variable "database_subnet_ids" {
  description = "List of private database subnet IDs for the ElastiCache subnet group."
  type        = list(string)
}

variable "redis_security_group_id" {
  description = "Security Group ID restricting access to the Redis cluster."
  type        = string
}

variable "engine_version" {
  description = "Redis engine version (e.g. '7.1')."
  type        = string
  default     = "7.1"
}

variable "node_type" {
  description = "ElastiCache node type (e.g. cache.t3.micro for staging, cache.r6g.large for production)."
  type        = string
}

variable "num_cache_nodes" {
  description = "Number of cache nodes. Use 1 for staging, 2+ for production with automatic failover."
  type        = number
  default     = 1

  validation {
    condition     = var.num_cache_nodes >= 1
    error_message = "At least one cache node is required."
  }
}

variable "automatic_failover_enabled" {
  description = "Enable automatic failover. Requires num_cache_nodes >= 2."
  type        = bool
  default     = false
}

variable "multi_az_enabled" {
  description = "Enable Multi-AZ for the Redis replication group. Requires automatic_failover_enabled = true."
  type        = bool
  default     = false
}

variable "snapshot_retention_days" {
  description = "Number of days to retain Redis snapshots (0 disables snapshots)."
  type        = number
  default     = 1
}
