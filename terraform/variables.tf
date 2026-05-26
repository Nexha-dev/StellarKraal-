variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (e.g., production, staging)"
  type        = string
  default     = "production"
}

variable "db_instance_arn" {
  description = "The ARN of the RDS instance to backup"
  type        = string
}

variable "pagerduty_routing_key" {
  description = "PagerDuty routing key for critical alerts"
  type        = string
  sensitive   = true
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = "number"
  default     = 30
}

variable "allowed_ips" {
  description = "List of IP addresses allowed to access the staging environment"
  type        = list(string)
  default     = ["0.0.0.0/0"] # Default to all, but will be overridden in staging
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for deployment notifications"
  type        = string
  sensitive   = true
  default     = ""
}
