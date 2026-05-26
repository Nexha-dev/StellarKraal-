###############################################################################
# infrastructure/main.tf — Root module
#
# Wires all child modules together.
# Select workspace before running:
#   terraform workspace select staging   (or production)
###############################################################################

locals {
  name_prefix = "stellarkraal-${terraform.workspace}"

  # Workspace-aware variable overrides are supplied via the matching .tfvars file.
  # CI/CD passes: -var-file="envs/${terraform.workspace}.tfvars"
}

###############################################################################
# Networking
###############################################################################
module "networking" {
  source = "./modules/networking"

  name_prefix           = local.name_prefix
  vpc_cidr              = var.vpc_cidr
  availability_zones    = var.availability_zones
  public_subnet_cidrs   = var.public_subnet_cidrs
  private_subnet_cidrs  = var.private_subnet_cidrs
  database_subnet_cidrs = var.database_subnet_cidrs
  nat_gateway_count     = var.nat_gateway_count
  app_port              = var.app_port
}

###############################################################################
# Application Load Balancer
###############################################################################
module "alb" {
  source = "./modules/alb"

  name_prefix           = local.name_prefix
  vpc_id                = module.networking.vpc_id
  public_subnet_ids     = module.networking.public_subnet_ids
  alb_security_group_id = module.networking.alb_security_group_id
  app_port              = var.app_port
  health_check_path     = var.health_check_path
  acm_certificate_arn   = var.acm_certificate_arn
}

###############################################################################
# Compute (Auto Scaling Group)
###############################################################################
module "compute" {
  source = "./modules/compute"

  name_prefix           = local.name_prefix
  environment           = terraform.workspace
  private_subnet_ids    = module.networking.private_subnet_ids
  app_security_group_id = module.networking.app_security_group_id
  target_group_arn      = module.alb.target_group_arn
  instance_type         = var.instance_type
  root_volume_size_gb   = var.root_volume_size_gb
  app_port              = var.app_port

  asg_min_size            = var.asg_min_size
  asg_max_size            = var.asg_max_size
  asg_desired_capacity    = var.asg_desired_capacity
  scale_out_cpu_threshold = var.scale_out_cpu_threshold
  scale_in_cpu_threshold  = var.scale_in_cpu_threshold
}

###############################################################################
# Database (RDS PostgreSQL)
###############################################################################
module "database" {
  source = "./modules/database"

  name_prefix          = local.name_prefix
  database_subnet_ids  = module.networking.database_subnet_ids
  db_security_group_id = module.networking.db_security_group_id

  instance_class              = var.db_instance_class
  allocated_storage_gb        = var.db_allocated_storage_gb
  max_allocated_storage_gb    = var.db_max_allocated_storage_gb
  multi_az                    = var.db_multi_az
  backup_retention_days       = var.db_backup_retention_days
  deletion_protection         = var.db_deletion_protection
  enable_performance_insights = var.db_enable_performance_insights

  db_name     = var.db_name
  db_username = var.db_username

  max_connections_alarm_threshold = var.db_max_connections_alarm_threshold
}

###############################################################################
# Redis (ElastiCache)
###############################################################################
module "redis" {
  source = "./modules/redis"

  name_prefix             = local.name_prefix
  database_subnet_ids     = module.networking.database_subnet_ids
  redis_security_group_id = module.networking.redis_security_group_id

  node_type                  = var.redis_node_type
  num_cache_nodes            = var.redis_num_cache_nodes
  automatic_failover_enabled = var.redis_automatic_failover_enabled
  multi_az_enabled           = var.redis_multi_az_enabled
  snapshot_retention_days    = var.redis_snapshot_retention_days
}
