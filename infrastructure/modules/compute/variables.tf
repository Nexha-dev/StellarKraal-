###############################################################################
# modules/compute/variables.tf
###############################################################################

variable "name_prefix" {
  description = "Prefix applied to all resource names."
  type        = string
}

variable "environment" {
  description = "Deployment environment label (staging | production). Injected into user-data."
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs in which ASG instances are launched."
  type        = list(string)
}

variable "app_security_group_id" {
  description = "Security Group ID applied to EC2 instances."
  type        = string
}

variable "target_group_arn" {
  description = "ARN of the ALB target group to register ASG instances with."
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type (e.g. t3.small for staging, m6i.large for production)."
  type        = string
}

variable "root_volume_size_gb" {
  description = "Size in GB of the root EBS volume attached to each instance."
  type        = number
  default     = 20
}

variable "app_port" {
  description = "Port the application process listens on."
  type        = number
  default     = 8080
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
  description = "Initial desired number of instances (autoscaling may override at runtime)."
  type        = number
  default     = 2
}

variable "scale_out_cpu_threshold" {
  description = "Average CPU utilisation percentage that triggers a scale-out event."
  type        = number
  default     = 70
}

variable "scale_in_cpu_threshold" {
  description = "Average CPU utilisation percentage that triggers a scale-in event."
  type        = number
  default     = 30
}
