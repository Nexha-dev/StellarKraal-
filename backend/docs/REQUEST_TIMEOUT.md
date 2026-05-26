# Request Timeout Middleware

## Overview

The request timeout middleware protects the server from long-running requests that can tie up resources indefinitely. It automatically aborts requests that exceed a configurable threshold and returns a `504 Gateway Timeout` response.

## Features

- **Global timeout**: Default 30 seconds for all requests
- **Per-route timeout**: Configurable timeout for specific endpoints
- **Write endpoint protection**: Stricter 15-second timeout for write operations
- **Graceful handling**: Cleans up timers when responses complete normally
- **Request logging**: Logs timeout events with full request context
- **Environment configuration**: Timeout values configurable via environment variables

## Configuration

### Environment Variables

```bash
# Global request timeout (default: 30000ms = 30 seconds)
TIMEOUT_GLOBAL_MS=30000

# Write endpoint timeout (default: 15000ms = 15 seconds)
TIMEOUT_WRITE_MS=15000
```

### Usage in Code

#### Global Timeout

Applied to all requests:

```typescript
import { timeoutMiddleware } from "./middleware/timeout";
import { config } from "./config";

app.use(timeoutMiddleware(parseInt(config.TIMEOUT_GLOBAL_MS, 10)));
```

#### Per-Route Timeout

Applied to specific endpoints:

```typescript
app.post(
  "/api/collateral/register",
  timeoutMiddleware(parseInt(config.TIMEOUT_WRITE_MS, 10)),
  asyncHandler(async (req, res) => {
    // Handler logic
  })
);
```

## Response Format

When a request times out, the middleware returns:

**Status Code**: `504 Gateway Timeout`

**Response Body**:
```json
{
  "error": "Request timeout"
}
```

## Logging

Timeout events are logged with the following context:

```typescript
{
  requestId: "uuid-v4",
  method: "POST",
  path: "/api/loan/request",
  timeoutMs: 15000
}
```

## Timeout Strategy by Endpoint Type

### Read Endpoints (30s timeout)
- `/api/health`
- `/api/loan/:id`
- `/api/health/:loanId`
- `/api/loans`

### Write Endpoints (15s timeout)
- `/api/collateral/register`
- `/api/loan/request`
- `/api/loan/repay`
- `/api/oracle/price-update`
- `/api/webhooks`

### Rationale

Write endpoints have stricter timeouts because:
1. They modify state and should complete quickly
2. Long-running writes can cause data inconsistencies
3. They're more likely to be retried by clients
4. They consume more server resources (database writes, RPC calls)

## Testing

Run tests:
```bash
npm test -- timeout
```

## Best Practices

1. **Set appropriate timeouts**: Consider your slowest legitimate operation
2. **Monitor timeout logs**: High timeout rates indicate performance issues
3. **Client-side handling**: Implement retry logic with exponential backoff
4. **Idempotency**: Use idempotency keys for write operations that may timeout
5. **Health checks**: Exclude health check endpoints from strict timeouts
