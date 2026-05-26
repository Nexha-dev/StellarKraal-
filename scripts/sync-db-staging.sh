#!/bin/bash

# Database Synchronization and Masking Script
# Synchronizes Production DB to Staging with PII Masking

set -e

# Configuration (should be set via env vars in the CI job)
PROD_DB_URL=${PROD_DB_URL}
STAGING_DB_URL=${STAGING_DB_URL}

echo "Starting database sync from Production to Staging..."

# 1. Create a backup of Production
echo "Dumping Production database..."
pg_dump "$PROD_DB_URL" --no-owner --no-privileges -F c -f prod_dump.bak

# 2. Restore to Staging
echo "Restoring to Staging database..."
# Use --clean to drop existing objects before restore
pg_restore -d "$STAGING_DB_URL" --clean --no-owner --no-privileges prod_dump.bak

# 3. Apply Masking
echo "Applying PII masking..."
psql "$STAGING_DB_URL" -f scripts/mask-pii.sql

echo "Cleaning up..."
rm prod_dump.bak

echo "Database sync and masking completed successfully."
