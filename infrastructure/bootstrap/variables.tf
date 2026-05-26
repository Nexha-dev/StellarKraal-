###############################################################################
# bootstrap/variables.tf
###############################################################################

variable "aws_region" {
  description = "AWS region in which the state bucket and lock table will be created."
  type        = string
  default     = "us-east-1"
}

variable "state_bucket_name" {
  description = "Globally-unique S3 bucket name for Terraform remote state storage."
  type        = string
  default     = "stellarkraal-tfstate-prod"
}

variable "lock_table_name" {
  description = "DynamoDB table name used for Terraform state locking."
  type        = string
  default     = "stellarkraal-tfstate-lock"
}

variable "github_actions_role_arn" {
  description = <<-EOT
    ARN of the IAM Role assumed by GitHub Actions via OIDC.
    This role is explicitly granted kms:Decrypt, kms:Encrypt, and
    kms:GenerateDataKey on the state-encryption KMS key so that
    `terraform init` and `terraform apply` succeed in CI/CD.
    Example: "arn:aws:iam::123456789012:role/GitHubActions-StellarKraal"
  EOT
  type        = string
}
