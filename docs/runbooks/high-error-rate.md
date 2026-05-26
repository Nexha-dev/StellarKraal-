# Runbook: High Error Rate (5xx)

## Incident Description
The backend API is returning an unusually high number of 5xx HTTP status codes to the frontend.

## Detection Steps
- **Alerts**: PagerDuty alert for `High5xxErrorRate` (e.g., > 5% of requests returning 5xx over 5 minutes).
- **Grafana Dashboards**: The `API Gateway` or `Backend Metrics` dashboard shows a spike in 5xx errors.
- **Logs**: Check the application logs for uncaught exceptions, unhandled promise rejections, or specific stack traces.

## Impact Assessment
- **Criticality**: Medium to High (depending on the affected endpoints).
- **User Impact**: Users may experience broken pages, failed transactions, or inability to load data.

## Remediation Steps
1.  **Identify the Failing Endpoint**: Look at Grafana or log aggregators to find which specific path (e.g., `/api/loans`, `/api/auth`) is failing.
2.  **Review Recent Deployments**: Check if a deployment occurred recently. If yes, consider initiating a deployment rollback (see `deployment-rollback.md`).
3.  **Check Dependencies**: Ensure that upstream dependencies (Database, RPC Node, third-party APIs) are healthy. Use their respective runbooks if a dependency is down.
4.  **Analyze the Logs**: Search the logs for the exact error message associated with the 5xx response to identify a code bug or data issue.
5.  **Increase Logging Level**: If the issue is not clear, temporarily increase the logging level to `debug` via environment variables and restart the service.

## Escalation Path
1.  If the issue cannot be identified within 15 minutes, page the **Backend Engineering Team**.
2.  Provide a summary of the failing endpoints and relevant log snippets in the `#incidents` Slack channel.
