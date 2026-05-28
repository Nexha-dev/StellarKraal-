import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import {
  Networks,
  TransactionBuilder,
  BASE_FEE,
  Contract,
  nativeToScVal,
  Address,
  xdr,
} from "@stellar/stellar-sdk";
import { SorobanRpc } from "@stellar/stellar-sdk";
import { z } from "zod";
import { stellarPublicKeySchema } from "./validators/stellar";
import { asyncHandler } from "./utils/asyncHandler";
import logger from "./config/logger";
import { requestIdMiddleware } from "./middleware/requestId";
import { loggingMiddleware } from "./middleware/logging";
const { Server } = SorobanRpc;

const app = express();
app.use(cors());
app.use(express.json());
app.use(requestIdMiddleware);
app.use(loggingMiddleware);

const RPC_URL = process.env.RPC_URL || "https://soroban-testnet.stellar.org";
const CONTRACT_ID = process.env.CONTRACT_ID || "";
const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK === "mainnet"
    ? Networks.PUBLIC
    : Networks.TESTNET;

const server = new Server(RPC_URL);

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

// ── helpers ──────────────────────────────────────────────────────────────────
async function buildContractTx(
  sourceAddress: string,
  method: string,
  args: xdr.ScVal[]
): Promise<string> {
  const account = await server.getAccount(sourceAddress);
  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  return prepared.toXDR();
}

// ── routes ────────────────────────────────────────────────────────────────────

// POST /api/collateral/register
app.post("/api/collateral/register", asyncHandler(async (req: Request, res: Response) => {
  const validation = registerCollateralSchema.safeParse(req.body);
    
    if (!validation.success) {
      logger.warn("Validation failed for collateral registration", {
        requestId: req.requestId,
        errors: validation.error.errors,
      });
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors,
      });
    }

    const { owner, animal_type, count, appraised_value } = validation.data;
    logger.debug("Building collateral registration transaction", {
      requestId: req.requestId,
      owner,
      animal_type,
      count,
      appraised_value,
    });
    const xdrTx = await buildContractTx(owner, "register_livestock", [
      new Address(owner).toScVal(),
      nativeToScVal(animal_type, { type: "symbol" }),
      nativeToScVal(count, { type: "u32" }),
      nativeToScVal(BigInt(appraised_value), { type: "i128" }),
    ]);
    logger.info("Collateral registration transaction built successfully", {
      requestId: req.requestId,
      owner,
    });
    res.json({ xdr: xdrTx });
}));

// POST /api/loan/request
app.post("/api/loan/request", asyncHandler(async (req: Request, res: Response) => {
  const validation = loanRequestSchema.safeParse(req.body);
    
    if (!validation.success) {
      logger.warn("Validation failed for loan request", {
        requestId: req.requestId,
        errors: validation.error.errors,
      });
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors,
      });
    }

    const { borrower, collateral_id, amount } = validation.data;
    logger.debug("Building loan request transaction", {
      requestId: req.requestId,
      borrower,
      collateral_id,
      amount,
    });
    const xdrTx = await buildContractTx(borrower, "request_loan", [
      new Address(borrower).toScVal(),
      nativeToScVal(BigInt(collateral_id), { type: "u64" }),
      nativeToScVal(BigInt(amount), { type: "i128" }),
    ]);
    logger.info("Loan request transaction built successfully", {
      requestId: req.requestId,
      borrower,
      amount,
    });
    res.json({ xdr: xdrTx });
}));

// POST /api/loan/repay
app.post("/api/loan/repay", asyncHandler(async (req: Request, res: Response) => {
  const validation = loanRepaySchema.safeParse(req.body);
    
    if (!validation.success) {
      logger.warn("Validation failed for loan repayment", {
        requestId: req.requestId,
        errors: validation.error.errors,
      });
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors,
      });
    }

    const { borrower, loan_id, amount } = validation.data;
    logger.debug("Building loan repayment transaction", {
      requestId: req.requestId,
      borrower,
      loan_id,
      amount,
    });
    const xdrTx = await buildContractTx(borrower, "repay_loan", [
      new Address(borrower).toScVal(),
      nativeToScVal(BigInt(loan_id), { type: "u64" }),
      nativeToScVal(BigInt(amount), { type: "i128" }),
    ]);
    logger.info("Loan repayment transaction built successfully", {
      requestId: req.requestId,
      borrower,
      loan_id,
      amount,
    });
    res.json({ xdr: xdrTx });
}));

// GET /api/loan/:id
app.get("/api/loan/:id", asyncHandler(async (req: Request, res: Response) => {
  logger.debug("Fetching loan details", {
      requestId: req.requestId,
      loanId: req.params.id,
    });
    const contract = new Contract(CONTRACT_ID);
    const account = await server.getAccount(
      "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN" // fee-less read account
    );
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call("get_loan", nativeToScVal(BigInt(req.params.id), { type: "u64" }))
      )
      .setTimeout(30)
      .build();

    const result = await server.simulateTransaction(tx);
    logger.info("Loan details fetched successfully", {
      requestId: req.requestId,
      loanId: req.params.id,
    });
    res.json({ result: (result as any).result?.retval });
}));

// GET /api/health/:loanId
app.get("/api/health/:loanId", asyncHandler(async (req: Request, res: Response) => {
  logger.debug("Calculating health factor", {
      requestId: req.requestId,
      loanId: req.params.loanId,
    });
    const contract = new Contract(CONTRACT_ID);
    const account = await server.getAccount(
      "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN"
    );
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          "health_factor",
          nativeToScVal(BigInt(req.params.loanId), { type: "u64" })
        )
      )
      .setTimeout(30)
      .build();

    const result = await server.simulateTransaction(tx);
    logger.info("Health factor calculated successfully", {
      requestId: req.requestId,
      loanId: req.params.loanId,
    });
    res.json({ health_factor: (result as any).result?.retval });
}));

// ── error handler ─────────────────────────────────────────────────────────────
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === "production";
  
  logger.error("Request error", {
    requestId: req.requestId,
    error: err.message,
    statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  
  res.status(statusCode).json({
    error: statusCode === 500 && isProduction ? "Internal Server Error" : err.name || "Error",
    message: err.message,
    statusCode,
    ...(isProduction ? {} : { stack: err.stack })
  });
});

const PORT = parseInt(process.env.PORT || "3001", 10);
app.listen(PORT, () => {
  logger.info(`StellarKraal API running on port ${PORT}`, {
    port: PORT,
    nodeEnv: process.env.NODE_ENV || "development",
    logLevel: process.env.LOG_LEVEL || "info",
  });
});

export default app;
