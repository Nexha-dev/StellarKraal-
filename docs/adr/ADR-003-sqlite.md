# ADR-003: SQLite as the Off-Chain Database

**Date:** 2026-04-28  
**Status:** Accepted

## Context

The backend needs to persist off-chain data: animal registrations, loan records, user profiles, and appraisal history. We needed a database that is simple to operate in a single-node, containerised environment without external infrastructure.

## Decision

Use SQLite as the off-chain relational database, accessed via the backend Node.js service.

## Alternatives Considered

| Option | Reason not chosen |
|--------|-------------------|
| PostgreSQL | Operationally heavier; requires a separate container/service for a project at this scale |
| MySQL / MariaDB | Same operational overhead as PostgreSQL with no meaningful benefit at this scale |
| MongoDB | Document model adds complexity for relational loan/collateral data; no strong advantage here |

## Consequences

**Positive:**
- Zero-dependency setup — single file, no separate database process.
- Trivial to include in Docker Compose without an extra service.
- Sufficient for expected single-node load during development and early production.
- Easy to back up (copy the file).

**Negative / Trade-offs:**
- Not suitable for high-concurrency write workloads or multi-node deployments.
- Migration to PostgreSQL would be required if the project scales significantly.
- Limited support for advanced SQL features (e.g., full-text search, JSON operators).
