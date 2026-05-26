import { AlertRule } from "./alerting";

/**
 * Alert rules — version-controlled source of truth.
 * Cooldowns prevent alert fatigue; PagerDuty flag escalates critical issues.
 */
export const rules = {
  rpcFailure: {
    id: "rpc-failure",
    name: "RPC Failure",
    severity: "critical",
    cooldownMs: 5 * 60 * 1000, // 5 min
    runbook: "rpc-failure.md",
    pagerduty: false,
  },

  rpcCircuitOpen: {
    id: "rpc-circuit-open",
    name: "RPC Circuit Breaker Opened",
    severity: "critical",
    cooldownMs: 10 * 60 * 1000,
    runbook: "rpc-failure.md",
    pagerduty: false,
  },

  dbError: {
    id: "db-error",
    name: "Database Error",
    severity: "critical",
    cooldownMs: 5 * 60 * 1000,
    runbook: "db-error.md",
    pagerduty: false,
  },

  liquidationFailure: {
    id: "liquidation-failure",
    name: "Liquidation Engine Failure",
    severity: "critical",
    cooldownMs: 2 * 60 * 1000,
    runbook: "liquidation-failure.md",
    pagerduty: false,
  },

  fivexxSpike: {
    id: "5xx-spike",
    name: "5xx Error Spike",
    severity: "critical",
    cooldownMs: 60 * 1000, // 1 min — tight window for spike detection
    runbook: "5xx-spike.md",
    pagerduty: true, // escalate: >10/min threshold
  },

  backupFailure: {
    id: "backup-failure",
    name: "Database Backup Failed",
    severity: "critical",
    cooldownMs: 60 * 60 * 1000, // 1 hour cooldown
    runbook: "restore-procedure.md",
    pagerduty: true,
  },
} satisfies Record<string, AlertRule>;
