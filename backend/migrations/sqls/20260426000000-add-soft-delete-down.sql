-- Migration: Add soft delete support (down)
-- Removes soft delete columns and indexes

-- Drop indexes
DROP INDEX IF EXISTS idx_loans_deleted;
DROP INDEX IF EXISTS idx_collaterals_deleted;

-- Note: SQLite doesn't support DROP COLUMN directly
-- In production with PostgreSQL, you would use:
-- ALTER TABLE loans DROP COLUMN deleted_at;
-- ALTER TABLE collaterals DROP COLUMN deleted_at;

-- For SQLite, we need to recreate the tables without the column
-- This is a destructive operation and should be used with caution

CREATE TABLE collaterals_backup AS SELECT 
  id, owner, animal_type, count, appraised_value, loan_id, created_at
FROM collaterals;

DROP TABLE collaterals;

CREATE TABLE collaterals (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  owner       TEXT    NOT NULL,
  animal_type TEXT    NOT NULL,
  count       INTEGER NOT NULL CHECK (count > 0),
  appraised_value INTEGER NOT NULL CHECK (appraised_value > 0),
  loan_id     INTEGER,
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

INSERT INTO collaterals SELECT * FROM collaterals_backup;
DROP TABLE collaterals_backup;

CREATE TABLE loans_backup AS SELECT 
  id, borrower, collateral_id, collateral_value, principal, outstanding, status, created_at, updated_at
FROM loans;

DROP TABLE loans;

CREATE TABLE loans (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  borrower         TEXT    NOT NULL,
  collateral_id    INTEGER NOT NULL REFERENCES collaterals(id),
  collateral_value INTEGER NOT NULL,
  principal        INTEGER NOT NULL CHECK (principal > 0),
  outstanding      INTEGER NOT NULL CHECK (outstanding >= 0),
  status           TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'repaid', 'liquidated')),
  created_at       INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at       INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

INSERT INTO loans SELECT * FROM loans_backup;
DROP TABLE loans_backup;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_loans_borrower ON loans(borrower);
CREATE INDEX IF NOT EXISTS idx_collaterals_owner ON collaterals(owner);
