# Staging Environment Documentation

This document provides information about the StellarKraal staging environment.

## Overview

The staging environment is a mirror of the production environment used for final testing and validation before deployment to production.

## Access Information

- **Staging URL:** `https://staging.stellarkraal.com` (Example)
- **Backend API:** `https://api-staging.stellarkraal.com` (Example)

## Security & IP Allowlist

Access to the staging environment is restricted to the team via an IP Allowlist at the Load Balancer level.

### Current Allowed IPs
The list of allowed IPs is managed via GitHub Actions variables (`ALLOWED_IPS`). To add your IP:
1. Update the `ALLOWED_IPS` variable in GitHub Repository Settings.
2. The next deployment to staging will apply the new allowlist.

## CI/CD Pipeline

The staging environment is automatically updated whenever code is merged into the `develop` branch.
The pipeline follows these steps:
1. **Linting & Unit Tests**: All tests must pass.
2. **Infrastructure Provisioning**: Terraform applies changes to the `staging` workspace.
3. **Deployment**: The latest application code is deployed to ECS Staging.
4. **Notification**: A Slack notification is sent upon success/failure.

## Data Synchronization

The staging database is synchronized with production every Sunday at midnight.
- **PII Masking**: During synchronization, all Personally Identifiable Information (PII) is anonymized.
- **Masking Logic**: Refer to `scripts/mask-pii.sql` for the specific masking rules.

## Terraform Management

The staging infrastructure is managed using Terraform Workspaces.
To manage staging infrastructure locally:
```bash
cd terraform
terraform init
terraform workspace select staging
terraform plan -var="environment=staging"
```
