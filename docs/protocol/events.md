# Contract Events

StellarKraal emits Soroban contract events for every state-changing operation. Off-chain systems (backend, indexers) subscribe to these events to stay in sync without polling contract storage.

## Event Format

All events follow the Soroban `env.events().publish(topics, data)` convention:

- **topics** – a tuple of `Symbol` values identifying the event namespace and action.
- **data** – a tuple containing all fields needed for off-chain processing.

## Events

### `livestock / registered`

Emitted by `register_livestock` when a new collateral record is created.

| Field | Type | Description |
|---|---|---|
| `id` | `u64` | Assigned collateral ID |
| `owner` | `Address` | Owner's Stellar address |
| `animal_type` | `Symbol` | Species symbol (e.g. `cattle`) |
| `count` | `u32` | Number of animals |
| `appraised_value` | `i128` | Oracle-appraised total value |

### `loan / requested`

Emitted by `request_loan` when a new loan is originated.

| Field | Type | Description |
|---|---|---|
| `loan_id` | `u64` | Assigned loan ID |
| `borrower` | `Address` | Borrower's Stellar address |
| `amount` | `i128` | Gross loan amount (before origination fee) |
| `disbursement` | `i128` | Net amount disbursed to borrower |
| `total_collateral_value` | `i128` | Sum of all collateral appraised values |

### `loan / repaid`

Emitted by `repay_loan` after each repayment (partial or full).

| Field | Type | Description |
|---|---|---|
| `loan_id` | `u64` | Loan ID |
| `borrower` | `Address` | Borrower's Stellar address |
| `repay_amount` | `i128` | Amount repaid in this transaction |
| `outstanding` | `i128` | Remaining outstanding balance after repayment |
| `status` | `LoanStatus` | New loan status (`Active` or `Repaid`) |

### `loan / liquidated`

Emitted by `liquidate` after a partial or full liquidation.

| Field | Type | Description |
|---|---|---|
| `loan_id` | `u64` | Loan ID |
| `liquidator` | `Address` | Liquidator's Stellar address |
| `repay_amount` | `i128` | Amount repaid by the liquidator |
| `outstanding` | `i128` | Remaining outstanding balance after liquidation |
| `status` | `LoanStatus` | New loan status (`Active` or `Liquidated`) |

### `FeeCollect / <loan_id>` (internal)

Emitted when origination or interest fees are transferred to the treasury.

| Field | Type | Description |
|---|---|---|
| `fee_type` | `Symbol` | `originate` or `interest` |
| `amount` | `i128` | Fee amount collected |

## Naming Convention

Topics follow the pattern `(namespace, action)` using `symbol_short!` macros:

```
(symbol_short!("livestock"), symbol_short!("registered"))
(symbol_short!("loan"),      symbol_short!("requested"))
(symbol_short!("loan"),      symbol_short!("repaid"))
(symbol_short!("loan"),      symbol_short!("liquidated"))
```

## Backend Event Listener

The backend polls the Soroban RPC for new events using `SorobanRpc.Server.getEvents()`. See [`backend/src/contractEventListener.ts`](../../backend/src/contractEventListener.ts).

Configure via environment variables:

| Variable | Default | Description |
|---|---|---|
| `CONTRACT_ID` | — | Deployed contract address (required) |
| `RPC_URL` | `https://soroban-testnet.stellar.org` | Soroban RPC endpoint |
| `EVENT_POLL_INTERVAL_MS` | `5000` | Polling interval in milliseconds |
