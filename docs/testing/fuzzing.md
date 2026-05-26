# Fuzz Testing Guide - StellarKraal Smart Contract

## Overview

Fuzz testing is a software testing technique that provides random or semi-random data as input to a program to discover edge cases and potential vulnerabilities. The StellarKraal smart contract uses `proptest` for property-based fuzz testing of critical arithmetic functions.

## Why Fuzz Testing?

Arithmetic functions in the contract (interest calculation, health factor, collateral valuation) are difficult to test exhaustively with hand-written unit tests. Fuzz testing generates thousands of random inputs to verify that invariants hold across the entire input space.

## Setup

### Dependencies

The project uses `proptest` for property-based testing:

```toml
[dev-dependencies]
proptest = { version = "1.1.0", default-features = false, features = ["alloc"] }
```

### Running Fuzz Tests

Run all fuzz tests:

```bash
cd contracts/stellarkraal
cargo test --test '*' -- --nocapture
```

Run specific fuzz test:

```bash
cargo test fuzz_interest_calculation_bounded -- --nocapture
```

Run fuzz tests with increased iterations (default is 256):

```bash
PROPTEST_CASES=1000000 cargo test fuzz_
```

## Fuzz Tests

### 1. Interest Calculation Bounded

**Test**: `fuzz_interest_calculation_bounded`  
**Invariant**: Interest fee never exceeds interest portion  
**Inputs**: 
- `principal`: 1 to 1 billion
- `interest_portion`: 0 to 100 million
- `fee_bps`: 0 to 10,000 basis points

**Verification**:
- `interest_fee <= interest_portion`
- `interest_fee >= 0`

### 2. Health Factor Positive

**Test**: `fuzz_health_factor_positive`  
**Invariant**: Health factor is always positive when outstanding > 0  
**Inputs**:
- `collateral_value`: 1 to 1 billion
- `outstanding`: 1 to 1 billion
- `liq_threshold_bps`: 1 to 10,000 basis points

**Verification**:
- `health_factor > 0` when `outstanding > 0`

**Formula**: `health_factor = (collateral_value * liq_threshold_bps) / (outstanding * 10_000) * 10_000`

### 3. Repayment Non-Negative

**Test**: `fuzz_repayment_non_negative`  
**Invariant**: Outstanding never goes negative after repayment  
**Inputs**:
- `outstanding`: 1 to 1 billion
- `repay_amount`: 0 to 1 billion

**Verification**:
- `new_outstanding >= 0`
- `new_outstanding <= outstanding`

### 4. Collateral Valuation Safe

**Test**: `fuzz_collateral_valuation_safe`  
**Invariant**: Total collateral value doesn't overflow  
**Inputs**:
- `collateral_count`: 1 to 1,000
- `value_per_collateral`: 1 to 1 billion

**Verification**:
- `total_value >= 0`
- No overflow occurs

### 5. LTV Calculation Bounded

**Test**: `fuzz_ltv_calculation_bounded`  
**Invariant**: Max loan never exceeds collateral value  
**Inputs**:
- `collateral_value`: 1 to 1 billion
- `ltv_bps`: 0 to 10,000 basis points

**Verification**:
- `max_loan <= collateral_value`
- `max_loan >= 0`

**Formula**: `max_loan = (collateral_value * ltv_bps) / 10_000`

### 6. Origination Fee Safe

**Test**: `fuzz_origination_fee_safe`  
**Invariant**: Origination fee never exceeds principal  
**Inputs**:
- `principal`: 1 to 1 billion
- `fee_bps`: 0 to 10,000 basis points

**Verification**:
- `fee <= principal`
- `fee >= 0`
- `disbursement >= 0`

### 7. Close Factor Bounded

**Test**: `fuzz_close_factor_bounded`  
**Invariant**: Max repay amount never exceeds outstanding  
**Inputs**:
- `outstanding`: 1 to 1 billion
- `close_factor_bps`: 1 to 10,000 basis points

**Verification**:
- `max_repay <= outstanding`
- `max_repay > 0`

### 8. Multiple Repayments Clear Loan

**Test**: `fuzz_multiple_repayments_clear_loan`  
**Invariant**: Repeated repayments eventually clear the loan  
**Inputs**:
- `initial_outstanding`: 1 to 1 billion
- `repay_count`: 1 to 100

**Verification**:
- `outstanding >= 0` after each repayment
- `outstanding == 0` after sufficient repayments

### 9. Health Factor Extreme Values

**Test**: `fuzz_health_factor_extreme_values`  
**Invariant**: Health factor calculation handles extreme values without panicking  
**Inputs**:
- `collateral_value`: 1 to i128::MAX / 100,000
- `outstanding`: 1 to i128::MAX / 100,000
- `liq_threshold_bps`: 1 to 10,000 basis points

**Verification**:
- Calculation completes without panic
- No overflow occurs

## CI Integration

Fuzz tests run in CI with the following configuration:

```yaml
# .github/workflows/contract-tests.yml
- name: Run fuzz tests
  run: |
    cd contracts/stellarkraal
    PROPTEST_CASES=1000000 cargo test fuzz_ -- --nocapture
```

**Nightly Schedule**: Fuzz tests run nightly with 1 million iterations to catch rare edge cases.

## Corpus

Proptest maintains a corpus of interesting inputs in `contracts/stellarkraal/proptest-regressions/`. This corpus is committed to the repository to ensure reproducibility of any failures.

## Interpreting Results

### Passing Tests

All invariants held across all generated inputs. The arithmetic functions are safe.

### Failing Tests

If a fuzz test fails, proptest will:
1. Print the failing input
2. Save it to the regression corpus
3. Provide a minimal reproducer

Example failure output:

```
thread 'fuzz_interest_calculation_bounded' panicked at 'assertion failed: interest_fee <= interest_portion'
Failing input: principal=500000, interest_portion=100000, fee_bps=15000
```

## Best Practices

1. **Run regularly**: Execute fuzz tests before each commit
2. **Increase iterations**: Use `PROPTEST_CASES=1000000` for thorough testing
3. **Monitor corpus**: Review regression corpus for patterns
4. **Update invariants**: Add new fuzz tests when adding arithmetic functions
5. **Document assumptions**: Keep this guide updated with new tests

## Troubleshooting

### Tests timeout

Increase the timeout or reduce iterations:

```bash
PROPTEST_TIMEOUT=60 cargo test fuzz_
```

### Out of memory

Reduce the number of cases:

```bash
PROPTEST_CASES=10000 cargo test fuzz_
```

### Flaky tests

Check for non-deterministic behavior. All fuzz tests should be deterministic.

## References

- [proptest Documentation](https://docs.rs/proptest/)
- [Property-Based Testing](https://hypothesis.works/articles/what-is-property-based-testing/)
- [StellarKraal Protocol Docs](../protocol/)
