import { Request, Response, NextFunction } from "express";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";

// ── Sensitive fields to redact ────────────────────────────────────────────────
const REDACTED_FIELDS = new Set([
  "password", "secret", "private_key", "privatekey", "seed",
  "mnemonic", "token", "authorization", "api_key", "apikey",
  "secret_key", "secretkey", "signing_key", "signingkey",
]);

export function redact(obj: unknown, depth = 0): unknown {
  if (depth > 5 || obj === null || typeof obj !== "object") return obj;
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    result[k] = REDACTED_FIELDS.has(k.toLowerCase()) ? "[REDACTED]" : redact(v, depth + 1);
  }
  return result;
}

// ── Audit log transport (separate file with 30-day rotation) ──────────────────
const LOG_DIR = process.env.AUDIT_LOG_DIR || path.join(process.cwd(), "logs");

const auditTransport = new DailyRotateFile({
  dirname: LOG_DIR,
  filename: "audit-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxFiles: "30d",
  zippedArchive: true,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
});

const auditLogger = winston.createLogger({
  level: "info",
  transports: [auditTransport],
  // Also write to console in non-production for visibility
  ...(process.env.NODE_ENV !== "production" && {
    transports: [
      auditTransport,
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({ format: "HH:mm:ss" }),
          winston.format.printf(
            ({ timestamp, message, ...m }) =>
              `${timestamp} [AUDIT] ${message} ${JSON.stringify(m)}`
          )
        ),
      }),
    ],
  }),
});

// ── Middleware ────────────────────────────────────────────────────────────────
export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;

    auditLogger.info("api_request", {
      requestId: (req as any).requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      body: req.method !== "GET" ? redact(req.body) : undefined,
      ip: req.ip,
    });
  });

  next();
}

export { auditLogger };
