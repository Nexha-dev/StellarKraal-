/**
 * Shared test fixtures for StellarKraal.
 * Factory functions accept partial overrides to customize specific fields.
 *
 * Usage:
 *   import { makeLoan, makeCollateral, makeUser, makeAppraisal } from "../../tests/fixtures";
 *   const loan = makeLoan({ amount: 500_000 });
 *   const collateral = makeCollateral({ animal_type: "goat" });
 */

// ── Inline types (mirrors backend/src/db/store.ts) ───────────────────────────

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

// ── Collateral ────────────────────────────────────────────────────────────────

export function makeCollateral(overrides: Partial<CollateralRecord> = {}): CollateralRecord {
  return {
    id: "col-001",
    owner: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
    animal_type: "cattle",
    count: 5,
    appraised_value: 10_000_000,
    createdAt: "2026-01-01T00:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

// ── Loan ──────────────────────────────────────────────────────────────────────

export function makeLoan(overrides: Partial<LoanRecord> = {}): LoanRecord {
  return {
    id: "loan-001",
    borrower: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
    collateral_id: "col-001",
    amount: 6_000_000,
    createdAt: "2026-01-01T00:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

// ── Transaction ───────────────────────────────────────────────────────────────

export function makeTransaction(overrides: Partial<TransactionRecord> = {}): TransactionRecord {
  return {
    id: "tx-001",
    borrower: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
    type: "loan",
    status: "pending",
    amount: 6_000_000,
    loanId: "loan-001",
    collateralId: "col-001",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ── User ──────────────────────────────────────────────────────────────────────

export interface UserFixture {
  walletAddress: string;
  joinDate: string;
  notifications: { loanApproved: boolean; loanRepaid: boolean; liquidationWarning: boolean };
  language: string;
  currency: string;
}

export function makeUser(overrides: Partial<UserFixture> = {}): UserFixture {
  return {
    walletAddress: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
    joinDate: "2026-01-01T00:00:00.000Z",
    notifications: { loanApproved: true, loanRepaid: true, liquidationWarning: true },
    language: "en",
    currency: "USD",
    ...overrides,
  };
}

// ── Appraisal ─────────────────────────────────────────────────────────────────

export interface AppraisalFixture {
  collateralId: string;
  appraisedValue: number;
  currency: string;
  appraisedAt: string;
}

export function makeAppraisal(overrides: Partial<AppraisalFixture> = {}): AppraisalFixture {
  return {
    collateralId: "col-001",
    appraisedValue: 10_000_000,
    currency: "XLM",
    appraisedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
