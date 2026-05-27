import "./config"; // validate env at startup
import { config } from "./config";
import express, { Request, Response, NextFunction } from "express";
import {
  runMigrations,
  getMigrationStatus,
  insertCollateral,
  listCollateral,
  getCollateral,
  softDeleteCollateral,
  restoreCollateral,
  listDeletedCollateral,
  insertLoan,
  listLoans,
  getLoan,
  softDeleteLoan,
  restoreLoan,
  listDeletedLoans,
  insertTransaction,
  listTransactions,
  getTransaction,
  updateTransaction,
  type TransactionType,
  type TransactionStatus,
} from "./db/store";
import { corsMiddleware } from "./middleware/cors";
import {
  Networks,
  TransactionBuilder,
  BASE_FEE,
  Contract,
  nativeToScVal,
  scValToNative,
  Address,
  xdr,
} from "@stellar/stellar-sdk";
import logger, { createRequestLogger } from "./utils/logger";
import { pool, PoolExhaustedError } from "./utils/connectionPool";
import { auditMiddleware } from "./middleware/audit";
import { authRouter, jwtMiddleware } from "./middleware/auth";
import { timeoutMiddleware } from "./middleware/timeout";
import {
  getAppraisal,
  setAppraisal,
  invalidateAll,
  configureCacheTTL,
} from "./utils/appraisalCache";
import { randomUUID } from "crypto";
import { z } from "zod";
import { globalLimiter, authLimiter } from "./middleware/rateLimit";
import { asyncHandler } from "./utils/asyncHandler";
import { stellarPublicKeySchema } from "./validators/stellar";
import rpcClient from "./utils/rpcClient";
import { registerWebhook, getWebhooks, getDeliveryLogs, fireWebhooks } from "./webhooks";
import { fireAlert } from "./utils/alerting";
import { rules } from "./utils/alertRules";
import {
  registry,
  httpRequestsTotal,
  httpRequestDurationSeconds,
  httpActiveConnections,
} from "./metrics";

// ── 5xx spike tracking (rolling 60s window) ───────────────────────────────────
const fivexxTimestamps: number[] = [];
const FIVEXX_WINDOW_MS = 60_000;
const FIVEXX_THRESHOLD = 10;

function track5xx() {
  const now = Date.now();
  fivexxTimestamps.push(now);
  // evict old entries
  while (fivexxTimestamps.length && fivexxTimestamps[0] < now - FIVEXX_WINDOW_MS) {
    fivexxTimestamps.shift();
  }
  if (fivexxTimestamps.length >= FIVEXX_THRESHOLD) {
    fireAlert(rules.fivexxSpike, `${fivexxTimestamps.length} 5xx errors in the last 60s`, {
      count: fivexxTimestamps.length,
      window: "60s",
    });
  }
}

// ── Idempotency cache (in-memory, 24h TTL) ───────────────────────────────────
interface IdempotencyEntry {
  status: number;
  body: unknown;
  createdAt: number;
}
const idempotencyCache = new Map<string, IdempotencyEntry>();
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
function getIdempotencyEntry(key: string): IdempotencyEntry | undefined {
  const entry = idempotencyCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.createdAt > IDEMPOTENCY_TTL_MS) {
    idempotencyCache.delete(key);
    return undefined;
  }
  return entry;
}
function setIdempotencyEntry(key: string, status: number, body: unknown): void {
  idempotencyCache.set(key, { status, body, createdAt: Date.now() });
}

const app = express();

// Secure CORS configuration
app.use(corsMiddleware);
app.use(express.json());
app.use(globalLimiter);
app.use(timeoutMiddleware(parseInt(config.TIMEOUT_GLOBAL_MS, 10)));

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = randomUUID();
  (req as any).requestId = requestId;
  (req as any).logger = createRequestLogger(requestId);
  res.setHeader("X-Request-ID", requestId);
  next();
});

