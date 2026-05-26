###############################################################################
# modules/networking/variables.tf
###############################################################################

variable "name_prefix" {
  description = "Prefix applied to all resource names (e.g. stellarkraal-staging)."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC (e.g. 10.0.0.0/16)."
  type        = string
}

variable "availability_zones" {
  description = "List of Availability Zones to use (must have at least 2 for production Multi-AZ)."
  type        = list(string)
}

variable "public_subnet_cidrs" {
  description = "One CIDR per AZ for public subnets (ALB, NAT Gateways). Length must equal availability_zones."
  type        = list(string)
}

variable "private_subnet_cidrs" {
  description = "One CIDR per AZ for private app subnets (Compute). Length must equal availability_zones."
  type        = list(string)
}

variable "database_subnet_cidrs" {
  description = "One CIDR per AZ for database subnets (RDS, ElastiCache). Length must equal availability_zones."
  type        = list(string)
}

variable "nat_gateway_count" {
  description = "Number of NAT Gateways. Use 1 for staging (cost saving) and length(availability_zones) for production HA."
  type        = number
  default     = 1

  validation {
    condition     = var.nat_gateway_count >= 1
    error_message = "At least one NAT Gateway is required."
  }
}

variable "app_port" {
  description = "TCP port the application listens on (used in App Security Group ingress rule)."
  type        = number
  default     = 8080
}

variable "db_port" {
  description = "TCP port for PostgreSQL / TimescaleDB. Used in App→DB security group egress and DB ingress rules."
  type        = number
  default     = 5432
}

variable "redis_port" {
  description = "TCP port for Redis Streams (ElastiCache). Used in App→Redis security group egress and Redis ingress rules."
  type        = number
  default     = 6379
}
