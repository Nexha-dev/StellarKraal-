# ADR-001: Use Soroban for On-Chain Loan Lifecycle Management

**Date:** 2026-04-28  
**Status:** Accepted

## Context

StellarKraal requires on-chain enforcement of loan creation, repayment, and liquidation logic. The Stellar network introduced Soroban as its native smart contract platform. We needed to decide which smart contract environment to use.

## Decision

Use Soroban (Stellar's native smart contract platform) written in Rust for all on-chain contract logic.

## Alternatives Considered

| Option | Reason not chosen |
|--------|-------------------|
| Ethereum / EVM (Solidity) | Different network from Stellar; would require bridging and adds cross-chain complexity |
| Stellar Classic (operations only) | No programmable logic; cannot enforce loan conditions or liquidation rules on-chain |
| CosmWasm on a Cosmos chain | Unrelated ecosystem; loses native Stellar asset and account integration |

## Consequences

**Positive:**
- Native integration with Stellar accounts, assets, and the Freighter wallet.
- Rust's type system and memory safety reduce contract bugs.
- Soroban's resource-metered execution keeps fees predictable.
- Single network for both off-chain backend and on-chain logic.

**Negative / Trade-offs:**
- Soroban is newer than EVM; tooling and community resources are still maturing.
- Requires Rust expertise in addition to TypeScript for the rest of the stack.
- Testnet-only availability during early development limits production readiness.
