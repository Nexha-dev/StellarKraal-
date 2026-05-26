###############################################################################
# bootstrap/main.tf
#
# Run this ONCE to create the S3 bucket + DynamoDB table that backs all
# other Terraform workspaces.  This module uses the LOCAL backend deliberately.
#
# Usage:
#   cd infrastructure/bootstrap
#   terraform init && terraform apply
###############################################################################

terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
  }
  # ── LOCAL backend: bootstrap state is stored here only ────────────────────
  backend "local" {}
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "StellarKraal"
      Environment = "bootstrap"
      ManagedBy   = "Terraform"
    }
  }
}

###############################################################################
# Data sources
###############################################################################
data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

###############################################################################
# KMS key for state-file encryption
###############################################################################
resource "aws_kms_key" "tfstate" {
  description             = "StellarKraal Terraform state encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  # Key policy is managed separately via aws_kms_key_policy below
  # to keep IAM concerns in one place and avoid drift.
}

resource "aws_kms_alias" "tfstate" {
  name          = "alias/stellarkraal-tfstate"
  target_key_id = aws_kms_key.tfstate.key_id
}

###############################################################################
# Explicit KMS Key Policy
#
# Three statements are required:
#   1. Root account admin  — prevents the key becoming unmanageable
#   2. GitHub Actions role — must decrypt/encrypt state on every tf command
#   3. AWS service access  — S3 + DynamoDB need GenerateDataKey for envelope
#                            encryption when writing objects / table items
###############################################################################
data "aws_iam_policy_document" "tfstate_key_policy" {
  # ── Statement 1: Root account full administration ────────────────────────────
  statement {
    sid    = "EnableRootAdministration"
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = ["arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:root"]
    }

    actions   = ["kms:*"]
    resources = ["*"]
  }

  # ── Statement 2: GitHub Actions IAM role ────────────────────────────────────
  # Required so that `terraform init` can read the encrypted remote state
  # and `terraform apply` can write updated state back to S3.
  statement {
    sid    = "AllowGitHubActionsRoleKMSUsage"
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = [var.github_actions_role_arn]
    }

    actions = [
      "kms:Decrypt",
      "kms:DescribeKey",
      "kms:Encrypt",
      "kms:GenerateDataKey",
      "kms:GenerateDataKeyWithoutPlaintext",
      "kms:ReEncryptFrom",
      "kms:ReEncryptTo",
    ]

    resources = ["*"]
  }

  # ── Statement 3: AWS service principals (S3 + DynamoDB) ─────────────────────
  # Needed for server-side encryption on the state bucket and lock table.
  statement {
    sid    = "AllowAWSServiceEnvelopeEncryption"
    effect = "Allow"

    principals {
      type = "Service"
      identifiers = [
        "s3.amazonaws.com",
        "dynamodb.amazonaws.com",
      ]
    }

    actions = [
      "kms:GenerateDataKey",
      "kms:Decrypt",
      "kms:DescribeKey",
    ]

    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "kms:CallerAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_kms_key_policy" "tfstate" {
  key_id = aws_kms_key.tfstate.id
  policy = data.aws_iam_policy_document.tfstate_key_policy.json
}

###############################################################################
# S3 bucket for remote state
###############################################################################
resource "aws_s3_bucket" "tfstate" {
  bucket        = var.state_bucket_name
  force_destroy = false # never accidentally destroy state

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.tfstate.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "tfstate" {
  bucket                  = aws_s3_bucket.tfstate.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enforce encrypted transport
resource "aws_s3_bucket_policy" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyNonTLS"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.tfstate.arn,
          "${aws_s3_bucket.tfstate.arn}/*",
        ]
        Condition = {
          Bool = { "aws:SecureTransport" = "false" }
        }
      }
    ]
  })
}

###############################################################################
# DynamoDB table for state locking
###############################################################################
resource "aws_dynamodb_table" "tfstate_lock" {
  name         = var.lock_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.tfstate.arn
  }

  point_in_time_recovery {
    enabled = true
  }
}
