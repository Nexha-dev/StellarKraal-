# Runbook: RPC Node Unreachable

## Incident Description
The backend service cannot connect to the Soroban RPC node (`RPC_URL`), causing transactions to fail, appraisals to stall, and blockchain state to become unreadable.

## Detection Steps
- **Slack/PagerDuty Alerts**: Alerts firing for `RPCConnectionFailure` or `HighRPCErrorRate`.
- **Grafana Dashboards**: Check the `StellarKraal RPC Metrics` dashboard. You will see a sudden drop in RPC request success rate or a spike in connection timeouts.
- **Logs**: Search for `Cannot connect to RPC_URL` or `fetch failed` in the backend logs (`/var/log/stellarkraal/backend.log` or your log aggregator).

## Impact Assessment
- **Criticality**: High
- **User Impact**: Users cannot interact with the smart contracts, loans cannot be originated, and liquidations may be delayed.

## Remediation Steps
1.  **Verify RPC Node Status**: Check the status page of the RPC provider (e.g., stellar.org status).
2.  **Check Network Connectivity**: SSH into the backend server and try to ping or curl the RPC endpoint:
    ```bash
    curl -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' $RPC_URL
    ```
3.  **Switch to Fallback RPC**: If the primary RPC is down, update the `.env` file (or your secret manager/Kubernetes ConfigMap) to use a secondary RPC provider.
4.  **Restart Backend**: After updating the URL, restart the backend service to clear old connection pools.
    ```bash
    # e.g., if using docker-compose
    docker-compose restart backend
    ```

## Escalation Path
If the issue persists and all available RPC nodes are unreachable:
1.  Escalate to the **Platform/Infrastructure Engineer on-call**.
2.  Post an update in the `#incidents` Slack channel.
3.  If downtime exceeds 15 minutes, notify the **Engineering Manager**.
