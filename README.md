# StellarKraal

[![CI](https://img.shields.io/github/actions/workflow/status/teslims2/StellarKraal-/backend-ci.yml?branch=main&label=backend%20CI)](https://github.com/teslims2/StellarKraal-/actions/workflows/backend-ci.yml)
[![CI](https://img.shields.io/github/actions/workflow/status/teslims2/StellarKraal-/frontend-ci.yml?branch=main&label=frontend%20CI)](https://github.com/teslims2/StellarKraal-/actions/workflows/frontend-ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-70%25%20min-brightgreen)](https://github.com/teslims2/StellarKraal-/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Project Overview

StellarKraal enables livestock-backed loans on the Stellar network. Animals are registered as collateral and borrowers can request loans against their appraised value, with on-chain loan lifecycle management and liquidation protection.

## Architecture

```mermaid
flowchart LR
  subgraph Frontend
    F[Next.js frontend] -->|HTTP| B[Backend API]
  end

  subgraph Backend
    B -->|SQL| DB[(SQLite database)]
    B -->|RPC| S[Soroban smart contract]
  end

  subgraph Contracts
    S -->|WASM| W[(Stellar contract)]
  end
```

### Architecture Summary

- Frontend: React + Next.js 14 with Tailwind CSS.
- Backend: Node.js + TypeScript + Express.
- Smart contract: Rust using the Soroban SDK.
- Infrastructure: Docker, Docker Compose, local SQLite database.

## Local Development

### Prerequisites

- Node.js 20+
- npm
- Docker & Docker Compose (for containerized setup)
- Rust toolchain and `stellar-cli` for contract work
- Freighter browser extension for wallet integration

### Clone and setup

```bash
git clone https://github.com/<your-username>/StellarKraal-.git
cd StellarKraal-
cp .env.example .env
```

### Environment Variables

Create a `.env` file in the project root containing:

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_NETWORK` | Stellar network to use | `testnet` |
| `RPC_URL` | Soroban JSON-RPC endpoint | `https://soroban-testnet.stellar.org` |
| `CONTRACT_ID` | Deployed Soroban contract ID | `G...` |
| `PORT` | Backend service port | `3001` |
| `NEXT_PUBLIC_API_URL` | Frontend API base URL | `http://localhost:3001` |

### Run with Docker Compose

```bash
docker-compose up --build
```

Access:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001`

### Run without Docker

#### Backend

```bash
cd backend
npm install
npm run build
npm start
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

#### Smart contract tests

```bash
cd contracts/stellarkraal
cargo test
```

## Troubleshooting

- `PORT already in use`: stop the process using the port or change `PORT` in `.env`.
- `Cannot connect to RPC_URL`: verify network and RPC endpoint reachability.
- `npm test` failures: ensure dependencies are installed and the correct Node.js version is active.
- `Docker build` errors: rebuild after clearing caches with `docker-compose build --no-cache`.

## Contribution Guidelines

This repository uses a documented contribution workflow. See [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming, commit style, PR template, and code review expectations.

### Pull Request Checklist

- [ ] Branch created from latest `main`
- [ ] Commit messages follow Conventional Commits
- [ ] Tests run successfully locally
- [ ] Documentation updated when necessary

## Development Scripts

Run the following from the repository root:

```bash
npm run test:contract
npm run test:backend
npm run test:frontend
```

## Documentation

| Document | Description |
|---|---|
| [Liquidation Mechanism](docs/protocol/liquidation.md) | Health factor formula, liquidation threshold, partial liquidation examples |

## Architecture Decision Records

Key design decisions are documented as ADRs in [`docs/adr/`](docs/adr/).

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](docs/adr/ADR-001-soroban.md) | Use Soroban for On-Chain Loan Lifecycle Management | Accepted |
| [ADR-002](docs/adr/ADR-002-jwt-auth.md) | JWT-Based Authentication Strategy | Accepted |
| [ADR-003](docs/adr/ADR-003-sqlite.md) | SQLite as the Off-Chain Database | Accepted |
| [ADR-004](docs/adr/ADR-004-nextjs-tailwind.md) | Next.js 14 + Tailwind CSS for the Frontend | Accepted |

To add a new ADR, copy [`docs/adr/template.md`](docs/adr/template.md), increment the number, fill in all sections, and add a row to the table above.

---

## License

MIT © StellarKraal
