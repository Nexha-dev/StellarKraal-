/**
 * Unit tests for API v1 router
 * Tests version envelope middleware and route mounting
 */
import request from "supertest";
import express, { Express } from "express";
import { v1Router } from "./v1";

jest.mock("../utils/logger", () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  createRequestLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock("@stellar/stellar-sdk", () => {
  const actual = jest.requireActual("@stellar/stellar-sdk");
  return {
    ...actual,
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
      build: jest.fn().mockReturnValue({ toXDR: () => "mock_xdr" }),
    })),
    Address: jest.fn().mockImplementation(() => ({
      toScVal: jest.fn().mockReturnValue({}),
    })),
    nativeToScVal: jest.fn().mockReturnValue({}),
    xdr: {
      ScVal: {
        scvVec: jest.fn((arr) => ({ type: "vec", value: arr })),
      },
    },
    SorobanRpc: {
      Server: jest.fn().mockImplementation(() => ({
        getAccount: jest.fn().mockResolvedValue({ id: "GABC", sequence: "1" }),
        prepareTransaction: jest.fn().mockResolvedValue({ toXDR: () => "prepared_xdr" }),
        simulateTransaction: jest.fn().mockResolvedValue({
          result: { retval: { value: 150 } },
        }),
        getHealth: jest.fn().mockResolvedValue({ status: "healthy" }),
      })),
    },
  };
});

describe("v1Router", () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use("/api/v1", v1Router);
  });

  describe("Version envelope middleware", () => {
    it("adds api_version to JSON responses", async () => {
      const res = await request(app).get("/api/v1/health");
      expect(res.body).toHaveProperty("api_version", "v1");
    });

    it("adds api_version to error responses", async () => {
      const res = await request(app).post("/api/v1/collateral/register").send({});
      expect(res.body).toHaveProperty("api_version", "v1");
      expect(res.body.error).toBe("Validation failed");
    });

    it("includes api_version in all endpoint responses", async () => {
      const endpoints = [
        { method: "get", path: "/api/v1/health" },
        { method: "get", path: "/api/v1/loan/1" },
        { method: "get", path: "/api/v1/health/1" },
      ];

      for (const endpoint of endpoints) {
        const res = await request(app)[endpoint.method](endpoint.path);
        expect(res.body).toHaveProperty("api_version", "v1");
      }
    });
  });

  describe("Route mounting", () => {
    it("mounts health endpoint at /health", async () => {
      const res = await request(app).get("/api/v1/health");
      expect(res.status).toBe(200);
    });

    it("mounts collateral registration at /collateral/register", async () => {
      const res = await request(app).post("/api/v1/collateral/register").send({});
      expect(res.status).toBe(400); // Validation error expected
    });

    it("mounts loan request at /loan/request", async () => {
      const res = await request(app).post("/api/v1/loan/request").send({});
      expect(res.status).toBe(400); // Validation error expected
    });

    it("mounts loan repay at /loan/repay", async () => {
      const res = await request(app).post("/api/v1/loan/repay").send({});
      expect(res.status).toBe(400); // Validation error expected
    });

    it("mounts loan liquidate at /loan/liquidate", async () => {
      const res = await request(app).post("/api/v1/loan/liquidate").send({});
      expect(res.status).toBe(400); // Validation error expected
    });
  });
});
