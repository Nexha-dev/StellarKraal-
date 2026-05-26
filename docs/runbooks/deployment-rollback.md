# Runbook: Deployment Rollback

## Incident Description
A recent deployment has caused a critical regression in the production environment (e.g., high error rates, service crashes, broken core flows) and must be reverted.

## Detection Steps
- Identified via post-deployment smoke tests, alerts (High 5xx, CPU spikes), or user reports immediately following a release.

## Impact Assessment
- **Criticality**: Varies depending on the bug, but typically High/Critical if a rollback is triggered.
- **User Impact**: Reverting to the previous stable state to restore service.

## Remediation Steps
### Option 1: Rollback via CI/CD Pipeline (Preferred)
1.  Navigate to the GitHub Actions (or your CI/CD tool) interface.
2.  Find the successful deployment job of the *previous* stable release.
3.  Click "Re-run jobs" or manually trigger the deployment workflow using the previous stable commit SHA/tag.
4.  Monitor the deployment until it completes successfully.

### Option 2: Manual Rollback (Docker/Server)
1.  SSH into the production server.
2.  Identify the previous Docker image tag.
    ```bash
    docker images
    ```
3.  Update the `docker-compose.prod.yml` or your orchestrator config to point to the previous stable tag.
4.  Redeploy the service:
    ```bash
    docker-compose -f docker-compose.prod.yml up -d
    ```

### Option 3: Smart Contract Rollback
*Warning: Smart contracts cannot be "rolled back" in the traditional sense once upgraded.*
1. If an upgraded contract has a critical bug, you must deploy the *previous* WASM file as a new upgrade transaction.
2. Ensure you have the previous verified WASM binary.
3. Submit a contract upgrade transaction using the previous WASM hash.

## Post-Rollback Actions
1.  Verify the system is stable and errors have subsided.
2.  Revert the offending commit in the `main` branch to prevent it from being accidentally deployed again.

## Escalation Path
1.  If the rollback fails or data corruption occurred during the bad deployment, escalate to the **Engineering Manager** and **Lead Database Administrator**.
2.  Communicate the status of the rollback in `#incidents`.
