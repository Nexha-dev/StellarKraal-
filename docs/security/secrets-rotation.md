# Secrets Rotation Procedure

All production secrets are stored as GitHub Actions repository secrets and injected into workflows at runtime. No secret value is ever committed to the repository or printed in workflow logs.

## Required GitHub Secrets

| Secret Name | Description | Used In |
|---|---|---|
| `JWT_SECRET` | JWT signing key (min 32 chars) | backend-ci, deploy |
| `CONTRACT_ID` | Deployed Soroban contract ID | frontend-ci, deploy |
| `RPC_URL` | Soroban JSON-RPC endpoint | frontend-ci, deploy |
| `NEXT_PUBLIC_NETWORK` | Stellar network (`testnet`/`mainnet`) | frontend-ci, deploy |
| `NEXT_PUBLIC_API_URL` | Frontend → backend base URL | frontend-ci, deploy |
| `WEBHOOK_SECRET` | HMAC secret for webhook validation | deploy |
| `ADMIN_API_KEY` | Admin endpoint API key | deploy |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook for alerts | deploy, deploy-staging |
| `PAGERDUTY_ROUTING_KEY` | PagerDuty Events API v2 routing key | deploy |
| `AWS_ACCESS_KEY_ID` | AWS credentials for Terraform | terraform, deploy-staging |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials for Terraform | terraform, deploy-staging |
| `LHCI_GITHUB_APP_TOKEN` | Lighthouse CI GitHub App token | frontend-ci |

Staging-specific secrets use the same names but are scoped to the `staging` environment in GitHub (Settings → Environments → staging).

## Rotation Schedule

| Secret | Rotation Frequency |
|---|---|
| `JWT_SECRET` | Every 90 days or immediately after suspected compromise |
| `WEBHOOK_SECRET` | Every 90 days |
| `ADMIN_API_KEY` | Every 90 days |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Every 90 days |
| `SLACK_WEBHOOK_URL` | On team member offboarding |
| `PAGERDUTY_ROUTING_KEY` | On team member offboarding |
| `CONTRACT_ID` / `RPC_URL` | On contract redeployment |

## Rotation Steps

### 1. Generate a new secret value

```bash
# For random secrets (JWT_SECRET, WEBHOOK_SECRET, ADMIN_API_KEY):
openssl rand -base64 48
```

### 2. Update the GitHub secret

1. Go to **Settings → Secrets and variables → Actions** in the repository.
2. Click the secret name → **Update**.
3. Paste the new value and save.
4. For staging secrets, repeat under **Settings → Environments → staging**.

### 3. Deploy to pick up the new value

Trigger a new workflow run (push a commit or use **Actions → Re-run**). The new secret is injected automatically — no code change is needed.

### 4. Revoke the old value

- **JWT_SECRET**: After rotating, existing JWTs signed with the old key will be invalid. Users will need to log in again. Coordinate with the team before rotating in production.
- **AWS keys**: Deactivate the old IAM access key in the AWS console after confirming the new key works.
- **WEBHOOK_SECRET**: Update the secret on the webhook provider side (e.g., GitHub webhook settings) to match the new value before the old one is revoked.

### 5. Verify

Run the relevant CI workflow and confirm it passes. Check that no secret values appear in the workflow logs — GitHub automatically masks registered secrets, but verify manually if in doubt.

## Emergency Rotation (Suspected Compromise)

1. Immediately rotate the compromised secret following steps 1–3 above.
2. Revoke the old value at the source (AWS console, Slack, PagerDuty, etc.).
3. Review recent workflow logs for any accidental exposure.
4. File an internal incident report in `#security`.
5. If a JWT secret was compromised, invalidate all active sessions by rotating the secret and notifying users.

## Verifying No Secrets in Logs

GitHub automatically redacts registered secret values from logs. To verify:

1. Open a completed workflow run in GitHub Actions.
2. Search the logs for any known secret substring — it should appear as `***`.
3. If a secret appears in plain text, rotate it immediately and investigate how it was exposed (e.g., `echo $SECRET` in a run step).
