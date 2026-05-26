/**
 * Integration tests for the loans API endpoints.
 * Covers the full HTTP request-response cycle for creating, fetching,
 * repaying, and liquidating loans using the in-memory store.
 * Closes #359
 */
import request from "supertest";
import express, { Express } from "express";

// ── Mocks (must be before imports that trigger module loading) ────────────────

jest.mock("../utils/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  createRequestLogger: jest.fn(() => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
  })),
}));

// Disable rate limiting in tests
jest.mock("../middleware/rateLimit", () => {
  const noop = (_req: any, _res: any, next: any) => next();
  return { globalLimiter: noop, authLimiter: noop, writeLimiter: noop };
});

const _MOCK_ADDR = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";

jest.mock("../utils/connectionPool", () => ({
  pool: {
    run: jest.fn().mockImplementation((fn: any) =>
      fn({
        getAccount: jest.fn().mockResolvedValue({ id: _MOCK_ADDR, sequence: "1" }),
        prepareTransaction: jest.fn().mockResolvedValue({ toXDR: () => "prepared_xdr" }),
        simulateTransaction: jest.fn().mockResolvedValue({ result: { retval: { value: 13_333 } } }),
        getHealth: jest.fn().mockResolvedValue({ status: "healthy" }),
      })
    ),
    stats: jest.fn().mockReturnValue({ size: 2, available: 2, inUse: 0, min: 2, max: 10 }),
  },
  PoolExhaustedError: class PoolExhaustedError extends Error {},
}));

jest.mock("../utils/rpcClient", () => ({
  __esModule: true,
  default: {
    getAccount: jest.fn().mockResolvedValue({ id: _MOCK_ADDR, sequence: "1" }),
    prepareTransaction: jest.fn().mockResolvedValue({ toXDR: () => "prepared_xdr" }),
    simulateTransaction: jest.fn().mockResolvedValue({ result: { retval: { value: 13_333 } } }),
    getHealth: jest.fn().mockResolvedValue({ status: "healthy" }),
  },
}));

jest.mock("@stellar/stellar-sdk", () => {
  // Keep StrKey so the Stellar public key validator works
  const { StrKey } = jest.requireActual("@stellar/stellar-sdk");
  return {
    StrKey,
    Networks: {
      TESTNET: "Test SDF Network ; September 2015",
      PUBLIC: "Public Global Stellar Network ; September 2015",
    },
    BASE_FEE: "100",
    Contract: jest.fn().mockImplementation(() => ({
      call: jest.fn().mockReturnValue({ type: "invokeHostFunction" }),
    })),
    TransactionBuilder: jest.fn().mockImplementation(() => ({
      addOperation: jest.fn().mockReturnThis(),
      setTimeout: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({ toXDR: () => "mock_xdr_base64" }),
    })),
    Address: jest.fn().mockImplementation(() => ({
      toScVal: jest.fn().mockReturnValue({}),
    })),
    nativeToScVal: jest.fn().mockReturnValue({}),
    xdr: {
      ScVal: { scvVec: jest.fn((arr: any) => ({ type: "vec", value: arr })) },
    },
  };
});

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { v1Router } from "./v1";
import { insertCollateral, insertLoan } from "../db/store";

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_ADDRESS = "GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR";

// ── App factory ───────────────────────────────────────────────────────────────

function createApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api/v1", v1Router);
  return app;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

function seedCollateral(id: string, appraisedValue = 1_000_000) {
  return insertCollateral({ id, owner: VALID_ADDRESS, animal_type: "cattle", count: 5, appraised_value: appraisedValue });
}

function seedLoan(id: string, collateralId: string, amount = 600_000) {
  return insertLoan({ id, borrower: VALID_ADDRESS, collateral_id: collateralId, amount });
}

// ── Test suites ───────────────────────────────────────────────────────────────

