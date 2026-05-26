# Runbook: Liquidation Engine Failure

## Incident Description
The automated service responsible for detecting undercollateralized loans and triggering liquidations has stopped functioning or is failing to execute transactions.

## Detection Steps
- **Alerts**: `LiquidationEngineStalled` or `LiquidationTxFailed` alerts.
- **On-chain Monitoring**: The number of underwater loans exceeds the threshold without any recent liquidation transactions on the network.
- **Logs**: Search the backend/worker logs for `Liquidation failed`, `tx_bad_seq`, or `insufficient_balance` from the liquidation wallet.

## Impact Assessment
- **Criticality**: High
- **User Impact**: The protocol becomes undercollateralized, increasing systemic risk.

## Remediation Steps
1.  **Check Wallet Balance**: Ensure the system wallet responsible for submitting liquidation transactions has enough XLM for gas fees.
    ```bash
    stellar account info $LIQUIDATION_WALLET_PUBKEY
    ```
    If empty, fund the wallet.
2.  **Check Sequence Numbers**: If transactions are failing with `tx_bad_seq`, the worker's local state is out of sync. Restart the worker to refresh the sequence number from the network.
3.  **Check RPC Connectivity**: Liquidations require a stable RPC connection. Verify RPC health (see `rpc-failure.md`).
4.  **Manual Liquidation**: If the automated engine is broken due to a bug, manually execute the critical liquidations via the Stellar CLI or admin script to protect the protocol.

## Escalation Path
1.  Escalate immediately to the **Smart Contract / Blockchain Engineering Team**.
2.  Notify the **Product Manager** and **Engineering Manager** about potential bad debt accumulation.
