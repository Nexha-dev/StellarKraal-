/**
 * API v1 router — all application routes are mounted here.
 * Accessed via /api/v1/...
 */
import { Router, Request, Response, NextFunction } from "express";
import {
  Contract,
  TransactionBuilder,
  BASE_FEE,
  Address,
  nativeToScVal,
  xdr,
  Networks,
} from "@stellar/stellar-sdk";
import { z } from "zod";
import { config } from "../config";
import { pool } from "../utils/connectionPool";
import { getAppraisal, setAppraisal, invalidateAll } from "../utils/appraisalCache";
import { asyncHandler } from "../utils/asyncHandler";
import { stellarPublicKeySchema } from "../validators/stellar";
import { registerWebhook, getWebhooks, getDeliveryLogs, fireWebhooks } from "../webhooks";
import { timeoutMiddleware } from "../middleware/timeout";
import { writeLimiter } from "../middleware/rateLimit";
import { fireAlert } from "../utils/alerting";
import { rules } from "../utils/alertRules";
import rpcClient from "../utils/rpcClient";
import { listLoans } from "../db/store";
const CONTRACT_ID = process.env.CONTRACT_ID || "";
const NETWORK_PASSPHRASE =
  config.NEXT_PUBLIC_NETWORK === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;

const APP_VERSION = process.env.npm_package_version || "1.0.0";
const startTime = Date.now();

// ── Validation Schemas ────────────────────────────────────────────────────────

const registerCollateralSchema = z.object({
  owner: stellarPublicKeySchema,
  animal_type: z.string().min(1),
  count: z.number().int().positive(),
  appraised_value: z.number().int().positive(),
});

const loanRequestSchema = z.object({
  borrower: stellarPublicKeySchema,
  collateral_ids: z.array(z.number().int().nonnegative()).min(1),
  amount: z.number().int().positive(),
});

const loanRepaySchema = z.object({
  borrower: stellarPublicKeySchema,
  loan_id: z.number().int().nonnegative(),
  amount: z.number().int().positive(),
});

const loanLiquidateSchema = z.object({
  liquidator: stellarPublicKeySchema,
  loan_id: z.number().int().nonnegative(),
  repay_amount: z.number().int().positive(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

// ── helpers ───────────────────────────────────────────────────────────────────

async function buildContractTx(
  sourceAddress: string,
  method: string,
  args: xdr.ScVal[]
): Promise<string> {
  const account = await rpcClient.getAccount(sourceAddress) as any;
  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();
  const prepared = await rpcClient.prepareTransaction(tx) as any;
  return prepared.toXDR();
}

// ── Router ────────────────────────────────────────────────────────────────────

const v1Router = Router();

// Version envelope middleware — adds api_version to every response
v1Router.use((_req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return originalJson({ api_version: "v1", ...(body as object) });
    }
    return originalJson(body);
  };
  next();
});

// GET /health
v1Router.get("/health", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    let rpcReachable = false;
    try {
      await pool.run((s) => s.getHealth());
      rpcReachable = true;
    } catch {
      // degraded
    }
    res.status(rpcReachable ? 200 : 503).json({
      status: rpcReachable ? "healthy" : "degraded",
      version: APP_VERSION,
      uptime,
      rpcReachable,
      pool: pool.stats(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /collateral/register
v1Router.post(
  "/collateral/register",
  timeoutMiddleware(parseInt(config.TIMEOUT_WRITE_MS, 10)),
  writeLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const validation = registerCollateralSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Validation failed", details: validation.error.issues });
    }
    const { owner, animal_type, count, appraised_value } = validation.data;
    const xdrTx = await buildContractTx(owner, "register_livestock", [
      new Address(owner).toScVal(),
      nativeToScVal(animal_type, { type: "symbol" }),
      nativeToScVal(count, { type: "u32" }),
      nativeToScVal(BigInt(appraised_value), { type: "i128" }),
    ]);
    res.json({ xdr: xdrTx });
  })
);

// POST /loan/request
v1Router.post(
  "/loan/request",
  timeoutMiddleware(parseInt(config.TIMEOUT_WRITE_MS, 10)),
  writeLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const validation = loanRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Validation failed", details: validation.error.issues });
    }
    const { borrower, collateral_ids, amount } = validation.data;
    const idsScVal = xdr.ScVal.scvVec(collateral_ids.map(id => nativeToScVal(BigInt(id), { type: "u64" })));
    const xdrTx = await buildContractTx(borrower, "request_loan", [
      new Address(borrower).toScVal(),
      idsScVal,
      nativeToScVal(BigInt(amount), { type: "i128" }),
    ]);
    fireWebhooks("loan.approved", { borrower, collateral_ids, amount });
    res.json({ xdr: xdrTx });
  })
);

// POST /loan/repay
v1Router.post(
  "/loan/repay",
  timeoutMiddleware(parseInt(config.TIMEOUT_WRITE_MS, 10)),
  writeLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const validation = loanRepaySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Validation failed", details: validation.error.issues });
    }
    const { borrower, loan_id, amount } = validation.data;
    const xdrTx = await buildContractTx(borrower, "repay_loan", [
      new Address(borrower).toScVal(),
      nativeToScVal(BigInt(loan_id), { type: "u64" }),
      nativeToScVal(BigInt(amount), { type: "i128" }),
    ]);
    fireWebhooks("loan.repaid", { borrower, loan_id, amount });
    res.json({ xdr: xdrTx });
  })
);

