# Production Deployment Guide

## Starting the Production Stack

```bash
docker compose -f docker-compose.prod.yml up -d
```

## Container Log Rotation

All services in `docker-compose.prod.yml` use the `json-file` log driver with rotation configured:

```yaml
logging:
  driver: json-file
  options:
    max-size: "10m"   # rotate when a log file reaches 10 MB
    max-file: "5"     # keep at most 5 rotated files per container
```

This caps each container's log footprint at **50 MB** (5 × 10 MB). Older files are deleted automatically by the Docker daemon when the limit is reached.

> **Note on existing logs**: Applying this configuration to a running container requires a container restart (`docker compose -f docker-compose.prod.yml up -d --force-recreate`). Existing log files on disk are not deleted — they remain until Docker's rotation removes them naturally as new log data is written.

## Accessing and Searching Container Logs

See the [ops runbook — container logs](../runbooks/container-logs.md) for commands to view, follow, and search logs in production.
