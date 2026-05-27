# Docker Guide

## Health Checks

Both `backend` and `frontend` services declare Docker health checks so Compose can manage startup order correctly.

| Service | Health check endpoint | Interval | Timeout | Retries | Start period |
|---|---|---|---|---|---|
| `backend` | `GET http://localhost:3001/api/health` | 30 s | 10 s | 3 | 15 s |
| `frontend` | `GET http://localhost:3000` | 30 s | 10 s | 3 | 20 s |

The `frontend` service uses `depends_on` with `condition: service_healthy` so it only starts after the backend passes its health check.

```yaml
frontend:
  depends_on:
    backend:
      condition: service_healthy
```

## Checking service health

```bash
docker compose ps          # shows health status column
docker inspect <container> --format '{{.State.Health.Status}}'
```

## Running the stack

```bash
docker compose up --build -d
```

Services start in dependency order. The frontend container will not start until the backend reports `healthy`.
