###############################################################################
# providers.tf — AWS provider with workspace-aware default tags
###############################################################################

terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

###############################################################################
# Local: resolve workspace → environment label
###############################################################################
locals {
  env = terraform.workspace # "staging" or "production"
}

###############################################################################
# Primary AWS provider
###############################################################################
provider "aws" {
  region = var.aws_region

  # ── Default tags applied to every resource in this run ────────────────────
  default_tags {
    tags = {
      Project     = "StellarKraal"
      Environment = local.env
      ManagedBy   = "Terraform"
      Repository  = "teslims2/StellarKraal"
    }
  }
}
