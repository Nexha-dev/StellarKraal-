# Time-Weighted Average Price (TWAP) - StellarKraal Protocol

## Overview

The StellarKraal protocol implements a Time-Weighted Average Price (TWAP) mechanism to protect against flash loan price manipulation attacks. Instead of using spot prices for collateral valuation in liquidations, the protocol uses TWAP, which averages oracle prices over a configurable window (default 1 hour).

## Motivation

Using spot prices for collateral valuation makes the protocol vulnerable to flash loan attacks:

1. **Flash Loan Attack Scenario**:
   - Attacker borrows large amount of collateral token via flash loan
   - Attacker sells tokens on DEX, crashing spot price
   - Protocol liquidates loans based on crashed spot price
   - Attacker repays flash loan and profits from liquidation

2. **TWAP Protection**:
   - TWAP averages prices over time window
   - Single transaction cannot significantly move TWAP
   - Liquidations use TWAP, preventing manipulation

## TWAP Calculation

The TWAP is calculated as a rolling average of oracle prices:

```
TWAP = sum(prices) / count(prices)
```

Where:
- `prices` = all prices submitted within the TWAP window
- `count` = number of price submissions within the window

### Window Management

- **Default Window**: 1 hour (3600 seconds)
- **Configurable**: Admin can adjust window via `set_twap_window()`
- **Rolling**: Window slides forward as new prices are submitted
- **Reset**: When window expires, TWAP resets with new price

## Price Submission

The oracle submits prices using:

```rust
submit_price(oracle: Address, price: i128) -> Result<(), Error>
```

### Validation

- Only the authorized oracle can submit prices
- Price must be positive (> 0)
- Price is added to TWAP calculation
- TWAP is updated immediately

### Example Flow

```
Time 0:00 - Oracle submits price 100
  TWAP = 100

Time 0:30 - Oracle submits price 102
  TWAP = (100 + 102) / 2 = 101

Time 1:00 - Oracle submits price 101
  TWAP = (100 + 102 + 101) / 3 = 101

Time 1:30 - Oracle submits price 103
  Window expires, reset with new price
  TWAP = 103
```

## Collateral Valuation

### Liquidations Use TWAP

Liquidations use TWAP for collateral valuation to prevent manipulation:

```rust
// Liquidation uses TWAP price
let twap_data = get_twap_data()?;
let collateral_value_at_twap = collateral_count * twap_data.twap_price;
```

### Loan Requests Use Spot Price (with sanity check)

Loan requests can use spot price for faster processing, but include a TWAP sanity check:

```rust
// Loan request uses spot price
let spot_price = get_twap_data()?.current_price;
let collateral_value = collateral_count * spot_price;

// Sanity check: spot price shouldn't deviate too much from TWAP
let max_deviation = 10%; // configurable
if spot_price > twap_price * (1 + max_deviation) {
    return Err(Error::PriceTooHigh);
}
```

## Querying TWAP Data

Current TWAP data can be queried using:

```rust
get_twap_data() -> Result<TWAPData, Error>
```

Returns:
```rust
pub struct TWAPData {
    pub current_price: i128,     // current spot price
    pub twap_price: i128,        // time-weighted average price
    pub last_update: u64,        // timestamp of last price update
}
```

## Configuration

### Setting TWAP Window

The TWAP window can be configured by the admin:

```rust
set_twap_window(admin: Address, window_seconds: u64) -> Result<(), Error>
```

### Recommended Windows

| Use Case | Window | Rationale |
|----------|--------|-----------|
| Volatile Assets | 1 hour | Captures short-term volatility |
| Stable Assets | 30 minutes | Faster response to changes |
| Conservative | 4 hours | Maximum protection |

## Security Considerations

### Flash Loan Protection

TWAP prevents flash loan attacks by:
1. Averaging prices over time
2. Requiring multiple price submissions
3. Making single-transaction manipulation ineffective

### Oracle Manipulation

TWAP reduces oracle manipulation risk by:
1. Requiring sustained price changes
2. Averaging out temporary spikes
3. Providing time for arbitrage to correct prices

### Limitations

TWAP does not protect against:
1. **Sustained attacks**: If attacker controls oracle for entire window
2. **Gradual manipulation**: Slow price changes over time
3. **Collusion**: Multiple oracles submitting false prices

## Testing

TWAP is tested with:

1. **Unit Tests**: Verify TWAP calculation with multiple price submissions
2. **Fuzz Tests**: Verify invariants across random prices and windows
3. **Integration Tests**: Verify liquidations use TWAP correctly

### Test Coverage

- TWAP updates correctly with new prices
- TWAP resets when window expires
- Spot price and TWAP tracked separately
- Liquidations use TWAP, not spot price
- Loan requests can use spot price with sanity check

## Example Scenarios

### Scenario 1: Normal Operation

```
Window: 1 hour
Prices submitted: 100, 101, 102, 101, 100
TWAP = (100 + 101 + 102 + 101 + 100) / 5 = 100.8
Liquidation uses TWAP = 100.8
```

### Scenario 2: Flash Loan Attack Attempt

```
Time 0:00 - TWAP = 100
Time 0:30 - Attacker flash loans and crashes price to 50
  Spot price = 50
  TWAP = (100 + 50) / 2 = 75
  Liquidation uses TWAP = 75 (not 50)
  Attack fails - liquidation not profitable
```

### Scenario 3: Legitimate Price Drop

```
Time 0:00 - TWAP = 100
Time 0:15 - Market crash, price drops to 80
Time 0:30 - Price stabilizes at 80
Time 0:45 - Price continues at 80
Time 1:00 - TWAP = (100 + 80 + 80 + 80) / 4 = 85
  Liquidation uses TWAP = 85
  Reflects real market conditions
```

## Future Enhancements

Potential improvements to TWAP mechanism:

1. **Multiple Oracles**: Average prices from multiple oracles
2. **Weighted TWAP**: Weight prices by time interval
3. **Deviation Bounds**: Reject prices that deviate too much from TWAP
4. **Adaptive Window**: Adjust window based on volatility

## References

- [Uniswap V2 TWAP](https://docs.uniswap.org/contracts/v2/concepts/core-concepts/oracles)
- [Compound Oracle Design](https://compound.finance/docs/governance)
- [Flash Loan Attacks](https://samczsun.com/the-anatomy-of-a-flash-loan-attack/)
- [StellarKraal Protocol Docs](../protocol/)
