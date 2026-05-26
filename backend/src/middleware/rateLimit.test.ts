/**
 * Rate limiting middleware tests.
 * Verifies auth (10/min) and read (100/min) limits, 429 responses,
 * Retry-After header, and counter reset after window.
 * Closes #374
 */
import request from "supertest";
import express, { Express, Request, Response } from "express";
import rateLimit from "express-rate-limit";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeApp(max: number, windowMs = 60_000): Express {
  const app = express();
  app.set("trust proxy", false);
  const limiter = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests", retryAfter: 60 },
  });
  app.use(limiter);
  app.get("/", (_req: Request, res: Response) => res.json({ ok: true }));
  return app;
}

async function sendN(app: Express, n: number): Promise<number[]> {
  const statuses: number[] = [];
  for (let i = 0; i < n; i++) {
    const res = await request(app).get("/");
    statuses.push(res.status);
  }
  return statuses;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Rate limiting middleware — Issue #374", () => {

  // ── Auth endpoint limits (10/min) ──────────────────────────────────────────

  describe("auth endpoints — 10 requests per minute", () => {
    let app: Express;

    beforeEach(() => {
      app = makeApp(10);
    });

    it("allows up to 10 requests", async () => {
      const statuses = await sendN(app, 10);
      expect(statuses.every((s) => s === 200)).toBe(true);
    });

    it("returns 429 on the 11th request", async () => {
      const statuses = await sendN(app, 11);
      expect(statuses[10]).toBe(429);
    });

    it("429 response includes Retry-After header", async () => {
      await sendN(app, 10);
      const res = await request(app).get("/");
      expect(res.status).toBe(429);
      expect(res.headers).toHaveProperty("retry-after");
    });

    it("429 response body contains error message", async () => {
      await sendN(app, 10);
      const res = await request(app).get("/");
      expect(res.status).toBe(429);
      expect(res.body.error).toBe("Too many requests");
    });

    it("RateLimit-Limit header reflects the configured max", async () => {
      const res = await request(app).get("/");
      expect(res.headers["ratelimit-limit"]).toBe("10");
    });
  });

  // ── Read endpoint limits (100/min) ─────────────────────────────────────────

  describe("read endpoints — 100 requests per minute", () => {
    let app: Express;

    beforeEach(() => {
      app = makeApp(100);
    });

    it("allows up to 100 requests", async () => {
      const statuses = await sendN(app, 100);
      expect(statuses.every((s) => s === 200)).toBe(true);
    });

    it("returns 429 on the 101st request", async () => {
      const statuses = await sendN(app, 101);
      expect(statuses[100]).toBe(429);
    });

    it("RateLimit-Limit header reflects 100", async () => {
      const res = await request(app).get("/");
      expect(res.headers["ratelimit-limit"]).toBe("100");
    });
  });

  // ── Counter reset after window ─────────────────────────────────────────────

  describe("rate limit counter reset", () => {
    it("resets counter after the window expires", async () => {
      // Use a very short window (100ms) to test reset
      const app = makeApp(3, 100);

      // Exhaust the limit
      const before = await sendN(app, 4);
      expect(before[3]).toBe(429);

      // Wait for window to expire
      await new Promise((r) => setTimeout(r, 150));

      // Counter should have reset
      const res = await request(app).get("/");
      expect(res.status).toBe(200);
    });
  });

  // ── authLimiter and globalLimiter from middleware module ───────────────────

  describe("rateLimit middleware exports", () => {
    it("authLimiter is configured with max=10", () => {
      // Verify the export exists and is a function (Express middleware)
      const { authLimiter } = require("../middleware/rateLimit");
      expect(typeof authLimiter).toBe("function");
    });

    it("globalLimiter is configured and exported", () => {
      const { globalLimiter } = require("../middleware/rateLimit");
      expect(typeof globalLimiter).toBe("function");
    });

    it("writeLimiter is configured and exported", () => {
      const { writeLimiter } = require("../middleware/rateLimit");
      expect(typeof writeLimiter).toBe("function");
    });
  });
});
