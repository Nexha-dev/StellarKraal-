###############################################################################
# modules/database/outputs.tf
###############################################################################

output "db_instance_id" {
  description = "Identifier of the RDS instance."
  value       = aws_db_instance.this.id
}

output "db_instance_arn" {
  description = "ARN of the RDS instance."
  value       = aws_db_instance.this.arn
}

output "db_endpoint" {
  description = "Connection endpoint of the RDS instance (host:port)."
  value       = aws_db_instance.this.endpoint
}

output "db_address" {
  description = "Hostname of the RDS instance."
  value       = aws_db_instance.this.address
}

output "db_port" {
  description = "Port on which the RDS instance accepts connections."
  value       = aws_db_instance.this.port
}

output "db_name" {
  description = "Name of the initial database created in the RDS instance."
  value       = aws_db_instance.this.db_name
}

output "db_credentials_secret_arn" {
  description = "ARN of the Secrets Manager secret containing master DB credentials."
  value       = aws_secretsmanager_secret.db_credentials.arn
  sensitive   = true
}

output "kms_key_arn" {
  description = "ARN of the KMS key used to encrypt the RDS instance and secret."
  value       = aws_kms_key.rds.arn
}
