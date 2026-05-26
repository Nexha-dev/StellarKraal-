# Liquidation Mechanism & Health Factor

## Overview

StellarKraal uses a **health factor** to determine whether a loan position is safe or eligible for liquidation. When collateral value drops relative to outstanding debt, the health factor falls below the safety threshold and any address can liquidate the position.

---

## Health Factor Formula

```
HF = (total_collateral_value × liquidation_threshold_bps) / (outstanding × 10_000) × 10_000
```

Where:
- `total_collateral_value` — sum of appraised values of all collateral assets locked to the loan (in token units)
- `liquidation_threshold_bps` — protocol parameter, default **8000** (= 80%)
- `outstanding` — current debt owed by the borrower (principal + accrued interest)
- Result is scaled by **10,000** so that `HF = 10_000` means exactly at threshold

**Safe condition:** `HF >= 10_000`  
**Liquidatable:** `HF < 10_000`

> If `outstanding == 0` the health factor is `i128::MAX` (fully repaid, cannot be liquidated).

### Rust implementation (contracts/stellarkraal/src/lib.rs)

```rust
let numerator  = total_collateral_value * liq_thr as i128;   // liq_thr = 8000
let denominator = outstanding * 10_000;
HF = (numerator / denominator) * 10_000
```

---

## Protocol Parameters (defaults)

| Parameter | Symbol | Default | Meaning |
|---|---|---|---|
| Loan-to-Value | `LTV` | 6000 bps (60%) | Max loan as % of collateral |
| Liquidation Threshold | `LIQ_THR` | 8000 bps (80%) | HF drops below 1.0 when debt exceeds 80% of collateral |
| Origination Fee | `ORIG_FEE` | 50 bps (0.5%) | Deducted from disbursement at loan creation |
| Interest Fee | `INT_FEE` | 1000 bps (10%) | Applied to the interest portion on repayment |
| Close Factor | `CLOSE_FACTOR` | 5000 bps (50%) | Max % of outstanding debt a liquidator can repay in one call |

---

## Step-by-Step Liquidation Example

### Setup

| Item | Value |
|---|---|
| Collateral (5 cattle @ 200 XLM each) | 1,000 XLM |
| Loan principal | 600 XLM (60% LTV) |
| Outstanding debt | 600 XLM |
| Liquidation threshold | 80% |

### Step 1 — Compute initial health factor

```
HF = (1000 × 8000) / (600 × 10_000) × 10_000
   = 8_000_000 / 6_000_000 × 10_000
   = 1.333... × 10_000
   = 13_333   ✅ SAFE (>= 10_000)
```

### Step 2 — Collateral value drops (cattle price falls)

Appraised value falls to **700 XLM** (30% drop).

```
HF = (700 × 8000) / (600 × 10_000) × 10_000
   = 5_600_000 / 6_000_000 × 10_000
   = 0.933... × 10_000
   = 9_333   ⚠️ LIQUIDATABLE (< 10_000)
```

### Step 3 — Liquidator calls `liquidate`

Close factor = 50%, so the maximum repayable in one call:

```
max_repay = 600 × 5000 / 10_000 = 300 XLM
```

Liquidator repays **300 XLM**.

### Step 4 — State after liquidation

| Item | Before | After |
|---|---|---|
| Outstanding debt | 600 XLM | 300 XLM |
| Loan status | Active | Active (partial) |

```
HF = (700 × 8000) / (300 × 10_000) × 10_000
   = 5_600_000 / 3_000_000 × 10_000
   = 18_666   ✅ SAFE again
```

---

## Partial Liquidation Mechanics

StellarKraal supports **partial liquidations** governed by the close factor:

1. A liquidator calls `liquidate(liquidator, loan_id, repay_amount)`.
2. The contract checks `HF < 10_000`; reverts with `HealthFactorSafe` otherwise.
3. `repay_amount` must satisfy: `repay_amount <= outstanding × close_factor / 10_000`.
4. The liquidator transfers `repay_amount` tokens to the contract.
5. `outstanding` is reduced by `repay_amount`.
6. If `outstanding` reaches 0, loan status becomes `Liquidated`; otherwise it stays `Active`.
7. The liquidator receives collateral value proportional to the repaid debt (handled off-chain via oracle settlement in the current implementation).

> **No liquidation bonus** is applied in the current contract version. The incentive for liquidators is the discounted collateral acquisition negotiated off-chain.

---

## Error Codes

| Code | Name | Meaning |
|---|---|---|
| 7 | `HealthFactorSafe` | Loan HF >= 10_000; liquidation rejected |
| 11 | `ExceedsCloseFactor` | `repay_amount` exceeds close factor cap |
| 5 | `LoanNotFound` | Invalid `loan_id` |
| 9 | `LoanAlreadyClosed` | Loan is Repaid or already Liquidated |

---

## Related

- Smart contract source: [`contracts/stellarkraal/src/lib.rs`](../../contracts/stellarkraal/src/lib.rs)
- Frontend health gauge: [`frontend/src/components/HealthGauge.tsx`](../../frontend/src/components/HealthGauge.tsx)
- Backend health endpoint: `GET /api/health/:loanId`
