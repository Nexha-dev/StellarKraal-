import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().regex(/^\d+$/, "PORT must be a valid number").default("3001"),
  RPC_URL: z.string().url("RPC_URL must be a valid URL"),
  CONTRACT_ID: z.string().min(1, "CONTRACT_ID is required"),
  NEXT_PUBLIC_NETWORK: z.enum(["testnet", "mainnet"]).default("testnet"),
  // Rate limiting (optional with defaults)
  RATE_LIMIT_GLOBAL: z.string().regex(/^\d+$/, "RATE_LIMIT_GLOBAL must be a number").default("60"),
  RATE_LIMIT_WRITE: z.string().regex(/^\d+$/, "RATE_LIMIT_WRITE must be a number").default("10"),
  // Request timeouts in milliseconds
  TIMEOUT_GLOBAL_MS: z.string().regex(/^\d+$/, "TIMEOUT_GLOBAL_MS must be a number").default("30000"),
  TIMEOUT_WRITE_MS: z.string().regex(/^\d+$/, "TIMEOUT_WRITE_MS must be a number").default("15000"),
  // Webhook secret
  WEBHOOK_SECRET: z.string().min(16, "WEBHOOK_SECRET must be at least 16 characters").optional(),
  // Admin key for webhook admin endpoints
  ADMIN_API_KEY: z.string().min(8, "ADMIN_API_KEY must be at least 8 characters").optional(),
  // Connection pool size
  POOL_MIN: z.string().regex(/^\d+$/, "POOL_MIN must be a number").default("2"),
  POOL_MAX: z.string().regex(/^\d+$/, "POOL_MAX must be a number").default("10"),
  // Appraisal cache TTL in milliseconds
  APPRAISAL_CACHE_TTL_MS: z.string().regex(/^\d+$/, "APPRAISAL_CACHE_TTL_MS must be a number").default("300000"),
  // JWT secret (min 32 chars recommended)
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters").optional(),
  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  // Frontend URL for CORS
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL").optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.issues.filter((i) => i.code === "invalid_type" && (i as any).received === "undefined");
  const invalid = parsed.error.issues.filter((i) => !(i.code === "invalid_type" && (i as any).received === "undefined"));

  const lines: string[] = ["\n❌ Environment validation failed\n"];
  if (missing.length > 0) {
    lines.push("Missing required variables:");
    missing.forEach((i) => lines.push(`  - ${i.path.join(".")}: ${i.message}`));
  }
  if (invalid.length > 0) {
    lines.push("\nInvalid variable values:");
    invalid.forEach((i) => lines.push(`  - ${i.path.join(".")}: ${i.message}`));
  }
  lines.push("\nPlease check your .env file or environment configuration.");
  lines.push("See env.example for reference.\n");
  process.stderr.write(lines.join("\n") + "\n");
  process.exit(1);
}

export const config = parsed.data;
