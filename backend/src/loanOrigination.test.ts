/**
 * Unit tests for loan origination service logic.
 * Covers successful origination, collateral validation, max loan enforcement,
 * duplicate loan prevention, and missing field errors.
 * All tests use the in-memory store (no external dependencies).
 * Closes #358
 */
import {
  insertCollateral,
  insertLoan,
  getCollateral,
  getLoan,
  listLoans,
  type CollateralRecord,
  type LoanRecord,
} from "./db/store";
import { makeCollateral, makeLoan } from "../../tests/fixtures";

// ── helpers ───────────────────────────────────────────────────────────────────

const VALID_BORROWER = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";
const LTV_BPS = 6000; // 60%

/** Compute max loan amount from collateral value at 60% LTV. */
function maxLoanAmount(appraisedValue: number): number {
  return Math.floor((appraisedValue * LTV_BPS) / 10_000);
}

/** Simulate origination: validate collateral, check LTV, insert loan. */
function originateLoan(params: {
  borrower: string;
  collateralId: string;
  amount: number;
}): LoanRecord {
  const { borrower, collateralId, amount } = params;

  if (!borrower || !collateralId || amount === undefined || amount === null) {
    throw new Error("Missing required fields: borrower, collateralId, amount");
  }
  if (amount <= 0) {
    throw new Error("Loan amount must be positive");
  }

  const collateral = getCollateral(collateralId);
  if (!collateral) {
    throw new Error(`Collateral not found: ${collateralId}`);
  }

  // Check if collateral is already pledged (loan_id != 0 equivalent: another active loan uses it)
  const { data: activeLoans } = listLoans();
  const alreadyPledged = activeLoans.some((l) => l.collateral_id === collateralId);
  if (alreadyPledged) {
    throw new Error(`Collateral ${collateralId} is already pledged to an active loan`);
  }

  const maxAmount = maxLoanAmount(collateral.appraised_value);
  if (amount > maxAmount) {
    throw new Error(
      `Requested amount ${amount} exceeds maximum allowed ${maxAmount} (LTV ${LTV_BPS / 100}%)`
    );
  }

  const id = `loan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return insertLoan({ id, borrower, collateral_id: collateralId, amount });
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("Loan origination – successful creation", () => {
  it("creates a loan with valid inputs", () => {
    const col = makeCollateral({ id: "orig-col-1", appraised_value: 1_000_000 });
    const { createdAt, deletedAt, ...colInput } = col;
    insertCollateral(colInput);

    const loan = originateLoan({
      borrower: VALID_BORROWER,
      collateralId: "orig-col-1",
      amount: 600_000,
    });

    expect(loan.borrower).toBe(VALID_BORROWER);
    expect(loan.collateral_id).toBe("orig-col-1");
    expect(loan.amount).toBe(600_000);
    expect(loan.deletedAt).toBeNull();
    expect(loan.createdAt).toBeDefined();
    expect(new Date(loan.createdAt).toISOString()).toBe(loan.createdAt);
  });

  it("persists the loan so getLoan returns it", () => {
    const col = makeCollateral({ id: "orig-col-2", appraised_value: 500_000 });
    const { createdAt, deletedAt, ...colInput } = col;
    insertCollateral(colInput);

    const loan = originateLoan({
      borrower: VALID_BORROWER,
      collateralId: "orig-col-2",
      amount: 300_000,
    });

    const fetched = getLoan(loan.id);
    expect(fetched).toBeDefined();
    expect(fetched!.id).toBe(loan.id);
    expect(fetched!.amount).toBe(300_000);
  });

  it("allows borrowing exactly at the LTV cap", () => {
    const col = makeCollateral({ id: "orig-col-3", appraised_value: 1_000_000 });
    const { createdAt, deletedAt, ...colInput } = col;
    insertCollateral(colInput);

    const loan = originateLoan({
      borrower: VALID_BORROWER,
      collateralId: "orig-col-3",
      amount: 600_000, // exactly 60% of 1_000_000
    });

    expect(loan.amount).toBe(600_000);
  });
});

describe("Loan origination – collateral validation", () => {
  it("throws when collateral does not exist", () => {
    expect(() =>
      originateLoan({
        borrower: VALID_BORROWER,
        collateralId: "nonexistent-col",
        amount: 100_000,
      })
    ).toThrow("Collateral not found: nonexistent-col");
  });

  it("throws when collateral is already pledged to an active loan", () => {
    const col = makeCollateral({ id: "orig-col-pledged", appraised_value: 1_000_000 });
    const { createdAt, deletedAt, ...colInput } = col;
    insertCollateral(colInput);

    // First loan pledges the collateral
    originateLoan({
      borrower: VALID_BORROWER,
      collateralId: "orig-col-pledged",
      amount: 300_000,
    });

    // Second loan on same collateral should fail
    expect(() =>
      originateLoan({
        borrower: VALID_BORROWER,
        collateralId: "orig-col-pledged",
        amount: 200_000,
      })
    ).toThrow("already pledged");
  });
});

describe("Loan origination – maximum loan amount enforcement", () => {
  it("throws when requested amount exceeds LTV cap", () => {
    const col = makeCollateral({ id: "orig-col-ltv", appraised_value: 1_000_000 });
    const { createdAt, deletedAt, ...colInput } = col;
    insertCollateral(colInput);

    expect(() =>
      originateLoan({
        borrower: VALID_BORROWER,
        collateralId: "orig-col-ltv",
        amount: 600_001, // 1 over the 600_000 cap
      })
    ).toThrow("exceeds maximum allowed 600000");
  });

  it("throws for amount far exceeding LTV cap", () => {
    const col = makeCollateral({ id: "orig-col-ltv2", appraised_value: 100_000 });
    const { createdAt, deletedAt, ...colInput } = col;
    insertCollateral(colInput);

    expect(() =>
      originateLoan({
        borrower: VALID_BORROWER,
        collateralId: "orig-col-ltv2",
        amount: 999_999,
      })
    ).toThrow("exceeds maximum allowed");
  });

  it("error message includes the LTV percentage", () => {
    const col = makeCollateral({ id: "orig-col-ltv3", appraised_value: 200_000 });
    const { createdAt, deletedAt, ...colInput } = col;
    insertCollateral(colInput);

    expect(() =>
      originateLoan({
        borrower: VALID_BORROWER,
        collateralId: "orig-col-ltv3",
        amount: 200_000,
      })
    ).toThrow("60%");
  });
});

describe("Loan origination – missing required fields", () => {
  it("throws when borrower is empty string", () => {
    expect(() =>
      originateLoan({ borrower: "", collateralId: "any", amount: 100_000 })
    ).toThrow("Missing required fields");
  });

  it("throws when collateralId is empty string", () => {
    expect(() =>
      originateLoan({ borrower: VALID_BORROWER, collateralId: "", amount: 100_000 })
    ).toThrow("Missing required fields");
  });

  it("throws when amount is zero", () => {
    expect(() =>
      originateLoan({ borrower: VALID_BORROWER, collateralId: "any", amount: 0 })
    ).toThrow("Loan amount must be positive");
  });

  it("throws when amount is negative", () => {
    expect(() =>
      originateLoan({ borrower: VALID_BORROWER, collateralId: "any", amount: -500 })
    ).toThrow("Loan amount must be positive");
  });
});
