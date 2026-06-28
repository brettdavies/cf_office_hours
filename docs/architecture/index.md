# CF Office Hours Platform — Fullstack Architecture

This is the sharded architecture documentation for the platform as built: a Cloudflare Workers backend on Cloudflare D1,
a React + Vite SPA served as Workers static assets, and the shared schemas that connect them. Read the sections in order
or jump to one below.

## Sections

1. [Introduction](./1-introduction.md) — what this document is and how to read it.
2. [High Level Architecture](./2-high-level-architecture.md) — the two-Worker model, platform choices, and patterns.
3. [Tech Stack](./3-tech-stack.md) — languages, frameworks, and the compatibility date.
4. [Data Models](./4-data-models.md) — the eleven D1 tables and their relationships.
5. [API Specification](./5-api-specification.md) — the OpenAPI contract and endpoint groups.
6. [Components](./6-components.md) — web UI component organization.
7. [Frontend Architecture](./7-frontend-architecture.md) — SPA structure, routing, state, and auth flow.
8. [Backend Architecture](./8-backend-architecture.md) — Worker layering, matching engines, events, and cron.
9. [Unified Project Structure](./9-unified-project-structure.md) — the monorepo layout and environment variables.
10. [Development Workflow](./10-development-workflow.md) — local setup, migrations, and testing loop.
11. [Deployment Architecture](./11-deployment-architecture.md) — environments, deploys, and rollback.
12. [Security and Performance](./12-security-and-performance.md) — app-layer authz, JWTs, and the cache read path.
13. [Testing Strategy](./13-testing-strategy.md) — Vitest with the D1 shim, and Playwright E2E.
14. [Coding Standards](./14-coding-standards.md) — layering rules, error handling, and D1 conventions.
15. [Error Handling Strategy](./15-error-handling-strategy.md) — the single error type, envelope, and degradation.
16. [Monitoring and Observability](./16-monitoring-and-observability.md) — structured logging and dashboard metrics.

## Supplementary

- [Matching Cache Architecture](./matching-cache-architecture.md) — the event-driven cached matching design in depth.

## Related

- Setup and run: [`apps/api/README.md`](../../apps/api/README.md), [`apps/web/README.md`](../../apps/web/README.md).
- Deploy runbook: [`docs/deployment/DEPLOYMENT_INSTRUCTIONS.md`](../deployment/DEPLOYMENT_INSTRUCTIONS.md).
- Historical planning record: [`docs/archive/`](../archive/).
