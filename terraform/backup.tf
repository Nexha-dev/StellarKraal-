resource "aws_backup_vault" "db_backup_vault" {
  name        = "db-backup-vault"
  kms_key_arn = aws_kms_key.backup_key.arn

  tags = {
    Environment = var.environment
  }
}

resource "aws_backup_plan" "daily_db_backup" {
  name = "daily-db-backup-plan"

  rule {
    rule_name         = "daily-backup-rule"
    target_vault_name = aws_backup_vault.db_backup_vault.name
    schedule          = "cron(0 5 * * ? *)" # Daily at 05:00 UTC

    lifecycle {
      delete_after = var.backup_retention_days
    }
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_backup_selection" "db_backup_selection" {
  iam_role_arn = aws_iam_role.backup_role.arn
  name         = "db-backup-selection"
  plan_id      = aws_backup_plan.daily_db_backup.id

  resources = [
    var.db_instance_arn
  ]
}

resource "aws_iam_role" "backup_role" {
  name = "aws-backup-service-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "backup_role_policy" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
  role       = aws_iam_role.backup_role.name
}

resource "aws_iam_role_policy_attachment" "restore_role_policy" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
  role       = aws_iam_role.backup_role.name
}
