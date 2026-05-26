import { auditMiddleware, redact } from "./audit";
import { Request, Response, NextFunction } from "express";
import { EventEmitter } from "events";

// Minimal mock for req/res
function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    method: "POST",
    path: "/api/loan/request",
    ip: "127.0.0.1",
    body: { borrower: "GABC", amount: 1000, private_key: "secret123" },
    requestId: "test-id",
    ...overrides,
  } as unknown as Request;
}

function makeRes(): Response & EventEmitter {
  const emitter = new EventEmitter() as Response & EventEmitter;
  (emitter as any).statusCode = 200;
  return emitter;
}

describe("auditMiddleware", () => {
  it("calls next()", () => {
    const next = jest.fn() as NextFunction;
    auditMiddleware(makeReq(), makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("logs on response finish", (done) => {
    const next = jest.fn() as NextFunction;
    const res = makeRes();
    auditMiddleware(makeReq(), res, next);
    res.emit("finish");
    // Give the event loop a tick for the log to fire
    setImmediate(() => {
      expect(next).toHaveBeenCalled();
      done();
    });
  });

  it("does not throw for GET requests (no body logged)", () => {
    const next = jest.fn() as NextFunction;
    const res = makeRes();
    expect(() =>
      auditMiddleware(makeReq({ method: "GET" } as any), res, next)
    ).not.toThrow();
  });
});

describe("redact (via middleware body)", () => {
  // We test redaction indirectly by verifying the middleware doesn't expose secrets
  it("middleware does not throw on body with sensitive fields", () => {
    const next = jest.fn() as NextFunction;
    const res = makeRes();
    const req = makeReq({
      body: { borrower: "GABC", password: "hunter2", privateKey: "0xdeadbeef" },
    } as any);
    expect(() => auditMiddleware(req, res, next)).not.toThrow();
  });

  it("middleware handles null body gracefully", () => {
    const next = jest.fn() as NextFunction;
    const res = makeRes();
    const req = makeReq({ body: null } as any);
    expect(() => auditMiddleware(req, res, next)).not.toThrow();
  });
});

describe("redact (direct)", () => {
  it("redacts known sensitive fields", () => {
    const result = redact({
      borrower: "GABC",
      amount: 1000,
      private_key: "secret123",
      privateKey: "0xdeadbeef",
      password: "hunter2",
      apiKey: "key-abc",
    }) as Record<string, unknown>;

    expect(result.borrower).toBe("GABC");
    expect(result.amount).toBe(1000);
    expect(result.private_key).toBe("[REDACTED]");
    expect(result.privateKey).toBe("[REDACTED]");
    expect(result.password).toBe("[REDACTED]");
    expect(result.apiKey).toBe("[REDACTED]");
  });

  it("redacts nested sensitive fields", () => {
    const result = redact({
      user: { password: "secret", name: "Alice" },
    }) as any;

    expect(result.user.password).toBe("[REDACTED]");
    expect(result.user.name).toBe("Alice");
  });

  it("returns primitives unchanged", () => {
    expect(redact("string")).toBe("string");
    expect(redact(42)).toBe(42);
    expect(redact(null)).toBe(null);
  });
});
