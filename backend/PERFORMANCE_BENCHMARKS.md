Performance Benchmarks
======================

This document records the baseline p95 response times used by the CI performance
checks and how the benchmark job works.

Baseline p95 (milliseconds)
- GET /api/v1/loans: 50ms
- GET /api/v1/collateral: 50ms
- POST /api/v1/loans: 100ms

Benchmark runner
- Script: `npm run benchmark` (runs `node src/benchmark.js`)
- Simulates 50 concurrent connections for 30 seconds per endpoint
- Writes results to `backend/benchmark-results.json`
- CI will upload `backend/benchmark-results.json` as an artifact
- CI will fail the job if any endpoint's p95 exceeds 2× the baseline

How to run locally

```bash
cd backend
npm ci
npm run benchmark
```

Interpreting results
- The generated JSON file contains a `results` array with objects:
  - `label`, `p95`, `baseline`, `limit`, `passed`, `rps`, `errors`
- If `passed` is false for any entry the script exits non-zero and CI will fail.
