/**
 * Edge case tests for list endpoints and aggregation functions.
 * Covers empty datasets, pagination limits, and max page size validation.
 * Closes #367
 */
import request from "supertest";
import express, { Express } from "express";

// ── Mocks (must be before imports that trigger module load) ───────────────────

jest.mock("../utils/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  createRequestLogger: jest.fn(() => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
  })),
}));

jest.mock("../utils/connectionPool", () => ({
  pool: {
    run: jest.fn(),
    stats: jest.fn().mockReturnValue({ active: 0, idle: 1, total: 1 }),
  },
  PoolExhaustedError: class PoolExhaustedError extends Error {},
}));

jest.mock("../utils/rpcClient", () => ({
  __esModule: true,
  default: {
    getAccount: jest.fn().mockResolvedValue({ id: "GABC", sequence: "1" }),
    prepareTransaction: jest.fn().mockResolvedValue({ toXDR: () => "prepared_xdr" }),
    simulateTransaction: jest.fn().mockResolvedValue({ result: { retval: { value: 150 } } }),
    getHealth: jest.fn().mockResolvedValue({ status: "healthy" }),
    getCircuitStates: jest.fn().mockReturnValue({}),
    isHealthy: jest.fn().mockReturnValue(true),
  },
}));

jest.mock("@stellar/stellar-sdk", () => ({
  Networks: { TESTNET: "Test SDF Network ; September 2015" },
  BASE_FEE: "100",
  Contract: jest.fn().mockImplementation(() => ({ call: jest.fn() })),
  TransactionBuilder: jest.fn().mockImplementation(() => ({
    addOperation: jest.fn().mockReturnThis(),
    setTimeout: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({ toXDR: () => "mock_xdr" }),
  })),
  Address: jest.fn().mockImplementation(() => ({ toScVal: jest.fn().mockReturnValue({}) })),
  nativeToScVal: jest.fn().mockReturnValue({}),
  xdr: { ScVal: { scvVec: jest.fn((arr) => ({ type: "vec", value: arr })) } },
  Keypair: { fromPublicKey: jest.fn() },
}));

jest.mock("../db/store", () => ({
  ...jest.requireActual("../db/store"),
  listLoans: jest.fn(),
  listCollateral: jest.fn(),
  listTransactions: jest.fn(),
}));

jest.mock("../webhooks", () => ({
  registerWebhook: jest.fn(),
  getWebhooks: jest.fn().mockReturnValue([]),
  getDeliveryLogs: jest.fn().mockReturnValue([]),
  fireWebhooks: jest.fn(),
}));

jest.mock("../utils/appraisalCache", () => ({
  getAppraisal: jest.fn(),
  setAppraisal: jest.fn(),
  invalidateAll: jest.fn(),
  configureCacheTTL: jest.fn(),
}));

jest.mock("../utils/alerting", () => ({ fireAlert: jest.fn() }));
jest.mock("../utils/alertRules", () => ({ rules: {} }));
jest.mock("../middleware/timeout", () => ({
  timeoutMiddleware: () => (_req: any, _res: any, next: any) => next(),
}));
jest.mock("../middleware/rateLimit", () => ({
  globalLimiter: (_req: any, _res: any, next: any) => next(),
  writeLimiter: (_req: any, _res: any, next: any) => next(),
}));

import { v1Router } from "./v1";
import * as store from "../db/store";

// ── Setup ─────────────────────────────────────────────────────────────────────

function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api/v1", v1Router);
  return app;
}

const mockListLoans = store.listLoans as jest.MockedFunction<typeof store.listLoans>;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Edge case tests — Issue #367", () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  // ── Empty dataset ──────────────────────────────────────────────────────────

  describe("GET /api/v1/loans — empty dataset", () => {
    beforeEach(() => {
      mockListLoans.mockReturnValue({ data: [], total: 0, page: 1, pageSize: 20 });
    });

    it("returns empty array and total=0 when no records exist", async () => {
      const res = await request(app).get("/api/v1/loans?page=1&pageSize=20");
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it("returns correct pagination metadata with empty dataset", async () => {
      const res = await request(app).get("/api/v1/loans?page=1&pageSize=20");
      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
      expect(res.body.pageSize).toBe(20);
    });
  });

  // ── Last page with fewer items than page size ──────────────────────────────

  describe("GET /api/v1/loans — last page partial results", () => {
    it("returns fewer items than pageSize on the last page", async () => {
      const partialPage = Array.from({ length: 5 }, (_, i) => ({
        id: String(i + 21),
        borrower: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
        collateral_id: "1",
        amount: 1000,
        createdAt: new Date().toISOString(),
        deletedAt: null,
      }));
      mockListLoans.mockReturnValue({ data: partialPage, total: 25, page: 2, pageSize: 20 });

      const res = await request(app).get("/api/v1/loans?page=2&pageSize=20");
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(5);
      expect(res.body.total).toBe(25);
      expect(res.body.page).toBe(2);
    });

    it("returns empty data array when page exceeds total pages", async () => {
      mockListLoans.mockReturnValue({ data: [], total: 10, page: 5, pageSize: 20 });

      const res = await request(app).get("/api/v1/loans?page=5&pageSize=20");
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.total).toBe(10);
    });
  });

  // ── pageSize above maximum returns 400 ────────────────────────────────────

  describe("GET /api/v1/loans — pageSize validation", () => {
    it("returns 400 when pageSize exceeds maximum of 100", async () => {
      const res = await request(app).get("/api/v1/loans?pageSize=101");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid pagination parameters");
    });

    it("returns 400 for pageSize=200", async () => {
      const res = await request(app).get("/api/v1/loans?pageSize=200");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid pagination parameters");
    });

    it("accepts pageSize=100 (boundary value)", async () => {
      mockListLoans.mockReturnValue({ data: [], total: 0, page: 1, pageSize: 100 });
      const res = await request(app).get("/api/v1/loans?pageSize=100");
      expect(res.status).toBe(200);
      expect(res.body.pageSize).toBe(100);
    });

    it("returns 400 for page=0", async () => {
      const res = await request(app).get("/api/v1/loans?page=0");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid pagination parameters");
    });

    it("returns 400 for negative page", async () => {
      const res = await request(app).get("/api/v1/loans?page=-1");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid pagination parameters");
    });
  });

  // ── Aggregation defaults for empty datasets ────────────────────────────────

  describe("store functions — aggregation defaults for empty dataset", () => {
    it("listLoans returns total=0 and empty data when store is empty", () => {
      const { listLoans: realListLoans } = jest.requireActual("../db/store") as typeof store;
      const result = realListLoans();
      expect(result.total).toBe(0);
      expect(result.data).toEqual([]);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it("listLoans returns sensible defaults when called with empty options", () => {
      const { listLoans: realListLoans } = jest.requireActual("../db/store") as typeof store;
      const result = realListLoans({});
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.page).toBeGreaterThanOrEqual(1);
      expect(result.pageSize).toBeGreaterThanOrEqual(1);
    });

    it("listTransactions returns total=0 and empty data for empty dataset", () => {
      const { listTransactions } = jest.requireActual("../db/store") as typeof store;
      const result = listTransactions();
      expect(result.total).toBe(0);
      expect(result.data).toEqual([]);
    });

    it("listCollateral returns empty array for empty dataset", () => {
      const { listCollateral } = jest.requireActual("../db/store") as typeof store;
      const result = listCollateral();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });
});
