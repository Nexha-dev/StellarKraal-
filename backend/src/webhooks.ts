import crypto from "crypto";

export interface WebhookRegistration {
  id: string;
  url: string;
  createdAt: number;
}

export interface DeliveryLog {
  webhookId: string;
  event: string;
  payload: object;
  attempts: number;
  lastStatus: number | null;
  lastError: string | null;
  deliveredAt: number | null;
}

// In-memory stores (replace with DB in production)
const webhooks = new Map<string, WebhookRegistration>();
const deliveryLogs: DeliveryLog[] = [];

/** Reset in-memory state — for use in tests only. */
export function __resetForTests(): void {
  webhooks.clear();
  deliveryLogs.length = 0;
}

export function registerWebhook(url: string): WebhookRegistration {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid webhook URL");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Webhook URL must use http or https");
  }
  const id = crypto.randomUUID();
  const reg: WebhookRegistration = { id, url, createdAt: Date.now() };
  webhooks.set(id, reg);
  return reg;
}

export function getWebhooks(): WebhookRegistration[] {
  return Array.from(webhooks.values());
}

export function getDeliveryLogs(): DeliveryLog[] {
  return deliveryLogs;
}

function sign(payload: string): string {
  const secret = process.env.WEBHOOK_SECRET ?? "default-webhook-secret-change-me";
  return "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function fireWebhooks(event: string, payload: object): Promise<void> {
  const body = JSON.stringify({ event, payload, timestamp: Date.now() });
  const signature = sign(body);

  for (const wh of webhooks.values()) {
    const log: DeliveryLog = {
      webhookId: wh.id,
      event,
      payload,
      attempts: 0,
      lastStatus: null,
      lastError: null,
      deliveredAt: null,
    };
    deliveryLogs.push(log);
    deliver(wh.url, body, signature, log);
  }
}

async function deliver(
  url: string,
  body: string,
  signature: string,
  log: DeliveryLog,
  attempt = 0
): Promise<void> {
  const MAX_ATTEMPTS = 5;
  log.attempts = attempt + 1;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
      },
      body,
    });
    log.lastStatus = res.status;
    if (res.ok) {
      log.deliveredAt = Date.now();
      return;
    }
    log.lastError = `HTTP ${res.status}`;
  } catch (err: any) {
    log.lastError = err.message;
    log.lastStatus = null;
  }

  if (attempt + 1 < MAX_ATTEMPTS) {
    const delay = Math.pow(2, attempt) * 1000; // exponential backoff
    setTimeout(() => deliver(url, body, signature, log, attempt + 1), delay);
  }
}
