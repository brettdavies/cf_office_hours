# 3. Tech Stack

This is the **DEFINITIVE technology selection** for the entire project. All versions reflect production-ready releases as of **July 2024** with recommended updates through **January 2025** based on stability and compatibility. This table is the single source of truth—all development must use these exact versions.

## 3.1 Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
|----------|-----------|---------|---------|-----------|
| **Frontend Language** | TypeScript | **5.7.x** | Type-safe JavaScript for frontend | Latest stable with improved performance and type inference |
| **Frontend Framework** | React | **18.3.x** (latest 18.x) | UI component library | Latest React 18 - stable ecosystem, React 19 still maturing |
| **Frontend Build Tool** | Vite | **5.x** (latest 5.x) | Dev server and bundler | Fast HMR, native ESM support, optimized for React |
| **UI Component Library** | Shadcn/ui | **Latest** (copy-paste) | Accessible, customizable components | Not versioned traditionally (copy components into codebase), full Tailwind control, WCAG 2.1 AA compliant |
| **CSS Framework** | Tailwind CSS | **3.4.x** | Utility-first styling | Stable - Tailwind 4.x has breaking config changes, stay on 3.4 |
| **State Management** | Zustand | **5.x** (latest) | Lightweight global state | Smaller bundle than Redux, React 18+ required, <1KB |
| **Form Management** | React Hook Form | **7.52.x** | Form validation and state | Minimal re-renders, integrates with Zod schemas, small bundle |
| **Backend Language** | TypeScript | **5.7.x** | Type-safe JavaScript for backend | Shared with frontend for monorepo consistency |
| **Backend Framework** | Hono | **4.x** (latest 4.x) | Web framework for Workers | Built for edge runtimes, fastest router benchmarks, Zod middleware support |
| **API Style** | REST (OpenAPI 3.1) | OpenAPI 3.1.0 | RESTful HTTP APIs | Mature tooling, simpler than GraphQL for CRUD operations |
| **API Validation** | Zod | **3.23.x** | Runtime schema validation | Single source of truth (schema → OpenAPI → TypeScript types), runtime type safety |
| **OpenAPI Integration** | @hono/zod-openapi | **Latest** (1.x) | Generate OpenAPI from Zod | Automates API docs, enables contract testing, generates frontend types |
| **Database** | PostgreSQL (Supabase) | **Latest** (Supabase managed) | Relational database | ACID compliance, Row Level Security built-in, Supabase manages version |
| **Database Client** | @supabase/supabase-js | **Latest** (Supabase managed) | Supabase SDK for JS/TS | Official client, handles auth + realtime + storage, auto-generated types |
| **ORM/Query Builder** | Drizzle ORM | **0.33.x** | Type-safe SQL query builder | Lightweight, edge-compatible, excellent TypeScript inference |
| **Cache** | Cloudflare KV | N/A (Platform) | Edge key-value storage | Low-latency global cache, free tier 100k reads/day |
| **File Storage** | Supabase Storage | N/A (Platform) | Object storage for files | S3-compatible, built-in CDN, RLS policies for access control |
| **Authentication** | Supabase Auth | N/A (Platform) | User authentication | Magic links + OAuth (Google/Microsoft), JWT tokens, RLS integration |
| **Real-time** | Supabase Realtime | N/A (Platform) | WebSocket subscriptions | Postgres logical replication, sub-second latency, scoped subscriptions |
| **Frontend Testing** | Vitest | **3.x** (latest) | Unit/integration testing | Vite-native, supports both Vite 5 & 6, rewritten reporting system |
| **React Testing** | Testing Library | **Latest** | Component testing | Encourages accessibility, user-centric queries |
| **Backend Testing** | Vitest | **3.x** (latest) | Unit/integration testing | Shared with frontend for consistency |
| **E2E Testing** | Playwright | **1.50.x+** (latest) | Browser automation | IndexedDB support, better trace viewer, cookie partitioning |
| **Type Generation** | openapi-typescript | **Latest** (7.x) | Generate TS types from OpenAPI | Ensures frontend/backend type alignment |
| **Bundler** | esbuild (via Vite/Wrangler) | **Latest** (via tooling) | JavaScript/TypeScript bundler | Embedded in Vite and Wrangler, managed automatically |
| **Monorepo Tool** | npm workspaces | Built-in (npm 10.x) | Monorepo management | Zero-config, sufficient for small monorepo |
| **Cloudflare Workers** | Cloudflare Workers | **compatibility_date: 2025-03-11** | Serverless edge runtime | nodejs_compat with process.env support, V8 14.0, native Buffer/AsyncLocalStorage |
| **Cloudflare Pages** | Cloudflare Pages | N/A (Platform) | Static site hosting | Platform service, automatic updates |
| **IaC Tool** | Wrangler | **Latest** (3.x) | Cloudflare Workers deployment | Official CLI for Workers/Pages deployment |
| **CI/CD** | GitHub Actions | N/A (Platform) | Automated testing and deployment | Platform service, YAML-based workflows |
| **Linting** | ESLint | **8.57.x** | Code quality enforcement | Stay on 8.x - ESLint 9 has breaking flat config changes |
| **Formatting** | Prettier | **3.x** (latest) | Code formatting | Opinionated formatter, zero config needed |
| **Monitoring** | Cloudflare Analytics | N/A (Platform) | Basic request metrics | Built-in, free, tracks Workers/Pages performance |
| **Logging** | Cloudflare Logs | N/A (Platform) | Application logging | Console logs captured by Cloudflare |
| **Email Notifications** | Supabase Auth (built-in) | N/A (Platform) | Transactional emails | Native email service for magic links + notifications |

## 3.2 Cloudflare Compatibility Date

**Setting:** `compatibility_date = "2025-03-11"`

This compatibility date in `wrangler.toml` enables:
- ✅ Native Node.js APIs (Buffer, AsyncLocalStorage, crypto, etc.)
- ✅ `process.env` automatically populated from bindings
- ✅ V8 14.0 performance improvements
- ✅ Uint8Array base64/hex native operations
- ✅ Enhanced security (V8 Sandbox)

**Example `wrangler.toml`:**
```toml
name = "cf-office-hours-api"
main = "src/index.ts"
compatibility_date = "2025-03-11"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "production"

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"
```

## 3.3 Email Notification Strategy

**Using Supabase Auth Native Email:**

Supabase Auth includes built-in transactional email for:
- Magic link authentication
- Password resets
- Email confirmations

**For custom notifications** (booking confirmations, reminders, cancellations):

**Recommendation for MVP:**
Start with **Supabase Auth's native email** for magic links and basic notifications. If custom HTML templates or higher volume needed, add SendGrid SMTP integration (free tier: 100 emails/day) called directly from Cloudflare Workers.

---
