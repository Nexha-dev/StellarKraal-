# Contributing to StellarKraal

Thank you for helping improve StellarKraal! This guide covers the commit convention, branching strategy, and automated release process.

---

## Commit Convention — Conventional Commits

All commits **must** follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification. This is required for the automated changelog and semantic versioning to work correctly.

### Format

```
<type>(<optional scope>): <short description>

[optional body]

[optional footer(s)]
```

### Types

| Type | When to use | Version bump |
|------|-------------|--------------|
| `feat` | New feature | minor |
| `fix` | Bug fix | patch |
| `docs` | Documentation only | patch |
| `refactor` | Code change with no feature/fix | patch |
| `test` | Adding or fixing tests | patch |
| `chore` | Build, CI, tooling changes | patch |
| `perf` | Performance improvement | patch |
| `BREAKING CHANGE` | Footer or `!` after type | major |

### Examples

```bash
feat(loans): add partial repayment support
fix(wallet): handle Freighter connection timeout
docs: update FAQ with liquidation questions
feat!: change collateral ID format (BREAKING CHANGE)
```

---

## Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code; triggers release-please |
| `feat/<name>` | New features |
| `fix/<name>` | Bug fixes |
| `chore/<name>` | Tooling, CI, dependency updates |

Open a pull request from your branch into `main`. Squash-merge to keep history clean.

---

## Automated Release Process (release-please)

This project uses [release-please](https://github.com/googleapis/release-please) to automate releases.

### How it works

1. You push Conventional Commits to `main`.
2. The `release-please` GitHub Actions workflow (`.github/workflows/release-please.yml`) opens a **Release PR** that:
   - Bumps the version in `package.json` following semver rules.
   - Updates `CHANGELOG.md` with entries grouped by type.
3. When the Release PR is merged, release-please:
   - Creates a **GitHub Release** with the changelog notes.
   - Tags the commit (e.g. `v1.2.0`).

### Manual steps (none required for normal releases)

If you need to cut a release manually, merge the open Release PR created by release-please. Do **not** manually edit `CHANGELOG.md` — it is auto-generated.

---

## Development Setup

```bash
# Clone
git clone https://github.com/teslims2/StellarKraal-.git
cd StellarKraal-

# Frontend
cd frontend && npm install && npm run dev

# Backend
cd backend && npm install && npm run dev

# Smart contract (requires Rust + stellar-cli)
stellar contract build
```

## Running Tests

```bash
npm run test:frontend   # Jest component tests
npm run test:backend    # Backend unit + integration tests
npm run test:contract   # Soroban contract tests
```

---

## Reporting Issues

- **Bugs**: Open a [GitHub issue](https://github.com/teslims2/StellarKraal-/issues/new?template=bug_report.md).
- **Security vulnerabilities**: Follow the responsible disclosure process in `SECURITY.md`.
- **Feature requests**: Open an issue with the `enhancement` label.
