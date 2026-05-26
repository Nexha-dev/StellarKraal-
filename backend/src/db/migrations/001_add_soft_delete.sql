-- Migration 001: Add soft delete support to loans and collateral tables
-- Run this against your production database when deploying soft-delete feature.

ALTER TABLE collaterals ADD COLUMN IF NOT EXISTS "deletedAt" TEXT DEFAULT NULL;
ALTER TABLE loans       ADD COLUMN IF NOT EXISTS "deletedAt" TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_collaterals_deleted ON collaterals("deletedAt");
CREATE INDEX IF NOT EXISTS idx_loans_deleted       ON loans("deletedAt");

-- All existing queries should add WHERE "deletedAt" IS NULL to filter soft-deleted rows.
