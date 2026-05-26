-- Migration: 20260526000000-add-soft-delete (down)
-- Removes deletedAt column from collaterals and loans.
-- Note: SQLite does not support DROP COLUMN before version 3.35.0.
-- For SQLite < 3.35, recreate the tables without the column.

DROP INDEX IF EXISTS idx_collaterals_deleted;
DROP INDEX IF EXISTS idx_loans_deleted;

-- SQLite 3.35+:
ALTER TABLE collaterals DROP COLUMN "deletedAt";
ALTER TABLE loans       DROP COLUMN "deletedAt";
