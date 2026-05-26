###############################################################################
# modules/alb/variables.tf
###############################################################################

variable "name_prefix" {
  description = "Prefix applied to all resource names."
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC in which the ALB is deployed."
  type        = string
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs for the ALB (minimum 2 for Multi-AZ)."
  type        = list(string)
}

variable "alb_security_group_id" {
  description = "Security Group ID attached to the ALB."
  type        = string
}

variable "app_port" {
  description = "TCP port the application instances listen on."
  type        = number
  default     = 8080
}

variable "health_check_path" {
  description = "HTTP path used for ALB target group health checks."
  type        = string
  default     = "/health"
}

variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate used for the HTTPS listener."
  type        = string
}
