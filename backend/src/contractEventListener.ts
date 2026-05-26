/**
 * Contract event listener for StellarKraal Soroban contract.
 * Polls the RPC for contract events and updates the local database.
 *
 * Events handled:
 * - livestock/registered  → upsert collateral record
 * - loan/requested        → upsert loan record
 * - loan/repaid           → update loan outstanding balance
 * - loan/liquidated       → update loan status to liquidated
 */

import { SorobanRpc, xdr } from "@stellar/stellar-sdk";
import logger from "./utils/logger";
import { insertCollateral, insertLoan, updateTransaction } from "./db/store";

const RPC_URL = process.env.RPC_URL || "https://soroban-testnet.stellar.org";
const CONTRACT_ID = process.env.CONTRACT_ID || "";
const POLL_INTERVAL_MS = parseInt(process.env.EVENT_POLL_INTERVAL_MS || "5000", 10);

let lastLedger = 0;
let pollTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Parse a contract event and update the local store accordingly.
 * @param event - Raw Soroban contract event from the RPC
 */
function handleEvent(event: SorobanRpc.Api.RawEventResponse): void {
  try {
    if (event.type !== "contract") return;

    const topics = event.topic.map((t) => xdr.ScVal.fromXDR(t, "base64"));
    if (topics.length < 2) return;

    const ns = topics[0].sym?.().toString();
    const action = topics[1].sym?.().toString();

    if (!ns || !action) return;

    const key = `${ns}/${action}`;
    logger.info("contract_event", { key, ledger: event.ledger });

    if (key === "livestock/registered") {
      // data: (id, owner, animal_type, count, appraised_value)
      const vals = xdr.ScVal.fromXDR(event.value, "base64").vec?.() ?? [];
      if (vals.length < 5) return;
      const id = vals[0].u64?.().toString() ?? "";
      const owner = vals[1].address?.accountId().ed25519?.().toString("hex") ?? "";
      const animal_type = vals[2].sym?.().toString() ?? "";
      const count = Number(vals[3].u32?.() ?? 0);
      const appraised_value = Number(vals[4].i128?.().lo ?? 0);
      insertCollateral({ id, owner, animal_type, count, appraised_value });
      logger.info("collateral_synced", { id, owner, animal_type });
    } else if (key === "loan/requested") {
      // data: (loan_id, borrower, amount, disbursement, total_collateral_value)
      const vals = xdr.ScVal.fromXDR(event.value, "base64").vec?.() ?? [];
      if (vals.length < 3) return;
      const id = vals[0].u64?.().toString() ?? "";
      const borrower = vals[1].address?.accountId().ed25519?.().toString("hex") ?? "";
      const amount = Number(vals[2].i128?.().lo ?? 0);
      insertLoan({ id, borrower, collateral_id: "", amount });
      logger.info("loan_synced", { id, borrower, amount });
    } else if (key === "loan/repaid") {
      // data: (loan_id, borrower, repay_amount, outstanding, status)
      const vals = xdr.ScVal.fromXDR(event.value, "base64").vec?.() ?? [];
      if (vals.length < 3) return;
      const id = vals[0].u64?.().toString() ?? "";
      const repayAmount = Number(vals[2].i128?.().lo ?? 0);
      updateTransaction(id, { status: "completed", amount: repayAmount });
      logger.info("loan_repaid_synced", { id, repayAmount });
    } else if (key === "loan/liquidated") {
      // data: (loan_id, liquidator, repay_amount, outstanding, status)
      const vals = xdr.ScVal.fromXDR(event.value, "base64").vec?.() ?? [];
      if (vals.length < 1) return;
      const id = vals[0].u64?.().toString() ?? "";
      updateTransaction(id, { status: "completed", type: "liquidation" });
      logger.info("loan_liquidated_synced", { id });
    }
  } catch (err) {
    logger.warn("event_parse_error", { error: (err as Error).message });
  }
}

/**
 * Poll the Soroban RPC for new contract events since the last processed ledger.
 */
async function poll(): Promise<void> {
  if (!CONTRACT_ID) return;

  try {
    const server = new SorobanRpc.Server(RPC_URL);
    const startLedger = lastLedger > 0 ? lastLedger + 1 : undefined;

    const response = await server.getEvents({
      startLedger,
      filters: [{ type: "contract", contractIds: [CONTRACT_ID] }],
    });

    for (const event of response.events) {
      handleEvent(event as unknown as SorobanRpc.Api.RawEventResponse);
      if (event.ledger > lastLedger) {
        lastLedger = event.ledger;
      }
    }
  } catch (err) {
    logger.warn("event_poll_error", { error: (err as Error).message });
  }
}

/**
 * Start the contract event listener polling loop.
 * @param intervalMs - Polling interval in milliseconds (default: POLL_INTERVAL_MS env var or 5000)
 */
export function startEventListener(intervalMs = POLL_INTERVAL_MS): void {
  if (!CONTRACT_ID) {
    logger.warn("event_listener_disabled", { reason: "CONTRACT_ID not set" });
    return;
  }
  logger.info("event_listener_started", { contractId: CONTRACT_ID, intervalMs });

  const tick = async () => {
    await poll();
    pollTimer = setTimeout(tick, intervalMs);
  };
  tick();
}

/**
 * Stop the contract event listener polling loop.
 */
export function stopEventListener(): void {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
    logger.info("event_listener_stopped");
  }
}
