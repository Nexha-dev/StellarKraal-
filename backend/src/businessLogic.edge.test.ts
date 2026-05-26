/**
 * Edge case tests for backend business logic.
 * Covers null/undefined/empty/zero inputs for store functions and loanStateMachine.
 * Closes #366
 */
import {
  insertCollateral,
  insertLoan,
  insertTransaction,
  listCollateral,
  getCollateral,
  listLoans,
  getTransaction,
} from "./db/store";
import { transition, allowedTransitions, InvalidTransitionError } from "./loanStateMachine";
import { makeCollateral, makeLoan, makeTransaction } from "../../tests/fixtures";

// ── insertCollateral edge cases ───────────────────────────────────────────────

describe("insertCollateral – edge cases", () => {
  it("stores a record with zero count (zero is invalid per schema but store accepts it)", () => {
    const data = makeCollateral({ id: "ec-col-1", count: 0 });
    const { createdAt, deletedAt, ...input } = data;
    const record = insertCollateral(input);
    expect(record.count).toBe(0);
  });

  it("stores a record with zero appraised_value", () => {
    const data = makeCollateral({ id: "ec-col-2", appraised_value: 0 });
    const { createdAt, deletedAt, ...input } = data;
    const record = insertCollateral(input);
    expect(record.appraised_value).toBe(0);
  });

  it("stores a record with empty string animal_type", () => {
    const data = makeCollateral({ id: "ec-col-3", animal_type: "" });
    const { createdAt, deletedAt, ...input } = data;
    const record = insertCollateral(input);
    expect(record.animal_type).toBe("");
  });

  it("sets deletedAt to null on creation", () => {
    const data = makeCollateral({ id: "ec-col-4" });
    const { createdAt, deletedAt, ...input } = data;
    const record = insertCollateral(input);
    expect(record.deletedAt).toBeNull();
  });

  it("sets createdAt to a valid ISO string", () => {
    const data = makeCollateral({ id: "ec-col-5" });
    const { createdAt, deletedAt, ...input } = data;
    const record = insertCollateral(input);
    expect(() => new Date(record.createdAt)).not.toThrow();
    expect(new Date(record.createdAt).toISOString()).toBe(record.createdAt);
  });
});

// ── getCollateral edge cases ──────────────────────────────────────────────────

describe("getCollateral – edge cases", () => {
  it("returns undefined for a non-existent id", () => {
    expect(getCollateral("does-not-exist")).toBeUndefined();
  });

  it("returns undefined for empty string id", () => {
    expect(getCollateral("")).toBeUndefined();
  });
});

// ── insertLoan edge cases ─────────────────────────────────────────────────────

describe("insertLoan – edge cases", () => {
  it("stores a loan with zero amount", () => {
    const data = makeLoan({ id: "ec-loan-1", amount: 0 });
    const { createdAt, deletedAt, ...input } = data;
    const record = insertLoan(input);
    expect(record.amount).toBe(0);
  });

  it("stores a loan with empty string collateral_id", () => {
    const data = makeLoan({ id: "ec-loan-2", collateral_id: "" });
    const { createdAt, deletedAt, ...input } = data;
    const record = insertLoan(input);
    expect(record.collateral_id).toBe("");
  });

  it("sets deletedAt to null on creation", () => {
    const data = makeLoan({ id: "ec-loan-3" });
    const { createdAt, deletedAt, ...input } = data;
    const record = insertLoan(input);
    expect(record.deletedAt).toBeNull();
  });
});

// ── listLoans pagination edge cases ──────────────────────────────────────────

describe("listLoans – pagination edge cases", () => {
  it("returns page 1 with default pageSize when called with no args", () => {
    const result = listLoans();
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("clamps page to 1 when page=0 is passed", () => {
    const result = listLoans({ page: 0 });
    expect(result.page).toBe(1);
  });

  it("clamps pageSize to 100 when pageSize exceeds max", () => {
    const result = listLoans({ pageSize: 999 });
    expect(result.pageSize).toBe(100);
  });
});

// ── insertTransaction edge cases ──────────────────────────────────────────────

describe("insertTransaction – edge cases", () => {
  it("stores a transaction without optional loanId and collateralId", () => {
    const data = makeTransaction({ loanId: undefined, collateralId: undefined });
    const { id, createdAt, updatedAt, ...input } = data;
    const record = insertTransaction(input);
    expect(record.loanId).toBeUndefined();
    expect(record.collateralId).toBeUndefined();
  });

  it("stores a transaction with zero amount", () => {
    const data = makeTransaction({ amount: 0 });
    const { id, createdAt, updatedAt, ...input } = data;
    const record = insertTransaction(input);
    expect(record.amount).toBe(0);
  });

  it("auto-generates a unique id", () => {
    const data = makeTransaction();
    const { id, createdAt, updatedAt, ...input } = data;
    const r1 = insertTransaction(input);
    const r2 = insertTransaction(input);
    expect(r1.id).not.toBe(r2.id);
  });
});

// ── getTransaction edge cases ─────────────────────────────────────────────────

describe("getTransaction – edge cases", () => {
  it("returns undefined for a non-existent id", () => {
    expect(getTransaction("no-such-tx")).toBeUndefined();
  });

  it("returns undefined for empty string id", () => {
    expect(getTransaction("")).toBeUndefined();
  });
});

// ── loanStateMachine edge cases ───────────────────────────────────────────────

describe("transition – edge cases", () => {
  it("throws InvalidTransitionError for null-like invalid transition", () => {
    expect(() => transition("pending", "repaid", [])).toThrow(InvalidTransitionError);
  });

  it("throws InvalidTransitionError for terminal state transition", () => {
    expect(() => transition("repaid", "active", [])).toThrow(InvalidTransitionError);
    expect(() => transition("liquidated", "active", [])).toThrow(InvalidTransitionError);
  });

  it("throws InvalidTransitionError for same-state transition", () => {
    expect(() => transition("pending", "pending", [])).toThrow(InvalidTransitionError);
  });

  it("appends a record to history on valid transition", () => {
    const history: any[] = [];
    transition("pending", "active", history);
    expect(history).toHaveLength(1);
    expect(history[0].from).toBe("pending");
    expect(history[0].to).toBe("active");
    expect(history[0].at).toBeDefined();
  });

  it("error message includes both states", () => {
    try {
      transition("repaid", "active", []);
    } catch (e: any) {
      expect(e.message).toContain("repaid");
      expect(e.message).toContain("active");
    }
  });
});

describe("allowedTransitions – edge cases", () => {
  it("returns empty array for terminal states", () => {
    expect(allowedTransitions("repaid")).toEqual([]);
    expect(allowedTransitions("liquidated")).toEqual([]);
  });

  it("returns correct transitions for pending", () => {
    expect(allowedTransitions("pending")).toEqual(["active"]);
  });

  it("returns correct transitions for active", () => {
    expect(allowedTransitions("active")).toContain("repaid");
    expect(allowedTransitions("active")).toContain("liquidated");
  });
});
