# Transaction History Integration Guide

This guide explains how to integrate transaction creation with existing loan operations.

## Quick Start

The transaction history feature is ready to use. To start tracking transactions, you need to call `insertTransaction()` when loan operations occur.

## Integration Points

### 1. Loan Request

When a user requests a loan, create a transaction record:

```typescript
import { insertTransaction } from "./db/store";

// In your loan request endpoint
app.post("/api/loan/request", async (req, res) => {
  const { borrower, collateral_id, amount } = req.body;
  
  // ... existing loan request logic ...
  
  // Create transaction record
  const transaction = insertTransaction({
    borrower,
    type: "loan",
    status: "pending", // Will be "completed" after blockchain confirmation
    amount,
    collateralId: String(collateral_id),
  });
  
  // Return XDR for signing
  res.json({ xdr: xdrTx, transactionId: transaction.id });
});
```

### 2. Loan Repayment

When a user repays a loan:

```typescript
// In your loan repay endpoint
app.post("/api/loan/repay", async (req, res) => {
  const { borrower, loan_id, amount } = req.body;
  
  // ... existing repay logic ...
  
  // Create transaction record
  const transaction = insertTransaction({
    borrower,
    type: "repayment",
    status: "pending",
    amount,
    loanId: String(loan_id),
  });
  
  res.json({ xdr: xdrTx, transactionId: transaction.id });
});
```

### 3. Liquidation

When a loan is liquidated:

```typescript
// In your liquidation endpoint
app.post("/api/loan/liquidate", async (req, res) => {
  const { liquidator, loan_id, repay_amount } = req.body;
  
  // ... existing liquidation logic ...
  
  // Create transaction record
  const transaction = insertTransaction({
    borrower: liquidator,
    type: "liquidation",
    status: "pending",
    amount: repay_amount,
    loanId: String(loan_id),
  });
  
  res.json({ xdr: xdrTx, transactionId: transaction.id });
});
```

## Updating Transaction Status

After blockchain confirmation, update the transaction status:

```typescript
import { updateTransaction } from "./db/store";

// After transaction is confirmed on blockchain
updateTransaction(transactionId, {
  status: "completed",
});

// If transaction fails
updateTransaction(transactionId, {
  status: "failed",
});
```

## Frontend Integration

The TransactionHistory component automatically fetches and displays all transactions. No additional frontend integration needed.

### Optional: Show Transaction ID to User

After creating a transaction, you can show the ID to the user:

```typescript
// Frontend
const response = await fetch("/api/loan/request", {
  method: "POST",
  body: JSON.stringify({ borrower, collateral_id, amount }),
});

const { xdr, transactionId } = await response.json();
console.log("Transaction ID:", transactionId); // Show to user if desired
```

## Database Migration (Production)

When moving to a real database, create this migration:

```sql
-- Migration: Create transactions table
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  borrower TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('loan', 'repayment', 'liquidation')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  amount INTEGER NOT NULL,
  loan_id TEXT,
  collateral_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_transactions_borrower ON transactions(borrower);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_borrower_created ON transactions(borrower, created_at DESC);
```

## API Usage Examples

### Fetch all transactions for a borrower

```bash
curl "http://localhost:3001/api/transactions?borrower=GXXXXXX&page=1&pageSize=20"
```

### Filter by type and date range

```bash
curl "http://localhost:3001/api/transactions?type=repayment&startDate=2026-04-01&endDate=2026-04-30"
```

### Get specific transaction details

```bash
curl "http://localhost:3001/api/transactions/tx_1234567890_abc123"
```

## Testing

### Create test transactions

```typescript
import { insertTransaction, updateTransaction } from "./db/store";

// Create a test loan transaction
const tx1 = insertTransaction({
  borrower: "GXXXXXX...",
  type: "loan",
  status: "completed",
  amount: 1000,
  collateralId: "123",
});

// Create a test repayment
const tx2 = insertTransaction({
  borrower: "GXXXXXX...",
  type: "repayment",
  status: "completed",
  amount: 500,
  loanId: "456",
});

// Update status
updateTransaction(tx1.id, { status: "completed" });
```

## Best Practices

1. **Always create transaction records** - Even if blockchain confirmation is pending
2. **Use consistent borrower addresses** - Ensures filtering works correctly
3. **Set correct transaction types** - Use "loan", "repayment", or "liquidation"
4. **Update status after confirmation** - Mark as "completed" or "failed" after blockchain confirmation
5. **Include optional IDs** - Provide loanId and collateralId when available for better tracking

## Troubleshooting

### Transactions not appearing in UI

1. Check that transactions are being created: `GET /api/transactions`
2. Verify borrower address matches the logged-in user
3. Check browser console for API errors
4. Verify API is running on correct port

### Filtering not working

1. Ensure date format is ISO (YYYY-MM-DD)
2. Check that transaction type is one of: "loan", "repayment", "liquidation"
3. Check that status is one of: "pending", "completed", "failed"

### CSV export empty

1. Verify transactions exist for current filters
2. Check that page size is not set to 0
3. Ensure no JavaScript errors in browser console

## Next Steps

1. Add transaction creation to existing loan endpoints
2. Implement blockchain confirmation webhook to update transaction status
3. Test with real loan operations
4. Monitor transaction history in dashboard
5. Consider adding analytics based on transaction data
