# CF Office Hours Platform

> **Note:** This is a project overview card. For technical documentation and setup instructions, see [README.md](README.md).

## Overview

A production-grade mentor-mentee matching and scheduling platform for a startup accelerator program, built with
TypeScript, React, and Cloudflare Workers. It pairs AI-assisted matching algorithms with event-driven, cached score
calculations for sub-100ms retrieval, a pluggable matching-algorithm interface, and reputation-based access control
enforced in the application layer.

## Quick Reference

| Field            | Value                                                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**       | Active (in development)                                                                                                                 |
| **Deployed URL** | [officehours.youcanjustdothings.io](https://officehours.youcanjustdothings.io) (production), API: api.officehours.youcanjustdothings.io |

## Technical Stack

| Category           | Technologies                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| **Languages**      | TypeScript 5.7.x                                                                                         |
| **Frontend**       | React 18.3.x, Vite 5.x, Shadcn/ui, Tailwind CSS 3.4.x                                                    |
| **Backend**        | Cloudflare Workers (Hono 4.x), OpenAPI 3.1 with Zod validation                                           |
| **Infrastructure** | Cloudflare Workers (API + static web assets), Cloudflare D1 (SQLite)                                     |
| **AI/ML**          | OpenAI (AI-based matching engine), pluggable matching algorithms                                         |
| **Auth**           | Worker-issued session JWT (`jose`), role-based demo login                                                |
| **Key Patterns**   | Plugin architecture (`IMatchingEngine`), event-driven cache, repository pattern, app-layer authorization |

## Key Achievements

- **Production TypeScript monorepo** (React frontend, Cloudflare Workers API, shared packages) with a Vitest +
  Playwright test suite.
- **Sub-100ms match retrieval** through an event-driven architecture with cached matching calculations stored in
  Cloudflare D1 with JSON explanations.
- **Pluggable algorithm system** via the `IMatchingEngine` interface, enabling A/B testing and gradual rollout of
  multiple matching algorithms (`tag-based-v1`, `ai-based-v1`) simultaneously.
- **Edge deployment** on Cloudflare Workers (API and static web assets).
- **Concurrency-safe booking** via an atomic transaction with a UNIQUE slot guard, preventing double-booking.
- **Relational D1 schema** with JSON-backed columns, audit and soft-delete columns, and reputation-tier access control.
- **Documentation-first approach** with architecture, deployment runbooks, and a frozen historical planning archive.

## Technical Highlights

- **Interface-Driven Matching:** the `IMatchingEngine` interface enables dependency injection and algorithm swapping
  without changing business logic, plus testability through mocked engines.
- **Event-Driven Cached Matching:** background match calculation triggered by data-change events (profile, tag, and
  reputation updates) writes results to a D1 cache table, eliminating live-scoring latency through pre-computation.
- **OpenAPI Contract-First Development:** `@hono/zod-openapi` generates the OpenAPI 3.1 spec from Zod schemas, which in
  turn generates the frontend's API types via `openapi-typescript` — one source of truth for the contract.

## Code Metrics

| Metric               | Value                                                                               |
| -------------------- | ----------------------------------------------------------------------------------- |
| **Primary Language** | TypeScript (strict mode, 5.7.x)                                                     |
| **Testing**          | Vitest 3.x (unit/integration) + Playwright 1.50.x (E2E)                             |
| **Key Dependencies** | Hono 4.x, React 18.3.x, jose 6.x, @tanstack/react-query 5.x, Zod 3.23.x, OpenAI 6.x |

## Roadmap (not yet implemented)

The following are not in the codebase today:

- OAuth and magic-link authentication (sign-in is demo login only).
- Calendar integration (Google Calendar, Microsoft Outlook) and Google Meet link generation.
- Additional notification channels beyond email.

---

*For detailed technical documentation, setup instructions, and contribution guidelines, please see
[README.md](README.md).*
