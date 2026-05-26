terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  env = terraform.workspace == "default" ? var.environment : terraform.workspace
}

resource "aws_kms_key" "backup_key" {
  description             = "KMS key for database backup encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name        = "db-backup-kms-key"
    Environment = local.env
  }
}

resource "aws_kms_alias" "backup_key_alias" {
  name          = "alias/db-backup-key"
  target_key_id = aws_kms_key.backup_key.key_id
}
