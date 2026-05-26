#!/bin/bash
# user_data.sh.tpl — bootstraps EC2 instances in the StellarKraal App tier
# Rendered by Terraform; variables are substituted at plan time.

set -euo pipefail

# ── System update ──────────────────────────────────────────────────────────────
dnf update -y

# ── CloudWatch Agent ───────────────────────────────────────────────────────────
dnf install -y amazon-cloudwatch-agent
systemctl enable amazon-cloudwatch-agent
systemctl start amazon-cloudwatch-agent

# ── Application environment ────────────────────────────────────────────────────
echo "ENVIRONMENT=${env}" >> /etc/environment
echo "APP_PORT=${app_port}" >> /etc/environment

# ── (Optional) Add your application installation steps below ──────────────────
# Example: pull from S3, ECR, or a package manager.
# aws s3 cp s3://stellarkraal-artifacts/${env}/app.tar.gz /opt/app/
# systemctl enable stellarkraal && systemctl start stellarkraal
