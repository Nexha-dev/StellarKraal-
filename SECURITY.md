# Security Policy

## Supported Versions

Only the latest release on the `main` branch receives security fixes.

| Version | Supported |
|---------|-----------|
| `main` (latest) | ✅ |
| Older branches | ❌ |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

### Preferred: GitHub Private Advisory

Use [GitHub's private vulnerability reporting](https://github.com/teslims2/StellarKraal-/security/advisories/new) to submit a report confidentially. This is the fastest path to triage.

### Alternative: Email

Send a report to **security@stellarkraal.example.com** with:

- A description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept
- Affected component(s): backend API, frontend, Soroban smart contract, infrastructure
- Any suggested mitigations (optional)

### Encrypted Reports (Optional)

If you prefer to encrypt your report, request our PGP public key via the email above before sending.

## Response Timeline

| Milestone | Target |
|-----------|--------|
| Acknowledgment | Within 48 hours |
| Initial triage and severity assessment | Within 5 business days |
| Fix or mitigation | Within 30 days for critical/high; best-effort for lower severity |
| Public disclosure | Coordinated with reporter after fix is deployed |

We will keep you informed of progress throughout the process.

## Scope

### In Scope

- Authentication and authorization flaws (JWT handling, session management)
- Smart contract vulnerabilities (Soroban/Stellar on-chain logic)
- Injection vulnerabilities (SQL injection, command injection)
- Sensitive data exposure (loan data, wallet addresses, PII)
- Insecure direct object references in the REST API
- Dependency vulnerabilities with a realistic exploit path

### Out of Scope

- Vulnerabilities in third-party services (Stellar network, Soroban RPC)
- Issues requiring physical access to infrastructure
- Social engineering attacks
- Denial-of-service attacks against the testnet deployment
- Findings from automated scanners without a demonstrated impact
- Missing security headers on non-sensitive static assets

## Bug Bounty

There is currently no paid bug bounty program. We do publicly acknowledge researchers who responsibly disclose valid vulnerabilities in our `CHANGELOG.md` and release notes, with their permission.

## Disclosure Policy

We follow coordinated disclosure. Please allow us the response timeline above before publishing your findings. We will work with you to agree on a disclosure date once a fix is available.
