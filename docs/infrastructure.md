# Infrastructure Setup & Resource Limits

This document outlines the resource allocations for the Docker Compose services in the StellarKraal- project.

## Resource Profiles

Baseline profiling was performed using `docker stats` during active development, identifying the following typical consumption:
- **backend**: ~260MiB memory usage with spikes during bursts.
- **frontend**: ~150-300MiB memory usage depending on asset compilation state.
- **contract-builder**: Bursts to ~500MiB-800MiB memory and uses maximum available CPU during Rust compilation.

## Limits and Requests

To ensure stability and prevent any single misbehaving service from starving the host system, we have applied the following limits (`limits`) and requests (`reservations`) to the `docker-compose.yml`:

| Service            | CPU Limit | Memory Limit | CPU Request | Memory Request | Restart Policy |
|--------------------|-----------|--------------|-------------|----------------|----------------|
| `backend`          | 0.5       | 512M         | 0.1         | 128M           | unless-stopped |
| `frontend`         | 0.5       | 512M         | 0.1         | 128M           | unless-stopped |
| `contract-builder` | 1.0       | 1024M        | 0.25        | 256M           | unless-stopped |

## Kubernetes Implications

When deploying these services to a Kubernetes cluster, these `docker-compose` limits must be mapped to Kubernetes `resources.limits` and `resources.requests` in the respective Deployment/Pod manifests. The values established here serve as the baseline minimums required to operate correctly in the cluster.

If the containers experience `OOMKilled` errors in staging, the memory limits should be incrementally raised by 256M until stability is achieved.
