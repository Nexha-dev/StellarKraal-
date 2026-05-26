# Interest Rate Model - StellarKraal Protocol

## Overview

The StellarKraal protocol implements a dynamic interest rate model based on utilization rate, similar to Compound's jump rate model. Interest rates automatically adjust based on market conditions, incentivizing repayment when liquidity is scarce and encouraging borrowing when liquidity is abundant.

## Motivation

A fixed interest rate does not respond to market conditions and leads to:
- Suboptimal capital efficiency
- Inability to incentivize repayment during liquidity scarcity
- Potential for liquidity crises

A dynamic model solves these issues by:
- Increasing rates when utilization is high (incentivizing repayment)
- Decreasing rates when utilization is low (encouraging borrowing)
- Providing predictable rate adjustments based on market conditions

## Model Formula

The interest rate model uses a piecewise linear function with a "kink" point:

```
if utilization <= kink:
    rate = base_rate + (slope1 * utilization / 10_000)
else:
    rate = base_rate + (slope1 * kink / 10_000) + (slope2 * (utilization - kink) / 10_000)
```

Where:
- `utilization = total_borrowed / total_liquidity` (in basis points, 0-10,000)
- `base_rate` = base interest rate (in basis points)
- `slope1` = interest rate slope below kink (in basis points)
- `slope2` = interest rate slope above kink (in basis points)
- `kink` = utilization threshold where slope changes (in basis points)

## Default Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `base_rate` | 200 bps (2%) | Minimum interest rate |
| `slope1` | 500 bps (5%) | Slope below kink |
| `slope2` | 4500 bps (45%) | Slope above kink |
| `kink` | 8000 bps (80%) | Utilization kink point |

## Example Calculations

### At 0% Utilization
```
rate = 2% + (5% * 0 / 100) = 2%
```

### At 50% Utilization (below kink)
```
rate = 2% + (5% * 50 / 100) = 2% + 2.5% = 4.5%
```

### At 80% Utilization (at kink)
```
rate = 2% + (5% * 80 / 100) = 2% + 4% = 6%
```

### At 100% Utilization (above kink)
```
rate = 2% + (5% * 80 / 100) + (45% * (100 - 80) / 100)
     = 2% + 4% + 9%
     = 15%
```

## Utilization Rate Calculation

Utilization is calculated as:

```
utilization = total_borrowed / total_liquidity
```

Where:
- `total_borrowed` = sum of all outstanding loan amounts
- `total_liquidity` = total available liquidity in the protocol

The utilization rate is expressed in basis points (0-10,000).

## Interest Accrual

Interest accrues per block/ledger, not per transaction. This ensures:
- Consistent interest calculations across the network
- Predictable borrowing costs
- Fair treatment of all borrowers

## Admin Configuration

The interest rate model parameters can be updated by the admin using:

```rust
set_interest_rate_model(
    admin: Address,
    base_rate_bps: u32,
    slope1_bps: u32,
    slope2_bps: u32,
    kink_bps: u32,
) -> Result<(), Error>
```

### Validation Rules

- `kink_bps` must be between 1 and 10,000 (0.01% to 100%)
- All rate parameters must be non-negative
- Parameters should be chosen to avoid excessive rate volatility

## Querying Current Rate

The current interest rate can be queried using:

```rust
get_current_interest_rate() -> Result<u32, Error>
```

This returns the current interest rate in basis points based on the current utilization rate.

## Interest Rate Model Retrieval

The current interest rate model parameters can be retrieved using:

```rust
get_interest_rate_model() -> Result<InterestRateModel, Error>
```

This returns:
```rust
pub struct InterestRateModel {
    pub base_rate_bps: u32,
    pub slope1_bps: u32,
    pub slope2_bps: u32,
    pub kink_bps: u32,
}
```

## Testing

The interest rate model is tested with:

1. **Unit Tests**: Verify rate calculations at 0%, 50%, 80%, and 100% utilization
2. **Fuzz Tests**: Verify invariants across random utilization rates
3. **Integration Tests**: Verify rate updates as loans are created and repaid

### Test Coverage

- Rate increases monotonically with utilization
- Rate at 0% utilization equals base rate
- Rate at kink point matches both formulas
- Rate at 100% utilization is maximum
- Parameter updates take effect immediately

## Future Enhancements

Potential improvements to the interest rate model:

1. **Time-weighted average utilization**: Smooth out rate volatility
2. **Governance-controlled parameters**: Allow community to adjust rates
3. **Multiple rate tiers**: Different rates for different collateral types
4. **Dynamic base rate**: Adjust base rate based on external factors

## References

- [Compound Interest Rate Model](https://compound.finance/docs/governance)
- [Aave Interest Rate Strategy](https://docs.aave.com/risk/liquidity-risk/interest-rate-strategy)
- [StellarKraal Protocol Docs](../protocol/)
