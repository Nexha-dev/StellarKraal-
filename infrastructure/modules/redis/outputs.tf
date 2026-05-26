###############################################################################
# modules/redis/outputs.tf
###############################################################################

output "replication_group_id" {
  description = "ID of the ElastiCache Redis replication group."
  value       = aws_elasticache_replication_group.this.id
}

output "primary_endpoint_address" {
  description = "DNS address of the primary Redis endpoint (read/write)."
  value       = aws_elasticache_replication_group.this.primary_endpoint_address
}

output "reader_endpoint_address" {
  description = "DNS address of the reader Redis endpoint (read-only replicas)."
  value       = aws_elasticache_replication_group.this.reader_endpoint_address
}

output "port" {
  description = "Port number the Redis cluster listens on."
  value       = aws_elasticache_replication_group.this.port
}

output "auth_token_secret_arn" {
  description = "ARN of the Secrets Manager secret containing the Redis AUTH token."
  value       = aws_secretsmanager_secret.redis_auth_token.arn
  sensitive   = true
}

output "kms_key_arn" {
  description = "ARN of the KMS key used for Redis encryption at rest."
  value       = aws_kms_key.redis.arn
}
