###############################################################################
# modules/networking/outputs.tf
###############################################################################

output "vpc_id" {
  description = "The ID of the VPC."
  value       = aws_vpc.this.id
}

output "vpc_cidr" {
  description = "The CIDR block of the VPC."
  value       = aws_vpc.this.cidr_block
}

output "public_subnet_ids" {
  description = "List of IDs of the public subnets (one per AZ)."
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of IDs of the private (app) subnets (one per AZ)."
  value       = aws_subnet.private[*].id
}

output "database_subnet_ids" {
  description = "List of IDs of the database subnets (one per AZ)."
  value       = aws_subnet.database[*].id
}

output "alb_security_group_id" {
  description = "Security Group ID assigned to the Application Load Balancer."
  value       = aws_security_group.alb.id
}

output "app_security_group_id" {
  description = "Security Group ID assigned to compute (app) instances."
  value       = aws_security_group.app.id
}

output "db_security_group_id" {
  description = "Security Group ID assigned to RDS instances."
  value       = aws_security_group.db.id
}

output "redis_security_group_id" {
  description = "Security Group ID assigned to ElastiCache Redis clusters."
  value       = aws_security_group.redis.id
}

output "nat_gateway_ids" {
  description = "List of NAT Gateway IDs."
  value       = aws_nat_gateway.this[*].id
}
