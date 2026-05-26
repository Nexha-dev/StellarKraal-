import rateLimit from "express-rate-limit";
import { config } from "../config";

const windowMs = 60 * 1000; // 1 minute

export const authLimiter = rateLimit({
  windowMs,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests", retryAfter: 60 },
});

export const globalLimiter = rateLimit({
  windowMs,
  max: parseInt(config.RATE_LIMIT_GLOBAL, 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests", retryAfter: 60 },
});

export const writeLimiter = rateLimit({
  windowMs,
  max: parseInt(config.RATE_LIMIT_WRITE, 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests", retryAfter: 60 },
});
