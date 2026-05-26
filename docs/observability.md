# Observability: Log Aggregation with Loki & Grafana

## Overview

StellarKraal uses **Grafana Loki** for centralized log aggregation and **Promtail** to ship logs from all Docker containers. Grafana provides a pre-configured dashboard with useful log queries.

---

## Local Development

All observability services are included in `docker-compose.yml`. Start everything with:

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Grafana (dashboards) | http://localhost:3200 |
| Loki (log ingestion API) | http://localhost:3100 |

Grafana is pre-configured with anonymous viewer access — no login required in development.

---

## Architecture

```
backend  ──┐
           ├─► Docker json-file logs ──► Promtail ──► Loki ──► Grafana
frontend ──┘
```

- **Promtail** reads Docker container logs via the Docker socket and ships them to Loki.
- **Loki** stores and indexes logs by labels (`service`, `container`, `level`, `stream`).
- **Grafana** queries Loki and renders the pre-built dashboards.

---

## Pre-built Log Queries

The `StellarKraal Logs` dashboard (`grafana/dashboards/logs.json`) includes:

| Panel | LogQL Query | Purpose |
|---|---|---|
| All Logs | `{container=~"backend\|frontend"}` | Live tail of all service logs |
| Errors | `{container=~"backend\|frontend"} \|= "error" \| level="error"` | Filter error-level entries |
| Slow Requests | `{service="backend"} \| json \| duration > 1000` | Requests taking > 1 second |
| RPC Failures | `{service="backend"} \|= "rpc" \|= "error"` | Soroban RPC call failures |

---

## Configuration Files

| File | Purpose |
|---|---|
| `observability/promtail-config.yml` | Promtail scrape config — Docker socket discovery, label extraction |
| `observability/grafana-datasources.yml` | Grafana provisioning — Loki datasource |
| `observability/grafana-dashboards.yml` | Grafana provisioning — dashboard file provider |
| `grafana/dashboards/logs.json` | Pre-built logs dashboard |

---

## Production Deployment

In production, replace the Docker socket-based Promtail setup with a sidecar or a dedicated log shipper appropriate for your infrastructure (e.g., Promtail DaemonSet on Kubernetes, or a Loki-compatible agent on VMs).

Key environment changes:
1. Set `GF_AUTH_ANONYMOUS_ENABLED=false` and configure proper Grafana authentication.
2. Point Promtail `clients[].url` to your production Loki endpoint.
3. Use persistent volumes or object storage (S3/GCS) for Loki's `storage_config`.
4. Restrict Loki's port (`3100`) to internal network only — do not expose publicly.

---

## Related

- Prometheus metrics: [`docs/protocol/liquidation.md`](protocol/liquidation.md) *(see also `GET /metrics` endpoint)*
- Backend logger: [`backend/src/utils/logger.ts`](../backend/src/utils/logger.ts)
