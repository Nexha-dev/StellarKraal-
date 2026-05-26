resource "aws_s3_bucket" "backup_storage" {
  bucket = "stellarkraal-db-backups-${var.environment}"

  object_lock_enabled = true

  tags = {
    Name        = "db-backup-storage"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "backup_storage_versioning" {
  bucket = aws_s3_bucket.backup_storage.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backup_storage_encryption" {
  bucket = aws_s3_bucket.backup_storage.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.backup_key.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backup_storage_lifecycle" {
  bucket = aws_s3_bucket.backup_storage.id

  rule {
    id     = "backup-retention"
    status = "Enabled"

    expiration {
      days = var.backup_retention_days
    }

    noncurrent_version_expiration {
      noncurrent_days = var.backup_retention_days
    }
  }
}

resource "aws_s3_bucket_object_lock_configuration" "backup_storage_lock" {
  bucket = aws_s3_bucket.backup_storage.id

  rule {
    default_retention {
      mode = "GOVERNANCE"
      days = var.backup_retention_days
    }
  }
}