// POST /loan/liquidate
v1Router.post(
  "/loan/liquidate",
  timeoutMiddleware(parseInt(config.TIMEOUT_WRITE_MS, 10)),
  writeLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const validation = loanLiquidateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Validation failed", details: validation.error.issues });
    }
    const { liquidator, loan_id, repay_amount } = validation.data;
    const xdrTx = await buildContractTx(liquidator, "liquidate", [
      new Address(liquidator).toScVal(),
      nativeToScVal(BigInt(loan_id), { type: "u64" }),
      nativeToScVal(BigInt(repay_amount), { type: "i128" }),
    ]);
    fireWebhooks("loan.liquidated", { liquidator, loan_id, repay_amount });
    res.json({ xdr: xdrTx });
  })
);

// GET /loan/:id
v1Router.get("/loan/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contract = new Contract(CONTRACT_ID);
    const account = await rpcClient.getAccount(
      "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN"
    ) as any;
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call("get_loan", nativeToScVal(BigInt(req.params.id as string), { type: "u64" })))
      .setTimeout(30)
      .build();
    const result = await rpcClient.simulateTransaction(tx);
    res.json({ result: (result as any).result?.retval });
  } catch (err) {
    next(err);
  }
});

// GET /health/:loanId
v1Router.get("/health/:loanId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contract = new Contract(CONTRACT_ID);
    const account = await rpcClient.getAccount(
      "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN"
    ) as any;
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call("health_factor", nativeToScVal(BigInt(req.params.loanId as string), { type: "u64" }))
      )
      .setTimeout(30)
      .build();
    const result = await rpcClient.simulateTransaction(tx);
    res.json({ health_factor: (result as any).result?.retval });
  } catch (err) {
    next(err);
  }
});

// GET /loans - List loans with pagination
v1Router.get("/loans", asyncHandler(async (req: Request, res: Response) => {
  const validation = paginationSchema.safeParse(req.query);
  if (!validation.success) {
    return res.status(400).json({ error: "Invalid pagination parameters", details: validation.error.issues });
  }

  const { page, pageSize } = validation.data;

  // Add deprecation warning header for unpaginated usage
  if (!req.query.page && !req.query.pageSize) {
    res.set("Deprecation", "true");
    res.set("Sunset", new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString());
    res.set("Warning", '299 - "Unpaginated loan listing is deprecated. Use ?page=1&pageSize=20 parameters."');
  }

  const result = listLoans({ page, pageSize });
  res.json({
    data: result.data,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  });
}));

// POST /oracle/price-update
v1Router.post(
  "/oracle/price-update",
  timeoutMiddleware(parseInt(config.TIMEOUT_WRITE_MS, 10)),
  (_req: Request, res: Response) => {
    invalidateAll();
    res.json({ invalidated: true });
  }
);

// POST /webhooks
v1Router.post(
  "/webhooks",
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
  }
);

// GET /admin/webhooks
v1Router.get("/admin/webhooks", (_req: Request, res: Response) => {
  res.json(getWebhooks());
});

// GET /admin/webhooks/logs
v1Router.get("/admin/webhooks/logs", (_req: Request, res: Response) => {
  res.json(getDeliveryLogs());
});

/**
 * POST /alerts/webhook
 * Receiver for AWS SNS notifications (specifically for BACKUP_JOB_FAILED)
 */
v1Router.post("/alerts/webhook", async (req: Request, res: Response) => {
  const body = req.body;

  // Handle SNS subscription confirmation
  if (req.header("x-amz-sns-message-type") === "SubscriptionConfirmation") {
    const subscribeUrl = body.SubscribeURL;
    if (subscribeUrl) {
      await fetch(subscribeUrl);
      return res.status(200).send("Subscribed");
    }
  }

  // Handle actual notification
  if (req.header("x-amz-sns-message-type") === "Notification") {
    try {
      const message = JSON.parse(body.Message);
      // Check if it's a backup failure event
      if (message["detail-type"] === "Backup Job State Change" && message.detail.state === "FAILED") {
        await fireAlert(rules.backupFailure, "AWS Backup job failed", {
          backupJobId: message.detail.backupJobId,
          resourceArn: message.detail.resourceArn,
        });
      }
    } catch (err) {
      // Not a JSON message or different format
    }
  }

  res.status(200).send("OK");
});

export { v1Router, startTime, APP_VERSION };

// ── User Settings ─────────────────────────────────────────────────────────────

const settingsSchema = z.object({
  notifications: z.object({
    loanApproved: z.boolean(),
    loanRepaid: z.boolean(),
    liquidationWarning: z.boolean(),
  }).optional(),
  language: z.string().min(2).max(10).optional(),
  currency: z.string().min(3).max(6).optional(),
});

type UserSettings = z.infer<typeof settingsSchema> & {
  walletAddress: string;
  joinDate: string;
};

// In-memory store (replace with DB persistence in production)
const settingsStore = new Map<string, UserSettings>();

v1Router.get("/settings/:wallet", (req: Request, res: Response) => {
  const wallet = req.params.wallet as string;
  const existing = settingsStore.get(wallet);
  if (!existing) {
    // Return defaults for new users
    return res.json({
      walletAddress: wallet,
      joinDate: new Date().toISOString(),
      notifications: { loanApproved: true, loanRepaid: true, liquidationWarning: true },
      language: "en",
      currency: "USD",
    });
  }
  res.json(existing);
});

v1Router.put("/settings/:wallet", (req: Request, res: Response) => {
  const wallet = req.params.wallet as string;
  const validation = settingsSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: "Validation failed", details: validation.error.issues });
  }
  const existing = settingsStore.get(wallet) ?? {
    walletAddress: wallet,
    joinDate: new Date().toISOString(),
    notifications: { loanApproved: true, loanRepaid: true, liquidationWarning: true },
    language: "en",
    currency: "USD",
  };
  const updated: UserSettings = { ...existing, ...validation.data };
  settingsStore.set(wallet, updated);
  res.json(updated);
});
