# Runbook: Accessing and Searching Container Logs

## View live logs (follow)

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Single service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

## View recent logs (last N lines)

```bash
docker compose -f docker-compose.prod.yml logs --tail=200 backend
```

## Search logs for a pattern

```bash
# Errors in the last 500 lines
docker compose -f docker-compose.prod.yml logs --tail=500 backend | grep -i error

# Requests to a specific path
docker compose -f docker-compose.prod.yml logs backend | grep '/api/v1/loans'
```

## Access raw JSON log files on the host

Docker stores `json-file` logs at:

```
/var/lib/docker/containers/<container-id>/<container-id>-json.log
```

Find the container ID:

```bash
docker ps --filter name=backend --format '{{.ID}}'
```

Then read the file directly (requires root or docker group membership):

```bash
sudo tail -f /var/lib/docker/containers/<container-id>/<container-id>-json.log | jq .
```

## Log rotation configuration

Rotation is configured in `docker-compose.prod.yml`:

- **max-size**: `10m` — each log file rotates at 10 MB
- **max-file**: `5` — at most 5 files are kept per container (max 50 MB per service)

Rotation is handled automatically by the Docker daemon. No manual intervention is needed under normal operation.

## Applying log rotation to a running container

Log driver options only take effect when a container is (re)created. To apply changes to a running stack:

```bash
docker compose -f docker-compose.prod.yml up -d --force-recreate
```

Existing log files are not deleted by this operation.