// Shutdown middleware - reject new requests during graceful shutdown
let isShuttingDown = false;
app.use((req: Request, res: Response, next: NextFunction) => {
  if (isShuttingDown) {
    res.setHeader("Connection", "close");
    return res.status(503).json({
      error: "Server is shutting down",
      message: "Please retry your request",
    });
  }
  next();
});

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const reqLogger = (req as any).logger;
  reqLogger.info(`${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
  });
  next();
});

// Audit logging middleware — logs all requests with redacted body to audit log
app.use(auditMiddleware);

// ── Prometheus instrumentation middleware ─────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  httpActiveConnections.inc();
  const end = httpRequestDurationSeconds.startTimer();
  res.on("finish", () => {
    const route = (req.route?.path as string) ?? req.path;
    const labels = { method: req.method, route, status_code: String(res.statusCode) };
    httpRequestsTotal.inc(labels);
    end(labels);
    httpActiveConnections.dec();
  });
  next();
});

// ── Auth ──────────────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRouter);
app.use(jwtMiddleware);

// ── API Docs (Swagger UI) ─────────────────────────────────────────────────────
import swaggerUi from "swagger-ui-express";
import openApiSpec from "../openapi.json";
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

// ── API Versioning ────────────────────────────────────────────────────────────
import { v1Router } from "./routes/v1";

// Mount v1 routes
app.use("/api/v1", v1Router);

const CONTRACT_ID = process.env.CONTRACT_ID || "";
const NETWORK_PASSPHRASE =
  config.NEXT_PUBLIC_NETWORK === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;

const APP_VERSION = process.env.npm_package_version || "1.0.0";
const startTime = Date.now();

// Configure appraisal cache TTL from env
configureCacheTTL(parseInt(config.APPRAISAL_CACHE_TTL_MS, 10));

// Run DB migrations on startup (automatic in development, manual in production)
(async () => {
  try {
    await runMigrations();
  } catch (error) {
    logger.error("Failed to run migrations on startup", {
      error: error instanceof Error ? error.message : String(error),
    });
    // In production, fail fast if migrations haven't been run
    if (process.env.NODE_ENV === "production") {
      logger.error("Production startup aborted due to migration failure");
      process.exit(1);
    }
  }
})();

// ── Validation Schemas ────────────────────────────────────────────────────────

const registerCollateralSchema = z.object({
  owner: stellarPublicKeySchema,
  animal_type: z.string().min(1),
  count: z.number().int().positive(),
  appraised_value: z.number().int().positive(),
});

const loanRequestSchema = z.object({
  borrower: stellarPublicKeySchema,
  collateral_id: z.number().int().nonnegative(),
  amount: z.number().int().positive(),
});

const loanRepaySchema = z.object({
  borrower: stellarPublicKeySchema,
  loan_id: z.number().int().nonnegative(),
  amount: z.number().int().positive(),
});

const loanRepaymentPreviewSchema = z.object({
  loan_id: z.number().int().nonnegative(),
  amount: z.number().int().positive(),
});

type LoanPreviewShape = {
  principal: number;
  outstanding: number;
  collateral_value: number;
};

type FeeConfigShape = {
  interest_fee_bps: number;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeNativeScVal(value: unknown): unknown {
  if (value instanceof Map) {
    return Object.fromEntries(
      Array.from(value.entries()).map(([k, v]) => [
        String(k),
        normalizeNativeScVal(v),
      ]),
    );
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeNativeScVal(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        normalizeNativeScVal(v),
      ]),
    );
  }
  return value;
}

function parseLoanFromSimulation(retval: unknown): LoanPreviewShape {
  const fallbackValue = toNumber((retval as { value?: unknown })?.value);
  if (fallbackValue !== null) {
    return {
      principal: fallbackValue,
      outstanding: fallbackValue,
      collateral_value: fallbackValue,
    };
  }

  const native = normalizeNativeScVal(scValToNative(retval as xdr.ScVal));
  if (!native || typeof native !== "object") {
    throw new Error("Unable to decode loan record");
  }

  const n = native as Record<string, unknown>;
  const principal = toNumber(n.principal);
  const outstanding = toNumber(n.outstanding);
  const collateralValue = toNumber(n.collateral_value);

  if (principal === null || outstanding === null || collateralValue === null) {
    throw new Error("Loan record is missing numeric fields");
  }

  return {
    principal,
    outstanding,
    collateral_value: collateralValue,
  };
}

function parseFeeConfigFromSimulation(retval: unknown): FeeConfigShape | null {
  const native = normalizeNativeScVal(scValToNative(retval as xdr.ScVal));
  if (!native || typeof native !== "object") {
    return null;
  }

  const n = native as Record<string, unknown>;
  const interestFeeBps = toNumber(n.interest_fee_bps);
  if (interestFeeBps === null) {
    return null;
  }

  return { interest_fee_bps: interestFeeBps };
}

// ── helpers ──────────────────────────────────────────────────────────────────
async function buildContractTx(
  sourceAddress: string,
  method: string,
  args: xdr.ScVal[],
): Promise<string> {
  const account = await rpcClient.getAccount(sourceAddress);
  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const prepared = await rpcClient.prepareTransaction(tx);
  return prepared.toXDR();
}

// ── routes ────────────────────────────────────────────────────────────────────

// GET /metrics - Prometheus metrics (token-protected)
app.get("/metrics", async (req: Request, res: Response) => {
  const token = process.env.METRICS_TOKEN;
  if (token) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${token}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }
  res.set("Content-Type", registry.contentType);
  res.end(await registry.metrics());
});

// GET /api/health - Health check endpoint
app.get(
  "/api/health",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uptime = Math.floor((Date.now() - startTime) / 1000);

      let rpcReachable = false;
      try {
        await pool.run((server) => server.getHealth());
        rpcReachable = true;
      } catch (error) {
        logger.warn("RPC health check failed", { error: (error as Error).message });
      }

      const circuitStates = rpcClient.getCircuitStates();
      const circuitHealthy = rpcClient.isHealthy();

      const healthData = {
        status: rpcReachable && circuitHealthy ? "healthy" : "degraded",
        version: APP_VERSION,
        uptime,
        rpcReachable,
        circuitBreaker: {
          healthy: circuitHealthy,
          states: circuitStates,
        },
        pool: pool.stats(),
      };

      res.status(rpcReachable && circuitHealthy ? 200 : 503).json(healthData);
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/collateral/register
app.post(
  "/api/collateral/register",
  timeoutMiddleware(parseInt(config.TIMEOUT_WRITE_MS, 10)),
  asyncHandler(async (req: Request, res: Response) => {
    const validation = registerCollateralSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.issues,
      });
    }

    const { owner, animal_type, count, appraised_value } = validation.data;
    const xdrTx = await buildContractTx(owner, "register_livestock", [
      new Address(owner).toScVal(),
      nativeToScVal(animal_type, { type: "symbol" }),
      nativeToScVal(count, { type: "u32" }),
      nativeToScVal(BigInt(appraised_value), { type: "i128" }),
    ]);
    res.json({ xdr: xdrTx });
  }),
);

// POST /api/loan/request
app.post(
  "/api/loan/request",
  timeoutMiddleware(parseInt(config.TIMEOUT_WRITE_MS, 10)),
  asyncHandler(async (req: Request, res: Response) => {
    const validation = loanRequestSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.issues,
      });
    }

    const { borrower, collateral_id, amount } = validation.data;
    const cacheKey = String(collateral_id);
    const cached = getAppraisal(cacheKey);

    if (!cached) {
      // No cached value — fetch appraised_value from request body and cache it
      const appraised_value: number | undefined = req.body.appraised_value;
      if (appraised_value !== undefined) {
        setAppraisal(cacheKey, appraised_value);
      }
    }

    const xdrTx = await buildContractTx(borrower, "request_loan", [
      new Address(borrower).toScVal(),
      nativeToScVal(BigInt(collateral_id), { type: "u64" }),
      nativeToScVal(BigInt(amount), { type: "i128" }),
    ]);
    fireWebhooks("loan.approved", { borrower, collateral_id, amount });
    res.json({ xdr: xdrTx, ...(cached?.stale ? { stale: true } : {}) });
  }),
);

// POST /api/loan/repay
app.post(
  "/api/loan/repay",
  timeoutMiddleware(parseInt(config.TIMEOUT_WRITE_MS, 10)),
  asyncHandler(async (req: Request, res: Response) => {
    const idempotencyKey = req.headers["idempotency-key"] as string | undefined;
    if (!idempotencyKey) {
      return res.status(400).json({
        error: "Idempotency-Key header is required for repay requests",
      });
    }

    const cached = getIdempotencyEntry(idempotencyKey);
    if (cached) {
      res.setHeader("X-Idempotent-Replayed", "true");
      return res.status(cached.status).json(cached.body);
    }

    const validation = loanRepaySchema.safeParse(req.body);
    if (!validation.success) {
      const body = {
        error: "Validation failed",
        details: validation.error.issues,
      };
      setIdempotencyEntry(idempotencyKey, 400, body);
      return res.status(400).json(body);
    }

    const { borrower, loan_id, amount } = validation.data;
    const xdrTx = await buildContractTx(borrower, "repay_loan", [
      new Address(borrower).toScVal(),
      nativeToScVal(BigInt(loan_id), { type: "u64" }),
      nativeToScVal(BigInt(amount), { type: "i128" }),
    ]);
    const body = { xdr: xdrTx };
    setIdempotencyEntry(idempotencyKey, 200, body);
    fireWebhooks("loan.repaid", { borrower, loan_id, amount });
    res.json(body);
  }),
);

// POST /api/loan/repayment-preview
app.post(
  "/api/loan/repayment-preview",
  asyncHandler(async (req: Request, res: Response) => {
    const validation = loanRepaymentPreviewSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.issues,
      });
    }

    const { loan_id, amount } = validation.data;
    const contract = new Contract(CONTRACT_ID);
    const account = await rpcClient.getAccount(
      "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
    );

    const loanTx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          "get_loan",
          nativeToScVal(BigInt(loan_id), { type: "u64" }),
        ),
      )
      .setTimeout(30)
      .build();

    const loanResult = await rpcClient.simulateTransaction(loanTx);
    const parsed = parseLoanFromSimulation((loanResult as any).result?.retval);

    // Fetch dynamic fee config; fallback keeps preview resilient if read fails.
    let interestFeeBps = 1000;
    try {
      const feeTx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call("get_fee_config"))
        .setTimeout(30)
        .build();
      const feeResult = await rpcClient.simulateTransaction(feeTx);
      const feeConfig = parseFeeConfigFromSimulation(
        (feeResult as any).result?.retval,
      );
      if (feeConfig) {
        interestFeeBps = feeConfig.interest_fee_bps;
      }
    } catch {
      // Preview remains available with sane default when fee config lookup fails.
    }

    const cappedRepayment = Math.min(amount, parsed.outstanding);
    const interestOutstanding = Math.max(
      parsed.outstanding - parsed.principal,
      0,
    );
    const interestPaid = Math.min(cappedRepayment, interestOutstanding);
    const principalPaid = cappedRepayment - interestPaid;
    const fees = Math.floor((interestPaid * interestFeeBps) / 10_000);
    const remainingBalance = Math.max(parsed.outstanding - cappedRepayment, 0);

    const projectedHealthFactorBps =
      remainingBalance === 0
        ? null
        : Math.floor(
            (parsed.collateral_value * 8000 * 10_000) /
              (remainingBalance * 10_000),
          );

    res.json({
      loan_id,
      repayment_amount: cappedRepayment,
      breakdown: {
        principal: principalPaid,
        interest: interestPaid,
        fees,
        remaining_balance: remainingBalance,
      },
      projected_health_factor_bps: projectedHealthFactorBps,
      fully_repaid: remainingBalance === 0,
    });
  }),
);

// GET /api/loans — paginated loan listing
// Deprecated: unpaginated usage will be removed in a future version.
app.get(
  "/api/loans",
  asyncHandler(async (req: Request, res: Response) => {
    const pageRaw = req.query.page !== undefined ? Number(req.query.page) : 1;
    const pageSizeRaw =
      req.query.pageSize !== undefined ? Number(req.query.pageSize) : 20;

    if (!Number.isInteger(pageRaw) || pageRaw < 1) {
      return res.status(400).json({ error: "page must be a positive integer" });
    }
    if (
      !Number.isInteger(pageSizeRaw) ||
      pageSizeRaw < 1 ||
      pageSizeRaw > 100
    ) {
      return res
        .status(400)
        .json({ error: "pageSize must be between 1 and 100" });
    }

    if (req.query.page === undefined) {
      res.setHeader("Deprecation", "true");
      res.setHeader(
        "Warning",
        '299 - "Unpaginated usage is deprecated; use ?page=1&pageSize=20"',
      );
    }

    // Placeholder: in production this would query a DB. Returns empty list with envelope.
    const total = 0;
    const data: unknown[] = [];
    res.json({ data, total, page: pageRaw, pageSize: pageSizeRaw });
  }),
);

// GET /api/loan/:id
app.get(
  "/api/loan/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contract = new Contract(CONTRACT_ID);
      const account = await rpcClient.getAccount(
        "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN", // fee-less read account
      );
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          contract.call(
            "get_loan",
            nativeToScVal(BigInt(req.params.id), { type: "u64" }),
          ),
        )
        .setTimeout(30)
        .build();

      const result = await rpcClient.simulateTransaction(tx);
      res.json({ result: (result as any).result?.retval });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/health/:loanId
app.get(
  "/api/health/:loanId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contract = new Contract(CONTRACT_ID);
      const account = await rpcClient.getAccount(
        "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
      );
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          contract.call(
            "health_factor",
            nativeToScVal(BigInt(req.params.loanId), { type: "u64" }),
          ),
        )
        .setTimeout(30)
        .build();

      const result = await rpcClient.simulateTransaction(tx);
      res.json({ health_factor: (result as any).result?.retval });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/oracle/price-update — invalidate appraisal cache on oracle update
app.post(
  "/api/oracle/price-update",
  timeoutMiddleware(parseInt(config.TIMEOUT_WRITE_MS, 10)),
  (req: Request, res: Response) => {
    invalidateAll();
    res.json({ invalidated: true });
  },
);

// ── webhook routes ────────────────────────────────────────────────────────────

// POST /api/webhooks — register a webhook URL
app.post(
  "/api/webhooks",
  timeoutMiddleware(parseInt(config.TIMEOUT_WRITE_MS, 10)),
  (req: Request, res: Response) => {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "url is required" });
    }
    try {
      return res.status(201).json(registerWebhook(url));
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  },
);

// GET /api/admin/webhooks — list registered webhooks
app.get("/api/admin/webhooks", (req: Request, res: Response) => {
  res.json(getWebhooks());
});

// GET /api/admin/webhooks/logs — delivery logs
app.get("/api/admin/webhooks/logs", (req: Request, res: Response) => {
  res.json(getDeliveryLogs());
});

// GET /api/admin/migrations/status — migration status
app.get(
  "/api/admin/migrations/status",
  asyncHandler(async (req: Request, res: Response) => {
    const status = await getMigrationStatus();
    res.json({ status });
  }),
);

// ── soft-delete admin routes ──────────────────────────────────────────────────

// GET /api/admin/deleted/collateral — list soft-deleted collateral records
app.get("/api/admin/deleted/collateral", (req: Request, res: Response) => {
  res.json(listDeletedCollateral());
});

// POST /api/admin/restore/collateral/:id — restore a soft-deleted collateral record
app.post("/api/admin/restore/collateral/:id", (req: Request, res: Response) => {
  const ok = restoreCollateral(req.params.id);
  if (!ok)
    return res.status(404).json({ error: "Record not found or not deleted" });
  res.json({ restored: true, id: req.params.id });
});

// DELETE /api/collateral/:id — soft delete a collateral record
app.delete("/api/collateral/:id", (req: Request, res: Response) => {
  const ok = softDeleteCollateral(req.params.id);
  if (!ok) return res.status(404).json({ error: "Record not found" });
  res.json({ deleted: true, id: req.params.id });
});

// GET /api/admin/deleted/loans — list soft-deleted loan records
app.get("/api/admin/deleted/loans", (req: Request, res: Response) => {
  res.json(listDeletedLoans());
});

// POST /api/admin/restore/loans/:id — restore a soft-deleted loan record
app.post("/api/admin/restore/loans/:id", (req: Request, res: Response) => {
  const ok = restoreLoan(req.params.id);
  if (!ok)
    return res.status(404).json({ error: "Record not found or not deleted" });
  res.json({ restored: true, id: req.params.id });
});

// DELETE /api/loan/:id — soft delete a loan record
app.delete("/api/loan/:id", (req: Request, res: Response) => {
  const ok = softDeleteLoan(req.params.id);
  if (!ok) return res.status(404).json({ error: "Record not found" });
  res.json({ deleted: true, id: req.params.id });
});

// GET /api/transactions — transaction history with filtering, sorting, and pagination
app.get(
  "/api/transactions",
  asyncHandler(async (req: Request, res: Response) => {
    const borrower = req.query.borrower as string | undefined;
    const type = req.query.type as TransactionType | undefined;
    const status = req.query.status as TransactionStatus | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const pageRaw = req.query.page !== undefined ? Number(req.query.page) : 1;
    const pageSizeRaw = req.query.pageSize !== undefined ? Number(req.query.pageSize) : 20;

    if (!Number.isInteger(pageRaw) || pageRaw < 1) {
      return res.status(400).json({ error: "page must be a positive integer" });
    }
    if (!Number.isInteger(pageSizeRaw) || pageSizeRaw < 1 || pageSizeRaw > 100) {
      return res.status(400).json({ error: "pageSize must be between 1 and 100" });
    }

    // Validate date range if provided
    if (startDate && isNaN(new Date(startDate).getTime())) {
      return res.status(400).json({ error: "startDate must be a valid ISO date" });
    }
    if (endDate && isNaN(new Date(endDate).getTime())) {
      return res.status(400).json({ error: "endDate must be a valid ISO date" });
    }

    const result = listTransactions({
      borrower,
      type,
      status,
      startDate,
      endDate,
      page: pageRaw,
      pageSize: pageSizeRaw,
    });

    res.json(result);
  }),
);

// GET /api/transactions/:id — get transaction details
app.get(
  "/api/transactions/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const transaction = getTransaction(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    res.json(transaction);
  }),
);

// ── error handler ─────────────────────────────────────────────────────────────
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const reqLogger = (req as any).logger || logger;
  if (err instanceof PoolExhaustedError) {
    track5xx();
    fireAlert(rules.dbError, "Connection pool exhausted", { path: req.path });
    return res
      .status(503)
      .json({ error: "Service unavailable: connection pool exhausted" });
  }
  reqLogger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
  });
  track5xx();
  res.status(500).json({ error: err.message });
});

const PORT = parseInt(process.env.PORT || "3001", 10);
const httpServer = app.listen(PORT, () => {
  logger.info(`StellarKraal API running on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || "development",
    logLevel: process.env.LOG_LEVEL || "info",
  });
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────

