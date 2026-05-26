import logger from "./logger";

export type AlertSeverity = "warning" | "critical";

export interface AlertRule {
  id: string;
  name: string;
  severity: AlertSeverity;
  cooldownMs: number; // dedup window
  runbook: string;
  pagerduty?: boolean; // escalate to PagerDuty
}

const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;
const PAGERDUTY_KEY = process.env.PAGERDUTY_ROUTING_KEY;
const RUNBOOK_BASE =
  process.env.RUNBOOK_BASE_URL ||
  "https://github.com/michaelvic123/StellarKraal-/blob/main/docs/runbooks";

// in-memory dedup: ruleId -> last fired timestamp
const lastFired = new Map<string, number>();

function isCoolingDown(rule: AlertRule): boolean {
  const last = lastFired.get(rule.id);
  return last !== undefined && Date.now() - last < rule.cooldownMs;
}

async function sendSlack(rule: AlertRule, message: string, meta: object) {
  if (!SLACK_WEBHOOK) return;

  const color = rule.severity === "critical" ? "#dc2626" : "#ca8a04";
  const payload = {
    attachments: [
      {
        color,
        title: `[${rule.severity.toUpperCase()}] ${rule.name}`,
        text: message,
        fields: [
          { title: "Runbook", value: `${RUNBOOK_BASE}/${rule.runbook}`, short: false },
          ...Object.entries(meta).map(([k, v]) => ({
            title: k,
            value: String(v),
            short: true,
          })),
        ],
        footer: "StellarKraal Alerting",
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  try {
    await fetch(SLACK_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    logger.warn("Failed to send Slack alert", { error: (err as Error).message });
  }
}

async function sendPagerDuty(rule: AlertRule, message: string, meta: object) {
  if (!PAGERDUTY_KEY || !rule.pagerduty) return;

  const payload = {
    routing_key: PAGERDUTY_KEY,
    event_action: "trigger",
    dedup_key: rule.id,
    payload: {
      summary: `[${rule.name}] ${message}`,
      severity: "critical",
      source: "stellarkraal-backend",
      custom_details: { ...meta, runbook: `${RUNBOOK_BASE}/${rule.runbook}` },
    },
  };

  try {
    await fetch("https://events.pagerduty.com/v2/enqueue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    logger.warn("Failed to send PagerDuty alert", { error: (err as Error).message });
  }
}

export async function fireAlert(
  rule: AlertRule,
  message: string,
  meta: object = {}
) {
  if (isCoolingDown(rule)) return;

  lastFired.set(rule.id, Date.now());
  logger.error(`ALERT [${rule.id}]: ${message}`, { alertId: rule.id, ...meta });

  await Promise.all([
    sendSlack(rule, message, meta),
    sendPagerDuty(rule, message, meta),
  ]);
}
