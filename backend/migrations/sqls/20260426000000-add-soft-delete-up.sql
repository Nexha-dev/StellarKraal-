-- Migration: Add soft delete support (up)
-- Adds deletedAt column to collaterals and loans tables for audit trail

-- Add deletedAt column to collaterals table
ALTER TABLE collaterals ADD COLUMN deleted_at INTEGER DEFAULT NULL;

-- Add deletedAt column to loans table
ALTER TABLE loans ADD COLUMN deleted_at INTEGER DEFAULT NULL;

-- Create indexes for efficient soft-delete queries
CREATE INDEX IF NOT EXISTS idx_collaterals_deleted ON collaterals(deleted_at);
CREATE INDEX IF NOT EXISTS idx_loans_deleted ON loans(deleted_at);

-- Note: All queries should filter WHERE deleted_at IS NULL to exclude soft-deleted records