describe("POST /api/v1/loan/request (create loan)", () => {
  let app: Express;

  beforeEach(() => { app = createApp(); });

  it("returns 200 and XDR for valid payload", async () => {
    const res = await request(app)
      .post("/api/v1/loan/request")
      .send({ borrower: VALID_ADDRESS, collateral_ids: [1], amount: 600_000 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("xdr");
    expect(typeof res.body.xdr).toBe("string");
    expect(res.body).toHaveProperty("api_version", "v1");
  });

  it("returns 200 for multiple collateral IDs", async () => {
    const res = await request(app)
      .post("/api/v1/loan/request")
      .send({ borrower: VALID_ADDRESS, collateral_ids: [1, 2, 3], amount: 1_000_000 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("xdr");
  });

  it("returns 400 for missing borrower", async () => {
    const res = await request(app)
      .post("/api/v1/loan/request")
      .send({ collateral_ids: [1], amount: 600_000 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it("returns 400 for invalid Stellar address", async () => {
    const res = await request(app)
      .post("/api/v1/loan/request")
      .send({ borrower: "NOT_A_STELLAR_KEY", collateral_ids: [1], amount: 600_000 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 for empty collateral_ids array", async () => {
    const res = await request(app)
      .post("/api/v1/loan/request")
      .send({ borrower: VALID_ADDRESS, collateral_ids: [], amount: 600_000 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 for zero amount", async () => {
    const res = await request(app)
      .post("/api/v1/loan/request")
      .send({ borrower: VALID_ADDRESS, collateral_ids: [1], amount: 0 });

    expect(res.status).toBe(400);
  });

  it("returns 400 for negative amount", async () => {
    const res = await request(app)
      .post("/api/v1/loan/request")
      .send({ borrower: VALID_ADDRESS, collateral_ids: [1], amount: -1 });

    expect(res.status).toBe(400);
  });

  it("returns 400 for missing body", async () => {
    const res = await request(app).post("/api/v1/loan/request").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });
});

describe("GET /api/v1/loan/:id (fetch loan)", () => {
  let app: Express;

  beforeEach(() => { app = createApp(); });

  it("returns 200 with result for existing numeric ID", async () => {
    const res = await request(app).get("/api/v1/loan/1");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("result");
    expect(res.body).toHaveProperty("api_version", "v1");
  });

  it("returns 200 for loan ID 0", async () => {
    const res = await request(app).get("/api/v1/loan/0");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("result");
  });

  it("returns 200 for large loan ID", async () => {
    const res = await request(app).get("/api/v1/loan/999999");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("result");
  });
});

describe("GET /api/v1/loans (list loans with pagination)", () => {
  let app: Express;

  beforeEach(() => {
    app = createApp();
    seedCollateral("list-col-a");
    seedCollateral("list-col-b");
    seedLoan("list-loan-a", "list-col-a", 300_000);
    seedLoan("list-loan-b", "list-col-b", 500_000);
  });

  it("returns 200 with paginated data and metadata", async () => {
    const res = await request(app).get("/api/v1/loans?page=1&pageSize=20");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("total");
    expect(res.body).toHaveProperty("page", 1);
    expect(res.body).toHaveProperty("pageSize", 20);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty("api_version", "v1");
  });

  it("returns seeded loans in the data array", async () => {
    const res = await request(app).get("/api/v1/loans?page=1&pageSize=20");

    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(2);
    const ids = res.body.data.map((l: any) => l.id);
    expect(ids).toContain("list-loan-a");
    expect(ids).toContain("list-loan-b");
  });

  it("respects custom pageSize", async () => {
    const res = await request(app).get("/api/v1/loans?page=1&pageSize=1");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(1);
    expect(res.body.pageSize).toBe(1);
  });

  it("returns empty data array when page exceeds total", async () => {
    const res = await request(app).get("/api/v1/loans?page=9999&pageSize=20");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("returns 400 for invalid page=0", async () => {
    const res = await request(app).get("/api/v1/loans?page=0");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid pagination parameters");
  });

  it("returns 400 for negative page", async () => {
    const res = await request(app).get("/api/v1/loans?page=-1");
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-numeric page", async () => {
    const res = await request(app).get("/api/v1/loans?page=abc");
    expect(res.status).toBe(400);
  });

  it("caps pageSize at 100 (returns 400 for pageSize > 100)", async () => {
    const res = await request(app).get("/api/v1/loans?pageSize=500");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid pagination parameters");
  });
});

describe("POST /api/v1/loan/repay (repay loan)", () => {
  let app: Express;

  beforeEach(() => { app = createApp(); });

  it("returns 200 and XDR for valid partial repayment", async () => {
    const res = await request(app)
      .post("/api/v1/loan/repay")
      .send({ borrower: VALID_ADDRESS, loan_id: 1, amount: 200_000 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("xdr");
    expect(res.body).toHaveProperty("api_version", "v1");
  });

  it("returns 200 and XDR for full repayment amount", async () => {
    const res = await request(app)
      .post("/api/v1/loan/repay")
      .send({ borrower: VALID_ADDRESS, loan_id: 1, amount: 600_000 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("xdr");
  });

  it("returns 400 for missing loan_id", async () => {
    const res = await request(app)
      .post("/api/v1/loan/repay")
      .send({ borrower: VALID_ADDRESS, amount: 200_000 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 for invalid Stellar address", async () => {
    const res = await request(app)
      .post("/api/v1/loan/repay")
      .send({ borrower: "INVALID", loan_id: 1, amount: 200_000 });

    expect(res.status).toBe(400);
  });

  it("returns 400 for zero repayment amount", async () => {
    const res = await request(app)
      .post("/api/v1/loan/repay")
      .send({ borrower: VALID_ADDRESS, loan_id: 1, amount: 0 });

    expect(res.status).toBe(400);
  });

  it("returns 400 for negative repayment amount", async () => {
    const res = await request(app)
      .post("/api/v1/loan/repay")
      .send({ borrower: VALID_ADDRESS, loan_id: 1, amount: -100 });

    expect(res.status).toBe(400);
  });

  it("returns 400 for negative loan_id", async () => {
    const res = await request(app)
      .post("/api/v1/loan/repay")
      .send({ borrower: VALID_ADDRESS, loan_id: -1, amount: 200_000 });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/loan/liquidate (liquidate loan)", () => {
  let app: Express;

  beforeEach(() => { app = createApp(); });

  it("returns 200 and XDR for eligible loan (valid payload)", async () => {
    const res = await request(app)
      .post("/api/v1/loan/liquidate")
      .send({ liquidator: VALID_ADDRESS, loan_id: 1, repay_amount: 300_000 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("xdr");
    expect(res.body).toHaveProperty("api_version", "v1");
  });

  it("returns 400 for missing liquidator", async () => {
    const res = await request(app)
      .post("/api/v1/loan/liquidate")
      .send({ loan_id: 1, repay_amount: 300_000 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 for invalid Stellar address", async () => {
    const res = await request(app)
      .post("/api/v1/loan/liquidate")
      .send({ liquidator: "BAD_KEY", loan_id: 1, repay_amount: 300_000 });

    expect(res.status).toBe(400);
  });

  it("returns 400 for zero repay_amount", async () => {
    const res = await request(app)
      .post("/api/v1/loan/liquidate")
      .send({ liquidator: VALID_ADDRESS, loan_id: 1, repay_amount: 0 });

    expect(res.status).toBe(400);
  });

  it("returns 400 for negative repay_amount", async () => {
    const res = await request(app)
      .post("/api/v1/loan/liquidate")
      .send({ liquidator: VALID_ADDRESS, loan_id: 1, repay_amount: -500 });

    expect(res.status).toBe(400);
  });

  it("returns 400 for negative loan_id", async () => {
    const res = await request(app)
      .post("/api/v1/loan/liquidate")
      .send({ liquidator: VALID_ADDRESS, loan_id: -1, repay_amount: 300_000 });

    expect(res.status).toBe(400);
  });

  it("returns 400 for missing body", async () => {
    const res = await request(app).post("/api/v1/loan/liquidate").send({});
    expect(res.status).toBe(400);
  });
});

describe("Full loan lifecycle integration", () => {
  let app: Express;

  beforeEach(() => { app = createApp(); });

  it("completes create → list → fetch → repay → liquidate without errors", async () => {
    // 1. Create loan
    const createRes = await request(app)
      .post("/api/v1/loan/request")
      .send({ borrower: VALID_ADDRESS, collateral_ids: [1], amount: 600_000 });
    expect(createRes.status).toBe(200);
    expect(createRes.body.xdr).toBeDefined();

    // 2. List loans
    const listRes = await request(app).get("/api/v1/loans?page=1&pageSize=20");
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);

    // 3. Fetch specific loan by ID
    const fetchRes = await request(app).get("/api/v1/loan/1");
    expect(fetchRes.status).toBe(200);
    expect(fetchRes.body).toHaveProperty("result");

    // 4. Repay loan
    const repayRes = await request(app)
      .post("/api/v1/loan/repay")
      .send({ borrower: VALID_ADDRESS, loan_id: 1, amount: 300_000 });
    expect(repayRes.status).toBe(200);
    expect(repayRes.body.xdr).toBeDefined();

    // 5. Liquidate loan
    const liquidateRes = await request(app)
      .post("/api/v1/loan/liquidate")
      .send({ liquidator: VALID_ADDRESS, loan_id: 1, repay_amount: 300_000 });
    expect(liquidateRes.status).toBe(200);
    expect(liquidateRes.body.xdr).toBeDefined();
  });
});
