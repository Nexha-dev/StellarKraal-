# On-Call Rotation

## Overview

StellarKraal uses a weekly on-call rotation. The on-call engineer is the first responder for alerts fired by the uptime monitors (Slack `#alerts` channel and email).

## Rotation Schedule

| Week | Engineer | Contact |
|------|----------|---------|
| Week 1 | — | — |
| Week 2 | — | — |
| Week 3 | — | — |
| Week 4 | — | — |

> Update this table with real names and contact details before going to production.

## Responsibilities

- Acknowledge alerts within **15 minutes** during business hours, **30 minutes** off-hours.
- Investigate and resolve or escalate within **1 hour**.
- Post a brief incident note in `#incidents` Slack channel for any outage > 5 minutes.
- File a post-mortem issue in GitHub for any P1 incident (full outage > 15 minutes).

## Alert Channels

| Channel | Purpose |
|---------|---------|
| Slack `#alerts` | Automated uptime alerts (2 consecutive failures) |
| Slack `#incidents` | Manual incident coordination |
| Email (`NOTIFICATION_EMAIL` secret) | Backup alert delivery |

## Escalation Path

1. On-call engineer
2. Engineering lead
3. CTO / project owner

## Runbooks

### Frontend down
1. Check GitHub Actions for recent failed deployments.
2. Verify Docker container is running: `docker-compose ps`.
3. Check `frontend` container logs: `docker-compose logs frontend`.

### Backend `/api/health` down
1. Check `backend` container logs: `docker-compose logs backend`.
2. Verify database connectivity (PostgreSQL container running).
3. Check RPC connectivity to Stellar testnet/mainnet.

### Stellar RPC unreachable
1. Check [Stellar network status](https://status.stellar.org).
2. If network-wide issue, post status update on the public status page and wait.
3. If isolated, verify `RPC_URL` env var and network egress from the host.

## Status Page

Public status page: `https://status.stellarkraal.io` (or `https://firstJOASH.github.io/StellarKraal-`)

Displays current service status and 30-day uptime history.
