/**
 * Lightweight in-memory store with soft delete support.
 * Provides audit trail for loans and collateral records.
 * Migration system is managed by db-migrate for schema versioning.
 * 
 * Note: This is an in-memory implementation for development.
 * In production, replace with actual database queries.
 */

export interface CollateralRecord {
  id: string;
  owner: string;
  animal_type: string;
  count: number;
  appraised_value: number;
  createdAt: string;
  deletedAt: string | null;
}

export interface LoanRecord {
  id: string;
  borrower: string;
  collateral_id: string;
  amount: number;
  createdAt: string;
  deletedAt: string | null;
}

export type TransactionType = "loan" | "repayment" | "liquidation";
export type TransactionStatus = "pending" | "completed" | "failed";

export interface TransactionRecord {
  id: string;
  borrower: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  loanId?: string;
  collateralId?: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory tables (replace with a real DB in production)
const collateralTable: Map<string, CollateralRecord> = new Map();
const loanTable: Map<string, LoanRecord> = new Map();
const transactionTable: Map<string, TransactionRecord> = new Map();

// ── Collateral ────────────────────────────────────────────────────────────────

/**
 * Insert a new collateral record into the in-memory store.
 * @param data - Collateral fields excluding auto-generated timestamps.
 * @returns The created {@link CollateralRecord} with `createdAt` and `deletedAt` set.
 * @example
 * const record = insertCollateral({ id: "1", owner: "G...", animal_type: "cattle", count: 5, appraised_value: 1000000 });
 */
export function insertCollateral(data: Omit<CollateralRecord, "createdAt" | "deletedAt">): CollateralRecord {
  const record: CollateralRecord = { ...data, createdAt: new Date().toISOString(), deletedAt: null };
  collateralTable.set(record.id, record);
  return record;
}

/**
 * Return all non-deleted collateral records.
 * @returns Array of active {@link CollateralRecord} objects.
 */
export function listCollateral(): CollateralRecord[] {
  return [...collateralTable.values()].filter((r) => r.deletedAt === null);
}

/**
 * Fetch a single collateral record by ID (excludes soft-deleted records).
 * @param id - Collateral record ID.
 * @returns The {@link CollateralRecord} or `undefined` if not found or deleted.
 */
export function getCollateral(id: string): CollateralRecord | undefined {
  const r = collateralTable.get(id);
  return r && r.deletedAt === null ? r : undefined;
}

/**
 * Soft-delete a collateral record by setting its `deletedAt` timestamp.
 * @param id - Collateral record ID.
 * @returns `true` if the record was deleted, `false` if not found or already deleted.
 */
export function softDeleteCollateral(id: string): boolean {
  const r = collateralTable.get(id);
  if (!r || r.deletedAt !== null) return false;
  r.deletedAt = new Date().toISOString();
  return true;
}

/**
 * Restore a soft-deleted collateral record by clearing its `deletedAt` timestamp.
 * @param id - Collateral record ID.
 * @returns `true` if restored, `false` if not found or not currently deleted.
 */
export function restoreCollateral(id: string): boolean {
  const r = collateralTable.get(id);
  if (!r || r.deletedAt === null) return false;
  r.deletedAt = null;
  return true;
}

/**
 * Return all soft-deleted collateral records.
 * @returns Array of deleted {@link CollateralRecord} objects.
 */
export function listDeletedCollateral(): CollateralRecord[] {
  return [...collateralTable.values()].filter((r) => r.deletedAt !== null);
}

// ── Loans ─────────────────────────────────────────────────────────────────────

/**
 * Insert a new loan record into the in-memory store.
 * @param data - Loan fields excluding auto-generated timestamps.
 * @returns The created {@link LoanRecord} with `createdAt` and `deletedAt` set.
 * @example
 * const loan = insertLoan({ id: "1", borrower: "G...", collateral_id: "1", amount: 600000 });
 */
export function insertLoan(data: Omit<LoanRecord, "createdAt" | "deletedAt">): LoanRecord {
  const record: LoanRecord = { ...data, createdAt: new Date().toISOString(), deletedAt: null };
  loanTable.set(record.id, record);
  return record;
}

/**
 * Return all non-deleted loan records with optional pagination.
 * @param filters - Optional pagination parameters.
 * @param filters.page - Page number (1-indexed, default 1).
 * @param filters.pageSize - Records per page (default 20, max 100).
 * @returns Paginated result with `data`, `total`, `page`, and `pageSize`.
 */
export function listLoans(filters?: {
  page?: number;
  pageSize?: number;
}): { data: LoanRecord[]; total: number; page: number; pageSize: number } {
  const pageSize = Math.min(filters?.pageSize || 20, 100);
  const page = Math.max(filters?.page || 1, 1);

  let results = [...loanTable.values()].filter((r) => r.deletedAt === null);

  // Sort by date descending (newest first)
  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = results.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const data = results.slice(start, end);

  return { data, total, page, pageSize };
}

/**
 * Fetch a single loan record by ID (excludes soft-deleted records).
 * @param id - Loan record ID.
 * @returns The {@link LoanRecord} or `undefined` if not found or deleted.
 */
export function getLoan(id: string): LoanRecord | undefined {
  const r = loanTable.get(id);
  return r && r.deletedAt === null ? r : undefined;
}

/**
 * Soft-delete a loan record by setting its `deletedAt` timestamp.
 * @param id - Loan record ID.
 * @returns `true` if deleted, `false` if not found or already deleted.
 */
export function softDeleteLoan(id: string): boolean {
  const r = loanTable.get(id);
  if (!r || r.deletedAt !== null) return false;
  r.deletedAt = new Date().toISOString();
  return true;
}

/**
 * Restore a soft-deleted loan record by clearing its `deletedAt` timestamp.
 * @param id - Loan record ID.
 * @returns `true` if restored, `false` if not found or not currently deleted.
 */
export function restoreLoan(id: string): boolean {
  const r = loanTable.get(id);
  if (!r || r.deletedAt === null) return false;
  r.deletedAt = null;
  return true;
}

/**
 * Return all soft-deleted loan records.
 * @returns Array of deleted {@link LoanRecord} objects.
 */
export function listDeletedLoans(): LoanRecord[] {
  return [...loanTable.values()].filter((r) => r.deletedAt !== null);
}

// ── Migration exports ─────────────────────────────────────────────────────────

/**
 * Migration 001: Add deletedAt column to loans and collateral tables.
 * For a real DB this would be a SQL migration script.
 * Schema:
 *   ALTER TABLE collateral ADD COLUMN deletedAt TEXT DEFAULT NULL;
 *   ALTER TABLE loans      ADD COLUMN deletedAt TEXT DEFAULT NULL;
 *   CREATE INDEX idx_collateral_deleted ON collateral(deletedAt);
 *   CREATE INDEX idx_loans_deleted      ON loans(deletedAt);
 */
export function runMigrations(): void {
  // No-op for in-memory store; documents intent for real DB migration
}


// ── Transactions ──────────────────────────────────────────────────────────────

/**
 * Insert a new transaction record with an auto-generated ID and timestamps.
 * @param data - Transaction fields excluding `id`, `createdAt`, and `updatedAt`.
 * @returns The created {@link TransactionRecord}.
 * @example
 * const tx = insertTransaction({ borrower: "G...", type: "loan", status: "pending", amount: 600000 });
 */
export function insertTransaction(data: Omit<TransactionRecord, "id" | "createdAt" | "updatedAt">): TransactionRecord {
  const id = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  const record: TransactionRecord = { ...data, id, createdAt: now, updatedAt: now };
  transactionTable.set(record.id, record);
  return record;
}

/**
 * List transactions with optional filtering and pagination.
 * @param filters - Optional filter and pagination options.
 * @param filters.borrower - Filter by borrower address.
 * @param filters.type - Filter by transaction type (`loan`, `repayment`, `liquidation`).
 * @param filters.status - Filter by status (`pending`, `completed`, `failed`).
 * @param filters.startDate - ISO date string lower bound for `createdAt`.
 * @param filters.endDate - ISO date string upper bound for `createdAt`.
 * @param filters.page - Page number (1-indexed, default 1).
 * @param filters.pageSize - Records per page (default 20).
 * @returns Paginated result with `data`, `total`, `page`, and `pageSize`.
 */
export function listTransactions(filters?: {
  borrower?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}): { data: TransactionRecord[]; total: number; page: number; pageSize: number } {
  const pageSize = filters?.pageSize || 20;
  const page = filters?.page || 1;

  let results = [...transactionTable.values()];

  if (filters?.borrower) {
    results = results.filter((t) => t.borrower === filters.borrower);
  }
  if (filters?.type) {
    results = results.filter((t) => t.type === filters.type);
  }
  if (filters?.status) {
    results = results.filter((t) => t.status === filters.status);
  }
  if (filters?.startDate) {
    results = results.filter((t) => new Date(t.createdAt) >= new Date(filters.startDate!));
  }
  if (filters?.endDate) {
    results = results.filter((t) => new Date(t.createdAt) <= new Date(filters.endDate!));
  }

  // Sort by date descending (newest first)
  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = results.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const data = results.slice(start, end);

  return { data, total, page, pageSize };
}

/**
 * Fetch a single transaction record by ID.
 * @param id - Transaction ID.
 * @returns The {@link TransactionRecord} or `undefined` if not found.
 */
export function getTransaction(id: string): TransactionRecord | undefined {
  return transactionTable.get(id);
}

/**
 * Update fields on an existing transaction record.
 * @param id - Transaction ID.
 * @param updates - Partial fields to merge (excluding `id` and `createdAt`).
 * @returns The updated {@link TransactionRecord}, or `undefined` if not found.
 * @throws Never — returns `undefined` instead of throwing when not found.
 */
export function updateTransaction(id: string, updates: Partial<Omit<TransactionRecord, "id" | "createdAt">>): TransactionRecord | undefined {
  const record = transactionTable.get(id);
  if (!record) return undefined;
  const updated = { ...record, ...updates, updatedAt: new Date().toISOString() };
  transactionTable.set(id, updated);
  return updated;
}
