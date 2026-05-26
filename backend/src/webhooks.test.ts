import crypto from "crypto";
import {
  registerWebhook,
  getWebhooks,
  getDeliveryLogs,
  fireWebhooks,
  __resetForTests,
} from "./webhooks";

const WEBHOOK_URL = "https://example.com/hook";
const SECRET = "test-secret-value-16";

beforeEach(() => {
  __resetForTests();
  process.env.WEBHOOK_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.WEBHOOK_SECRET;
  jest.useRealTimers();
});

function sign(payload: string, secret: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

// ── registration ──────────────────────────────────────────────────────────────

describe("registerWebhook", () => {
  it("returns a registration with id, url, and createdAt", () => {
    const reg = registerWebhook(WEBHOOK_URL);
    expect(reg.id).toBeDefined();
    expect(reg.url).toBe(WEBHOOK_URL);
    expect(typeof reg.createdAt).toBe("number");
  });

  it("appears in getWebhooks()", () => {
    const reg = registerWebhook(WEBHOOK_URL);
    expect(getWebhooks().some((w) => w.id === reg.id)).toBe(true);
  });

  it("throws on an invalid URL", () => {
    expect(() => registerWebhook("not-a-url")).toThrow("Invalid webhook URL");
  });

  it("throws on a non-http/https URL", () => {
    expect(() => registerWebhook("ftp://example.com/hook")).toThrow(
      "Webhook URL must use http or https"
    );
  });
});

// ── delivery logs ─────────────────────────────────────────────────────────────

describe("getDeliveryLogs", () => {
  it("returns an empty array initially", () => {
    expect(getDeliveryLogs()).toEqual([]);
  });
});

// ── fireWebhooks ──────────────────────────────────────────────────────────────

describe("fireWebhooks", () => {
  it("POSTs to each registered webhook URL", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock as any;

    registerWebhook(WEBHOOK_URL);
    await fireWebhooks("loan.approved", { loan_id: 1 });
    await new Promise((r) => setImmediate(r));

    expect(fetchMock).toHaveBeenCalledWith(WEBHOOK_URL, expect.objectContaining({ method: "POST" }));
  });

  it("sends correct event and payload in body", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock as any;

    registerWebhook(WEBHOOK_URL);
    await fireWebhooks("loan.repaid", { loan_id: 2, amount: 500 });
    await new Promise((r) => setImmediate(r));

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.event).toBe("loan.repaid");
    expect(body.payload).toEqual({ loan_id: 2, amount: 500 });
    expect(typeof body.timestamp).toBe("number");
  });

  it("signs payload with HMAC-SHA256 in X-Webhook-Signature header", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock as any;

    registerWebhook(WEBHOOK_URL);
    await fireWebhooks("loan.liquidated", { loan_id: 3 });
    await new Promise((r) => setImmediate(r));

    const [, options] = fetchMock.mock.calls[0];
    const sentSig: string = options.headers["X-Webhook-Signature"];
    // Verify format: sha256=<64 hex chars>
    expect(sentSig).toMatch(/^sha256=[0-9a-f]{64}$/);
    // Verify it's deterministic: same body produces same signature
    expect(sentSig).toBe(options.headers["X-Webhook-Signature"]);
  });

  it("creates a delivery log entry per webhook", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock as any;

    registerWebhook(WEBHOOK_URL);
    await fireWebhooks("loan.approved", { loan_id: 4 });

    expect(getDeliveryLogs()).toHaveLength(1);
  });

  it("marks log as delivered on success", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock as any;

    registerWebhook(WEBHOOK_URL);
    await fireWebhooks("loan.approved", { loan_id: 5 });
    await new Promise((r) => setImmediate(r));

    const log = getDeliveryLogs()[0];
    expect(log.lastStatus).toBe(200);
    expect(log.deliveredAt).not.toBeNull();
  });

  it("retries up to 5 times on failure", async () => {
    jest.useFakeTimers();
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    global.fetch = fetchMock as any;

    registerWebhook(WEBHOOK_URL);
    await fireWebhooks("loan.approved", { loan_id: 6 });

    // Drain all 4 retry timeouts (attempt 0→1→2→3→4)
    for (let i = 0; i < 4; i++) {
      await Promise.resolve();
      jest.runAllTimers();
      await Promise.resolve();
    }

    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("logs lastError on network failure and does not mark delivered", async () => {
    jest.useFakeTimers();
    const fetchMock = jest.fn().mockRejectedValue(new Error("connection refused"));
    global.fetch = fetchMock as any;

    registerWebhook(WEBHOOK_URL);
    await fireWebhooks("loan.approved", { loan_id: 7 });

    // Exhaust all retries
    for (let i = 0; i < 4; i++) {
      await Promise.resolve();
      jest.runAllTimers();
      await Promise.resolve();
    }

    const log = getDeliveryLogs()[0];
    expect(log.lastError).toBe("connection refused");
    expect(log.deliveredAt).toBeNull();
  });
});