const SHUTDOWN_TIMEOUT_MS = 30000; // 30 seconds

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn("Shutdown already in progress, ignoring signal", { signal });
    return;
  }

  isShuttingDown = true;
  logger.info(`Received ${signal}, starting graceful shutdown...`, { signal });

  // Stop accepting new connections
  httpServer.close(() => {
    logger.info("HTTP server closed, no longer accepting connections");
  });

  // Set a timeout to force shutdown if graceful shutdown takes too long
  const forceShutdownTimer = setTimeout(() => {
    logger.error("Graceful shutdown timeout exceeded, forcing exit", {
      timeoutMs: SHUTDOWN_TIMEOUT_MS,
    });
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  try {
    // Wait for in-flight requests to complete
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        const stats = pool.stats();
        if (stats.inUse === 0) {
          clearInterval(checkInterval);
          resolve();
        } else {
          logger.info("Waiting for in-flight requests to complete", {
            inUse: stats.inUse,
          });
        }
      }, 1000);
    });

    logger.info("All in-flight requests completed");

    // Close database connections
    pool.close();
    logger.info("Database connection pool closed");

    clearTimeout(forceShutdownTimer);
    logger.info("Graceful shutdown complete");
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown", {
      error: (error as Error).message,
    });
    clearTimeout(forceShutdownTimer);
    process.exit(1);
  }
}

// Register signal handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught errors
process.on("uncaughtException", (error: Error) => {
  logger.error("Uncaught exception", {
    error: error.message,
    stack: error.stack,
  });
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason: unknown) => {
  logger.error("Unhandled promise rejection", {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
  gracefulShutdown("unhandledRejection");
});

// Redirect unversioned routes to v1 with deprecation warning
app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  // Skip if already versioned or is auth/health
  if (req.path.startsWith("/api/v1") || req.path === "/api/health" || req.path.startsWith("/api/auth")) {
    return next();
  }

  const newPath = req.path.replace(/^\/api/, "/api/v1");
  res.setHeader("Deprecation", "true");
  res.setHeader("Warning", '299 - "Unversioned API routes are deprecated. Use /api/v1/ prefix."');
  res.redirect(301, newPath + (req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : ""));
});

export default app;
