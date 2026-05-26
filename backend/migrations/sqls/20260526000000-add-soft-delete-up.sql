-- Migration: 20260526000000-add-soft-delete (up)
-- Adds deletedAt column to collaterals and loans for soft-delete support.

ALTER TABLE collaterals ADD COLUMN "deletedAt" TEXT DEFAULT NULL;
ALTER TABLE loans       ADD COLUMN "deletedAt" TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_collaterals_deleted ON collaterals("deletedAt");
CREATE INDEX IF NOT EXISTS idx_loans_deleted       ON loans("deletedAt");
