###############################################################################
# bootstrap/outputs.tf
###############################################################################

output "state_bucket_name" {
  description = "Name of the S3 bucket that stores Terraform state. Copy this into backend.tf."
  value       = aws_s3_bucket.tfstate.bucket
}

output "state_bucket_arn" {
  description = "ARN of the Terraform state S3 bucket."
  value       = aws_s3_bucket.tfstate.arn
}

output "lock_table_name" {
  description = "DynamoDB table used for state locking. Copy this into backend.tf."
  value       = aws_dynamodb_table.tfstate_lock.name
}

output "kms_key_alias" {
  description = "KMS alias used to encrypt the state bucket. Copy this into backend.tf."
  value       = aws_kms_alias.tfstate.name
}
