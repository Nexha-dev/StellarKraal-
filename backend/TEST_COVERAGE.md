# Test Coverage Report

## Overview
This document outlines the comprehensive test coverage for the StellarKraal backend API.

## Test Files

### 1. `src/index.test.ts`
- Basic API endpoint tests
- Health check validation
- Collateral registration
- Loan request/repay flows
- Idempotency testing
- Pagination tests
- Request ID middleware

### 2. `src/loan-lifecycle.integration.test.ts`
- Full loan lifecycle integration tests
- Register collateral → Request loan → Repay → Health check
- Happy paths and error scenarios
- Edge cases for all 5 main endpoints

### 3. `src/routes/v1.integration.test.ts` (NEW)
- Comprehensive v1 API endpoint tests
- All 5 endpoints: register, request, repay, liquidate, health
- Version envelope validation
- Full lifecycle testing
- Edge cases and error handling
- 80%+ coverage target

### 4. `src/routes/v1.test.ts` (NEW)
- Unit tests for v1 router
- Version envelope middleware
- Route mounting validation

## Coverage by Module

### API Endpoints (100% coverage)
- ✅ POST /api/v1/collateral/register
- ✅ POST /api/v1/loan/request
- ✅ POST /api/v1/loan/repay
- ✅ POST /api/v1/loan/liquidate
- ✅ GET /api/v1/loan/:id
- ✅ GET /api/v1/health/:loanId
- ✅ GET /api/v1/health

### Test Scenarios

#### Happy Paths
- Valid collateral registration
- Successful loan requests
- Partial and full loan repayments
- Loan liquidation
- Health factor checks
- Full lifecycle completion

#### Error Paths
- Missing required fields
- Invalid Stellar public keys
- Negative/zero amounts
- Invalid data types
- Malformed JSON
- Empty arrays

#### Edge Cases
- Very large amounts
- Multiple collateral IDs
- Loan ID 0
- Large loan IDs
- Different animal types
- Various health statuses

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- src/routes/v1.integration.test.ts

# Run in watch mode
npm test -- --watch
```

## Coverage Thresholds

The project enforces minimum coverage thresholds:
- Lines: 80%
- Functions: 80%
- Branches: 80%
- Statements: 80%

## CI Integration

Tests run automatically on every pull request via GitHub Actions.
Coverage reports are generated and enforced at 80% minimum.
