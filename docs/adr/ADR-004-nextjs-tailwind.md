# ADR-004: Next.js 14 + Tailwind CSS for the Frontend

**Date:** 2026-04-28  
**Status:** Accepted

## Context

StellarKraal needs a web frontend for borrowers and administrators to register animals, request loans, and monitor loan status. We needed a React-based framework with good developer experience, SSR/SSG capability, and a styling approach that keeps the UI consistent without a heavy component library.

## Decision

Use Next.js 14 (App Router) as the React framework and Tailwind CSS for styling.

## Alternatives Considered

| Option | Reason not chosen |
|--------|-------------------|
| Create React App (Vite SPA) | No SSR; worse SEO and initial load performance; less opinionated routing |
| Remix | Smaller ecosystem and community at the time of decision; team less familiar |
| Material UI / Chakra UI (component library) | Heavier bundle; harder to customise to a bespoke design; Tailwind utility classes are sufficient |
| Plain CSS / CSS Modules | More boilerplate for responsive layouts; Tailwind's utility-first approach is faster to iterate |

## Consequences

**Positive:**
- App Router enables server components, reducing client-side JavaScript.
- Built-in API routes available if lightweight BFF endpoints are needed.
- Tailwind's utility classes keep styles co-located with components and easy to audit.
- Large ecosystem, strong TypeScript support, and active maintenance.

**Negative / Trade-offs:**
- App Router is a relatively new paradigm; some patterns (e.g., data fetching, caching) require learning.
- Tailwind class strings can become verbose on complex components.
- Next.js version upgrades can introduce breaking changes requiring migration effort.
