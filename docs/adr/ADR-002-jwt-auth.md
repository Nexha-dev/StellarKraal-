# ADR-002: JWT-Based Authentication Strategy

**Date:** 2026-04-28  
**Status:** Accepted

## Context

The backend API needs to authenticate requests from the Next.js frontend. Users identify themselves via a Stellar wallet (Freighter). We needed a stateless, wallet-compatible auth mechanism that works without a traditional username/password flow.

## Decision

Issue signed JWTs after the client proves wallet ownership via a challenge-response signature. The backend verifies the Stellar public key signature, then returns a short-lived JWT used for subsequent API calls.

## Alternatives Considered

| Option | Reason not chosen |
|--------|-------------------|
| Session cookies (server-side sessions) | Requires session store; adds statefulness and horizontal-scaling complexity |
| OAuth 2.0 / third-party IdP | No natural mapping to Stellar wallet identity; adds external dependency |
| API keys (static secrets) | Not suitable for end-user wallet-based identity; poor revocation story |

## Consequences

**Positive:**
- Stateless — no session store needed alongside SQLite.
- Standard library support in Node.js (`jsonwebtoken`).
- Works naturally with wallet-signed challenges (no password required).
- Easy to pass in `Authorization: Bearer` header from the frontend.

**Negative / Trade-offs:**
- JWTs cannot be invalidated before expiry without a denylist (adds state).
- Short expiry + refresh token logic must be implemented carefully to avoid UX friction.
- Private signing key must be kept secret and rotated on compromise.
