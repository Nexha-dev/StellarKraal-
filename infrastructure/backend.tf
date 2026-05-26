###############################################################################
# Remote State Backend
#
# NOTE: This file must be bootstrapped ONCE before any other `terraform` command.
# Run: cd infrastructure/bootstrap && terraform apply
# Then update the bucket/table names below to match the bootstrap outputs.
###############################################################################

terraform {
  backend "s3" {
    # ── Replace these with your bootstrap outputs ──────────────────────────────
    bucket         = "stellarkraal-tfstate-prod" # created by bootstrap module
    region         = "us-east-1"
    encrypt        = true
    kms_key_id     = "alias/stellarkraal-tfstate" # created by bootstrap module
    dynamodb_table = "stellarkraal-tfstate-lock"  # created by bootstrap module

    # Generic key — never include the workspace name here.
    # Terraform automatically resolves the full S3 path as:
    #   env:/<workspace>/stellar-kraal/terraform.tfstate
    # e.g.  env:/staging/stellar-kraal/terraform.tfstate
    #        env:/production/stellar-kraal/terraform.tfstate
    key                  = "stellar-kraal/terraform.tfstate"
    workspace_key_prefix = "env"
  }
}
