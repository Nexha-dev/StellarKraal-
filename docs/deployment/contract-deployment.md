# Contract Deployment Guide

This guide provides step-by-step instructions for deploying the smart contract to Stellar Testnet and Mainnet.

## Prerequisites

Ensure you have the following installed:

- Rust (latest stable)
- Cargo
- Soroban CLI
- A funded Stellar account

Install Soroban CLI:
```bash
cargo install --locked soroban-cli
```

## Build the Contract (WASM)
Compile the contract to WASM:
```bash
cargo build --target wasm32-unknown-unknown --release
```

Optimize the WASM:
```bash
soroban contract optimize \
  --wasm target/wasm32-unknown-unknown/release/*.wasm
```

## Fund Deployer Account (Testnet)
Generate a keypair if needed:
```bash
soroban keys generate deployer
```

Fund the account using Friendbot:
```bash
curl "https://friendbot.stellar.org?addr=$(soroban keys address deployer)"
```

## Deploy to Testnet
```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/*.wasm \
  --source deployer \
  --network testnet
```

Save the returned `CONTRACT_ID`.

## Initialize Contract
Replace placeholders with actual values:

```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- \
  init \
  --admin <ADMIN_ADDRESS>
```

>Ensure the correct initialization parameters are used based on the contract implementation.

## Verify Deployment
Check contract is working:

```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  -- \
  version
```
Or call any read function available.

## Mainnet Deployment - Warnings & Checklist

## Important War
- Never use test keys on mainnet  
- Double-check contract code before deployment  
- Ensure contract is audited  
- Secure admin private keys  
- Validate all environment variables  


## Mainnet Checklist
- [ ] Contract audited  
- [ ] Tests passing  
- [ ] Gas usage optimized  
- [ ] Admin keys secured  
- [ ] Environment variables updated  
- [ ] Backup of keys created  

## Deploy to Mainnet
```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/*.wasm \
  --source deployer \
  --network mainnet
```

## Initialize (Mainnet)
```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source deployer \
  --network mainnet \
  -- \
  init \
  --admin <ADMIN_ADDRESS>
```

## Post-Deployment Verification
- Confirm contract responds to queries
- Verify initialization parameters
- Run small test transactions
- Monitor logs and events

## Rollback Procedure
If something goes wrong:
- Stop interactions with the contract
- Identify issue
- Deploy a fixed version
- Re-initialize with correct parameters
- Update frontend/backend with new contract ID


## Troubleshooting
❌ Insufficient Funds

- Fund deployer account again

❌ WASM Not Found

- Ensure correct build path

❌ Unauthorized Error

- Check correct key is used

❌ Init Fails

- Verify parameters match contract requirements

## Notes
- Always test on testnet first
- Keep contract IDs documented
- Never expose private keys
  
