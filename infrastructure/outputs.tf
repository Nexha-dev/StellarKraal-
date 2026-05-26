###############################################################################
# infrastructure/outputs.tf — Root outputs
###############################################################################

###############################################################################
# Networking
###############################################################################
output "vpc_id" {
  description = "ID of the deployed VPC."
  value       = module.networking.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets."
  value       = module.networking.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private (app) subnets."
  value       = module.networking.private_subnet_ids
}

output "database_subnet_ids" {
  description = "IDs of the database subnets."
  value       = module.networking.database_subnet_ids
}

###############################################################################
# ALB
###############################################################################
output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer. Point your CNAME here."
  value       = module.alb.alb_dns_name
}

output "alb_zone_id" {
  description = "Route 53 Hosted Zone ID of the ALB (for alias records)."
  value       = module.alb.alb_zone_id
}

###############################################################################
# Compute
###############################################################################
output "asg_name" {
  description = "Name of the Auto Scaling Group."
  value       = module.compute.asg_name
}

###############################################################################
# Database
###############################################################################
output "db_endpoint" {
  description = "RDS connection endpoint (host:port). Retrieved from Secrets Manager by the app."
  value       = module.database.db_endpoint
}

output "db_credentials_secret_arn" {
  description = "ARN of the Secrets Manager secret holding DB credentials."
  value       = module.database.db_credentials_secret_arn
  sensitive   = true
}

###############################################################################
# Redis
###############################################################################
output "redis_primary_endpoint" {
  description = "Primary Redis endpoint address."
  value       = module.redis.primary_endpoint_address
}

output "redis_auth_token_secret_arn" {
  description = "ARN of the Secrets Manager secret holding the Redis AUTH token."
  value       = module.redis.auth_token_secret_arn
  sensitive   = true
}
