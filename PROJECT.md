# CF Office Hours Platform

> **Note:** This is a project overview card. For technical documentation and setup instructions, see [README.md](README.md).

## Overview

A production-grade intelligent mentor-mentee matching and scheduling platform built for Capital Factory's startup accelerator program using TypeScript, React, and Cloudflare Workers. Replaces legacy Union.vc with AI-powered matching algorithms, event-driven cached calculations achieving sub-100ms response times, pluggable provider interfaces for calendar integration (Google Calendar, Microsoft Outlook), and reputation-based access control enforced at the database layer.

## Quick Reference

| Field | Value |
|-------|-------|
| **Status** | Active (in development) |
| **Deployed URL** | [officehours.youcanjustdothings.io](https://officehours.youcanjustdothings.io) (production), API: api.officehours.youcanjustdothings.io |
| **Build Time** | 19 days (Oct 2 - Oct 21, 2025) |

## Technical Stack

| Category | Technologies |
|----------|--------------|
| **Languages** | TypeScript 5.7.x |
| **Frontend** | React 18.3.x, Vite 5.x, Shadcn/ui, Tailwind CSS 3.4.x |
| **Backend** | Cloudflare Workers (Hono 4.x), OpenAPI 3.1 with Zod validation |
| **Infrastructure** | Supabase (PostgreSQL, Auth, Storage, Realtime), Cloudflare Pages/Workers |
| **AI/ML** | OpenAI GPT (AI-powered mentor-mentee matching), pluggable matching algorithms |
| **Key Patterns** | Plugin architecture (IMatchingEngine), Event-driven cache system, Interface-based providers (calendar, notifications), Repository pattern, Row-Level Security (RLS) |

## Key Achievements

- **38,386 lines of production TypeScript** across monorepo (React frontend, Cloudflare Workers API, shared packages) with 70+ test files achieving comprehensive coverage
- **Sub-100ms match retrieval** through event-driven architecture with cached AI-powered matching calculations stored in PostgreSQL with JSONB explanations
- **Pluggable algorithm system** via IMatchingEngine interface enabling A/B testing and gradual rollout of multiple matching algorithms simultaneously
- **Zero-downtime edge deployment** on Cloudflare's 300+ global locations with serverless Workers eliminating cold starts
- **Real-time collaboration** using Supabase Realtime WebSocket subscriptions preventing race conditions in concurrent booking scenarios
- **17 database migrations** implementing Row-Level Security (RLS) policies, JSONB schema validation, and automated reputation tier calculations
- **Documentation-first approach** with 70+ markdown files covering architecture, PRD, user stories, deployment runbooks, and comprehensive testing strategy
- **Multi-provider calendar integration** through ICalendarProvider interface supporting Google Calendar and Microsoft Outlook OAuth flows

## Technical Highlights

- **Interface-Driven Architecture:** Implemented polymorphic provider pattern with IMatchingEngine, ICalendarProvider, INotificationProvider, and IReputationCalculator interfaces enabling dependency injection, algorithm swapping without business logic changes, and testability through mocked implementations
- **Event-Driven Cached Matching:** Designed background match calculation system triggered by data change events (user profile updates, tag changes, reputation tier changes) writing results to PostgreSQL cache table, eliminating 2-5 second UI wait times through pre-computation
- **OpenAPI Contract-First Development:** Leveraged @hono/zod-openapi to generate OpenAPI 3.1 specification from Zod schemas ensuring single source of truth, automated type generation for frontend via openapi-typescript, and API documentation through Swagger UI

## Code Metrics

| Metric | Value |
|--------|-------|
| **Lines of Code** | 38,386 (TypeScript/JavaScript) |
| **Primary Language** | TypeScript 100% (strict mode with 5.7.x) |
| **Test Coverage** | 70+ test files (unit, integration, E2E with Vitest 3.x + Playwright 1.50.x) |
| **Key Dependencies** | Hono 4.x, React 18.3.x, @supabase/supabase-js 2.39.x, @tanstack/react-query 5.x, Zod 3.23.x, OpenAI 6.2.x, googleapis 131.x |

---

*For detailed technical documentation, setup instructions, and contribution guidelines, please see [README.md](README.md).*
