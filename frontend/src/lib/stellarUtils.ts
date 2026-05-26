import { Networks, TransactionBuilder } from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;

/** Format stroops (1e-7 XLM) to human-readable XLM string */
export function formatStroops(stroops: number | bigint): string {
  return (Number(stroops) / 1e7).toFixed(7).replace(/\.?0+$/, "") + " XLM";
}

/** Returns a CSS color string based on health factor bps */
export function healthColor(bps: number): string {
  if (bps >= 15_000) return "#16a34a"; // green
  if (bps >= 10_000) return "#ca8a04"; // yellow
  return "#dc2626"; // red
}

/** Submit a signed XDR transaction and return the result value */
export async function submitSignedXdr(signedXdr: string): Promise<string> {
  if (typeof window !== "undefined" && window.__STELLARKRAAL_E2E__?.submitSignedXdr) {
    return Promise.resolve(window.__STELLARKRAAL_E2E__.submitSignedXdr(signedXdr));
  }

  const server = new Server(RPC_URL);
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const result = await server.sendTransaction(tx);
  if (result.status === "ERROR") {
    throw new Error(`Transaction failed: ${result.errorResult}`);
  }
  // Poll for completion
  let getResult = await server.getTransaction(result.hash);
  let attempts = 0;
  while (getResult.status === "NOT_FOUND" && attempts < 20) {
    await new Promise((r) => setTimeout(r, 1500));
    getResult = await server.getTransaction(result.hash);
    attempts++;
  }
  if (getResult.status === "SUCCESS") {
    return result.hash;
  }
  throw new Error(`Transaction status: ${getResult.status}`);
}
