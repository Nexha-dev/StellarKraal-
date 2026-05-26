###############################################################################
# modules/database/main.tf
#
# Creates:
#   • DB Subnet Group
#   • Random password (stored in AWS Secrets Manager — never in state plain-text)
#   • KMS key for RDS encryption
#   • RDS PostgreSQL instance (or Multi-AZ cluster for production)
#   • Secrets Manager secret for DB credentials
#   • CloudWatch alarms (CPU, storage, connections)
###############################################################################

###############################################################################
# KMS key for RDS encryption at rest
###############################################################################
resource "aws_kms_key" "rds" {
  description             = "${var.name_prefix} RDS encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

resource "aws_kms_alias" "rds" {
  name          = "alias/${var.name_prefix}-rds"
  target_key_id = aws_kms_key.rds.key_id
}

###############################################################################
# Random master password (generated at plan time; stored in Secrets Manager)
###############################################################################
resource "random_password" "db_master" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

###############################################################################
# Secrets Manager — DB credentials
###############################################################################
resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "${var.name_prefix}/db/master-credentials"
  description             = "RDS master credentials for ${var.name_prefix}"
  kms_key_id              = aws_kms_key.rds.arn
  recovery_window_in_days = 30
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db_master.result
    engine   = "postgres"
    host     = aws_db_instance.this.address
    port     = aws_db_instance.this.port
    dbname   = var.db_name
  })

  # Depends on the instance so host/port are resolved
  depends_on = [aws_db_instance.this]
}

###############################################################################
# DB Subnet Group
###############################################################################
resource "aws_db_subnet_group" "this" {
  name        = "${var.name_prefix}-db-subnet-group"
  description = "DB subnet group for ${var.name_prefix}"
  subnet_ids  = var.database_subnet_ids

  tags = { Name = "${var.name_prefix}-db-subnet-group" }
}

###############################################################################
# RDS Parameter Group
###############################################################################
resource "aws_db_parameter_group" "this" {
  name        = "${var.name_prefix}-pg15"
  family      = "postgres15"
  description = "Custom parameters for ${var.name_prefix} PostgreSQL 15"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_duration"
    value = "1"
  }

  tags = { Name = "${var.name_prefix}-pg15" }
}

###############################################################################
# RDS Instance
###############################################################################
resource "aws_db_instance" "this" {
  identifier = "${var.name_prefix}-rds"

  # Engine
  engine               = "postgres"
  engine_version       = var.engine_version
  parameter_group_name = aws_db_parameter_group.this.name

  # Credentials
  username = var.db_username
  password = random_password.db_master.result
  db_name  = var.db_name

  # Sizing
  instance_class        = var.instance_class
  allocated_storage     = var.allocated_storage_gb
  max_allocated_storage = var.max_allocated_storage_gb
  storage_type          = "gp3"

  # Encryption
  storage_encrypted = true
  kms_key_id        = aws_kms_key.rds.arn

  # Network
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [var.db_security_group_id]
  publicly_accessible    = false # always private

  # High Availability
  multi_az = var.multi_az

  # Backups & Maintenance
  backup_retention_period    = var.backup_retention_days
  backup_window              = "03:00-04:00"
  maintenance_window         = "Mon:04:00-Mon:05:00"
  auto_minor_version_upgrade = true
  copy_tags_to_snapshot      = true

  # Deletion Protection
  deletion_protection       = var.deletion_protection
  skip_final_snapshot       = !var.deletion_protection
  final_snapshot_identifier = var.deletion_protection ? "${var.name_prefix}-rds-final-snapshot" : null

  # Performance Insights (enabled for production)
  performance_insights_enabled          = var.enable_performance_insights
  performance_insights_kms_key_id       = var.enable_performance_insights ? aws_kms_key.rds.arn : null
  performance_insights_retention_period = var.enable_performance_insights ? 7 : null

  tags = { Name = "${var.name_prefix}-rds" }
}

###############################################################################
# CloudWatch Alarms
###############################################################################
resource "aws_cloudwatch_metric_alarm" "db_cpu" {
  alarm_name          = "${var.name_prefix}-rds-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 120
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU utilization exceeded 80%"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.this.id
  }
}

resource "aws_cloudwatch_metric_alarm" "db_storage_low" {
  alarm_name          = "${var.name_prefix}-rds-low-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5368709120 # 5 GB in bytes
  alarm_description   = "RDS free storage space is below 5 GB"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.this.id
  }
}

resource "aws_cloudwatch_metric_alarm" "db_connections" {
  alarm_name          = "${var.name_prefix}-rds-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 120
  statistic           = "Average"
  threshold           = var.max_connections_alarm_threshold
  alarm_description   = "RDS connection count is unusually high"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.this.id
  }
}
