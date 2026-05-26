# Database Restore Procedure

This document outlines the exact steps to restore a database backup to a fresh instance in the event of data loss or system failure.

## Prerequisites

- Access to the AWS Management Console or AWS CLI.
- Permissions to manage RDS, S3, and KMS.
- The `KMS_KEY_ID` used for backup encryption.
- Target VPC and Security Group IDs.

## Restoration Steps

### 1. Identify the Backup
- Log in to the **AWS Backup Console**.
- Navigate to **Backup Vaults** and select `db-backup-vault`.
- Locate the latest recovery point for the database.
- Note the **Recovery Point ARN**.

### 2. Initiate Restore
- Select the recovery point and click **Restore**.
- **Instance Specifications**:
  - Choose the desired instance class (e.g., `db.t3.medium`).
  - Ensure the DB engine version matches the original.
- **Settings**:
  - **DB Instance Identifier**: Provide a new unique name (e.g., `stellarkraal-restored-YYYYMMDD`).
  - **Availability Zone**: Select based on high availability requirements.
- **Connectivity**:
  - **VPC**: Select the production VPC.
  - **Subnet Group**: Select the appropriate private subnet group.
  - **Security Groups**: Select the security group that allows traffic from the backend.

### 3. Verification
- Once the instance status is `Available`, update the backend configuration with the new endpoint.
- Connect to the database and verify data integrity:
  ```sql
  SELECT COUNT(*) FROM loans;
  SELECT COUNT(*) FROM collateral;
  ```
- Check application logs for any connectivity issues.

### 4. Cleanup
- Once the restored instance is confirmed stable, update DNS or environment variables to point to the new instance.
- Decommission the old (failed) instance if applicable.

---

## Quarterly Validation Checklist

To ensure backup integrity and team readiness, the following steps must be performed every quarter:

- [ ] **Backup Success Rate**: Verify that 100% of daily backups for the last 90 days were successful in AWS Backup reports.
- [ ] **Test Restore**: Perform a full restoration of the previous day's backup to a temporary test instance.
- [ ] **Data Integrity Check**: Run a checksum or record count comparison between the live database and the restored test instance.
- [ ] **Alerting Test**: Manually trigger a `BACKUP_JOB_FAILED` event (or simulate via script) and confirm the PagerDuty alert is received.
- [ ] **Access Review**: Confirm that only authorized IAM roles/users have access to the backup vault and KMS keys.
- [ ] **Documentation Update**: Review this restore procedure and update any changed infrastructure details or CLI commands.

**Last Validated By**: ____________________  
**Date**: ____________________
