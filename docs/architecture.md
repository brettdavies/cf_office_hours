# CF Office Hours Platform - Fullstack Architecture Document

**Version:** 1.0
**Date:** 2025-10-02
**Status:** Complete - Aligned with PRD v2.0

---

## Table of Contents

1. [Introduction](#introduction)
2. [High Level Architecture](#high-level-architecture)
3. [Tech Stack](#tech-stack)
4. [Data Models](#data-models)
5. [API Specification](#api-specification)
6. [Components](#components)
7. [Frontend Architecture](#frontend-architecture)
8. [Backend Architecture](#backend-architecture)
9. [Unified Project Structure](#unified-project-structure)
10. [Development Workflow](#development-workflow)
11. [Deployment Architecture](#deployment-architecture)
12. [Security and Performance](#security-and-performance)
13. [Testing Strategy](#testing-strategy)
14. [Coding Standards](#coding-standards)
15. [Error Handling Strategy](#error-handling-strategy)
16. [Monitoring and Observability](#monitoring-and-observability)

---

## 1. Introduction

This document outlines the complete fullstack architecture for **CF Office Hours Platform**, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack.

This unified approach combines what would traditionally be separate backend and frontend architecture documents, streamlining the development process for a modern fullstack application where these concerns are increasingly intertwined.

The platform replaces Union.vc to provide intelligent mentor-mentee matching, seamless calendar integration, reputation-based access control, and automated meeting scheduling for Capital Factory's startup accelerator program.

### 1.1 Starter Template or Existing Project

**Decision:** N/A - Greenfield project with predefined stack

No starter template is required since the architecture is already well-defined. The project will use:
- Vite for React frontend scaffolding
- Hono framework for API development
- Cloudflare Workers for serverless deployment

This is a **greenfield project** with a clearly defined tech stack:

- **Frontend:** React + Vite hosted on Cloudflare Pages
- **Backend:** Cloudflare Workers with Hono framework
- **Database:** Supabase (Postgres + Auth + Storage + Realtime)
- **UI:** Shadcn/ui + Tailwind CSS

### 1.2 Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-02 | 1.0 | Initial architecture document | Winston (Architect Agent) |

---

## 2. High Level Architecture

### 2.1 Technical Summary

The CF Office Hours Platform employs a **serverless Jamstack architecture** with edge-deployed APIs and centralized data management. The frontend is a React SPA hosted on Cloudflare Pages, communicating with RESTful APIs running on Cloudflare Workers at the edge. Supabase provides the operational database (Postgres), authentication layer, file storage, and real-time subscription infrastructure. The system maintains a **one-way data sync** from Airtable (source of truth for user management) via webhook-triggered Workers, while all booking, scheduling, and reputation logic lives exclusively in Supabase.

Calendar integrations (Google Calendar, Microsoft Outlook) use OAuth 2.0 flows to access user availability and create meeting events, with Google Meet links auto-generated for virtual sessions. The architecture emphasizes **interface-based modularity** for calendar providers, matching algorithms, reputation calculators, and notification delivery—enabling future extensibility without touching core business logic.

This design achieves the PRD's goals through: (1) **intelligent matching** via pluggable tag-based algorithms, (2) **reputation-driven access control** enforced at the database layer, (3) **real-time booking updates** via Supabase subscriptions, and (4) **seamless scheduling** through bi-directional calendar sync.

### 2.2 Platform and Infrastructure Choice

Based on the PRD's requirements for budget constraints (free tier only), scale (~500 users), and technical stack preferences, I've evaluated the following options:

**Option 1: Cloudflare Pages + Workers + Supabase** ⭐ **RECOMMENDED**
- **Pros:**
  - Workers have zero cold starts (V8 isolates vs containers)
  - Generous free tiers align perfectly (100k requests/day Workers, unlimited Pages bandwidth)
  - Edge deployment reduces latency globally
  - Supabase provides Postgres + Auth + Storage + Realtime in one platform
- **Cons:**
  - Workers have 10ms CPU limit (requires async patterns for heavy work)
  - Less mature ecosystem than AWS/Vercel
- **Cost:** $0/month for MVP scale

**Option 2: Vercel + Supabase**
- **Pros:**
  - Excellent DX for React apps
  - Simpler deployment pipeline
- **Cons:**
  - Serverless Functions have cold starts (300-600ms)
  - Free tier bandwidth limited to 100GB/month (vs unlimited on Cloudflare Pages)
  - Edge Functions cost more at scale
- **Cost:** $0/month initially, may exceed free tier with heavy pitch deck downloads

**Option 3: AWS (Amplify + Lambda + Cognito + RDS)**
- **Pros:**
  - Enterprise-grade reliability
  - Maximum flexibility
- **Cons:**
  - Complexity overkill for MVP
  - Free tier expires after 12 months
  - Requires significant DevOps expertise
- **Cost:** ~$50-100/month after free tier expires

**RECOMMENDATION:** **Option 1 (Cloudflare + Supabase)**
This combination maximizes free tier generosity, eliminates cold starts, and consolidates backend services into Supabase's unified platform—reducing integration complexity while staying within budget.

---

**Platform:** Cloudflare (Pages + Workers)
**Key Services:**
- **Cloudflare Pages:** Frontend hosting (React SPA)
- **Cloudflare Workers:** Serverless API endpoints (Hono framework)
- **Supabase Postgres:** Operational database with Row Level Security
- **Supabase Auth:** Magic link + OAuth (Google/Microsoft)
- **Supabase Storage:** Pitch decks, avatars, documents
- **Supabase Realtime:** WebSocket subscriptions for live slot updates
- **Airtable:** External source of truth (user data, taxonomy)
- **Google Calendar API / Microsoft Graph API:** Calendar integration

**Deployment Host and Regions:**
- **Frontend:** Global edge network via Cloudflare Pages (automatic)
- **API:** Cloudflare Workers edge network (300+ locations globally)
- **Database:** Supabase US East region (configurable)

### 2.3 Repository Structure

For a fullstack project of this size (~500 users, 3-5 AI agent developers), a **monorepo with npm workspaces** provides the optimal balance of simplicity and shared code benefits without heavy tooling overhead.

**Rationale:**
- **Shared TypeScript types** between frontend/backend (OpenAPI-generated from Zod schemas)
- **Single deployment pipeline** via GitHub Actions
- **Simplified dependency management** (one root `package.json`)
- **No monorepo tool complexity** (Turborepo/Nx overkill for 2-3 packages)

**Repository Details:**
- Single frontend app (no separate admin dashboard)
- No mobile app (responsive web design for mobile-friendly experience)

---

**Structure:** Monorepo
**Monorepo Tool:** npm workspaces (built-in, zero config)
**Package Organization:**
- `apps/web` - React frontend (Vite + Shadcn/ui)
- `apps/api` - Cloudflare Workers (Hono + Zod)
- `packages/shared` - Shared TypeScript types, constants, utilities
- `packages/config` - Shared ESLint, TypeScript, Prettier configs

### 2.4 High Level Architecture Diagram

```mermaid
graph TB
    subgraph External["External Systems"]
        AT[Airtable<br/>User Data & Taxonomy]
        GCAL[Google Calendar API]
        MSGRAPH[Microsoft Graph API]
        GMEET[Google Meet API]
    end

    subgraph Edge["Cloudflare Edge Network"]
        PAGES[Cloudflare Pages<br/>React SPA]
        WORKERS[Cloudflare Workers<br/>Hono API]
    end

    subgraph Backend["Supabase Backend"]
        AUTH[Supabase Auth<br/>Magic Link + OAuth]
        DB[(Supabase Postgres<br/>Users, Bookings, Ratings)]
        STORAGE[Supabase Storage<br/>Pitch Decks, Avatars]
        RT[Supabase Realtime<br/>WebSocket Subscriptions]
    end

    USER[Users<br/>Mentors & Mentees] -->|HTTPS| PAGES
    PAGES -->|REST API| WORKERS
    PAGES -->|Auth & Realtime| AUTH
    PAGES -.->|WebSocket| RT

    WORKERS -->|SQL Queries| DB
    WORKERS -->|File Uploads| STORAGE
    WORKERS -->|OAuth & Availability| GCAL
    WORKERS -->|OAuth & Availability| MSGRAPH
    WORKERS -->|Generate Meet Links| GMEET

    AT -->|Webhook on CRUD| WORKERS
    WORKERS -->|Sync User Data| DB

    AUTH -->|JWT Tokens| WORKERS
    DB -.->|Change Events| RT
```

### 2.5 Architectural Patterns

- **Jamstack Architecture:** Static frontend with serverless APIs - _Rationale: Optimal performance, global CDN distribution, and simplified scaling without server management_

- **Edge Computing:** API logic runs at Cloudflare edge locations - _Rationale: Reduces latency for geographically distributed users (mentors/mentees across time zones)_

- **Interface-Based Abstractions:** Calendar, Matching, Reputation, Notifications use dependency injection - _Rationale: PRD requirement (Section 1.8) enables swapping providers without touching business logic_

- **Event-Driven Sync:** Airtable webhooks trigger real-time data synchronization - _Rationale: Minimizes API calls, keeps data fresh only when changes occur_

- **Optimistic UI with Realtime Sync:** Frontend updates immediately, reconciles via Supabase Realtime - _Rationale: Prevents double-booking race conditions (NFR7) while maintaining snappy UX_

- **Repository Pattern:** Data access layer abstracts database queries - _Rationale: Enables testing with mocks, centralizes query logic_

- **Row Level Security (RLS):** Postgres policies enforce role-based access - _Rationale: Security at database layer prevents accidental data leaks even if API logic fails_

- **Backend for Frontend (BFF) Pattern:** Cloudflare Workers aggregate data for specific UI needs - _Rationale: Reduces frontend complexity, combines multiple data sources (Supabase + external APIs) efficiently_

- **Contract-First API Design:** OpenAPI spec generated from Zod schemas drives frontend type generation - _Rationale: Single source of truth prevents frontend/backend drift (NFR34)_

---

## 3. Tech Stack

This is the **DEFINITIVE technology selection** for the entire project. All versions reflect production-ready releases as of **July 2024** with recommended updates through **January 2025** based on stability and compatibility. This table is the single source of truth—all development must use these exact versions.

### 3.1 Technology Stack Table

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

### 3.2 Cloudflare Compatibility Date

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

### 3.3 Email Notification Strategy

**Using Supabase Auth Native Email:**

Supabase Auth includes built-in transactional email for:
- Magic link authentication
- Password resets
- Email confirmations

**For custom notifications** (booking confirmations, reminders, cancellations):

**Recommendation for MVP:**
Start with **Supabase Auth's native email** for magic links and basic notifications. If custom HTML templates or higher volume needed, add SendGrid SMTP integration (free tier: 100 emails/day) called directly from Cloudflare Workers.

---

## 4. Data Models

Based on the PRD requirements and database schema design, the following TypeScript interfaces define the core data models/entities that will be shared between frontend and backend. These interfaces will live in `packages/shared` for type safety across the stack.

### 4.1 User & Profile Models

**Purpose:** Represents system users with role-based access and reputation tracking

**Key Attributes:**
- `id`: UUID - Primary identifier
- `airtable_record_id`: string - Stable external reference from Airtable source of truth
- `email`: string - Authentication and communication
- `role`: UserRole enum - Access control (mentee, mentor, coordinator) - **Single role per user in MVP**
- `reputation_score`: number - Calculated value (default 3.5 for cold start per FR47)
- `reputation_tier`: ReputationTier enum - Derived tier (bronze, silver, gold, platinum)
- `is_active`: boolean - Soft delete flag synced from Airtable
- `last_activity_at`: timestamp - Tracks dormancy (90+ days = dormant per FR57)

**TypeScript Interface:**

```typescript
// packages/shared/src/types/user.ts

export enum UserRole {
  Mentee = 'mentee',
  Mentor = 'mentor',
  Coordinator = 'coordinator',
}

export enum ReputationTier {
  Bronze = 'bronze',   // 0-3.0: 2 bookings/week max
  Silver = 'silver',   // 3.0-4.0: 5 bookings/week max
  Gold = 'gold',       // 4.0-4.5: 10 bookings/week max
  Platinum = 'platinum' // 4.5+: Unlimited bookings
}

export interface User {
  id: string;
  airtable_record_id: string;
  email: string;
  role: UserRole;
  reputation_score: number;
  reputation_tier: ReputationTier;
  is_active: boolean;
  last_activity_at: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  title: string | null;
  company: string | null;
  phone: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  pitch_vc_url: string | null; // Mentee-specific
  expertise_description: string | null; // Mentor-specific
  ideal_mentee_description: string | null; // Mentor-specific
  bio: string | null;
  avatar_url: string | null;
  avatar_source_type: 'upload' | 'url' | null;
  avatar_metadata: AvatarCropSettings | null;
  reminder_preference: ReminderPreference;
  additional_links: Record<string, string>; // Flexible JSONB
  metadata: Record<string, any>; // Experimentation escape hatch
  created_at: Date;
  updated_at: Date;
}

export interface AvatarCropSettings {
  zoom: number;
  pan_x: number;
  pan_y: number;
  rotation: number;
}

export enum ReminderPreference {
  OneHour = 'one_hour',
  TwentyFourHours = 'twenty_four_hours',
  Both = 'both',
}

// Combined view for API responses
export interface UserWithProfile extends User {
  profile: UserProfile;
}
```

**Relationships:**
- User → UserProfile (1:1)
- User → UserTags (1:many)
- User → Bookings as mentor/mentee (1:many)
- User → CalendarIntegration (1:1, optional except for non-coordinators per FR105)

### 4.2 Tag & Taxonomy Models

**Purpose:** Industry/technology/stage categorization for matching and filtering

**Key Attributes:**
- `category`: TagCategory enum - Type of classification
- `tag_value`: string - Machine-readable value (**normalized to lowercase_snake_case**)
- `source`: TagSource enum - Origin of tag (airtable, user, auto_generated, admin)
- `is_confirmed`: boolean - Whether user has confirmed the tag
- `is_approved`: boolean - For taxonomy entries, whether coordinator approved

**TypeScript Interface:**

```typescript
// packages/shared/src/types/tag.ts

export enum TagCategory {
  Industry = 'industry',
  Technology = 'technology',
  Stage = 'stage',
}

export enum TagSource {
  Airtable = 'airtable',     // Synced from Airtable (auto-confirmed)
  User = 'user',             // User manually selected from taxonomy
  AutoGenerated = 'auto_generated', // System suggested (future AI feature)
  Admin = 'admin',           // Coordinator added
}

export interface UserTag {
  id: string;
  user_id: string;
  category: TagCategory;
  tag_value: string;
  is_confirmed: boolean;
  source: TagSource;
  confirmed_at: Date | null;
  confirmed_by: string | null; // User ID who confirmed
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface TaxonomyEntry {
  id: string;
  airtable_record_id: string | null; // Null for user-submitted
  category: TagCategory;
  value: string; // Machine-readable, lowercase_snake_case (e.g., "artificial_intelligence")
  display_name: string; // Human-readable (e.g., "Artificial Intelligence")
  source: TagSource;
  is_approved: boolean;
  requested_by: string | null; // User ID for user_request source
  approved_by: string | null; // Coordinator user ID
  requested_at: Date | null;
  approved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
```

**Tag Normalization:**
- Backend always converts `value` to lowercase_snake_case
- Original input stored in `display_name`
- Database unique constraint on `LOWER(value)` prevents duplicates

**Relationships:**
- UserTag → User (many:1)
- UserTag → TaxonomyEntry (many:1 via category + tag_value lookup)

### 4.3 Availability & Booking Models

**Purpose:** Mentor availability scheduling and booking management

**Key Design Notes:**
- Availability blocks define recurring patterns (weekly, monthly, etc.)
- Time slots are generated instances from availability blocks
- **Time Slot Generation Strategy:**
  - Generate slots for next 30 days on availability block save
  - Background job (triggered on coordinator login) generates next 30 days weekly (rolling window)
  - Keeps `time_slots` table manageable (~500 mentors × 4 blocks × 30 slots = 60k rows max)
- Bookings link mentees to specific time slots with meeting details

**TypeScript Interface:**

```typescript
// packages/shared/src/types/availability.ts

export enum RecurrencePattern {
  OneTime = 'one_time',
  Weekly = 'weekly',
  Monthly = 'monthly',
  Quarterly = 'quarterly',
}

export enum MeetingType {
  InPersonPreset = 'in_person_preset',
  InPersonCustom = 'in_person_custom',
  Online = 'online',
}

export interface AvailabilityBlock {
  id: string;
  mentor_id: string;
  recurrence_pattern: RecurrencePattern;
  start_date: string; // ISO date string (YYYY-MM-DD)
  end_date: string | null; // Null for ongoing
  start_time: string; // Time only (HH:MM:SS)
  end_time: string; // Time only (HH:MM:SS)
  slot_duration_minutes: 15 | 20 | 30 | 60;
  buffer_minutes: number;
  meeting_type: MeetingType;
  location_preset_id: string | null;
  location_custom: string | null;
  description: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface TimeSlot {
  id: string;
  availability_block_id: string;
  mentor_id: string;
  start_time: Date; // Full UTC datetime
  end_time: Date; // Full UTC datetime
  is_booked: boolean;
  booking_id: string | null;
  created_at: Date;
  deleted_at: Date | null;
}

export enum BookingStatus {
  Confirmed = 'confirmed',
  Completed = 'completed',
  Canceled = 'canceled',
}

export enum CancellationReason {
  Emergency = 'emergency',
  Reschedule = 'reschedule',
  Other = 'other',
}

export interface Booking {
  id: string;
  time_slot_id: string;
  mentor_id: string;
  mentee_id: string;
  meeting_goal: string; // Required, min 10 chars
  materials_urls: string[];
  meeting_type: MeetingType;
  location: string | null;
  google_meet_link: string | null; // Auto-generated per FR62
  status: BookingStatus;
  canceled_by: string | null; // User ID
  canceled_at: Date | null;
  cancellation_reason: CancellationReason | null;
  cancellation_notes: string | null;
  meeting_start_time: Date;
  meeting_end_time: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

// Extended booking with participant details for UI
export interface BookingWithParticipants extends Booking {
  mentor: UserWithProfile;
  mentee: UserWithProfile;
  time_slot: TimeSlot;
}
```

**Relationships:**
- AvailabilityBlock → TimeSlots (1:many, generated)
- TimeSlot → Booking (1:1, when booked)
- Booking → User (many:1 for mentor, many:1 for mentee)

### 4.4 Reputation & Rating Models

**Purpose:** Track user ratings and calculate reputation scores with tier assignment

**Key Attributes:**
- Ratings are 1-5 star reviews after meetings
- Reputation history tracks score changes and calculation details
- **Mentor-specific exception requests** handle tier restriction bypass per FR54
- **Responsiveness Factor Calculation:**
  - Default: 1.0× multiplier
  - Late cancellation (within 2hrs per FR60): 0.8× penalty
  - Time between mentor-initiated override request creation and booking acceptance (tracked for future enhancements)

**TypeScript Interface:**

```typescript
// packages/shared/src/types/reputation.ts

export interface Rating {
  id: string;
  booking_id: string;
  rater_id: string; // Who gave the rating
  rated_user_id: string; // Who received the rating
  score: 1 | 2 | 3 | 4 | 5;
  feedback_text: string | null;
  created_at: Date;
  deleted_at: Date | null;
}

export enum ReputationTrigger {
  RatingReceived = 'rating_received',
  MeetingCompleted = 'meeting_completed',
  MeetingCanceled = 'meeting_canceled',
  AdminOverride = 'admin_override',
}

export interface ReputationCalculationDetails {
  average_rating: number;
  completion_rate: number;
  responsiveness_factor: number; // 1.0× default, 0.8× for late cancellations
  tenure_bonus: number;
  raw_score: number;
  probationary_clamp_applied: boolean;
  ratings_count: number;
}

export interface ReputationHistory {
  id: string;
  user_id: string;
  old_score: number | null;
  new_score: number;
  old_tier: ReputationTier | null;
  new_tier: ReputationTier;
  calculation_details: ReputationCalculationDetails;
  trigger_event: ReputationTrigger;
  created_at: Date;
}

export enum OverrideStatus {
  Pending = 'pending',
  Approved = 'approved',
  Denied = 'denied',
}

export enum OverrideScope {
  OneTime = 'one_time', // MVP: Single booking with specific mentor within 7 days
}

// NOTE: Tier-based overrides not supported in MVP - only mentor-specific exceptions
export interface TierOverrideRequest {
  id: string;
  mentee_id: string;
  mentor_id: string; // Specific mentor (not tier-based)
  reason: string;
  status: OverrideStatus;
  scope: OverrideScope;
  expires_at: Date; // 7 days from approval (or creation for pending)
  used_at: Date | null; // When booking was made using this override
  reviewed_by: string | null; // Coordinator user ID
  reviewed_at: Date | null;
  review_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

// Extended view for coordinator dashboard
export interface TierOverrideRequestWithUsers extends TierOverrideRequest {
  mentee: UserWithProfile;
  mentor: UserWithProfile;
  reviewer: UserWithProfile | null;
}
```

**Optimistic Locking for Override Approvals:**
- Use `UPDATE WHERE status = 'pending'` to prevent duplicate approvals
- First coordinator approval wins
- Second attempt returns 409 Conflict

**Relationships:**
- Rating → Booking (many:1)
- Rating → User as rater (many:1)
- Rating → User as rated (many:1)
- ReputationHistory → User (many:1)
- TierOverrideRequest → User as mentee (many:1)
- TierOverrideRequest → User as mentor (many:1)

### 4.5 Calendar Integration Models

**Purpose:** OAuth calendar connectivity for Google/Microsoft calendars per FR21/FR105

**Key Attributes:**
- OAuth tokens and refresh tokens for calendar API access
- Multi-calendar support (select which calendars to read/write)
- Connection method tracks OAuth signup vs post-login connection

**TypeScript Interface:**

```typescript
// packages/shared/src/types/calendar.ts

export enum CalendarProvider {
  Google = 'google',
  Microsoft = 'microsoft',
}

export enum ConnectionMethod {
  OAuthSignup = 'oauth_signup',     // FR2: Combined auth + calendar during signup
  PostLogin = 'post_login',         // Magic link users connect post-auth
}

export interface CalendarInfo {
  id: string;
  name: string;
  is_primary: boolean;
  color: string | null;
}

export interface CalendarIntegration {
  id: string;
  user_id: string;
  provider: CalendarProvider;
  access_token: string; // Encrypted at rest
  refresh_token: string; // Encrypted at rest
  token_expires_at: Date;
  granted_scopes: string[]; // OAuth scopes granted
  connection_method: ConnectionMethod;
  is_connected: boolean;
  available_calendars: CalendarInfo[];
  write_calendar_id: string | null; // Which calendar to create events in
  read_calendar_ids: string[]; // Which calendars to check for conflicts
  last_sync_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// API response for calendar sync status
export interface CalendarSyncStatus {
  is_connected: boolean;
  provider: CalendarProvider | null;
  last_sync_at: Date | null;
  calendars_count: number;
}
```

**Relationships:**
- CalendarIntegration → User (1:1, unique constraint per user in MVP)

### 4.6 Notification & Audit Models

**Purpose:** Track notification delivery and admin actions for compliance

**TypeScript Interface:**

```typescript
// packages/shared/src/types/notification.ts

export enum NotificationType {
  BookingConfirmed = 'booking_confirmed',
  BookingCancelled = 'booking_cancelled',
  BookingReminder = 'booking_reminder',
  RatingRequest = 'rating_request',
  TierChanged = 'tier_changed',
  MentorReachOut = 'mentor_reach_out',
  OverrideApproved = 'override_approved',
  OverrideRejected = 'override_rejected',
  TagApprovalPending = 'tag_approval_pending',
}

export enum DeliveryChannel {
  Email = 'email',
  Toast = 'toast',
  Both = 'both',
}

export enum DeliveryStatus {
  Sent = 'sent',
  Failed = 'failed',
}

export interface NotificationLog {
  id: string;
  notification_type: NotificationType;
  recipient_id: string;
  delivery_channel: DeliveryChannel;
  delivery_status: DeliveryStatus;
  error_message: string | null;
  metadata: Record<string, any>; // booking_id, mentor_id, etc.
  sent_at: Date | null;
  created_at: Date;
}

export interface AuditLog {
  id: string;
  action_type: string; // 'reputation_override', 'meeting_canceled', etc.
  admin_user_id: string;
  target_entity_type: string; // 'booking', 'user', etc.
  target_entity_id: string;
  before_value: Record<string, any> | null;
  after_value: Record<string, any> | null;
  reason: string | null;
  created_at: Date;
}
```

**Relationships:**
- NotificationLog → User (many:1 recipient)
- AuditLog → User (many:1 admin)

### 4.7 Edge Case Handling

**User Deletion (Airtable Sync):**
- Soft delete user (`is_active = false`)
- Send notification to BOTH parties + coordinators
- **24-hour undo window:** Coordinator can manually reactivate
- After 24hrs, meetings auto-cancel permanently

**Rating After User Deletion:**
- Deleted users (`deleted_at IS NOT NULL`) cannot submit ratings
- Other parties in the meeting can still rate the deleted user

**Mutual Availability Indicator:**
- Best-effort indication (not guarantee)
- Booking confirmation checks BOTH calendars via API (FR106)
- If conflict detected: Show error, remove ⭐ indicator, refresh slot list
- User picks different slot

---

## 5. API Specification

Based on the chosen API style (REST with OpenAPI 3.1), the API contract is defined using **Hono + Zod + @hono/zod-openapi**. This approach generates TypeScript types and OpenAPI documentation from a single source of truth.

### 5.1 API Design Philosophy

**Contract-First Approach:**
1. Define Zod schemas for all requests/responses
2. Generate OpenAPI 3.1 spec using `@hono/zod-openapi`
3. Generate frontend TypeScript types using `openapi-typescript`
4. Validate all requests/responses at runtime with Zod

**REST Principles:**
- Resource-based URLs (`/users`, `/bookings`, `/availability`)
- HTTP verbs for actions (GET, POST, PUT, DELETE)
- Stateless requests with JWT authentication
- Standard HTTP status codes (200, 201, 400, 401, 403, 404, 409, 500)

### 5.2 API Base Structure

**Base URL:** `https://api.officehours.youcanjustdothings.io/v1`

**Authentication:** JWT tokens from Supabase Auth in `Authorization: Bearer <token>` header

**OpenAPI Generation Strategy:**

```typescript
// apps/api/src/index.ts
import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';

const app = new OpenAPIHono();

// Auto-generated docs at /api/docs
app.doc('/api/openapi.json', {
  openapi: '3.1.0',
  info: {
    version: '1.0.0',
    title: 'CF Office Hours API',
    description: 'Mentor-mentee matching and scheduling platform',
  },
  servers: [
    { url: 'https://api.officehours.youcanjustdothings.io/v1', description: 'Production' },
    { url: 'http://localhost:8787/v1', description: 'Local development' },
  ],
});

app.get('/api/docs', swaggerUI({ url: '/api/openapi.json' }));

export default app;
```

### 5.3 Core API Schemas (Zod)

**Example: Booking Creation**

```typescript
// packages/shared/src/schemas/booking.ts
import { z } from 'zod';

export const CreateBookingSchema = z.object({
  time_slot_id: z.string().uuid(),
  meeting_goal: z.string().min(10, 'Meeting goal must be at least 10 characters'),
  materials_urls: z.array(z.string().url()).optional().default([]),
});

export const BookingResponseSchema = z.object({
  id: z.string().uuid(),
  time_slot_id: z.string().uuid(),
  mentor_id: z.string().uuid(),
  mentee_id: z.string().uuid(),
  meeting_goal: z.string(),
  materials_urls: z.array(z.string()),
  meeting_type: z.enum(['in_person_preset', 'in_person_custom', 'online']),
  location: z.string().nullable(),
  google_meet_link: z.string().url().nullable(),
  status: z.enum(['confirmed', 'completed', 'canceled']),
  meeting_start_time: z.string().datetime(),
  meeting_end_time: z.string().datetime(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type CreateBookingRequest = z.infer<typeof CreateBookingSchema>;
export type BookingResponse = z.infer<typeof BookingResponseSchema>;
```

**Hono Route Definition:**

```typescript
// apps/api/src/routes/bookings.ts
import { createRoute, z } from '@hono/zod-openapi';
import { CreateBookingSchema, BookingResponseSchema } from '@shared/schemas/booking';

export const createBookingRoute = createRoute({
  method: 'post',
  path: '/bookings',
  tags: ['Bookings'],
  summary: 'Create a new booking',
  description: 'Book a mentor time slot. Requires calendar connection per FR105. Checks both calendars for conflicts per FR106.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateBookingSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Booking created successfully',
      content: {
        'application/json': {
          schema: BookingResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request (validation errors)',
      content: {
        'application/json': {
          schema: z.object({
            error: z.object({
              code: z.string(),
              message: z.string(),
              details: z.record(z.any()).optional(),
            }),
          }),
        },
      },
    },
    401: { description: 'Unauthorized - Missing or invalid JWT token' },
    403: { description: 'Forbidden - Calendar not connected or tier restriction' },
    404: { description: 'Time slot not found or already booked' },
    409: { description: 'Calendar conflict detected or slot just booked by another user' },
    500: { description: 'Internal server error' },
  },
});
```

### 5.4 REST API Endpoints (Grouped by Resource)

#### **1. Authentication & User Management**

```yaml
POST /auth/magic-link
  Body: { email: string }
  Response: { message: "Magic link sent to email" }
  Description: Send passwordless login link (Supabase Auth)

POST /auth/oauth/google
  Body: { code: string, redirect_uri: string }
  Response: { access_token: string, refresh_token: string, user: User }
  Description: OAuth login + calendar permissions (combined per FR2)

POST /auth/oauth/microsoft
  Body: { code: string, redirect_uri: string }
  Response: { access_token: string, refresh_token: string, user: User }
  Description: OAuth login + calendar permissions (combined per FR2)

POST /auth/logout
  Headers: Authorization Bearer <token>
  Response: { message: "Logged out successfully" }

GET /users/me
  Headers: Authorization Bearer <token>
  Response: UserWithProfile
  Description: Get current authenticated user with profile

PUT /users/me
  Headers: Authorization Bearer <token>
  Body: Partial<UserProfile>
  Response: UserWithProfile

GET /users/:id
  Headers: Authorization Bearer <token>
  Response: UserWithProfile
  Description: Get any user's public profile

GET /users/search
  Headers: Authorization Bearer <token>
  Query: { role?: UserRole, industries?: string[], technologies?: string[], stage?: string, tier?: ReputationTier, limit?: number, offset?: number }
  Response: { users: UserWithProfile[], total: number }
  Description: Search/filter users directory
```

#### **2. Calendar Integration**

```yaml
POST /calendar/connect
  Headers: Authorization Bearer <token>
  Body: { provider: 'google' | 'microsoft', code: string, redirect_uri: string }
  Response: CalendarIntegration
  Description: Post-login calendar connection for magic link users

POST /calendar/disconnect
  Headers: Authorization Bearer <token>
  Response: { message: "Calendar disconnected", warning?: string }
  Description: Disconnect calendar (warn if bookings in next 7 days per FR93)

GET /calendar/sync-status
  Headers: Authorization Bearer <token>
  Response: CalendarSyncStatus

GET /calendar/feed/:user_id/:token
  Description: Public iCal feed (token-authenticated, per FR37)
  Response: text/calendar (RFC 5545 format)
```

#### **3. Availability Management**

```yaml
POST /availability
  Headers: Authorization Bearer <token>
  Body: AvailabilityBlockInput
  Response: AvailabilityBlock
  Description: Create availability block (mentor only, calendar required per FR105)

PUT /availability/:id
  Headers: Authorization Bearer <token>
  Body: Partial<AvailabilityBlock>
  Response: AvailabilityBlock

DELETE /availability/:id
  Headers: Authorization Bearer <token>
  Response: { message: "Deleted" } | { error: "Cannot delete - 3 bookings exist" }
  Description: Delete availability block (blocked if booked slots exist per FR80)

GET /availability/my-blocks
  Headers: Authorization Bearer <token>
  Response: AvailabilityBlock[]

GET /slots/available
  Headers: Authorization Bearer <token>
  Query: { mentor_id: string, start_date: string, end_date: string }
  Response: TimeSlot[]
  Description: Get available time slots for a mentor (30-day rolling window)
```

#### **4. Bookings**

```yaml
POST /bookings
  Headers: Authorization Bearer <token>
  Body: CreateBookingRequest
  Response: 201 BookingWithParticipants
  Description: Create booking (checks calendar conflicts per FR106, generates Google Meet link per FR62)

PUT /bookings/:id/cancel
  Headers: Authorization Bearer <token>
  Body: { reason?: 'emergency' | 'reschedule' | 'other', notes?: string }
  Response: BookingWithParticipants
  Description: Cancel booking (tracks late cancellation for reputation per FR60)

GET /bookings/my-bookings
  Headers: Authorization Bearer <token>
  Query: { status?: BookingStatus, limit?: number, offset?: number }
  Response: { bookings: BookingWithParticipants[], total: number }

GET /bookings/:id
  Headers: Authorization Bearer <token>
  Response: BookingWithParticipants
```

#### **5. Ratings & Reputation**

```yaml
POST /ratings
  Headers: Authorization Bearer <token>
  Body: { booking_id: string, score: 1 | 2 | 3 | 4 | 5, feedback_text?: string }
  Response: 201 Rating
  Description: Submit rating after meeting (optional per FR45)

GET /ratings/my-ratings
  Headers: Authorization Bearer <token>
  Response: Rating[]

GET /reputation/:user_id
  Headers: Authorization Bearer <token>
  Response: { user_id: string, score: number, tier: ReputationTier, breakdown: ReputationCalculationDetails }

GET /reputation/:user_id/history
  Headers: Authorization Bearer <token>
  Response: ReputationHistory[]
```

#### **6. Mentor-Specific Exception Requests**

```yaml
POST /exceptions
  Headers: Authorization Bearer <token>
  Body: { mentor_id: string, reason: string }
  Response: 201 TierOverrideRequest
  Description: Mentee requests exception to book restricted mentor (per FR54)

GET /exceptions/requests
  Headers: Authorization Bearer <token>
  Query: { status?: OverrideStatus }
  Response: TierOverrideRequestWithUsers[]
  Description: Coordinators view all exception requests

PUT /exceptions/:id/approve
  Headers: Authorization Bearer <token>
  Body: { notes?: string }
  Response: TierOverrideRequestWithUsers
  Description: Coordinator approves exception (7-day expiration starts, optimistic locking)

PUT /exceptions/:id/deny
  Headers: Authorization Bearer <token>
  Body: { notes: string }
  Response: TierOverrideRequestWithUsers

GET /exceptions/approve/:token
  Description: Email magic link approval (token-authenticated JWT)
  Response: Redirect to dashboard with success message
```

#### **7. Tags & Taxonomy**

```yaml
GET /taxonomy
  Headers: Authorization Bearer <token>
  Query: { category?: TagCategory, is_approved?: boolean }
  Response: TaxonomyEntry[]

POST /taxonomy/request
  Headers: Authorization Bearer <token>
  Body: { category: TagCategory, value: string, display_name: string }
  Response: 201 TaxonomyEntry
  Description: User requests new tag (normalized to lowercase_snake_case, requires coordinator approval per FR75)

PUT /taxonomy/:id/approve
  Headers: Authorization Bearer <token>
  Response: TaxonomyEntry
  Description: Coordinator approves user-requested tag

GET /users/me/tags
  Headers: Authorization Bearer <token>
  Response: UserTag[]

POST /users/me/tags
  Headers: Authorization Bearer <token>
  Body: { category: TagCategory, tag_value: string }
  Response: 201 UserTag
  Description: Add tag to user profile (from approved taxonomy)

PUT /users/me/tags/:id/confirm
  Headers: Authorization Bearer <token>
  Response: UserTag
  Description: Confirm auto-generated tag
```

#### **8. Matching & Recommendations**

```yaml
GET /mentors/recommended
  Headers: Authorization Bearer <token>
  Response: { recommendations: Array<{ mentor: UserWithProfile, match_score: number, explanation: string[] }> }
  Description: Personalized mentor recommendations (IMatchingEngine interface)

GET /mentees/recommended
  Headers: Authorization Bearer <token>
  Response: Similar to /mentors/recommended
  Description: Personalized mentee recommendations for mentors

POST /mentors/:mentor_id/send-interest
  Headers: Authorization Bearer <token>
  Body: { message?: string }
  Response: { message: "Interest notification sent" }
  Description: Mentor expresses interest in mentee (FR19, auto-creates exception if tier mismatch)
```

#### **9. Admin/Coordinator**

```yaml
GET /admin/dashboard/stats
  Headers: Authorization Bearer <token>
  Response: { mentor_utilization: number, weekly_slots_filled: number, active_users: number, upcoming_meetings: number }
  Description: KPI dashboard (coordinator only per FR68)

GET /admin/users
  Headers: Authorization Bearer <token>
  Query: { search?: string, role?: UserRole, is_active?: boolean }
  Response: { users: UserWithProfile[], total: number }

PUT /admin/users/:id/reputation
  Headers: Authorization Bearer <token>
  Body: { new_score: number, reason: string }
  Response: User
  Description: Admin override of reputation score (logged in audit_log per FR53)

GET /admin/bookings
  Headers: Authorization Bearer <token>
  Query: { start_date?: string, end_date?: string, status?: BookingStatus }
  Response: BookingWithParticipants[]

GET /admin/audit-log
  Headers: Authorization Bearer <token>
  Query: { action_type?: string, admin_user_id?: string, limit?: number, offset?: number }
  Response: { logs: AuditLog[], total: number }

POST /admin/schedule-meeting
  Headers: Authorization Bearer <token>
  Body: { mentor_id: string, mentee_id: string, start_time: string, end_time: string, meeting_goal: string }
  Response: 201 BookingWithParticipants
  Description: White-glove scheduling (coordinator only, bypasses tier restrictions per FR67)

POST /admin/generate-slots
  Headers: Authorization Bearer <token>
  Response: { generated_count: number }
  Description: Trigger 30-day rolling window slot generation (called on coordinator login)
```

#### **10. Webhooks (Airtable Integration)**

```yaml
POST /webhooks/airtable
  Headers: X-Airtable-Signature: <signature>
  Body: AirtableWebhookPayload
  Response: 200 { message: "Processing started" }
  Description: Receive Airtable webhooks, store payload, trigger async sync (FR5, NFR31)
```

### 5.5 Error Response Format

All errors follow consistent structure:

```typescript
interface ApiError {
  error: {
    code: string; // Machine-readable (e.g., "CALENDAR_NOT_CONNECTED")
    message: string; // Human-readable (e.g., "Please connect your calendar to book meetings")
    details?: Record<string, any>; // Additional context (validation errors, etc.)
    timestamp: string; // ISO 8601 timestamp
    request_id: string; // For debugging
  };
}
```

**Example Error Responses:**

```json
// 400 Bad Request (Validation)
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "meeting_goal": ["Meeting goal must be at least 10 characters"]
    },
    "timestamp": "2025-10-02T14:30:00Z",
    "request_id": "req_abc123"
  }
}

// 403 Forbidden (Tier Restriction)
{
  "error": {
    "code": "TIER_RESTRICTION",
    "message": "Your Bronze tier cannot book Gold mentors. Request an exception from coordinators.",
    "details": {
      "your_tier": "bronze",
      "mentor_tier": "gold",
      "can_request_exception": true
    },
    "timestamp": "2025-10-02T14:30:00Z",
    "request_id": "req_def456"
  }
}

// 409 Conflict (Calendar Conflict)
{
  "error": {
    "code": "CALENDAR_CONFLICT",
    "message": "This time slot conflicts with an existing event in your calendar",
    "details": {
      "conflicting_event": {
        "start_time": "2025-10-15T14:00:00Z",
        "end_time": "2025-10-15T15:00:00Z"
      }
    },
    "timestamp": "2025-10-02T14:30:00Z",
    "request_id": "req_ghi789"
  }
}
```

### 5.6 OpenAPI Type Generation

**Frontend Type Generation:**

```bash
# package.json script
"generate:api-types": "openapi-typescript http://localhost:8787/api/openapi.json -o packages/shared/src/types/api.generated.ts"
```

**Usage in Frontend:**

```typescript
// apps/web/src/services/api.ts
import type { paths } from '@shared/types/api.generated';

type CreateBookingRequest = paths['/bookings']['post']['requestBody']['content']['application/json'];
type CreateBookingResponse = paths['/bookings']['post']['responses']['201']['content']['application/json'];

export async function createBooking(data: CreateBookingRequest): Promise<CreateBookingResponse> {
  const response = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new ApiError(error);
  }

  return response.json();
}
```

### 5.7 API Sample Payloads

This subsection provides complete request/response examples for the 10 most critical API endpoints, including success cases, error scenarios, and edge cases aligned with PRD requirements.

#### Top 10 Critical Endpoints

1. POST /auth/magic-link - Magic Link Authentication
2. POST /auth/oauth/google - OAuth Authentication (Google)
3. POST /bookings - Create Booking
4. GET /bookings - List Bookings
5. DELETE /bookings/:id - Cancel Booking
6. POST /availability - Create Availability
7. GET /availability/slots - Browse Available Slots
8. GET /users/:id/profile - Get User Profile
9. POST /matching/find-mentors - Find Matching Mentors
10. POST /tier-overrides - Request Tier Override

---

#### 1. POST /auth/magic-link - Magic Link Authentication

**Purpose:** Send magic link email for passwordless authentication

**Request:**
```http
POST https://api.officehours.youcanjustdothings.io/v1/auth/magic-link
Content-Type: application/json

{
  "email": "sarah.mentor@capitalfactory.com"
}
```

**Success Response (200):**
```json
{
  "message": "Magic link sent to your email",
  "email": "sarah.mentor@capitalfactory.com",
  "expires_in": 3600
}
```

**Error Response (403) - Email Not Whitelisted:**
```json
{
  "error": {
    "code": "EMAIL_NOT_WHITELISTED",
    "message": "Your email is not authorized. Please contact an administrator for access.",
    "timestamp": "2025-10-02T14:30:00Z",
    "request_id": "req_abc123"
  }
}
```

**Error Response (422) - Validation Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "email": ["Invalid email format"]
    },
    "timestamp": "2025-10-02T14:30:00Z",
    "request_id": "req_abc124"
  }
}
```

---

#### 2. POST /auth/oauth/google - OAuth Authentication (Google)

**Purpose:** Initiate Google OAuth flow with combined auth + calendar permissions

**Request:**
```http
POST https://api.officehours.youcanjustdothings.io/v1/auth/oauth/google
Content-Type: application/json

{
  "redirect_uri": "https://officehours.youcanjustdothings.io/auth/callback"
}
```

**Success Response (200):**
```json
{
  "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=xxx&redirect_uri=https%3A%2F%2Fofficehours.youcanjustdothings.io%2Fauth%2Fcallback&response_type=code&scope=openid+email+profile+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.readonly+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events&access_type=offline&prompt=consent",
  "state": "random-state-token-xyz789",
  "expires_in": 600
}
```

**OAuth Callback Handling:**
After user completes OAuth, Google redirects to:
```
https://officehours.youcanjustdothings.io/auth/callback?code=4/0AX4XfWh...&state=random-state-token-xyz789
```

Frontend exchanges code for tokens:
```http
POST https://api.officehours.youcanjustdothings.io/v1/auth/oauth/callback
Content-Type: application/json

{
  "code": "4/0AX4XfWh...",
  "provider": "google",
  "state": "random-state-token-xyz789"
}
```

**Callback Success Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "v1.MR...xyz",
  "expires_in": 3600,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.startup@example.com",
    "role": "mentee",
    "reputation_tier": "silver",
    "profile": {
      "name": "John Startup",
      "avatar_url": "https://lh3.googleusercontent.com/a/default-user=s96-c"
    }
  },
  "calendar_connected": true
}
```

---

#### 3. POST /bookings - Create Booking

**Purpose:** Mentee books an available time slot with a mentor

**Request:**
```http
POST https://api.officehours.youcanjustdothings.io/v1/bookings
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "time_slot_id": "7f3d2c8a-9b1e-4d6f-a5c3-2e8b9a1d4f6c",
  "meeting_goal": "I'd like to discuss go-to-market strategy for our SaaS product targeting mid-market companies. Specifically interested in channel partnerships and pricing models.",
  "materials_urls": [
    "https://storage.supabase.co/pitch-decks/my-deck.pdf",
    "https://www.example.com/product-demo"
  ]
}
```

**Success Response (201):**
```json
{
  "booking": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "time_slot_id": "7f3d2c8a-9b1e-4d6f-a5c3-2e8b9a1d4f6c",
    "mentor_id": "550e8400-e29b-41d4-a716-446655440001",
    "mentee_id": "550e8400-e29b-41d4-a716-446655440000",
    "meeting_goal": "I'd like to discuss go-to-market strategy for our SaaS product targeting mid-market companies. Specifically interested in channel partnerships and pricing models.",
    "materials_urls": [
      "https://storage.supabase.co/pitch-decks/my-deck.pdf",
      "https://www.example.com/product-demo"
    ],
    "meeting_type": "online",
    "location": null,
    "google_meet_link": "https://meet.google.com/abc-defg-hij",
    "status": "confirmed",
    "meeting_start_time": "2025-10-15T14:00:00Z",
    "meeting_end_time": "2025-10-15T14:30:00Z",
    "created_at": "2025-10-02T14:30:00Z",
    "mentor": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Sarah Mentor",
      "title": "VP of Product",
      "company": "TechCorp",
      "avatar_url": "https://storage.supabase.co/avatars/sarah.jpg",
      "reputation_tier": "platinum"
    },
    "mentee": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Startup",
      "title": "Founder & CEO",
      "company": "StartupCo",
      "avatar_url": "https://lh3.googleusercontent.com/a/default-user=s96-c",
      "reputation_tier": "silver"
    }
  }
}
```

**Error Response (409) - Slot Already Booked:**
```json
{
  "error": {
    "code": "SLOT_ALREADY_BOOKED",
    "message": "This slot was just booked by another user. Please select another slot.",
    "timestamp": "2025-10-02T14:30:00Z",
    "request_id": "req_conflict_001"
  }
}
```

**Error Response (409) - Calendar Conflict:**
```json
{
  "error": {
    "code": "CALENDAR_CONFLICT",
    "message": "You have a conflicting event on your calendar at this time.",
    "details": {
      "conflict": {
        "start_time": "2025-10-15T14:00:00Z",
        "end_time": "2025-10-15T15:00:00Z",
        "summary": "Team standup meeting"
      }
    },
    "timestamp": "2025-10-02T14:30:00Z",
    "request_id": "req_conflict_002"
  }
}
```

**Error Response (403) - Booking Limit Reached:**
```json
{
  "error": {
    "code": "BOOKING_LIMIT_REACHED",
    "message": "You have reached your weekly booking limit for your tier.",
    "details": {
      "current_bookings": 5,
      "limit": 5,
      "tier": "silver",
      "reset_date": "2025-10-08T00:00:00Z"
    },
    "timestamp": "2025-10-02T14:30:00Z",
    "request_id": "req_limit_001"
  }
}
```

**Error Response (403) - Tier Restriction:**
```json
{
  "error": {
    "code": "TIER_RESTRICTION",
    "message": "Your silver tier cannot book platinum mentors. Request an exception from coordinators.",
    "details": {
      "your_tier": "silver",
      "mentor_tier": "platinum",
      "can_request_exception": true,
      "mentor_id": "550e8400-e29b-41d4-a716-446655440001"
    },
    "timestamp": "2025-10-02T14:30:00Z",
    "request_id": "req_tier_001"
  }
}
```

---

#### 4. GET /bookings - List Bookings

**Purpose:** Retrieve user's bookings with filtering options

**Request:**
```http
GET https://api.officehours.youcanjustdothings.io/v1/bookings?status=confirmed&role=mentee&start_date=2025-10-01&end_date=2025-10-31&limit=20&offset=0
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameters:**
- `status` (optional): Filter by status (confirmed, completed, canceled)
- `role` (optional): Filter by user role (mentee, mentor) - defaults to all
- `start_date` (optional): Filter bookings starting after this date (ISO 8601)
- `end_date` (optional): Filter bookings starting before this date (ISO 8601)
- `limit` (optional): Number of results per page (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Success Response (200):**
```json
{
  "bookings": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "meeting_goal": "Discuss go-to-market strategy",
      "meeting_type": "online",
      "google_meet_link": "https://meet.google.com/abc-defg-hij",
      "status": "confirmed",
      "meeting_start_time": "2025-10-15T14:00:00Z",
      "meeting_end_time": "2025-10-15T14:30:00Z",
      "created_at": "2025-10-02T14:30:00Z",
      "mentor": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Sarah Mentor",
        "title": "VP of Product",
        "company": "TechCorp",
        "avatar_url": "https://storage.supabase.co/avatars/sarah.jpg",
        "reputation_tier": "platinum"
      },
      "mentee": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "John Startup",
        "title": "Founder & CEO",
        "company": "StartupCo",
        "avatar_url": "https://lh3.googleusercontent.com/a/default-user=s96-c",
        "reputation_tier": "silver"
      }
    },
    {
      "id": "b2c3d4e5-f678-90ab-cdef-123456789012",
      "meeting_goal": "Review fundraising pitch deck",
      "meeting_type": "in_person_predefined",
      "location": "Capital Factory - 4th Floor Conference Room A",
      "google_meet_link": null,
      "status": "confirmed",
      "meeting_start_time": "2025-10-20T16:00:00Z",
      "meeting_end_time": "2025-10-20T16:30:00Z",
      "created_at": "2025-10-03T09:15:00Z",
      "mentor": {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "name": "Mike Advisor",
        "title": "Partner",
        "company": "Venture Capital Firm",
        "avatar_url": "https://storage.supabase.co/avatars/mike.jpg",
        "reputation_tier": "gold"
      },
      "mentee": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "John Startup",
        "title": "Founder & CEO",
        "company": "StartupCo",
        "avatar_url": "https://lh3.googleusercontent.com/a/default-user=s96-c",
        "reputation_tier": "silver"
      }
    }
  ],
  "pagination": {
    "total": 12,
    "limit": 20,
    "offset": 0,
    "has_more": false
  }
}
```

---

#### 5. DELETE /bookings/:id - Cancel Booking

**Purpose:** Cancel an existing booking with reason

**Request:**
```http
DELETE https://api.officehours.youcanjustdothings.io/v1/bookings/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "reason": "schedule_conflict",
  "notes": "Unexpected board meeting scheduled at the same time"
}
```

**Request Body:**
- `reason` (required): Cancellation reason enum
  - `schedule_conflict`
  - `no_longer_needed`
  - `reschedule` (will create new booking)
  - `other`
- `notes` (optional): Additional context for cancellation

**Success Response (200):**
```json
{
  "booking": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "canceled",
    "canceled_by": "550e8400-e29b-41d4-a716-446655440000",
    "canceled_at": "2025-10-02T15:00:00Z",
    "cancellation_reason": "schedule_conflict",
    "cancellation_notes": "Unexpected board meeting scheduled at the same time",
    "meeting_start_time": "2025-10-15T14:00:00Z",
    "meeting_end_time": "2025-10-15T14:30:00Z"
  },
  "reputation_impact": {
    "penalty_applied": true,
    "reason": "Late cancellation within 2 hours of meeting",
    "responsiveness_factor_change": -0.2
  }
}
```

**Error Response (403) - Cannot Cancel:**
```json
{
  "error": {
    "code": "CANNOT_CANCEL_COMPLETED",
    "message": "Cannot cancel a completed meeting.",
    "timestamp": "2025-10-02T15:00:00Z",
    "request_id": "req_cancel_001"
  }
}
```

---

#### 6. POST /availability - Create Availability

**Purpose:** Mentor creates availability block with recurring schedule

**Request:**
```http
POST https://api.officehours.youcanjustdothings.io/v1/availability
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "recurrence_type": "weekly",
  "recurrence_day_of_week": 2,
  "start_time": "14:00:00",
  "end_time": "16:00:00",
  "timezone": "America/Chicago",
  "slot_duration_minutes": 30,
  "buffer_minutes": 5,
  "meeting_type": "online",
  "location_id": null,
  "custom_location": null,
  "max_bookings_per_slot": 1,
  "description": "Weekly office hours for product strategy and fundraising advice"
}
```

**Request Body:**
- `recurrence_type`: "one_time", "weekly", "monthly", "quarterly"
- `recurrence_day_of_week`: 0 (Sunday) to 6 (Saturday) - required for weekly
- `start_time`: Time in HH:mm:ss format (in specified timezone)
- `end_time`: Time in HH:mm:ss format
- `timezone`: IANA timezone string (e.g., "America/Chicago")
- `slot_duration_minutes`: 15, 20, 30, or 60
- `buffer_minutes`: Buffer time between slots (0-60)
- `meeting_type`: "online", "in_person_predefined", "in_person_custom"
- `location_id`: UUID of predefined location (if applicable)
- `custom_location`: Free text location (if meeting_type is in_person_custom)

**Success Response (201):**
```json
{
  "availability": {
    "id": "f9e8d7c6-b5a4-3210-9876-543210fedcba",
    "mentor_id": "550e8400-e29b-41d4-a716-446655440001",
    "recurrence_type": "weekly",
    "recurrence_day_of_week": 2,
    "start_time": "14:00:00",
    "end_time": "16:00:00",
    "timezone": "America/Chicago",
    "slot_duration_minutes": 30,
    "buffer_minutes": 5,
    "meeting_type": "online",
    "location_id": null,
    "custom_location": null,
    "description": "Weekly office hours for product strategy and fundraising advice",
    "is_active": true,
    "created_at": "2025-10-02T15:30:00Z"
  },
  "slots_generated": {
    "count": 12,
    "date_range": {
      "start": "2025-10-08T19:00:00Z",
      "end": "2025-11-05T21:00:00Z"
    }
  }
}
```

**Error Response (409) - Calendar Conflict:**
```json
{
  "error": {
    "code": "CALENDAR_CONFLICT",
    "message": "Recurring availability conflicts with existing calendar events",
    "details": {
      "conflicts": [
        {
          "date": "2025-10-15",
          "time": "14:00-14:30",
          "existing_event": "Product review meeting"
        }
      ]
    },
    "timestamp": "2025-10-02T15:30:00Z",
    "request_id": "req_avail_001"
  }
}
```

---

#### 7. GET /availability/slots - Browse Available Slots

**Purpose:** Mentee browses available time slots with filtering

**Request:**
```http
GET https://api.officehours.youcanjustdothings.io/v1/availability/slots?mentor_id=550e8400-e29b-41d4-a716-446655440001&start_date=2025-10-15&end_date=2025-10-22&meeting_type=online&tags=fintech,saas&limit=50
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameters:**
- `mentor_id` (optional): Filter by specific mentor
- `start_date` (required): Start date for slot search (ISO 8601 date)
- `end_date` (required): End date for slot search (ISO 8601 date)
- `meeting_type` (optional): Filter by meeting type
- `tags` (optional): Comma-separated list of tags for mentor filtering
- `limit` (optional): Number of results (default: 50, max: 100)

**Success Response (200):**
```json
{
  "slots": [
    {
      "id": "7f3d2c8a-9b1e-4d6f-a5c3-2e8b9a1d4f6c",
      "availability_id": "f9e8d7c6-b5a4-3210-9876-543210fedcba",
      "mentor_id": "550e8400-e29b-41d4-a716-446655440001",
      "start_time": "2025-10-15T19:00:00Z",
      "end_time": "2025-10-15T19:30:00Z",
      "meeting_type": "online",
      "location": null,
      "is_booked": false,
      "mentor": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Sarah Mentor",
        "title": "VP of Product",
        "company": "TechCorp",
        "avatar_url": "https://storage.supabase.co/avatars/sarah.jpg",
        "reputation_tier": "platinum",
        "reputation_score": 4.8,
        "expertise_description": "15+ years building SaaS products. Expert in go-to-market strategy, product-market fit, and scaling engineering teams.",
        "tags": [
          { "category": "industry", "value": "saas", "display_name": "SaaS" },
          { "category": "industry", "value": "fintech", "display_name": "FinTech" },
          { "category": "technology", "value": "cloud_native", "display_name": "Cloud Native" },
          { "category": "stage", "value": "series_a", "display_name": "Series A" }
        ]
      }
    },
    {
      "id": "8g4e3d9b-0c2f-5e7g-b6d4-3f9c0b2e5g7d",
      "availability_id": "f9e8d7c6-b5a4-3210-9876-543210fedcba",
      "mentor_id": "550e8400-e29b-41d4-a716-446655440001",
      "start_time": "2025-10-15T19:35:00Z",
      "end_time": "2025-10-15T20:05:00Z",
      "meeting_type": "online",
      "location": null,
      "is_booked": false,
      "mentor": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Sarah Mentor",
        "title": "VP of Product",
        "company": "TechCorp",
        "avatar_url": "https://storage.supabase.co/avatars/sarah.jpg",
        "reputation_tier": "platinum",
        "reputation_score": 4.8,
        "expertise_description": "15+ years building SaaS products. Expert in go-to-market strategy, product-market fit, and scaling engineering teams.",
        "tags": [
          { "category": "industry", "value": "saas", "display_name": "SaaS" },
          { "category": "industry", "value": "fintech", "display_name": "FinTech" },
          { "category": "technology", "value": "cloud_native", "display_name": "Cloud Native" },
          { "category": "stage", "value": "series_a", "display_name": "Series A" }
        ]
      }
    }
  ],
  "pagination": {
    "total": 24,
    "limit": 50,
    "has_more": false
  }
}
```

---

#### 8. GET /users/:id/profile - Get User Profile

**Purpose:** Retrieve detailed user profile with reputation and tags

**Request:**
```http
GET https://api.officehours.youcanjustdothings.io/v1/users/550e8400-e29b-41d4-a716-446655440001/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "sarah.mentor@techcorp.com",
    "role": "mentor",
    "reputation_score": 4.8,
    "reputation_tier": "platinum",
    "is_active": true,
    "last_activity_at": "2025-10-01T18:30:00Z",
    "created_at": "2024-03-15T10:00:00Z"
  },
  "profile": {
    "id": "profile-uuid-001",
    "user_id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Sarah Mentor",
    "title": "VP of Product",
    "company": "TechCorp",
    "phone": "+1 (512) 555-0123",
    "linkedin_url": "https://www.linkedin.com/in/sarahmentor",
    "website_url": "https://www.sarahmentor.com",
    "pitch_vc_url": null,
    "expertise_description": "15+ years building SaaS products. Expert in go-to-market strategy, product-market fit, and scaling engineering teams. Passionate about helping early-stage founders avoid common pitfalls.",
    "ideal_mentee_description": "Series A-B SaaS founders looking to scale their product and engineering teams. Also enjoy working with first-time founders on product strategy.",
    "bio": "Former VP of Product at two successful exits. Angel investor in 12 companies. Love connecting founders with resources.",
    "avatar_url": "https://storage.supabase.co/avatars/sarah.jpg",
    "avatar_source_type": "upload",
    "reminder_preference": "both",
    "additional_links": {
      "twitter": "https://twitter.com/sarahmentor",
      "blog": "https://blog.sarahmentor.com"
    },
    "created_at": "2024-03-15T10:00:00Z",
    "updated_at": "2025-09-28T14:20:00Z"
  },
  "tags": [
    {
      "id": "tag-001",
      "category": "industry",
      "tag_value": "saas",
      "display_name": "SaaS",
      "source": "airtable",
      "is_confirmed": true
    },
    {
      "id": "tag-002",
      "category": "industry",
      "tag_value": "fintech",
      "display_name": "FinTech",
      "source": "user",
      "is_confirmed": true
    },
    {
      "id": "tag-003",
      "category": "technology",
      "tag_value": "cloud_native",
      "display_name": "Cloud Native",
      "source": "airtable",
      "is_confirmed": true
    },
    {
      "id": "tag-004",
      "category": "stage",
      "tag_value": "series_a",
      "display_name": "Series A",
      "source": "user",
      "is_confirmed": true
    },
    {
      "id": "tag-005",
      "category": "stage",
      "tag_value": "series_b",
      "display_name": "Series B",
      "source": "user",
      "is_confirmed": true
    }
  ],
  "reputation_breakdown": {
    "average_rating": 4.9,
    "completion_rate": 0.96,
    "responsiveness_factor": 1.2,
    "tenure_bonus": 1.0,
    "raw_score": 5.8,
    "ratings_count": 47,
    "is_probationary": false
  },
  "stats": {
    "total_bookings_as_mentor": 52,
    "total_bookings_as_mentee": 3,
    "completed_sessions": 50,
    "canceled_sessions": 2,
    "no_show_sessions": 0
  }
}
```

---

#### 9. POST /matching/find-mentors - Find Matching Mentors

**Purpose:** Find and rank mentors based on tags and preferences

**Request:**
```http
POST https://api.officehours.youcanjustdothings.io/v1/matching/find-mentors
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "tags": ["saas", "fintech", "series_a"],
  "limit": 10,
  "include_explanation": true,
  "exclude_dormant": true
}
```

**Request Body:**
- `tags` (optional): Array of tag values to match against
- `limit` (optional): Number of results (default: 10, max: 50)
- `include_explanation` (optional): Include match explanation (default: true)
- `exclude_dormant` (optional): Exclude dormant users (default: true)

**Success Response (200):**
```json
{
  "matches": [
    {
      "score": 92,
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Sarah Mentor",
        "title": "VP of Product",
        "company": "TechCorp",
        "avatar_url": "https://storage.supabase.co/avatars/sarah.jpg",
        "reputation_tier": "platinum",
        "reputation_score": 4.8,
        "expertise_description": "15+ years building SaaS products. Expert in go-to-market strategy, product-market fit, and scaling engineering teams.",
        "tags": [
          { "category": "industry", "value": "saas", "display_name": "SaaS" },
          { "category": "industry", "value": "fintech", "display_name": "FinTech" },
          { "category": "stage", "value": "series_a", "display_name": "Series A" }
        ],
        "is_dormant": false
      },
      "explanation": {
        "tag_overlap": [
          { "category": "industry", "tag": "saas" },
          { "category": "industry", "tag": "fintech" },
          { "category": "stage", "tag": "series_a" }
        ],
        "tag_overlap_score": 60,
        "stage_match": true,
        "stage_score": 20,
        "reputation_compatible": true,
        "reputation_score": 12,
        "summary": "Perfect match! 3 shared tags including industry and stage. High reputation (platinum tier)."
      }
    },
    {
      "score": 75,
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "name": "Mike Advisor",
        "title": "Partner",
        "company": "Venture Capital Firm",
        "avatar_url": "https://storage.supabase.co/avatars/mike.jpg",
        "reputation_tier": "gold",
        "reputation_score": 4.3,
        "expertise_description": "20 years in venture capital. Focus on FinTech and Enterprise SaaS investments. Active board member in 8 portfolio companies.",
        "tags": [
          { "category": "industry", "value": "fintech", "display_name": "FinTech" },
          { "category": "industry", "value": "enterprise_software", "display_name": "Enterprise Software" },
          { "category": "stage", "value": "seed", "display_name": "Seed" }
        ],
        "is_dormant": false
      },
      "explanation": {
        "tag_overlap": [
          { "category": "industry", "tag": "fintech" }
        ],
        "tag_overlap_score": 40,
        "stage_match": false,
        "stage_score": 10,
        "reputation_compatible": true,
        "reputation_score": 15,
        "summary": "Good match. 1 shared industry tag (fintech). Different stage focus but high reputation."
      }
    }
  ],
  "total_matches": 8,
  "request_tags": ["saas", "fintech", "series_a"]
}
```

---

#### 10. POST /tier-overrides - Request Tier Override

**Purpose:** Mentee requests exception to book mentor above their tier

**Request:**
```http
POST https://api.officehours.youcanjustdothings.io/v1/tier-overrides
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "mentor_id": "550e8400-e29b-41d4-a716-446655440001",
  "reason": "Sarah has specific expertise in my industry (FinTech + SaaS) that matches my current needs perfectly. I'm preparing for Series A fundraising and her experience at TechCorp's Series A would be incredibly valuable."
}
```

**Request Body:**
- `mentor_id` (required): UUID of the mentor to request exception for
- `reason` (required): Detailed explanation (min 20 characters, max 500)

**Success Response (201):**
```json
{
  "override_request": {
    "id": "override-req-001",
    "mentee_id": "550e8400-e29b-41d4-a716-446655440000",
    "mentor_id": "550e8400-e29b-41d4-a716-446655440001",
    "reason": "Sarah has specific expertise in my industry (FinTech + SaaS) that matches my current needs perfectly. I'm preparing for Series A fundraising and her experience at TechCorp's Series A would be incredibly valuable.",
    "status": "pending",
    "scope": "one_time",
    "expires_at": "2025-10-09T14:45:00Z",
    "created_at": "2025-10-02T14:45:00Z"
  },
  "mentee": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Startup",
    "reputation_tier": "silver"
  },
  "mentor": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Sarah Mentor",
    "reputation_tier": "platinum"
  },
  "notification_sent": true
}
```

**Mentor-Initiated Override (Auto-Approved):**
When a mentor sends meeting interest to a mentee below their tier:

**Request:**
```http
POST https://api.officehours.youcanjustdothings.io/v1/tier-overrides
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (mentor token)
Content-Type: application/json

{
  "mentee_id": "550e8400-e29b-41d4-a716-446655440000",
  "reason": "Interested in working with John based on his pitch deck and startup focus",
  "initiated_by": "mentor"
}
```

**Response (201):**
```json
{
  "override_request": {
    "id": "override-req-002",
    "mentee_id": "550e8400-e29b-41d4-a716-446655440000",
    "mentor_id": "550e8400-e29b-41d4-a716-446655440001",
    "reason": "Interested in working with John based on his pitch deck and startup focus",
    "status": "approved",
    "scope": "one_time",
    "expires_at": "2025-10-09T15:00:00Z",
    "reviewed_by": null,
    "reviewed_at": "2025-10-02T15:00:00Z",
    "created_at": "2025-10-02T15:00:00Z"
  },
  "auto_approved": true,
  "reason": "Mentor-initiated overrides are automatically approved"
}
```

**Error Response (409) - Override Already Exists:**
```json
{
  "error": {
    "code": "OVERRIDE_ALREADY_EXISTS",
    "message": "An active override request already exists for this mentor-mentee pair.",
    "details": {
      "existing_override_id": "override-req-001",
      "status": "pending"
    },
    "timestamp": "2025-10-02T14:45:00Z",
    "request_id": "req_override_001"
  }
}
```

---

**Section 5 Complete.** This API specification provides comprehensive documentation of the REST API contract, including:
- ✅ Contract-first design approach with Zod and OpenAPI
- ✅ Complete endpoint specifications grouped by resource
- ✅ Consistent error response format
- ✅ Type-safe frontend integration via openapi-typescript
- ✅ Detailed sample payloads for top 10 critical endpoints with success and error scenarios

---

## 6. Components

This section defines the component architecture for the React frontend, including the component library strategy, shared components, feature-specific components, and design patterns. All components use **Shadcn/ui** as the foundation with **Tailwind CSS** for styling.

### 6.1 Component Library Strategy

**Shadcn/ui Approach:**
Unlike traditional component libraries (Material-UI, Ant Design), Shadcn/ui uses a **copy-paste model** where components are copied directly into your codebase. This provides:
- ✅ Full control over component code
- ✅ No runtime dependency on library updates
- ✅ Customization without fighting framework abstractions
- ✅ Built on Radix UI primitives (accessibility built-in)
- ✅ Tailwind CSS integration

**Installation Pattern:**
```bash
# Initialize Shadcn/ui in apps/web
npx shadcn-ui@latest init

# Add components as needed
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add calendar
```

**Component Location:**
- **Shadcn Components:** `apps/web/src/components/ui/` (auto-generated)
- **Custom Shared Components:** `apps/web/src/components/common/`
- **Feature Components:** `apps/web/src/components/features/{feature-name}/`
- **Layout Components:** `apps/web/src/components/layouts/`

### 6.2 Shadcn/ui Components Used

Based on PRD requirements, the following Shadcn components will be installed:

| Component | Purpose | PRD Reference |
|-----------|---------|---------------|
| **Button** | Primary actions, CTAs | Universal |
| **Card** | User cards, booking cards, stat cards | FR10, FR23 |
| **Dialog** | Modals (booking confirmation, override request) | FR38, FR54 |
| **Form** | All forms (profile, availability, booking) | FR11, FR77 |
| **Input** | Text inputs across forms | Universal |
| **Label** | Form labels with accessibility | Universal |
| **Select** | Dropdowns (meeting type, duration, tags) | FR77, FR86 |
| **Textarea** | Multi-line inputs (bio, meeting goal) | FR11, FR38 |
| **Calendar** | Date picker for availability blocks | FR77 |
| **Badge** | Tags, tier indicators, status labels | FR9, FR52 |
| **Avatar** | User profile images | FR10, FR11 |
| **Tabs** | Dashboard views (My Bookings, Find Mentors) | FR23, FR33 |
| **Separator** | Visual dividers | Universal |
| **Toast** | Success/error notifications | NFR7, NFR30 |
| **Tooltip** | Help text, icon explanations | FR48, FR52 |
| **Switch** | Toggle settings (reminder preferences) | FR98 |
| **Command** | Search/filter interface | FR33 |
| **Popover** | Filter dropdowns, contextual actions | FR33 |
| **Alert** | Warning messages (calendar not connected) | FR105 |
| **Skeleton** | Loading states | NFR30 |
| **Table** | Coordinator dashboard data tables | FR68 |
| **Checkbox** | Multi-select (calendar selection, tags) | FR25, FR75 |
| **RadioGroup** | Single-choice selections (meeting type) | FR77 |
| **Progress** | Profile completion indicator | NFR30 |
| **HoverCard** | User profile previews on hover | FR10 |

### 6.3 Shared Common Components

These custom components wrap Shadcn components with app-specific logic and are used across multiple features.

#### 6.3.1 UserAvatar Component

**Purpose:** Display user avatar with fallback initials and online status

**Props Interface:**
```typescript
// apps/web/src/components/common/UserAvatar.tsx

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export interface UserAvatarProps {
  user: {
    name: string;
    avatar_url?: string | null;
  };
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showOnlineStatus?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-16 w-16 text-xl',
};

export function UserAvatar({ 
  user, 
  size = 'md', 
  showOnlineStatus = false,
  className 
}: UserAvatarProps) {
  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative">
      <Avatar className={cn(sizeClasses[size], className)}>
        <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      {showOnlineStatus && (
        <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white" />
      )}
    </div>
  );
}
```

**Usage:**
```typescript
<UserAvatar user={mentor} size="lg" showOnlineStatus />
```

#### 6.3.2 ReputationBadge Component

**Purpose:** Display reputation tier with color-coded badge and score tooltip

**Props Interface:**
```typescript
// apps/web/src/components/common/ReputationBadge.tsx

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ReputationTier } from '@shared/types/user';

export interface ReputationBadgeProps {
  tier: ReputationTier;
  score: number;
  showScore?: boolean;
  size?: 'sm' | 'md';
}

const tierConfig = {
  bronze: { label: 'Bronze', color: 'bg-amber-700 text-white hover:bg-amber-800' },
  silver: { label: 'Silver', color: 'bg-gray-400 text-white hover:bg-gray-500' },
  gold: { label: 'Gold', color: 'bg-yellow-500 text-white hover:bg-yellow-600' },
  platinum: { label: 'Platinum', color: 'bg-purple-600 text-white hover:bg-purple-700' },
};

export function ReputationBadge({ 
  tier, 
  score, 
  showScore = true,
  size = 'md' 
}: ReputationBadgeProps) {
  const config = tierConfig[tier];
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';

  const badge = (
    <Badge className={`${config.color} ${sizeClass}`}>
      {config.label} {showScore && `(${score.toFixed(1)})`}
    </Badge>
  );

  if (!showScore) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>
            <p>Reputation Score: {score.toFixed(2)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}
```

#### 6.3.3 TagsList Component

**Purpose:** Display user tags with category grouping and management actions

**Props Interface:**
```typescript
// apps/web/src/components/common/TagsList.tsx

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { UserTag, TagCategory } from '@shared/types/tag';

export interface TagsListProps {
  tags: UserTag[];
  editable?: boolean;
  onRemove?: (tagId: string) => void;
  groupByCategory?: boolean;
  maxTags?: number;
}

const categoryColors = {
  industry: 'bg-blue-100 text-blue-800 border-blue-300',
  technology: 'bg-green-100 text-green-800 border-green-300',
  stage: 'bg-purple-100 text-purple-800 border-purple-300',
};

export function TagsList({ 
  tags, 
  editable = false, 
  onRemove,
  groupByCategory = true,
  maxTags 
}: TagsListProps) {
  const displayTags = maxTags ? tags.slice(0, maxTags) : tags;
  const remaining = maxTags && tags.length > maxTags ? tags.length - maxTags : 0;

  if (groupByCategory) {
    const grouped = displayTags.reduce((acc, tag) => {
      if (!acc[tag.category]) acc[tag.category] = [];
      acc[tag.category].push(tag);
      return acc;
    }, {} as Record<TagCategory, UserTag[]>);

    return (
      <div className="space-y-3">
        {Object.entries(grouped).map(([category, categoryTags]) => (
          <div key={category}>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">
              {category}
            </p>
            <div className="flex flex-wrap gap-2">
              {categoryTags.map(tag => (
                <TagBadge key={tag.id} tag={tag} editable={editable} onRemove={onRemove} />
              ))}
            </div>
          </div>
        ))}
        {remaining > 0 && (
          <Badge variant="outline" className="text-gray-500">
            +{remaining} more
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {displayTags.map(tag => (
        <TagBadge key={tag.id} tag={tag} editable={editable} onRemove={onRemove} />
      ))}
      {remaining > 0 && (
        <Badge variant="outline" className="text-gray-500">
          +{remaining} more
        </Badge>
      )}
    </div>
  );
}

function TagBadge({ 
  tag, 
  editable, 
  onRemove 
}: { 
  tag: UserTag; 
  editable: boolean; 
  onRemove?: (id: string) => void 
}) {
  return (
    <Badge 
      variant="outline" 
      className={`${categoryColors[tag.category]} ${editable ? 'pr-1' : ''}`}
    >
      {tag.tag_value.replace(/_/g, ' ')}
      {editable && onRemove && (
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
          onClick={() => onRemove(tag.id)}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </Badge>
  );
}
```

#### 6.3.4 EmptyState Component

**Purpose:** Consistent empty state messaging across the app

**Props Interface:**
```typescript
// apps/web/src/components/common/EmptyState.tsx

import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction 
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-gray-100 p-6 mb-4">
        <Icon className="h-12 w-12 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
```

#### 6.3.5 LoadingSpinner Component

**Purpose:** Consistent loading states

**Props Interface:**
```typescript
// apps/web/src/components/common/LoadingSpinner.tsx

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <Loader2 className={cn('animate-spin text-gray-400', sizeClasses[size], className)} />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  );
}
```

#### 6.3.6 ErrorMessage Component

**Purpose:** Consistent error display with retry actions

**Props Interface:**
```typescript
// apps/web/src/components/common/ErrorMessage.tsx

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorMessage({ 
  title = 'Something went wrong', 
  message, 
  onRetry,
  retryLabel = 'Try again'
}: ErrorMessageProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2">
        {message}
        {onRetry && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry} 
            className="mt-3"
          >
            {retryLabel}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
```

### 6.4 Feature-Specific Components

Components organized by feature domain, corresponding to PRD screens and flows.

#### 6.4.1 User Discovery Components

**Location:** `apps/web/src/components/features/discovery/`

**Components:**
- `UserCard.tsx` - Displays user profile card with tags, reputation, and CTA (FR10)
- `UserSearchFilters.tsx` - Multi-filter interface (role, tags, tier) (FR33)
- `UserGrid.tsx` - Responsive grid of user cards
- `RecommendedMentors.tsx` - Personalized recommendations with match scores (FR18)
- `MutualAvailabilityIndicator.tsx` - Star icon with tooltip (FR20, FR106)

**UserCard Example:**
```typescript
// apps/web/src/components/features/discovery/UserCard.tsx

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/common/UserAvatar';
import { ReputationBadge } from '@/components/common/ReputationBadge';
import { TagsList } from '@/components/common/TagsList';
import { Star, Calendar } from 'lucide-react';
import { UserWithProfile } from '@shared/types/user';

export interface UserCardProps {
  user: UserWithProfile;
  hasMutualAvailability?: boolean;
  matchScore?: number;
  onViewProfile: (userId: string) => void;
  onBookNow?: (userId: string) => void;
  onExpressInterest?: (userId: string) => void;
}

export function UserCard({ 
  user, 
  hasMutualAvailability = false,
  matchScore,
  onViewProfile,
  onBookNow,
  onExpressInterest
}: UserCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-start gap-4">
        <UserAvatar user={user.profile} size="lg" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{user.profile.name}</h3>
            {hasMutualAvailability && (
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            )}
          </div>
          <p className="text-sm text-gray-500">{user.profile.title}</p>
          <ReputationBadge 
            tier={user.reputation_tier} 
            score={user.reputation_score} 
            size="sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {user.profile.bio || user.profile.expertise_description}
        </p>
        <TagsList tags={user.tags || []} maxTags={5} groupByCategory={false} />
        {matchScore && (
          <div className="mt-3 text-xs text-gray-500">
            Match Score: <span className="font-medium">{matchScore}%</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" onClick={() => onViewProfile(user.id)} className="flex-1">
          View Profile
        </Button>
        {onBookNow && user.role === 'mentor' && (
          <Button onClick={() => onBookNow(user.id)} className="flex-1">
            <Calendar className="h-4 w-4 mr-2" />
            Book Now
          </Button>
        )}
        {onExpressInterest && (
          <Button variant="secondary" onClick={() => onExpressInterest(user.id)}>
            Express Interest
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
```

_[Continued in Part 2...]_

#### 6.4.2 Booking Components

**Location:** `apps/web/src/components/features/bookings/`

**Components:**
- `AvailabilityCalendar.tsx` - Calendar view of mentor availability (FR21)
- `TimeSlotPicker.tsx` - Time slot selection grid (FR38)
- `BookingForm.tsx` - Meeting goal + materials form (FR38)
- `BookingConfirmationDialog.tsx` - Confirmation modal (FR39)
- `BookingCard.tsx` - Upcoming/past booking display (FR23)
- `CancelBookingDialog.tsx` - Cancellation with reason (FR40)
- `RatingDialog.tsx` - Post-meeting rating (FR45)

**TimeSlotPicker Example:**
```typescript
// apps/web/src/components/features/bookings/TimeSlotPicker.tsx

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TimeSlot } from '@shared/types/availability';
import { format, parseISO } from 'date-fns';

export interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedSlotId?: string;
  onSelectSlot: (slot: TimeSlot) => void;
  disabledSlotIds?: string[];
}

export function TimeSlotPicker({ 
  slots, 
  selectedSlotId, 
  onSelectSlot,
  disabledSlotIds = []
}: TimeSlotPickerProps) {
  // Group slots by date
  const slotsByDate = slots.reduce((acc, slot) => {
    const dateKey = format(parseISO(slot.start_time), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(slot);
    return acc;
  }, {} as Record<string, TimeSlot[]>);

  return (
    <div className="space-y-6">
      {Object.entries(slotsByDate).map(([date, dateSlots]) => (
        <div key={date}>
          <h4 className="font-medium text-sm text-gray-700 mb-3">
            {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {dateSlots.map(slot => {
              const isSelected = slot.id === selectedSlotId;
              const isDisabled = slot.is_booked || disabledSlotIds.includes(slot.id);
              
              return (
                <Button
                  key={slot.id}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  disabled={isDisabled}
                  onClick={() => onSelectSlot(slot)}
                  className={cn(
                    'justify-center',
                    isDisabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {format(parseISO(slot.start_time), 'h:mm a')}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

#### 6.4.3 Profile Components

**Location:** `apps/web/src/components/features/profile/`

**Components:**
- `ProfileForm.tsx` - Editable profile with role-specific fields (FR11)
- `AvatarUploader.tsx` - Image upload with crop/zoom (FR12, FR13)
- `TagSelector.tsx` - Tag selection from taxonomy with request (FR75)
- `CalendarConnectionCard.tsx` - Calendar integration status (FR21, FR25)
- `ProfileCompletenessIndicator.tsx` - Progress bar (NFR30)

**AvatarUploader Example:**
```typescript
// apps/web/src/components/features/profile/AvatarUploader.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Link as LinkIcon } from 'lucide-react';

export interface AvatarUploaderProps {
  currentAvatarUrl?: string | null;
  onUpload: (file: File) => Promise<void>;
  onUrlSubmit: (url: string) => Promise<void>;
  isUploading?: boolean;
}

export function AvatarUploader({ 
  currentAvatarUrl, 
  onUpload, 
  onUrlSubmit,
  isUploading = false
}: AvatarUploaderProps) {
  const [avatarUrl, setAvatarUrl] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="space-y-4">
      {currentAvatarUrl && (
        <div className="flex justify-center">
          <img 
            src={currentAvatarUrl} 
            alt="Current avatar" 
            className="h-32 w-32 rounded-full object-cover"
          />
        </div>
      )}
      
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="url">From URL</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload" className="space-y-2">
          <Label htmlFor="avatar-upload">Choose a file (JPG, PNG, max 2MB)</Label>
          <Input 
            id="avatar-upload"
            type="file" 
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </TabsContent>
        
        <TabsContent value="url" className="space-y-2">
          <Label htmlFor="avatar-url">Enter image URL</Label>
          <div className="flex gap-2">
            <Input 
              id="avatar-url"
              type="url"
              placeholder="https://example.com/avatar.jpg"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              disabled={isUploading}
            />
            <Button 
              onClick={() => onUrlSubmit(avatarUrl)}
              disabled={!avatarUrl || isUploading}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

#### 6.4.4 Availability Management Components (Mentor-only)

**Location:** `apps/web/src/components/features/availability/`

**Components:**
- `AvailabilityBlockForm.tsx` - Create/edit availability blocks (FR77)
- `AvailabilityBlockList.tsx` - Display existing blocks (FR79)
- `LocationPresetSelector.tsx` - Choose from CF locations (FR84)
- `RecurrencePatternPicker.tsx` - One-time, weekly, monthly, quarterly (FR82)
- `BufferTimeSelector.tsx` - Buffer between slots (FR88)

#### 6.4.5 Coordinator Components

**Location:** `apps/web/src/components/features/coordinator/`

**Components:**
- `DashboardStats.tsx` - KPI cards (FR68)
- `OverrideRequestsTable.tsx` - Exception approvals (FR54, FR55)
- `WhiteGloveScheduler.tsx` - Manual booking creation (FR67)
- `TaxonomyApprovalTable.tsx` - User-requested tags (FR75)
- `AuditLogViewer.tsx` - Admin action history (FR53)

### 6.5 Layout Components

**Location:** `apps/web/src/components/layouts/`

**Components:**
- `AppLayout.tsx` - Main authenticated layout with navigation
- `AuthLayout.tsx` - Unauthenticated layout (login, signup)
- `Header.tsx` - Top navigation with role-specific menu
- `Sidebar.tsx` - Side navigation (if needed)
- `Footer.tsx` - Footer with links

**AppLayout Example:**
```typescript
// apps/web/src/components/layouts/AppLayout.tsx

import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { Toaster } from '@/components/ui/toaster';

export interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {children}
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}
```

### 6.6 Component Design Patterns

#### 6.6.1 Composition Over Props Drilling

Use React Context for deeply nested data (auth user, theme):

```typescript
// apps/web/src/contexts/AuthContext.tsx

import { createContext, useContext, ReactNode } from 'react';
import { UserWithProfile } from '@shared/types/user';

interface AuthContextValue {
  user: UserWithProfile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Implementation in Section 7
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

#### 6.6.2 Controlled vs Uncontrolled Components

**Controlled (for forms with validation):**
```typescript
// Using React Hook Form
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm({
  resolver: zodResolver(CreateBookingSchema),
  defaultValues: { meeting_goal: '', materials_urls: [] },
});
```

**Uncontrolled (for simple inputs):**
```typescript
// Direct input without state management
<Input type="text" defaultValue={user.name} ref={nameRef} />
```

#### 6.6.3 Render Props for Flexible UI

**Example: Data fetching wrapper**
```typescript
// apps/web/src/components/common/DataFetcher.tsx

interface DataFetcherProps<T> {
  fetcher: () => Promise<T>;
  children: (data: T) => ReactNode;
  loadingComponent?: ReactNode;
  errorComponent?: (error: Error) => ReactNode;
}

export function DataFetcher<T>({ 
  fetcher, 
  children, 
  loadingComponent,
  errorComponent 
}: DataFetcherProps<T>) {
  const { data, isLoading, error } = useQuery({ queryFn: fetcher });

  if (isLoading) return loadingComponent || <LoadingSpinner />;
  if (error) return errorComponent?.(error) || <ErrorMessage message={error.message} />;
  if (!data) return null;

  return <>{children(data)}</>;
}
```

**Usage:**
```typescript
<DataFetcher fetcher={() => fetchMentors()}>
  {(mentors) => <UserGrid users={mentors} />}
</DataFetcher>
```

#### 6.6.4 Compound Components for Complex UI

**Example: Multi-step booking flow**
```typescript
// apps/web/src/components/features/bookings/BookingWizard.tsx

export function BookingWizard({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState(0);
  // Wizard logic
  return (
    <WizardContext.Provider value={{ currentStep, setCurrentStep }}>
      {children}
    </WizardContext.Provider>
  );
}

BookingWizard.Step = function Step({ children }: { children: ReactNode }) {
  // Step logic
  return <>{children}</>;
};

// Usage:
<BookingWizard>
  <BookingWizard.Step>Select mentor</BookingWizard.Step>
  <BookingWizard.Step>Pick time</BookingWizard.Step>
  <BookingWizard.Step>Enter details</BookingWizard.Step>
  <BookingWizard.Step>Confirm</BookingWizard.Step>
</BookingWizard>
```

#### 6.6.5 Error Boundaries for Graceful Failures

```typescript
// apps/web/src/components/common/ErrorBoundary.tsx

import { Component, ReactNode } from 'react';
import { ErrorMessage } from './ErrorMessage';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // TODO: Send to monitoring service (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <ErrorMessage 
          title="Something went wrong"
          message={this.state.error?.message || 'An unexpected error occurred'}
          onRetry={() => this.setState({ hasError: false })}
        />
      );
    }

    return this.props.children;
  }
}
```

### 6.7 Component Testing Approach

**Unit Tests (Vitest + Testing Library):**
```typescript
// apps/web/src/components/common/UserAvatar.test.tsx

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { UserAvatar } from './UserAvatar';

describe('UserAvatar', () => {
  it('displays user initials when no avatar URL', () => {
    render(<UserAvatar user={{ name: 'John Doe' }} />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('shows online status when enabled', () => {
    const { container } = render(
      <UserAvatar user={{ name: 'John Doe' }} showOnlineStatus />
    );
    expect(container.querySelector('.bg-green-500')).toBeInTheDocument();
  });
});
```

**Integration Tests (Playwright):**
```typescript
// apps/web/e2e/booking-flow.spec.ts

import { test, expect } from '@playwright/test';

test('complete booking flow', async ({ page }) => {
  await page.goto('/mentors');
  await page.click('[data-testid="mentor-card-first"] button:has-text("Book Now")');
  await page.click('[data-testid="time-slot-picker"] button:first-child');
  await page.fill('[name="meeting_goal"]', 'Discuss product-market fit strategy');
  await page.click('button:has-text("Confirm Booking")');
  await expect(page.locator('text=Booking Confirmed')).toBeVisible();
});
```

### 6.8 Accessibility (WCAG 2.1 AA Compliance)

All components follow accessibility best practices:

**1. Semantic HTML:**
```typescript
// Good
<button onClick={handleClick}>Submit</button>

// Bad
<div onClick={handleClick}>Submit</div>
```

**2. ARIA Labels:**
```typescript
<Button aria-label="Close dialog" onClick={onClose}>
  <X className="h-4 w-4" />
</Button>
```

**3. Keyboard Navigation:**
- All interactive elements must be keyboard accessible
- Focus indicators visible (Tailwind's `focus:ring-2`)
- Logical tab order

**4. Color Contrast:**
- Minimum 4.5:1 for normal text
- Minimum 3:1 for large text
- Shadcn/ui components meet these by default

**5. Screen Reader Support:**
```typescript
<img src={avatar} alt={`${user.name}'s avatar`} />
<input type="text" id="email" />
<label htmlFor="email">Email Address</label>
```

### 6.9 Performance Optimization

**1. Code Splitting:**
```typescript
// apps/web/src/pages/Dashboard.tsx
import { lazy, Suspense } from 'react';

const CoordinatorPanel = lazy(() => import('@/components/features/coordinator/CoordinatorPanel'));

export function Dashboard() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      {user.role === 'coordinator' && <CoordinatorPanel />}
    </Suspense>
  );
}
```

**2. Memoization:**
```typescript
import { memo, useMemo } from 'react';

export const UserCard = memo(function UserCard({ user, onViewProfile }: UserCardProps) {
  const formattedTags = useMemo(
    () => user.tags.map(tag => tag.tag_value.replace(/_/g, ' ')),
    [user.tags]
  );
  
  return (/* ... */);
});
```

**3. Virtual Scrolling (for large lists):**
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

export function UserList({ users }: { users: UserWithProfile[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: users.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Estimated row height
  });

  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div key={virtualRow.index} style={{ transform: `translateY(${virtualRow.start}px)` }}>
            <UserCard user={users[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 6.10 Component Documentation Standards

Each component should include JSDoc comments:

```typescript
/**
 * Displays a user profile card with avatar, reputation badge, and tags.
 * 
 * @param user - User object with profile information
 * @param hasMutualAvailability - Shows star indicator if true (FR20)
 * @param matchScore - Optional match percentage for recommendations (FR18)
 * @param onViewProfile - Callback when "View Profile" is clicked
 * @param onBookNow - Callback when "Book Now" is clicked (mentor cards only)
 * 
 * @example
 * ```tsx
 * <UserCard 
 *   user={mentor} 
 *   hasMutualAvailability 
 *   onViewProfile={handleViewProfile}
 *   onBookNow={handleBookNow}
 * />
 * ```
 */
export function UserCard({ user, hasMutualAvailability, ... }: UserCardProps) {
  // Implementation
}
```

---


## 7. Frontend Architecture

This section defines the React frontend architecture, including application structure, routing strategy, state management, data fetching patterns, authentication flows, and real-time communication. The frontend is built with **React 18.3.x**, **Vite 5.x**, **TypeScript 5.7.x**, and follows modern React best practices.

### 7.1 Frontend Application Structure

The frontend follows a **feature-based directory structure** with clear separation of concerns:

```
apps/web/
├── public/                          # Static assets
│   ├── favicon.ico
│   ├── robots.txt
│   └── manifest.json
├── src/
│   ├── components/                  # React components (from Section 6)
│   │   ├── ui/                      # Shadcn/ui components (auto-generated)
│   │   ├── common/                  # Shared components
│   │   ├── features/                # Feature-specific components
│   │   │   ├── discovery/
│   │   │   ├── bookings/
│   │   │   ├── profile/
│   │   │   ├── availability/
│   │   │   └── coordinator/
│   │   └── layouts/                 # Layout components
│   ├── pages/                       # Route pages (one component per route)
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── SignupPage.tsx
│   │   │   └── CallbackPage.tsx    # OAuth callback handler
│   │   ├── DashboardPage.tsx
│   │   ├── MentorsPage.tsx
│   │   ├── MenteesPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── BookingPage.tsx
│   │   ├── AvailabilityPage.tsx    # Mentor-only
│   │   ├── CoordinatorDashboard.tsx # Coordinator-only
│   │   └── NotFoundPage.tsx
│   ├── hooks/                       # Custom React hooks
│   │   ├── useAuth.ts               # Authentication hook
│   │   ├── useBookings.ts           # Booking management
│   │   ├── useUsers.ts              # User queries
│   │   ├── useAvailability.ts       # Availability management
│   │   ├── useRealtime.ts           # Supabase Realtime subscriptions
│   │   ├── useCalendar.ts           # Calendar integration
│   │   └── useToast.ts              # Toast notifications
│   ├── services/                    # API client and external services
│   │   ├── api/                     # API client functions
│   │   │   ├── client.ts            # Base fetch wrapper
│   │   │   ├── auth.ts              # Auth endpoints
│   │   │   ├── users.ts             # User endpoints
│   │   │   ├── bookings.ts          # Booking endpoints
│   │   │   ├── availability.ts      # Availability endpoints
│   │   │   └── coordinator.ts       # Coordinator endpoints
│   │   ├── supabase.ts              # Supabase client initialization
│   │   └── calendar.ts              # Calendar provider abstractions
│   ├── stores/                      # Zustand stores
│   │   ├── authStore.ts             # Auth state (user, session)
│   │   ├── bookingStore.ts          # Booking UI state (selected slot, form data)
│   │   └── notificationStore.ts     # Toast notification queue
│   ├── contexts/                    # React contexts
│   │   ├── AuthContext.tsx          # Auth provider wrapper
│   │   └── RealtimeContext.tsx      # Realtime connection provider
│   ├── lib/                         # Utilities and helpers
│   │   ├── utils.ts                 # General utilities (cn, formatters)
│   │   ├── constants.ts             # App constants
│   │   ├── validators.ts            # Client-side validation helpers
│   │   └── errors.ts                # Error handling utilities
│   ├── types/                       # Frontend-specific types
│   │   ├── routes.ts                # Route definitions
│   │   └── ui.ts                    # UI-specific types
│   ├── App.tsx                      # Root component with providers
│   ├── main.tsx                     # Entry point
│   ├── router.tsx                   # React Router configuration
│   └── index.css                    # Global styles (Tailwind imports)
├── e2e/                             # Playwright E2E tests
│   ├── auth.spec.ts
│   ├── booking-flow.spec.ts
│   └── profile.spec.ts
├── index.html                       # HTML template
├── vite.config.ts                   # Vite configuration
├── tailwind.config.ts               # Tailwind configuration
├── tsconfig.json                    # TypeScript configuration
├── vitest.config.ts                 # Vitest configuration
├── playwright.config.ts             # Playwright configuration
└── package.json                     # Dependencies
```

**Key Principles:**
- **Feature-based organization:** Related components grouped by feature domain
- **Colocation:** Keep files that change together close together
- **Separation of concerns:** Clear boundaries between UI, business logic, and data
- **Import aliases:** Use `@/` for `src/`, `@shared/` for shared package

### 7.2 Routing Strategy

**Router:** React Router v6.x with data loading and protected routes

**Router Configuration:**
```typescript
// apps/web/src/router.tsx

import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { RoleGuard } from '@/components/common/RoleGuard';

// Lazy load pages for code splitting
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const MentorsPage = lazy(() => import('@/pages/MentorsPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const AvailabilityPage = lazy(() => import('@/pages/AvailabilityPage'));
const CoordinatorDashboard = lazy(() => import('@/pages/CoordinatorDashboard'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      // Public routes
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      // Protected routes
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },
          {
            path: 'mentors',
            element: <MentorsPage />,
          },
          {
            path: 'mentees',
            element: <MenteesPage />,
          },
          {
            path: 'profile/:userId?',
            element: <ProfilePage />,
          },
          {
            path: 'bookings/:bookingId',
            element: <BookingPage />,
          },
          // Mentor-only routes
          {
            element: <RoleGuard allowedRoles={['mentor']} />,
            children: [
              {
                path: 'availability',
                element: <AvailabilityPage />,
              },
            ],
          },
          // Coordinator-only routes
          {
            element: <RoleGuard allowedRoles={['coordinator']} />,
            children: [
              {
                path: 'coordinator',
                element: <CoordinatorDashboard />,
              },
            ],
          },
        ],
      },
    ],
  },
  // Auth routes (separate layout)
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'signup',
        element: <SignupPage />,
      },
      {
        path: 'callback',
        element: <CallbackPage />, // OAuth callback
      },
    ],
  },
  // 404
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
```

**ProtectedRoute Component:**
```typescript
// apps/web/src/components/common/ProtectedRoute.tsx

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading..." />;
  }

  if (!user) {
    // Redirect to login with return URL
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
```

**RoleGuard Component:**
```typescript
// apps/web/src/components/common/RoleGuard.tsx

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@shared/types/user';

interface RoleGuardProps {
  allowedRoles: UserRole[];
}

export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    // Unauthorized access
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
```

**Deep Linking & Bookmark-able States:**

To enable users to bookmark and share specific application states, the routing strategy implements URL-based state management for key user flows:

```typescript
// apps/web/src/pages/MentorsPage.tsx

import { useSearchParams } from 'react-router-dom';

export function MentorsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Read state from URL
  const filters = {
    tags: searchParams.getAll('tag'),
    tier: searchParams.get('tier'),
    hasAvailability: searchParams.get('available') === 'true',
  };
  
  const handleFilterChange = (newFilters: Filters) => {
    const params = new URLSearchParams();
    
    // Encode state in URL
    newFilters.tags.forEach(tag => params.append('tag', tag));
    if (newFilters.tier) params.set('tier', newFilters.tier);
    if (newFilters.hasAvailability) params.set('available', 'true');
    
    setSearchParams(params);
  };
  
  return <MentorDirectory filters={filters} onFilterChange={handleFilterChange} />;
}
```

**Bookmark-able URLs:**

| State | Example URL | Description |
|-------|-------------|-------------|
| **Filtered Mentor Search** | `/mentors?tag=fintech&tag=saas&tier=gold&available=true` | Search results with specific filters applied |
| **User Profile** | `/profile/550e8400-e29b-41d4-a716-446655440001` | Direct link to specific user profile |
| **Booking Details** | `/bookings/a1b2c3d4-e5f6-7890-abcd-ef1234567890` | Direct link to specific booking |
| **Profile Edit Mode** | `/profile?edit=true` | Profile page in edit mode |
| **Dashboard Tab** | `/dashboard?tab=upcoming` | Specific dashboard tab (upcoming vs past bookings) |
| **Coordinator View** | `/coordinator?view=overrides&status=pending` | Coordinator dashboard filtered view |

**Implementation Pattern:**

```typescript
// Custom hook for managing URL state
export function useURLState<T extends Record<string, any>>(
  defaults: T
): [T, (updates: Partial<T>) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const state = useMemo(() => {
    const result = { ...defaults };
    
    // Parse URL params into typed state
    Object.keys(defaults).forEach(key => {
      const value = searchParams.get(key);
      if (value !== null) {
        // Type coercion based on default value type
        if (typeof defaults[key] === 'boolean') {
          result[key] = value === 'true';
        } else if (typeof defaults[key] === 'number') {
          result[key] = Number(value);
        } else if (Array.isArray(defaults[key])) {
          result[key] = searchParams.getAll(key);
        } else {
          result[key] = value;
        }
      }
    });
    
    return result as T;
  }, [searchParams, defaults]);
  
  const setState = useCallback((updates: Partial<T>) => {
    const params = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === defaults[key]) {
        params.delete(key);
      } else if (Array.isArray(value)) {
        params.delete(key);
        value.forEach(v => params.append(key, String(v)));
      } else {
        params.set(key, String(value));
      }
    });
    
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams, defaults]);
  
  return [state, setState];
}
```

**Usage Example:**

```typescript
// apps/web/src/pages/DashboardPage.tsx

interface DashboardState {
  tab: 'upcoming' | 'past' | 'all';
  sortBy: 'date' | 'mentor';
}

export function DashboardPage() {
  const [state, setState] = useURLState<DashboardState>({
    tab: 'upcoming',
    sortBy: 'date',
  });
  
  return (
    <div>
      <Tabs value={state.tab} onValueChange={tab => setState({ tab })}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>
      {/* Tab content */}
    </div>
  );
}
```

**Benefits:**
- ✅ Users can bookmark filtered views and search results
- ✅ Share links preserve exact application state
- ✅ Browser back/forward navigation works intuitively
- ✅ SEO-friendly for public pages
- ✅ Analytics can track specific user paths
- ✅ Deep links from emails/notifications work correctly

---

### 7.3 State Management

**Strategy:** Hybrid approach using **Zustand** (global UI state) + **React Query** (server state)

#### 7.3.1 Zustand for UI State

**Auth Store:**
```typescript
// apps/web/src/stores/authStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserWithProfile } from '@shared/types/user';

interface AuthState {
  user: UserWithProfile | null;
  session: { access_token: string; refresh_token: string } | null;
  setUser: (user: UserWithProfile | null) => void;
  setSession: (session: AuthState['session']) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      clearAuth: () => set({ user: null, session: null }),
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({ 
        session: state.session // Only persist session, not full user object
      }),
    }
  )
);
```

**Booking UI Store:**
```typescript
// apps/web/src/stores/bookingStore.ts

import { create } from 'zustand';
import { TimeSlot } from '@shared/types/availability';

interface BookingState {
  selectedMentorId: string | null;
  selectedSlot: TimeSlot | null;
  bookingFormData: {
    meeting_goal: string;
    materials_urls: string[];
  };
  setSelectedMentor: (mentorId: string | null) => void;
  setSelectedSlot: (slot: TimeSlot | null) => void;
  updateFormData: (data: Partial<BookingState['bookingFormData']>) => void;
  resetBookingFlow: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  selectedMentorId: null,
  selectedSlot: null,
  bookingFormData: {
    meeting_goal: '',
    materials_urls: [],
  },
  setSelectedMentor: (mentorId) => set({ selectedMentorId: mentorId }),
  setSelectedSlot: (slot) => set({ selectedSlot: slot }),
  updateFormData: (data) =>
    set((state) => ({
      bookingFormData: { ...state.bookingFormData, ...data },
    })),
  resetBookingFlow: () =>
    set({
      selectedMentorId: null,
      selectedSlot: null,
      bookingFormData: { meeting_goal: '', materials_urls: [] },
    }),
}));
```

**Notification Store:**
```typescript
// apps/web/src/stores/notificationStore.ts

import { create } from 'zustand';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: 'default' | 'success' | 'error' | 'warning';
}

interface NotificationState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: Math.random().toString(36) }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
```

#### 7.3.2 React Query for Server State

**QueryClient Configuration:**
```typescript
// apps/web/src/lib/queryClient.ts

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

**Query Hooks Example:**
```typescript
// apps/web/src/hooks/useUsers.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, getUserById, updateUserProfile } from '@/services/api/users';
import { UserWithProfile } from '@shared/types/user';

// Query keys for cache management
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

// Fetch user list with filters
export function useUsers(filters: { role?: string; tags?: string[] }) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => getUsers(filters),
  });
}

// Fetch single user by ID
export function useUser(userId: string) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => getUserById(userId),
    enabled: !!userId, // Only run if userId exists
  });
}

// Update user profile mutation
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<UserWithProfile>) => updateUserProfile(data),
    onSuccess: (updatedUser) => {
      // Invalidate and refetch user queries
      queryClient.invalidateQueries({ queryKey: userKeys.detail(updatedUser.id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      
      // Optimistically update cache
      queryClient.setQueryData(userKeys.detail(updatedUser.id), updatedUser);
    },
  });
}
```

**Booking Hooks Example:**
```typescript
// apps/web/src/hooks/useBookings.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getMyBookings, 
  createBooking, 
  cancelBooking 
} from '@/services/api/bookings';
import { useNotificationStore } from '@/stores/notificationStore';
import { useBookingStore } from '@/stores/bookingStore';

export const bookingKeys = {
  all: ['bookings'] as const,
  my: () => [...bookingKeys.all, 'my'] as const,
  detail: (id: string) => [...bookingKeys.all, 'detail', id] as const,
};

export function useMyBookings() {
  return useQuery({
    queryKey: bookingKeys.my(),
    queryFn: getMyBookings,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  const addToast = useNotificationStore((state) => state.addToast);
  const resetBookingFlow = useBookingStore((state) => state.resetBookingFlow);

  return useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      // Invalidate bookings list
      queryClient.invalidateQueries({ queryKey: bookingKeys.my() });
      
      // Show success toast
      addToast({
        title: 'Booking Confirmed',
        description: 'Your meeting has been scheduled successfully.',
        variant: 'success',
      });
      
      // Reset booking flow state
      resetBookingFlow();
    },
    onError: (error: any) => {
      addToast({
        title: 'Booking Failed',
        description: error.message || 'Something went wrong',
        variant: 'error',
      });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  const addToast = useNotificationStore((state) => state.addToast);

  return useMutation({
    mutationFn: ({ 
      bookingId, 
      reason, 
      notes 
    }: { 
      bookingId: string; 
      reason?: string; 
      notes?: string 
    }) => cancelBooking(bookingId, reason, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.my() });
      addToast({
        title: 'Booking Cancelled',
        description: 'The meeting has been cancelled.',
        variant: 'default',
      });
    },
  });
}
```

### 7.4 Data Fetching & API Client

**Base API Client:**
```typescript
// apps/web/src/services/api/client.ts

import { useAuthStore } from '@/stores/authStore';
import type { paths } from '@shared/types/api.generated';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { session } = useAuthStore.getState();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add auth token if available
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized (session expired)
  if (response.status === 401) {
    useAuthStore.getState().clearAuth();
    window.location.href = '/auth/login';
    throw new ApiError('Session expired', 401, 'UNAUTHORIZED');
  }

  const data = await response.json();

  if (!response.ok) {
    const error = data.error || {};
    throw new ApiError(
      error.message || 'An error occurred',
      response.status,
      error.code || 'UNKNOWN_ERROR',
      error.details
    );
  }

  return data as T;
}
```

**API Service Example:**
```typescript
// apps/web/src/services/api/bookings.ts

import { apiClient } from './client';
import type { paths } from '@shared/types/api.generated';

type CreateBookingRequest = 
  paths['/bookings']['post']['requestBody']['content']['application/json'];
type BookingResponse = 
  paths['/bookings']['post']['responses']['201']['content']['application/json'];
type BookingsListResponse = 
  paths['/bookings/my-bookings']['get']['responses']['200']['content']['application/json'];

export async function getMyBookings(): Promise<BookingsListResponse> {
  return apiClient<BookingsListResponse>('/bookings/my-bookings');
}

export async function createBooking(
  data: CreateBookingRequest
): Promise<BookingResponse> {
  return apiClient<BookingResponse>('/bookings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function cancelBooking(
  bookingId: string,
  reason?: string,
  notes?: string
): Promise<BookingResponse> {
  return apiClient<BookingResponse>(`/bookings/${bookingId}/cancel`, {
    method: 'PUT',
    body: JSON.stringify({ reason, notes }),
  });
}
```

### 7.5 Authentication Flow

**Auth Hook:**
```typescript
// apps/web/src/hooks/useAuth.ts

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/services/supabase';
import { UserWithProfile } from '@shared/types/user';

export function useAuth() {
  const { user, session, setUser, setSession, clearAuth } = useAuthStore();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        fetchUser(session.access_token);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        fetchUser(session.access_token);
      } else {
        clearAuth();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUser(token: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const userData: UserWithProfile = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    clearAuth();
  }

  return {
    user,
    session,
    isLoading: session !== null && user === null,
    isAuthenticated: !!user,
    signOut,
  };
}
```

**Login/Signup Components:**
```typescript
// apps/web/src/pages/auth/LoginPage.tsx

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/services/supabase';
import { useNotificationStore } from '@/stores/notificationStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const addToast = useNotificationStore((state) => state.addToast);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  async function handleMagicLink() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      addToast({
        title: 'Check your email',
        description: 'We sent you a magic link to sign in.',
        variant: 'success',
      });
    } catch (error: any) {
      addToast({
        title: 'Error',
        description: error.message,
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleOAuth() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
      },
    });

    if (error) {
      addToast({
        title: 'Error',
        description: error.message,
        variant: 'error',
      });
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold">Sign In</h1>
      
      {/* Magic Link */}
      <div className="space-y-2">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button onClick={handleMagicLink} disabled={loading} className="w-full">
          {loading ? 'Sending...' : 'Send Magic Link'}
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or</span>
        </div>
      </div>

      {/* OAuth Buttons */}
      <Button onClick={handleGoogleOAuth} variant="outline" className="w-full">
        Continue with Google
      </Button>
      
      <Button onClick={() => {/* Microsoft OAuth */}} variant="outline" className="w-full">
        Continue with Microsoft
      </Button>
    </div>
  );
}
```

_[Continued in next part...]_

### 7.6 Real-Time Updates (Supabase Realtime)

**Real-Time Strategy:** Subscribe to booking and availability changes to prevent double-booking (FR106, NFR7)

**Realtime Hook:**
```typescript
// apps/web/src/hooks/useRealtime.ts

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { bookingKeys } from '@/hooks/useBookings';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useBookingRealtime(mentorId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!mentorId) return;

    let channel: RealtimeChannel;

    // Subscribe to time_slots table for this mentor
    channel = supabase
      .channel(`time_slots:mentor_id=eq.${mentorId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'time_slots',
          filter: `mentor_id=eq.${mentorId}`,
        },
        (payload) => {
          console.log('Slot updated:', payload);
          
          // Invalidate availability queries to refetch
          queryClient.invalidateQueries({ 
            queryKey: ['availability', 'slots', mentorId] 
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [mentorId, queryClient]);
}

export function useMyBookingsRealtime() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Subscribe to bookings where user is mentor or mentee
    const channel = supabase
      .channel('my_bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `or(mentor_id.eq.${user.id},mentee_id.eq.${user.id})`,
        },
        (payload) => {
          console.log('Booking updated:', payload);
          
          // Refetch bookings list
          queryClient.invalidateQueries({ queryKey: bookingKeys.my() });
          
          // Show toast for updates
          if (payload.eventType === 'UPDATE' && payload.new.status === 'canceled') {
            addToast({
              title: 'Booking Cancelled',
              description: 'A meeting was cancelled. Check your bookings.',
              variant: 'warning',
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, queryClient]);
}
```

**Usage in Components:**
```typescript
// apps/web/src/pages/BookingPage.tsx

export default function BookingPage() {
  const { mentorId } = useParams();
  
  // Subscribe to real-time updates for this mentor's slots
  useBookingRealtime(mentorId);
  
  const { data: slots, isLoading } = useQuery({
    queryKey: ['availability', 'slots', mentorId],
    queryFn: () => fetchAvailableSlots(mentorId),
  });

  // ... rest of component
}
```

### 7.7 Form Handling

**Strategy:** React Hook Form + Zod validation (shared schemas from backend)

**Form Example:**
```typescript
// apps/web/src/components/features/bookings/BookingForm.tsx

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateBookingSchema } from '@shared/schemas/booking';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export function BookingForm({ slotId, onSubmit }: BookingFormProps) {
  const form = useForm({
    resolver: zodResolver(CreateBookingSchema),
    defaultValues: {
      time_slot_id: slotId,
      meeting_goal: '',
      materials_urls: [],
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="meeting_goal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meeting Goal *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What would you like to discuss? (min 10 characters)"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="materials_urls"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Materials (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Add links to pitch decks, documents, etc."
                  {...field}
                  value={field.value?.[0] || ''}
                  onChange={(e) => field.onChange([e.target.value])}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Confirming...' : 'Confirm Booking'}
        </Button>
      </form>
    </Form>
  );
}
```

**Profile Form with Role-Specific Fields:**
```typescript
// apps/web/src/components/features/profile/ProfileForm.tsx

export function ProfileForm() {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();

  const form = useForm({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      name: user?.profile.name || '',
      title: user?.profile.title || '',
      bio: user?.profile.bio || '',
      // Mentor-specific
      expertise_description: user?.profile.expertise_description || '',
      ideal_mentee_description: user?.profile.ideal_mentee_description || '',
      // Mentee-specific
      pitch_vc_url: user?.profile.pitch_vc_url || '',
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfile.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Common fields */}
        <FormField name="name" />
        <FormField name="title" />
        <FormField name="bio" />

        {/* Conditional fields based on role */}
        {user?.role === 'mentor' && (
          <>
            <FormField name="expertise_description" />
            <FormField name="ideal_mentee_description" />
          </>
        )}

        {user?.role === 'mentee' && (
          <FormField name="pitch_vc_url" />
        )}

        <Button type="submit">Save Changes</Button>
      </form>
    </Form>
  );
}
```

### 7.8 Calendar Integration (Frontend)

**Calendar Connection Flow:**
```typescript
// apps/web/src/hooks/useCalendar.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { CalendarProvider } from '@shared/types/calendar';

export function useCalendarConnection() {
  return useQuery({
    queryKey: ['calendar', 'status'],
    queryFn: async () => {
      const response = await fetch('/api/calendar/sync-status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.json();
    },
  });
}

export function useConnectCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (provider: CalendarProvider) => {
      if (provider === 'google') {
        return supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/profile?calendar_connected=true`,
            scopes: 'https://www.googleapis.com/auth/calendar',
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });
      } else {
        // Microsoft OAuth flow
        return supabase.auth.signInWithOAuth({
          provider: 'azure',
          options: {
            redirectTo: `${window.location.origin}/profile?calendar_connected=true`,
            scopes: 'Calendars.ReadWrite offline_access',
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', 'status'] });
    },
  });
}

export function useDisconnectCalendar() {
  const queryClient = useQueryClient();
  const addToast = useNotificationStore((state) => state.addToast);

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/calendar/disconnect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['calendar', 'status'] });
      
      if (data.warning) {
        addToast({
          title: 'Calendar Disconnected',
          description: data.warning,
          variant: 'warning',
        });
      } else {
        addToast({
          title: 'Calendar Disconnected',
          variant: 'success',
        });
      }
    },
  });
}
```

**Calendar Connection Card:**
```typescript
// apps/web/src/components/features/profile/CalendarConnectionCard.tsx

import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, AlertCircle } from 'lucide-react';
import { useCalendarConnection, useConnectCalendar, useDisconnectCalendar } from '@/hooks/useCalendar';

export function CalendarConnectionCard() {
  const { data: status, isLoading } = useCalendarConnection();
  const connectCalendar = useConnectCalendar();
  const disconnectCalendar = useDisconnectCalendar();

  if (isLoading) return <div>Loading...</div>;

  const isConnected = status?.is_connected;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <h3 className="font-semibold">Calendar Integration</h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected && (
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You must connect your calendar to create availability or book meetings (FR105).
            </AlertDescription>
          </Alert>
        )}

        {isConnected ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Connected: <span className="font-medium">{status.provider}</span>
            </p>
            <p className="text-sm text-gray-600">
              Last synced: {new Date(status.last_sync_at).toLocaleString()}
            </p>
            <Button 
              variant="outline" 
              onClick={() => disconnectCalendar.mutate()}
              disabled={disconnectCalendar.isPending}
            >
              Disconnect Calendar
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button onClick={() => connectCalendar.mutate('google')}>
              Connect Google Calendar
            </Button>
            <Button 
              variant="outline" 
              onClick={() => connectCalendar.mutate('microsoft')}
            >
              Connect Outlook
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 7.9 Error Handling & Loading States

**Global Error Boundary:**
```typescript
// apps/web/src/App.tsx

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AppRouter } from '@/router';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppRouter />
          <Toaster />
        </AuthProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
```

**Suspense Boundaries for Code Splitting:**
```typescript
// apps/web/src/pages/DashboardPage.tsx

import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const BookingList = lazy(() => import('@/components/features/bookings/BookingList'));
const RecommendedMentors = lazy(() => import('@/components/features/discovery/RecommendedMentors'));

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <ErrorBoundary fallback={<div>Failed to load bookings</div>}>
        <Suspense fallback={<LoadingSpinner text="Loading bookings..." />}>
          <BookingList />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={<div>Failed to load recommendations</div>}>
        <Suspense fallback={<LoadingSpinner text="Finding mentors..." />}>
          <RecommendedMentors />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
```

### 7.10 Performance Optimization Strategies

**1. Route-Based Code Splitting:**
All pages lazy loaded via React Router (see Section 7.2)

**2. Component-Level Code Splitting:**
```typescript
// Heavy components loaded on-demand
const BookingWizard = lazy(() => import('@/components/features/bookings/BookingWizard'));
const CoordinatorPanel = lazy(() => import('@/components/features/coordinator/CoordinatorPanel'));
```

**3. Image Optimization:**
```typescript
// apps/web/src/components/common/OptimizedImage.tsx

export function OptimizedImage({ src, alt, ...props }: ImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      {...props}
    />
  );
}
```

**4. React Query Prefetching:**
```typescript
// Prefetch data on hover for faster navigation
import { useQueryClient } from '@tanstack/react-query';

function MentorCard({ mentor }) {
  const queryClient = useQueryClient();

  const handleMouseEnter = () => {
    // Prefetch mentor details
    queryClient.prefetchQuery({
      queryKey: userKeys.detail(mentor.id),
      queryFn: () => getUserById(mentor.id),
    });
  };

  return (
    <Card onMouseEnter={handleMouseEnter}>
      {/* ... */}
    </Card>
  );
}
```

**5. Debounced Search:**
```typescript
// apps/web/src/hooks/useDebouncedSearch.ts

import { useState, useEffect } from 'react';

export function useDebouncedValue<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Usage in search component:
const [searchQuery, setSearchQuery] = useState('');
const debouncedQuery = useDebouncedValue(searchQuery, 300);

const { data } = useQuery({
  queryKey: ['users', 'search', debouncedQuery],
  queryFn: () => searchUsers(debouncedQuery),
  enabled: debouncedQuery.length > 2,
});
```

**6. Optimistic Updates:**
```typescript
// apps/web/src/hooks/useOptimisticBooking.ts

export function useOptimisticCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelBooking,
    onMutate: async (bookingId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: bookingKeys.my() });

      // Snapshot current data
      const previousBookings = queryClient.getQueryData(bookingKeys.my());

      // Optimistically update
      queryClient.setQueryData(bookingKeys.my(), (old: any) => ({
        ...old,
        bookings: old.bookings.map((booking: any) =>
          booking.id === bookingId
            ? { ...booking, status: 'canceled' }
            : booking
        ),
      }));

      return { previousBookings };
    },
    onError: (err, bookingId, context) => {
      // Rollback on error
      queryClient.setQueryData(bookingKeys.my(), context?.previousBookings);
    },
    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: bookingKeys.my() });
    },
  });
}
```

### 7.11 Environment Configuration

**Environment Variables:**
```typescript
// apps/web/.env.example

# API
VITE_API_BASE_URL=http://localhost:8787/v1

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Feature Flags (optional)
VITE_ENABLE_REALTIME=true
VITE_ENABLE_ANALYTICS=false
```

**Type-Safe Environment Variables:**
```typescript
// apps/web/src/lib/env.ts

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_ENABLE_REALTIME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
  features: {
    realtime: import.meta.env.VITE_ENABLE_REALTIME === 'true',
  },
};
```

### 7.12 Build Configuration

**Vite Configuration:**
```typescript
// apps/web/vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'query-vendor': ['@tanstack/react-query'],
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      // Proxy API requests to Cloudflare Workers during development
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
```

**TypeScript Configuration:**
```json
// apps/web/tsconfig.json

{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "types": ["vite/client"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["../../packages/shared/src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "../../packages/shared" }]
}
```

### 7.13 Testing Strategy (Frontend)

**Unit Tests (Vitest):**
```typescript
// apps/web/src/hooks/useBookings.test.ts

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import { useMyBookings } from './useBookings';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useMyBookings', () => {
  it('fetches bookings successfully', async () => {
    const { result } = renderHook(() => useMyBookings(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(3);
  });
});
```

**Component Tests:**
```typescript
// apps/web/src/components/features/bookings/TimeSlotPicker.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TimeSlotPicker } from './TimeSlotPicker';

describe('TimeSlotPicker', () => {
  const mockSlots = [
    {
      id: '1',
      start_time: '2025-10-15T14:00:00Z',
      end_time: '2025-10-15T14:30:00Z',
      is_booked: false,
    },
    {
      id: '2',
      start_time: '2025-10-15T15:00:00Z',
      end_time: '2025-10-15T15:30:00Z',
      is_booked: true,
    },
  ];

  it('renders available time slots', () => {
    render(
      <TimeSlotPicker 
        slots={mockSlots} 
        onSelectSlot={vi.fn()} 
      />
    );

    expect(screen.getByText('2:00 PM')).toBeInTheDocument();
    expect(screen.getByText('3:00 PM')).toBeInTheDocument();
  });

  it('disables booked slots', () => {
    render(
      <TimeSlotPicker 
        slots={mockSlots} 
        onSelectSlot={vi.fn()} 
      />
    );

    const bookedButton = screen.getByText('3:00 PM').closest('button');
    expect(bookedButton).toBeDisabled();
  });

  it('calls onSelectSlot when clicking available slot', () => {
    const onSelectSlot = vi.fn();
    render(
      <TimeSlotPicker 
        slots={mockSlots} 
        onSelectSlot={onSelectSlot} 
      />
    );

    fireEvent.click(screen.getByText('2:00 PM'));
    expect(onSelectSlot).toHaveBeenCalledWith(mockSlots[0]);
  });
});
```

**E2E Tests (Playwright):**
```typescript
// apps/web/e2e/booking-flow.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'mentee@example.com');
    await page.click('button:has-text("Send Magic Link")');
    // ... handle magic link authentication
  });

  test('complete booking from mentor card', async ({ page }) => {
    // Navigate to mentors page
    await page.goto('/mentors');
    await expect(page.locator('h1')).toContainText('Find Mentors');

    // Click first mentor's "Book Now" button
    await page.click('[data-testid="mentor-card"]:first-child button:has-text("Book Now")');

    // Select time slot
    await page.waitForSelector('[data-testid="time-slot-picker"]');
    await page.click('[data-testid="time-slot-button"]:not([disabled]):first-child');

    // Fill booking form
    await page.fill('[name="meeting_goal"]', 'Discuss product-market fit strategy and customer acquisition channels');
    await page.fill('[name="materials_urls"]', 'https://example.com/pitch-deck.pdf');

    // Submit booking
    await page.click('button:has-text("Confirm Booking")');

    // Verify confirmation
    await expect(page.locator('text=Booking Confirmed')).toBeVisible();
    await expect(page.locator('text=Your meeting has been scheduled')).toBeVisible();
  });

  test('prevents double booking via realtime update', async ({ page, context }) => {
    // Open two tabs as different users
    const mentee1 = page;
    const mentee2 = await context.newPage();

    // Both navigate to same mentor
    await mentee1.goto('/mentors/mentor-123');
    await mentee2.goto('/mentors/mentor-123');

    // Both select same slot
    const slotSelector = '[data-testid="time-slot-14:00"]';
    await mentee1.click(slotSelector);
    await mentee2.click(slotSelector);

    // Mentee 1 books first
    await mentee1.fill('[name="meeting_goal"]', 'Product strategy discussion');
    await mentee1.click('button:has-text("Confirm Booking")');
    await expect(mentee1.locator('text=Booking Confirmed')).toBeVisible();

    // Mentee 2 tries to book (should see slot disappear via realtime)
    await expect(mentee2.locator(slotSelector)).toBeDisabled({ timeout: 2000 });
  });
});
```

### 7.14 Frontend Security Considerations

**1. XSS Prevention:**
- React escapes content by default
- Use `dangerouslySetInnerHTML` only when absolutely necessary
- Sanitize user input with DOMPurify if rendering HTML

**2. CSRF Protection:**
- Supabase handles CSRF tokens automatically
- API uses JWT bearer tokens (no cookies)

**3. Secure Storage:**
```typescript
// Never store sensitive data in localStorage
// Use Supabase auth for session management (httpOnly cookies)
```

**4. Content Security Policy:**
```html
<!-- apps/web/index.html -->
<meta 
  http-equiv="Content-Security-Policy" 
  content="
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    connect-src 'self' https://*.supabase.co https://api.officehours.youcanjustdothings.io;
  "
>
```

**5. Environment Variable Security:**
- Never commit `.env` files
- Use `.env.example` for documentation
- Prefix public variables with `VITE_`

---

## 8. Backend Architecture

This section defines the backend architecture for the Cloudflare Workers API, including application structure, Hono framework patterns, service layer design, repository pattern for data access, middleware implementation, and backend-specific concerns. The backend is built with **Hono 4.x**, **TypeScript 5.7.x**, and runs on **Cloudflare Workers** with edge deployment.

### 8.1 Backend Application Structure

The backend follows a **layered architecture** with clear separation between routing, business logic, and data access:

```
apps/api/
├── src/
│   ├── index.ts                     # Entry point, app initialization
│   ├── routes/                      # Route definitions (Hono routers)
│   │   ├── index.ts                 # Route aggregator
│   │   ├── auth.ts                  # Auth routes
│   │   ├── users.ts                 # User routes
│   │   ├── bookings.ts              # Booking routes
│   │   ├── availability.ts          # Availability routes
│   │   ├── calendar.ts              # Calendar integration routes
│   │   ├── ratings.ts               # Rating routes
│   │   ├── exceptions.ts            # Tier exception routes
│   │   ├── coordinator.ts           # Coordinator routes
│   │   └── webhooks.ts              # Webhook handlers (Airtable)
│   ├── middleware/                  # Hono middleware
│   │   ├── auth.ts                  # JWT authentication
│   │   ├── rbac.ts                  # Role-based access control
│   │   ├── validation.ts            # Request validation (Zod)
│   │   ├── error-handler.ts         # Global error handling
│   │   ├── request-id.ts            # Request ID generation
│   │   ├── rate-limit.ts            # Rate limiting (Cloudflare KV)
│   │   └── cors.ts                  # CORS configuration
│   ├── services/                    # Business logic layer
│   │   ├── auth.service.ts          # Authentication logic
│   │   ├── user.service.ts          # User management
│   │   ├── booking.service.ts       # Booking logic
│   │   ├── availability.service.ts  # Availability management
│   │   ├── reputation.service.ts    # Reputation calculation
│   │   ├── matching.service.ts      # Mentor-mentee matching
│   │   ├── calendar.service.ts      # Calendar integration orchestration
│   │   ├── notification.service.ts  # Email notifications
│   │   └── airtable.service.ts      # Airtable sync logic
│   ├── repositories/                # Data access layer
│   │   ├── base.repository.ts       # Base repository with common methods
│   │   ├── user.repository.ts       # User data access
│   │   ├── booking.repository.ts    # Booking data access
│   │   ├── availability.repository.ts # Availability data access
│   │   ├── reputation.repository.ts # Reputation data access
│   │   ├── tag.repository.ts        # Tag data access
│   │   └── calendar.repository.ts   # Calendar integration data access
│   ├── providers/                   # External service integrations
│   │   ├── calendar/                # Calendar provider abstractions
│   │   │   ├── interface.ts         # ICalendarProvider interface
│   │   │   ├── google.provider.ts   # Google Calendar implementation
│   │   │   └── microsoft.provider.ts # Microsoft Graph implementation
│   │   ├── email/                   # Email provider abstractions
│   │   │   ├── interface.ts         # IEmailProvider interface
│   │   │   └── supabase.provider.ts # Supabase Email implementation
│   │   └── matching/                # Matching algorithm abstractions
│   │       ├── interface.ts         # IMatchingEngine interface
│   │       └── tag-based.engine.ts  # Tag-based matching implementation
│   ├── lib/                         # Utilities and helpers
│   │   ├── db.ts                    # Supabase client initialization
│   │   ├── errors.ts                # Custom error classes
│   │   ├── utils.ts                 # General utilities
│   │   ├── validators.ts            # Custom validators
│   │   └── constants.ts             # Backend constants
│   ├── types/                       # Backend-specific types
│   │   ├── bindings.ts              # Cloudflare bindings types
│   │   ├── context.ts               # Hono context extensions
│   │   └── env.ts                   # Environment variable types
│   └── jobs/                        # Background jobs (Durable Objects)
│       ├── slot-generator.ts        # Time slot generation
│       └── reputation-calculator.ts # Batch reputation updates
├── wrangler.toml                    # Cloudflare Workers configuration
├── tsconfig.json                    # TypeScript configuration
├── vitest.config.ts                 # Vitest configuration
└── package.json                     # Dependencies
```

**Key Principles:**
- **Layered architecture:** Routes → Services → Repositories → Database
- **Dependency injection:** Services receive dependencies via constructor
- **Interface-based design:** Providers implement interfaces for swappability
- **Single Responsibility:** Each layer has one clear purpose
- **Testability:** All layers are independently testable

### 8.2 Entry Point & App Initialization

**Main Entry Point:**
```typescript
// apps/api/src/index.ts

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';

import { routes } from './routes';
import { errorHandler } from './middleware/error-handler';
import { requestId } from './middleware/request-id';
import type { Env } from './types/bindings';

// Create OpenAPI-enabled Hono app
const app = new OpenAPIHono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', requestId());
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://officehours.youcanjustdothings.io'],
  credentials: true,
}));
app.use('*', prettyJSON());

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API documentation
app.doc('/api/openapi.json', {
  openapi: '3.1.0',
  info: {
    version: '1.0.0',
    title: 'CF Office Hours API',
    description: 'Mentor-mentee matching and scheduling platform',
  },
  servers: [
    { url: 'https://api.officehours.youcanjustdothings.io/v1', description: 'Production' },
    { url: 'http://localhost:8787/v1', description: 'Local development' },
  ],
});

app.get('/api/docs', swaggerUI({ url: '/api/openapi.json' }));

// Mount API routes under /v1
app.route('/v1', routes);

// Global error handler (must be last)
app.onError(errorHandler);

// 404 handler
app.notFound((c) => {
  return c.json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
      timestamp: new Date().toISOString(),
      request_id: c.get('requestId'),
    },
  }, 404);
});

export default app;
```

**Cloudflare Bindings Types:**
```typescript
// apps/api/src/types/bindings.ts

export interface Env {
  // Environment variables
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  MICROSOFT_CLIENT_ID: string;
  MICROSOFT_CLIENT_SECRET: string;
  AIRTABLE_API_KEY: string;
  AIRTABLE_BASE_ID: string;
  
  // KV Namespaces
  CACHE: KVNamespace;
  RATE_LIMIT: KVNamespace;
  
  // D1 Database (if using D1 instead of Supabase for caching)
  // DB: D1Database;
  
  // Durable Objects (for background jobs)
  SLOT_GENERATOR: DurableObjectNamespace;
  
  // Secrets
  JWT_SECRET: string;
  WEBHOOK_SECRET: string;
}
```

### 8.3 Routing Layer (Hono Routes)

**Route Aggregator:**
```typescript
// apps/api/src/routes/index.ts

import { Hono } from 'hono';
import { authRoutes } from './auth';
import { userRoutes } from './users';
import { bookingRoutes } from './bookings';
import { availabilityRoutes } from './availability';
import { calendarRoutes } from './calendar';
import { ratingRoutes } from './ratings';
import { exceptionRoutes } from './exceptions';
import { coordinatorRoutes } from './coordinator';
import { webhookRoutes } from './webhooks';
import type { Env } from '../types/bindings';

const routes = new Hono<{ Bindings: Env }>();

// Mount route modules
routes.route('/auth', authRoutes);
routes.route('/users', userRoutes);
routes.route('/bookings', bookingRoutes);
routes.route('/availability', availabilityRoutes);
routes.route('/calendar', calendarRoutes);
routes.route('/ratings', ratingRoutes);
routes.route('/exceptions', exceptionRoutes);
routes.route('/coordinator', coordinatorRoutes);
routes.route('/webhooks', webhookRoutes);

export { routes };
```

**Example Route Module with OpenAPI:**
```typescript
// apps/api/src/routes/bookings.ts

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../middleware/auth';
import { rbacMiddleware } from '../middleware/rbac';
import { BookingService } from '../services/booking.service';
import { CreateBookingSchema, BookingResponseSchema } from '@shared/schemas/booking';
import type { Env } from '../types/bindings';

export const bookingRoutes = new OpenAPIHono<{ Bindings: Env }>();

// Create booking route definition
const createBookingRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Bookings'],
  summary: 'Create a new booking',
  middleware: [authMiddleware, rbacMiddleware(['mentee'])],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateBookingSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Booking created successfully',
      content: {
        'application/json': {
          schema: BookingResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request',
      content: {
        'application/json': {
          schema: z.object({
            error: z.object({
              code: z.string(),
              message: z.string(),
              details: z.record(z.any()).optional(),
            }),
          }),
        },
      },
    },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden - Calendar not connected or tier restriction' },
    409: { description: 'Conflict - Slot already booked or calendar conflict' },
  },
});

// Implement route handler
bookingRoutes.openapi(createBookingRoute, async (c) => {
  const user = c.get('user'); // Set by authMiddleware
  const requestData = c.req.valid('json');
  
  const bookingService = new BookingService(c.env);
  const booking = await bookingService.createBooking(user.id, requestData);
  
  return c.json(booking, 201);
});

// Get my bookings
const getMyBookingsRoute = createRoute({
  method: 'get',
  path: '/my-bookings',
  tags: ['Bookings'],
  summary: 'Get current user bookings',
  middleware: [authMiddleware],
  responses: {
    200: {
      description: 'Bookings retrieved successfully',
      content: {
        'application/json': {
          schema: z.object({
            bookings: z.array(BookingResponseSchema),
            total: z.number(),
          }),
        },
      },
    },
  },
});

bookingRoutes.openapi(getMyBookingsRoute, async (c) => {
  const user = c.get('user');
  const bookingService = new BookingService(c.env);
  const bookings = await bookingService.getMyBookings(user.id);
  
  return c.json({ bookings, total: bookings.length });
});

// Cancel booking
const cancelBookingRoute = createRoute({
  method: 'put',
  path: '/{id}/cancel',
  tags: ['Bookings'],
  summary: 'Cancel a booking',
  middleware: [authMiddleware],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            reason: z.enum(['emergency', 'reschedule', 'other']).optional(),
            notes: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Booking cancelled successfully',
      content: {
        'application/json': {
          schema: BookingResponseSchema,
        },
      },
    },
    404: { description: 'Booking not found' },
    403: { description: 'Not authorized to cancel this booking' },
  },
});

bookingRoutes.openapi(cancelBookingRoute, async (c) => {
  const user = c.get('user');
  const { id } = c.req.valid('param');
  const { reason, notes } = c.req.valid('json');
  
  const bookingService = new BookingService(c.env);
  const booking = await bookingService.cancelBooking(id, user.id, reason, notes);
  
  return c.json(booking);
});
```

### 8.4 Middleware Layer

**Authentication Middleware (JWT):**
```typescript
// apps/api/src/middleware/auth.ts

import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { verify } from 'hono/jwt';
import { UserRepository } from '../repositories/user.repository';
import type { Env } from '../types/bindings';

export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HTTPException(401, {
      message: 'Missing or invalid authorization header',
    });
  }

  const token = authHeader.substring(7);

  try {
    // Verify JWT using Supabase JWT secret
    const payload = await verify(token, c.env.SUPABASE_JWT_SECRET);
    
    // Fetch full user from database
    const userRepo = new UserRepository(c.env);
    const user = await userRepo.findById(payload.sub as string);
    
    if (!user || !user.is_active) {
      throw new HTTPException(401, {
        message: 'User not found or inactive',
      });
    }

    // Attach user to context
    c.set('user', user);
    c.set('userId', user.id);
    
    await next();
  } catch (error) {
    throw new HTTPException(401, {
      message: 'Invalid or expired token',
    });
  }
});
```

**Role-Based Access Control (RBAC) Middleware:**
```typescript
// apps/api/src/middleware/rbac.ts

import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { UserRole } from '@shared/types/user';
import type { Env } from '../types/bindings';

export function rbacMiddleware(allowedRoles: UserRole[]) {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const user = c.get('user');
    
    if (!user) {
      throw new HTTPException(401, {
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(user.role)) {
      throw new HTTPException(403, {
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        res: c.json({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this resource',
            required_roles: allowedRoles,
            your_role: user.role,
          },
        }, 403),
      });
    }

    await next();
  });
}
```

**Request Validation Middleware (Zod):**
```typescript
// apps/api/src/middleware/validation.ts

import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { ZodSchema, ZodError } from 'zod';

export function validateBody(schema: ZodSchema) {
  return createMiddleware(async (c, next) => {
    try {
      const body = await c.req.json();
      const validated = schema.parse(body);
      
      // Attach validated data to context
      c.set('validatedBody', validated);
      
      await next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new HTTPException(400, {
          message: 'Validation failed',
          res: c.json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: error.errors.reduce((acc, err) => {
                const field = err.path.join('.');
                if (!acc[field]) acc[field] = [];
                acc[field].push(err.message);
                return acc;
              }, {} as Record<string, string[]>),
              timestamp: new Date().toISOString(),
              request_id: c.get('requestId'),
            },
          }, 400),
        });
      }
      throw error;
    }
  });
}
```

**Error Handler Middleware:**
```typescript
// apps/api/src/middleware/error-handler.ts

import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { ApiError } from '../lib/errors';

export function errorHandler(err: Error, c: Context) {
  console.error('Error:', err);

  const requestId = c.get('requestId') || 'unknown';

  // HTTP exceptions (from middleware)
  if (err instanceof HTTPException) {
    return c.json({
      error: {
        code: err.message.toUpperCase().replace(/\s+/g, '_'),
        message: err.message,
        timestamp: new Date().toISOString(),
        request_id: requestId,
      },
    }, err.status);
  }

  // Custom API errors
  if (err instanceof ApiError) {
    return c.json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        timestamp: new Date().toISOString(),
        request_id: requestId,
      },
    }, err.statusCode);
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    return c.json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: err.errors,
        timestamp: new Date().toISOString(),
        request_id: requestId,
      },
    }, 400);
  }

  // Unknown errors
  return c.json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      request_id: requestId,
    },
  }, 500);
}
```

**Request ID Middleware:**
```typescript
// apps/api/src/middleware/request-id.ts

import { createMiddleware } from 'hono/factory';
import { v4 as uuidv4 } from 'uuid';

export const requestId = createMiddleware(async (c, next) => {
  const requestId = c.req.header('X-Request-ID') || `req_${uuidv4()}`;
  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);
  await next();
});
```

**Rate Limiting Middleware:**
```typescript
// apps/api/src/middleware/rate-limit.ts

import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../types/bindings';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

export function rateLimitMiddleware(config: RateLimitConfig) {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const userId = c.get('userId');
    const ip = c.req.header('CF-Connecting-IP') || 'unknown';
    const key = userId || ip;
    
    const rateLimitKey = `ratelimit:${key}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get current request count from KV
    const value = await c.env.RATE_LIMIT.get(rateLimitKey);
    const requests = value ? JSON.parse(value) : [];
    
    // Filter requests within current window
    const recentRequests = requests.filter((timestamp: number) => timestamp > windowStart);
    
    if (recentRequests.length >= config.maxRequests) {
      const oldestRequest = Math.min(...recentRequests);
      const resetTime = oldestRequest + config.windowMs;
      const retryAfter = Math.ceil((resetTime - now) / 1000);

      throw new HTTPException(429, {
        message: 'Too many requests',
        res: c.json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
            retry_after: retryAfter,
          },
        }, 429),
      });
    }

    // Add current request
    recentRequests.push(now);
    
    // Store updated count (expire after window)
    await c.env.RATE_LIMIT.put(
      rateLimitKey,
      JSON.stringify(recentRequests),
      { expirationTtl: Math.ceil(config.windowMs / 1000) }
    );

    // Add rate limit headers
    c.header('X-RateLimit-Limit', config.maxRequests.toString());
    c.header('X-RateLimit-Remaining', (config.maxRequests - recentRequests.length).toString());
    c.header('X-RateLimit-Reset', new Date(now + config.windowMs).toISOString());

    await next();
  });
}
```

_[Continued in next part...]_

### 8.5 Service Layer (Business Logic)

The service layer contains all business logic and orchestrates operations across repositories and providers.

**Base Service Pattern:**
```typescript
// apps/api/src/services/base.service.ts

import type { Env } from '../types/bindings';

export abstract class BaseService {
  protected env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  protected getSupabaseClient() {
    const { createClient } = require('@supabase/supabase-js');
    return createClient(this.env.SUPABASE_URL, this.env.SUPABASE_SERVICE_ROLE_KEY);
  }
}
```

**Booking Service Example:**
```typescript
// apps/api/src/services/booking.service.ts

import { BaseService } from './base.service';
import { BookingRepository } from '../repositories/booking.repository';
import { UserRepository } from '../repositories/user.repository';
import { AvailabilityRepository } from '../repositories/availability.repository';
import { CalendarService } from './calendar.service';
import { NotificationService } from './notification.service';
import { ReputationService } from './reputation.service';
import { ApiError } from '../lib/errors';
import type { CreateBookingRequest, Booking } from '@shared/types/booking';

export class BookingService extends BaseService {
  private bookingRepo: BookingRepository;
  private userRepo: UserRepository;
  private availabilityRepo: AvailabilityRepository;
  private calendarService: CalendarService;
  private notificationService: NotificationService;
  private reputationService: ReputationService;

  constructor(env: Env) {
    super(env);
    this.bookingRepo = new BookingRepository(env);
    this.userRepo = new UserRepository(env);
    this.availabilityRepo = new AvailabilityRepository(env);
    this.calendarService = new CalendarService(env);
    this.notificationService = new NotificationService(env);
    this.reputationService = new ReputationService(env);
  }

  async createBooking(menteeId: string, data: CreateBookingRequest): Promise<Booking> {
    // 1. Fetch mentee and verify calendar connection (FR105)
    const mentee = await this.userRepo.findById(menteeId);
    if (!mentee) {
      throw new ApiError('Mentee not found', 404, 'MENTEE_NOT_FOUND');
    }

    const menteeCalendar = await this.calendarService.getCalendarConnection(menteeId);
    if (!menteeCalendar || !menteeCalendar.is_connected) {
      throw new ApiError(
        'Please connect your calendar to book meetings',
        403,
        'CALENDAR_NOT_CONNECTED'
      );
    }

    // 2. Fetch time slot and verify it's available
    const timeSlot = await this.availabilityRepo.findSlotById(data.time_slot_id);
    if (!timeSlot) {
      throw new ApiError('Time slot not found', 404, 'SLOT_NOT_FOUND');
    }

    if (timeSlot.is_booked) {
      throw new ApiError(
        'This time slot is no longer available',
        409,
        'SLOT_ALREADY_BOOKED'
      );
    }

    // 3. Fetch mentor and verify calendar connection
    const mentor = await this.userRepo.findById(timeSlot.mentor_id);
    if (!mentor) {
      throw new ApiError('Mentor not found', 404, 'MENTOR_NOT_FOUND');
    }

    const mentorCalendar = await this.calendarService.getCalendarConnection(mentor.id);
    if (!mentorCalendar || !mentorCalendar.is_connected) {
      throw new ApiError(
        'Mentor calendar not connected. Please contact coordinator.',
        403,
        'MENTOR_CALENDAR_NOT_CONNECTED'
      );
    }

    // 4. Check tier restrictions (FR48)
    await this.checkTierRestrictions(mentee, mentor);

    // 5. Check calendar conflicts for BOTH parties (FR106)
    const [menteeConflict, mentorConflict] = await Promise.all([
      this.calendarService.checkConflict(menteeId, timeSlot.start_time, timeSlot.end_time),
      this.calendarService.checkConflict(mentor.id, timeSlot.start_time, timeSlot.end_time),
    ]);

    if (menteeConflict) {
      throw new ApiError(
        'This time conflicts with an event in your calendar',
        409,
        'CALENDAR_CONFLICT',
        { conflicting_event: menteeConflict }
      );
    }

    if (mentorConflict) {
      throw new ApiError(
        'This time conflicts with the mentor\'s calendar',
        409,
        'MENTOR_CALENDAR_CONFLICT'
      );
    }

    // 6. Determine meeting type and location
    const availabilityBlock = await this.availabilityRepo.findBlockById(
      timeSlot.availability_block_id
    );
    const meetingType = availabilityBlock.meeting_type;
    let location = availabilityBlock.location_custom;
    let googleMeetLink = null;

    if (meetingType === 'online') {
      // Generate Google Meet link (FR62)
      googleMeetLink = await this.calendarService.generateMeetLink(
        mentor.id,
        timeSlot.start_time,
        timeSlot.end_time,
        `Meeting with ${mentee.profile.name}`
      );
    } else if (meetingType === 'in_person_preset') {
      location = await this.getLocationPreset(availabilityBlock.location_preset_id);
    }

    // 7. Create booking with atomic slot update
    const booking = await this.bookingRepo.createBooking({
      time_slot_id: timeSlot.id,
      mentor_id: mentor.id,
      mentee_id: menteeId,
      meeting_goal: data.meeting_goal,
      materials_urls: data.materials_urls || [],
      meeting_type: meetingType,
      location,
      google_meet_link: googleMeetLink,
      meeting_start_time: timeSlot.start_time,
      meeting_end_time: timeSlot.end_time,
      status: 'confirmed',
    });

    // 8. Create calendar events for both parties
    await Promise.all([
      this.calendarService.createEvent(menteeId, booking),
      this.calendarService.createEvent(mentor.id, booking),
    ]);

    // 9. Send confirmation notifications
    await this.notificationService.sendBookingConfirmation(booking, mentor, mentee);

    return booking;
  }

  async cancelBooking(
    bookingId: string,
    userId: string,
    reason?: string,
    notes?: string
  ): Promise<Booking> {
    // 1. Fetch booking
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) {
      throw new ApiError('Booking not found', 404, 'BOOKING_NOT_FOUND');
    }

    // 2. Verify user is mentor or mentee
    if (booking.mentor_id !== userId && booking.mentee_id !== userId) {
      throw new ApiError(
        'You are not authorized to cancel this booking',
        403,
        'NOT_AUTHORIZED'
      );
    }

    // 3. Check if cancellation is late (within 2 hours) for reputation impact (FR60)
    const now = new Date();
    const meetingTime = new Date(booking.meeting_start_time);
    const hoursUntilMeeting = (meetingTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isLateCancellation = hoursUntilMeeting < 2 && hoursUntilMeeting > 0;

    // 4. Update booking status
    const cancelledBooking = await this.bookingRepo.cancelBooking(
      bookingId,
      userId,
      reason,
      notes
    );

    // 5. Delete calendar events for both parties
    await Promise.all([
      this.calendarService.deleteEvent(booking.mentee_id, bookingId),
      this.calendarService.deleteEvent(booking.mentor_id, bookingId),
    ]);

    // 6. Apply reputation penalty if late cancellation
    if (isLateCancellation) {
      await this.reputationService.applyLateCancellationPenalty(userId);
    }

    // 7. Send cancellation notifications to both parties + coordinators
    await this.notificationService.sendCancellationNotification(
      cancelledBooking,
      userId,
      isLateCancellation
    );

    return cancelledBooking;
  }

  private async checkTierRestrictions(mentee: User, mentor: User): Promise<void> {
    // Bronze (0-3.0) can book Bronze/Silver
    // Silver (3.0-4.0) can book Bronze/Silver/Gold
    // Gold (4.0-4.5) can book any tier except Platinum
    // Platinum (4.5+) can book any tier

    const tierHierarchy = {
      bronze: 0,
      silver: 1,
      gold: 2,
      platinum: 3,
    };

    const menteeLevel = tierHierarchy[mentee.reputation_tier];
    const mentorLevel = tierHierarchy[mentor.reputation_tier];

    // Check if mentee can book this mentor
    const canBook = 
      mentee.reputation_tier === 'platinum' || // Platinum can book anyone
      (mentee.reputation_tier === 'gold' && mentor.reputation_tier !== 'platinum') || // Gold can book up to Gold
      (mentee.reputation_tier === 'silver' && mentorLevel <= 2) || // Silver can book up to Gold
      (mentee.reputation_tier === 'bronze' && mentorLevel <= 1); // Bronze can book up to Silver

    if (!canBook) {
      // Check for active override
      const override = await this.bookingRepo.findActiveOverride(
        mentee.id,
        mentor.id
      );

      if (!override) {
        throw new ApiError(
          `Your ${mentee.reputation_tier} tier cannot book ${mentor.reputation_tier} mentors. Request an exception from coordinators.`,
          403,
          'TIER_RESTRICTION',
          {
            your_tier: mentee.reputation_tier,
            mentor_tier: mentor.reputation_tier,
            can_request_exception: true,
          }
        );
      }

      // Use the override
      await this.bookingRepo.markOverrideUsed(override.id);
    }
  }

  private async getLocationPreset(presetId: string): Promise<string> {
    const presets: Record<string, string> = {
      'cf-main': 'Capital Factory - Main Space (16th Floor)',
      'cf-conference-a': 'Capital Factory - Conference Room A',
      'cf-conference-b': 'Capital Factory - Conference Room B',
      'cf-lounge': 'Capital Factory - Lounge Area',
    };
    
    return presets[presetId] || 'Capital Factory';
  }

  async getMyBookings(userId: string): Promise<Booking[]> {
    return this.bookingRepo.findByUser(userId);
  }
}
```

### 8.6 Repository Layer (Data Access)

The repository layer abstracts database operations using Supabase client.

**Base Repository:**
```typescript
// apps/api/src/repositories/base.repository.ts

import { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../types/bindings';

export abstract class BaseRepository {
  protected supabase: SupabaseClient;
  protected env: Env;

  constructor(env: Env) {
    this.env = env;
    const { createClient } = require('@supabase/supabase-js');
    this.supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  protected handleError(error: any, operation: string): never {
    console.error(`Repository error during ${operation}:`, error);
    throw error;
  }
}
```

**Booking Repository:**
```typescript
// apps/api/src/repositories/booking.repository.ts

import { BaseRepository } from './base.repository';
import { ApiError } from '../lib/errors';
import type { Booking, CreateBookingData } from '@shared/types/booking';

export class BookingRepository extends BaseRepository {
  async createBooking(data: CreateBookingData): Promise<Booking> {
    try {
      // Atomic operation: create booking + mark slot as booked
      const { data: booking, error } = await this.supabase
        .rpc('create_booking_atomic', {
          p_time_slot_id: data.time_slot_id,
          p_mentor_id: data.mentor_id,
          p_mentee_id: data.mentee_id,
          p_meeting_goal: data.meeting_goal,
          p_materials_urls: data.materials_urls,
          p_meeting_type: data.meeting_type,
          p_location: data.location,
          p_google_meet_link: data.google_meet_link,
          p_meeting_start_time: data.meeting_start_time,
          p_meeting_end_time: data.meeting_end_time,
        });

      if (error) {
        if (error.code === 'P0001') { // Slot already booked (custom error)
          throw new ApiError(
            'This time slot was just booked by someone else',
            409,
            'SLOT_RACE_CONDITION'
          );
        }
        throw error;
      }

      return booking;
    } catch (error) {
      return this.handleError(error, 'createBooking');
    }
  }

  async findById(id: string): Promise<Booking | null> {
    const { data, error } = await this.supabase
      .from('bookings')
      .select(`
        *,
        mentor:users!mentor_id(*),
        mentee:users!mentee_id(*),
        time_slot:time_slots(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      this.handleError(error, 'findById');
    }

    return data;
  }

  async findByUser(userId: string): Promise<Booking[]> {
    const { data, error } = await this.supabase
      .from('bookings')
      .select(`
        *,
        mentor:users!mentor_id(id, email, profile:user_profiles(*)),
        mentee:users!mentee_id(id, email, profile:user_profiles(*))
      `)
      .or(`mentor_id.eq.${userId},mentee_id.eq.${userId}`)
      .order('meeting_start_time', { ascending: true });

    if (error) this.handleError(error, 'findByUser');
    return data || [];
  }

  async cancelBooking(
    id: string,
    cancelledBy: string,
    reason?: string,
    notes?: string
  ): Promise<Booking> {
    const { data, error } = await this.supabase
      .from('bookings')
      .update({
        status: 'canceled',
        canceled_by: cancelledBy,
        canceled_at: new Date().toISOString(),
        cancellation_reason: reason,
        cancellation_notes: notes,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) this.handleError(error, 'cancelBooking');
    return data;
  }

  async findActiveOverride(
    menteeId: string,
    mentorId: string
  ): Promise<TierOverrideRequest | null> {
    const { data, error } = await this.supabase
      .from('tier_override_requests')
      .select('*')
      .eq('mentee_id', menteeId)
      .eq('mentor_id', mentorId)
      .eq('status', 'approved')
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      this.handleError(error, 'findActiveOverride');
    }

    return data;
  }

  async markOverrideUsed(overrideId: string): Promise<void> {
    const { error } = await this.supabase
      .from('tier_override_requests')
      .update({ used_at: new Date().toISOString() })
      .eq('id', overrideId);

    if (error) this.handleError(error, 'markOverrideUsed');
  }
}
```

**Stored Procedure for Atomic Booking:**
```sql
-- Supabase migration: create_booking_atomic function

CREATE OR REPLACE FUNCTION create_booking_atomic(
  p_time_slot_id UUID,
  p_mentor_id UUID,
  p_mentee_id UUID,
  p_meeting_goal TEXT,
  p_materials_urls TEXT[],
  p_meeting_type meeting_type_enum,
  p_location TEXT,
  p_google_meet_link TEXT,
  p_meeting_start_time TIMESTAMPTZ,
  p_meeting_end_time TIMESTAMPTZ
) RETURNS bookings AS $$
DECLARE
  v_slot time_slots;
  v_booking bookings;
BEGIN
  -- Lock the time slot for update
  SELECT * INTO v_slot
  FROM time_slots
  WHERE id = p_time_slot_id
  FOR UPDATE;

  -- Check if slot exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Time slot not found' USING ERRCODE = 'P0001';
  END IF;

  -- Check if slot is already booked
  IF v_slot.is_booked THEN
    RAISE EXCEPTION 'Time slot already booked' USING ERRCODE = 'P0001';
  END IF;

  -- Create booking
  INSERT INTO bookings (
    time_slot_id,
    mentor_id,
    mentee_id,
    meeting_goal,
    materials_urls,
    meeting_type,
    location,
    google_meet_link,
    meeting_start_time,
    meeting_end_time,
    status
  ) VALUES (
    p_time_slot_id,
    p_mentor_id,
    p_mentee_id,
    p_meeting_goal,
    p_materials_urls,
    p_meeting_type,
    p_location,
    p_google_meet_link,
    p_meeting_start_time,
    p_meeting_end_time,
    'confirmed'
  ) RETURNING * INTO v_booking;

  -- Mark slot as booked
  UPDATE time_slots
  SET is_booked = TRUE, booking_id = v_booking.id
  WHERE id = p_time_slot_id;

  RETURN v_booking;
END;
$$ LANGUAGE plpgsql;
```

### 8.7 Reputation Calculator Service

The Reputation Calculator Service implements the reputation scoring algorithm using modular utility functions for maintainability and testability. This refactored approach breaks down the complex calculation into smaller, focused functions.

#### 8.7.1 Reputation Utility Functions

```typescript
// apps/api/src/utils/reputation.ts

/**
 * Calculate base reputation score from ratings and behaviors.
 * Formula: (AvgRating × CompletionRate × ResponsivenessFactor) + TenureBonus
 */
export function calculateBaseScore(data: {
  averageRating: number;
  completionRate: number;
  responsivenessFactor: number;
  tenureBonus: number;
}): number {
  const { averageRating, completionRate, responsivenessFactor, tenureBonus } = data;
  
  // Base score: rating metrics multiplied together
  const baseMetric = averageRating * completionRate * responsivenessFactor;
  
  // Add tenure bonus
  const rawScore = baseMetric + tenureBonus;
  
  // Clamp to 0-5 range
  return Math.max(0, Math.min(5, rawScore));
}

/**
 * Calculate responsiveness factor based on average response time.
 * Returns: 1.2× (<24hr), 1.0× (24-48hr), 0.8× (>48hr)
 */
export function calculateResponsivenessFactor(averageResponseHours: number): number {
  if (averageResponseHours < 24) return 1.2;
  if (averageResponseHours <= 48) return 1.0;
  return 0.8;
}

/**
 * Calculate tenure bonus based on months active.
 * Returns: +0.1 per month active (max +1.0 after 10 months)
 */
export function calculateTenureBonus(monthsActive: number): number {
  // +0.1 per month, capped at 1.0
  return Math.min(1.0, monthsActive * 0.1);
}

/**
 * Apply probationary clamp for new users (per FR48).
 * If ratingsCount < 3 AND rawScore < 3.5, clamp to 3.5 (Silver tier minimum).
 * This prevents new users from being penalized before getting sufficient ratings.
 */
export function applyProbationaryClamp(
  rawScore: number,
  ratingsCount: number
): { finalScore: number; isProbationary: boolean } {
  const isProbationary = ratingsCount < 3;
  
  if (isProbationary && rawScore < 3.5) {
    return {
      finalScore: 3.5,
      isProbationary: true,
    };
  }
  
  return {
    finalScore: rawScore,
    isProbationary: false,
  };
}

/**
 * Determine reputation tier based on final score.
 * Tiers: Bronze (<3.0), Silver (3.0-4.0), Gold (4.0-4.5), Platinum (>4.5)
 */
export function determineTier(score: number): ReputationTier {
  if (score < 3.0) return 'bronze';
  if (score < 4.0) return 'silver';
  if (score < 4.5) return 'gold';
  return 'platinum';
}

/**
 * Get booking limit based on reputation tier.
 */
export function getBookingLimitForTier(tier: ReputationTier): number {
  const limits: Record<ReputationTier, number> = {
    bronze: 2,
    silver: 5,
    gold: 10,
    platinum: Infinity,
  };
  return limits[tier];
}

/**
 * Check if mentee can book a mentor based on tier restrictions (per FR51).
 * Rule: Mentees cannot book mentors more than one tier above their own.
 */
export function canBookMentorByTier(
  menteeTier: ReputationTier,
  mentorTier: ReputationTier
): boolean {
  const tierOrder: ReputationTier[] = ['bronze', 'silver', 'gold', 'platinum'];
  const menteeIndex = tierOrder.indexOf(menteeTier);
  const mentorIndex = tierOrder.indexOf(mentorTier);
  
  // Can book same tier or up to one tier above
  return mentorIndex <= menteeIndex + 1;
}
```

#### 8.7.2 Reputation Service Implementation

```typescript
// apps/api/src/services/reputation.service.ts

import { BaseService } from './base.service';
import { UserRepository } from '../repositories/user.repository';
import { BookingRepository } from '../repositories/booking.repository';
import { RatingRepository } from '../repositories/rating.repository';
import {
  calculateBaseScore,
  calculateResponsivenessFactor,
  calculateTenureBonus,
  applyProbationaryClamp,
  determineTier,
  getBookingLimitForTier,
  canBookMentorByTier,
} from '../utils/reputation';
import type { Env } from '../types/bindings';
import type { ReputationScore, ReputationTier } from '@shared/types/reputation';

export class ReputationService extends BaseService {
  private userRepo: UserRepository;
  private bookingRepo: BookingRepository;
  private ratingRepo: RatingRepository;

  constructor(env: Env) {
    super(env);
    this.userRepo = new UserRepository(env);
    this.bookingRepo = new BookingRepository(env);
    this.ratingRepo = new RatingRepository(env);
  }

  /**
   * Calculate complete reputation score for a user.
   * Orchestrates all utility functions to produce final score.
   */
  async calculateReputationScore(userId: string): Promise<ReputationScore> {
    // 1. Fetch raw data from database
    const ratings = await this.ratingRepo.findByUserId(userId);
    const bookings = await this.bookingRepo.findByUserId(userId);
    const user = await this.userRepo.findById(userId);
    
    if (!user) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }

    // 2. Calculate average rating
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 3.5; // Default for new users

    // 3. Calculate completion rate
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const totalBookings = bookings.length;
    const completionRate = totalBookings > 0 
      ? completedBookings / totalBookings 
      : 1.0; // Perfect rate for new users

    // 4. Calculate responsiveness factor
    const averageResponseHours = await this.calculateAverageResponseTime(userId);
    const responsivenessFactor = calculateResponsivenessFactor(averageResponseHours);

    // 5. Calculate tenure bonus
    const monthsActive = this.calculateMonthsActive(user.created_at);
    const tenureBonus = calculateTenureBonus(monthsActive);

    // 6. Calculate base score
    const rawScore = calculateBaseScore({
      averageRating,
      completionRate,
      responsivenessFactor,
      tenureBonus,
    });

    // 7. Apply probationary clamp if applicable
    const { finalScore, isProbationary } = applyProbationaryClamp(rawScore, ratings.length);

    // 8. Determine tier
    const tier = determineTier(finalScore);

    // 9. Return complete breakdown
    return {
      score: finalScore,
      breakdown: {
        averageRating,
        completionRate,
        responsivenessFactor,
        tenureBonus,
        rawScore,
        isProbationary,
      },
      tier,
      ratingsCount: ratings.length,
    };
  }

  /**
   * Check if a mentee can book a specific mentor based on tier restrictions.
   */
  async canBookMentor(menteeId: string, mentorId: string): Promise<boolean> {
    const [menteeScore, mentorScore] = await Promise.all([
      this.calculateReputationScore(menteeId),
      this.calculateReputationScore(mentorId),
    ]);

    return canBookMentorByTier(menteeScore.tier, mentorScore.tier);
  }

  /**
   * Get booking limit for a user based on their current tier.
   */
  async getBookingLimit(userId: string): Promise<number> {
    const score = await this.calculateReputationScore(userId);
    return getBookingLimitForTier(score.tier);
  }

  /**
   * Recalculate and update reputation score in database.
   * Called after new ratings or bookings.
   */
  async updateUserReputation(userId: string): Promise<void> {
    const score = await this.calculateReputationScore(userId);
    
    await this.userRepo.update(userId, {
      reputation_score: score.score,
      reputation_tier: score.tier,
      updated_at: new Date(),
    });
  }

  // Private helper methods

  private async calculateAverageResponseTime(userId: string): Promise<number> {
    // Get all booking requests where user was asked to respond
    const requests = await this.bookingRepo.findBookingRequests(userId);
    
    if (requests.length === 0) return 12; // Default: 12 hours (gets 1.2× factor)
    
    const responseTimes = requests.map(req => {
      const requestedAt = new Date(req.created_at);
      const respondedAt = new Date(req.responded_at || req.created_at);
      const hours = (respondedAt.getTime() - requestedAt.getTime()) / (1000 * 60 * 60);
      return hours;
    });
    
    return responseTimes.reduce((sum, h) => sum + h, 0) / responseTimes.length;
  }

  private calculateMonthsActive(createdAt: Date): number {
    const now = new Date();
    const created = new Date(createdAt);
    const monthsDiff = (now.getFullYear() - created.getFullYear()) * 12 
                      + (now.getMonth() - created.getMonth());
    return Math.max(0, monthsDiff);
  }
}
```

**Key Benefits of Refactoring:**

- ✅ **Testability**: Each utility function can be unit tested independently
- ✅ **Readability**: Clear function names describe what each step does
- ✅ **Maintainability**: Easy to modify individual components (e.g., change responsiveness thresholds)
- ✅ **Reusability**: Utility functions can be imported and used elsewhere
- ✅ **Type Safety**: TypeScript ensures correct inputs/outputs for each function
- ✅ **Documentation**: Each function has clear JSDoc comments explaining purpose

**Example Usage:**

```typescript
// In a booking route handler
const reputationService = new ReputationService(c.env);

// Check if mentee can book this mentor
const canBook = await reputationService.canBookMentor(menteeId, mentorId);
if (!canBook) {
  throw new AppError(
    403,
    'Your reputation tier cannot book this mentor. Request an exception from coordinators.',
    'TIER_RESTRICTION'
  );
}

// Get user's booking limit
const limit = await reputationService.getBookingLimit(userId);
const currentBookings = await bookingRepo.countActiveBookings(userId);
if (currentBookings >= limit) {
  throw new AppError(
    403,
    `You have reached your ${limit} bookings/week limit for ${tier} tier.`,
    'BOOKING_LIMIT_EXCEEDED'
  );
}
```

---

### 8.8 Provider Interfaces (External Integrations)

**Calendar Provider Interface:**
```typescript
// apps/api/src/providers/calendar/interface.ts

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  meetLink?: string;
  attendees: string[];
}

export interface CalendarConflict {
  start_time: Date;
  end_time: Date;
  summary: string;
}

export interface ICalendarProvider {
  /**
   * Check if a time slot conflicts with existing events
   */
  checkConflict(
    userId: string,
    startTime: Date,
    endTime: Date
  ): Promise<CalendarConflict | null>;

  /**
   * Create a calendar event
   */
  createEvent(
    userId: string,
    event: CalendarEvent
  ): Promise<string>; // Returns event ID

  /**
   * Delete a calendar event
   */
  deleteEvent(userId: string, eventId: string): Promise<void>;

  /**
   * Generate a Google Meet link (Google only)
   */
  generateMeetLink?(
    userId: string,
    startTime: Date,
    endTime: Date,
    summary: string
  ): Promise<string>;

  /**
   * Get user's available calendars
   */
  getCalendars(userId: string): Promise<Array<{ id: string; name: string }>>;
}
```

**Google Calendar Provider Implementation:**
```typescript
// apps/api/src/providers/calendar/google.provider.ts

import { google } from 'googleapis';
import { ICalendarProvider, CalendarEvent, CalendarConflict } from './interface';
import { CalendarRepository } from '../../repositories/calendar.repository';
import type { Env } from '../../types/bindings';

export class GoogleCalendarProvider implements ICalendarProvider {
  private env: Env;
  private calendarRepo: CalendarRepository;

  constructor(env: Env) {
    this.env = env;
    this.calendarRepo = new CalendarRepository(env);
  }

  private async getOAuth2Client(userId: string) {
    const integration = await this.calendarRepo.findByUserId(userId);
    if (!integration || integration.provider !== 'google') {
      throw new Error('Google Calendar not connected');
    }

    const oauth2Client = new google.auth.OAuth2(
      this.env.GOOGLE_CLIENT_ID,
      this.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
    });

    // Auto-refresh token if expired
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        await this.calendarRepo.updateTokens(
          userId,
          tokens.access_token,
          tokens.refresh_token || integration.refresh_token
        );
      }
    });

    return oauth2Client;
  }

  async checkConflict(
    userId: string,
    startTime: Date,
    endTime: Date
  ): Promise<CalendarConflict | null> {
    const auth = await this.getOAuth2Client(userId);
    const calendar = google.calendar({ version: 'v3', auth });

    const integration = await this.calendarRepo.findByUserId(userId);
    const calendarIds = integration.read_calendar_ids || ['primary'];

    // Check all configured calendars
    for (const calendarId of calendarIds) {
      const response = await calendar.events.list({
        calendarId,
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        singleEvents: true,
        maxResults: 1,
      });

      if (response.data.items && response.data.items.length > 0) {
        const event = response.data.items[0];
        return {
          start_time: new Date(event.start?.dateTime || event.start?.date || ''),
          end_time: new Date(event.end?.dateTime || event.end?.date || ''),
          summary: event.summary || 'Busy',
        };
      }
    }

    return null;
  }

  async createEvent(userId: string, event: CalendarEvent): Promise<string> {
    const auth = await this.getOAuth2Client(userId);
    const calendar = google.calendar({ version: 'v3', auth });

    const integration = await this.calendarRepo.findByUserId(userId);
    const calendarId = integration.write_calendar_id || 'primary';

    const response = await calendar.events.insert({
      calendarId,
      conferenceDataVersion: event.meetLink ? 1 : undefined,
      requestBody: {
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: {
          dateTime: event.start.toISOString(),
          timeZone: 'America/Chicago', // Capital Factory timezone
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: 'America/Chicago',
        },
        attendees: event.attendees.map(email => ({ email })),
        conferenceData: event.meetLink ? {
          createRequest: {
            requestId: `booking-${event.id}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        } : undefined,
      },
    });

    return response.data.id!;
  }

  async deleteEvent(userId: string, eventId: string): Promise<void> {
    const auth = await this.getOAuth2Client(userId);
    const calendar = google.calendar({ version: 'v3', auth });

    const integration = await this.calendarRepo.findByUserId(userId);
    const calendarId = integration.write_calendar_id || 'primary';

    await calendar.events.delete({
      calendarId,
      eventId,
    });
  }

  async generateMeetLink(
    userId: string,
    startTime: Date,
    endTime: Date,
    summary: string
  ): Promise<string> {
    const auth = await this.getOAuth2Client(userId);
    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: {
        summary,
        start: { dateTime: startTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    });

    return response.data.conferenceData?.entryPoints?.[0]?.uri || '';
  }

  async getCalendars(userId: string): Promise<Array<{ id: string; name: string }>> {
    const auth = await this.getOAuth2Client(userId);
    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.calendarList.list();

    return (response.data.items || []).map(cal => ({
      id: cal.id!,
      name: cal.summary!,
    }));
  }
}
```

### 8.8 Background Jobs (Durable Objects)

**Time Slot Generator (Durable Object):**
```typescript
// apps/api/src/jobs/slot-generator.ts

import { DurableObject } from 'cloudflare:workers';
import { AvailabilityRepository } from '../repositories/availability.repository';
import type { Env } from '../types/bindings';

export class SlotGenerator extends DurableObject<Env> {
  async generateSlotsForNext30Days() {
    const availabilityRepo = new AvailabilityRepository(this.env);
    
    // Get all active availability blocks
    const blocks = await availabilityRepo.findAllActiveBlocks();
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    
    let totalGenerated = 0;

    for (const block of blocks) {
      const slots = this.generateSlotsFromBlock(block, startDate, endDate);
      await availabilityRepo.createSlots(slots);
      totalGenerated += slots.length;
    }

    console.log(`Generated ${totalGenerated} slots for next 30 days`);
    return { generated: totalGenerated };
  }

  private generateSlotsFromBlock(
    block: AvailabilityBlock,
    startDate: Date,
    endDate: Date
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const currentDate = new Date(Math.max(startDate.getTime(), new Date(block.start_date).getTime()));

    while (currentDate <= endDate) {
      // Check if this date matches recurrence pattern
      if (this.matchesRecurrence(currentDate, block)) {
        // Generate slots for this day
        const daySlots = this.generateSlotsForDay(currentDate, block);
        slots.push(...daySlots);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  }

  private matchesRecurrence(date: Date, block: AvailabilityBlock): boolean {
    const blockStart = new Date(block.start_date);
    
    switch (block.recurrence_pattern) {
      case 'one_time':
        return date.toDateString() === blockStart.toDateString();
      
      case 'weekly':
        return date.getDay() === blockStart.getDay();
      
      case 'monthly':
        return date.getDate() === blockStart.getDate();
      
      case 'quarterly':
        // Same day of month, every 3 months
        const monthsDiff = (date.getFullYear() - blockStart.getFullYear()) * 12 + 
                          date.getMonth() - blockStart.getMonth();
        return monthsDiff % 3 === 0 && date.getDate() === blockStart.getDate();
      
      default:
        return false;
    }
  }

  private generateSlotsForDay(date: Date, block: AvailabilityBlock): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const [startHour, startMinute] = block.start_time.split(':').map(Number);
    const [endHour, endMinute] = block.end_time.split(':').map(Number);

    let current = new Date(date);
    current.setHours(startHour, startMinute, 0, 0);

    const end = new Date(date);
    end.setHours(endHour, endMinute, 0, 0);

    while (current < end) {
      const slotEnd = new Date(current.getTime() + block.slot_duration_minutes * 60 * 1000);
      
      if (slotEnd <= end) {
        slots.push({
          availability_block_id: block.id,
          mentor_id: block.mentor_id,
          start_time: new Date(current),
          end_time: slotEnd,
          is_booked: false,
        });
      }

      // Add buffer time
      current = new Date(slotEnd.getTime() + block.buffer_minutes * 60 * 1000);
    }

    return slots;
  }
}
```

_[Continued in next part...]_

### 8.9 Webhook Handling (Airtable Sync)

**Webhook Route:**
```typescript
// apps/api/src/routes/webhooks.ts

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { AirtableService } from '../services/airtable.service';
import { ApiError } from '../lib/errors';
import type { Env } from '../types/bindings';

export const webhookRoutes = new OpenAPIHono<{ Bindings: Env }>();

// Airtable webhook handler
const airtableWebhookRoute = createRoute({
  method: 'post',
  path: '/airtable',
  tags: ['Webhooks'],
  summary: 'Handle Airtable webhook events',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            webhook: z.object({
              id: z.string(),
            }),
            timestamp: z.string(),
            base: z.object({
              id: z.string(),
            }),
            payload: z.array(z.object({
              recordId: z.string(),
              tableName: z.string(),
              action: z.enum(['created', 'updated', 'deleted']),
              fields: z.record(z.any()).optional(),
            })),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Webhook processed successfully',
      content: {
        'application/json': {
          schema: z.object({
            message: z.string(),
            processed: z.number(),
          }),
        },
      },
    },
    401: { description: 'Invalid webhook signature' },
  },
});

webhookRoutes.openapi(airtableWebhookRoute, async (c) => {
  // Verify webhook signature
  const signature = c.req.header('X-Airtable-Signature');
  if (!signature || !verifyWebhookSignature(signature, c.env.WEBHOOK_SECRET)) {
    throw new ApiError('Invalid webhook signature', 401, 'INVALID_SIGNATURE');
  }

  const payload = c.req.valid('json');
  
  const airtableService = new AirtableService(c.env);
  
  // Process webhook asynchronously (don't block response)
  c.executionCtx.waitUntil(
    airtableService.processWebhook(payload)
  );

  return c.json({
    message: 'Webhook accepted for processing',
    processed: payload.payload.length,
  });
});

function verifyWebhookSignature(signature: string, secret: string): boolean {
  // Implement signature verification
  // Airtable uses HMAC-SHA256
  return true; // Placeholder
}
```

**Airtable Service:**
```typescript
// apps/api/src/services/airtable.service.ts

import { BaseService } from './base.service';
import { UserRepository } from '../repositories/user.repository';
import { TagRepository } from '../repositories/tag.repository';
import Airtable from 'airtable';

export class AirtableService extends BaseService {
  private airtable: Airtable;
  private userRepo: UserRepository;
  private tagRepo: TagRepository;

  constructor(env: Env) {
    super(env);
    this.airtable = new Airtable({ apiKey: env.AIRTABLE_API_KEY });
    this.userRepo = new UserRepository(env);
    this.tagRepo = new TagRepository(env);
  }

  async processWebhook(payload: AirtableWebhookPayload): Promise<void> {
    for (const record of payload.payload) {
      switch (record.action) {
        case 'created':
        case 'updated':
          await this.syncUser(record.recordId, record.fields);
          break;
        
        case 'deleted':
          await this.handleUserDeletion(record.recordId);
          break;
      }
    }
  }

  private async syncUser(airtableRecordId: string, fields: any): Promise<void> {
    // Map Airtable fields to our User model
    const userData = {
      airtable_record_id: airtableRecordId,
      email: fields.Email,
      role: this.mapRole(fields.Role),
      is_active: fields.Status === 'Active',
    };

    const profileData = {
      name: fields.Name,
      title: fields.Title,
      company: fields.Company,
      phone: fields.Phone,
      linkedin_url: fields.LinkedIn,
      bio: fields.Bio,
    };

    // Upsert user
    const user = await this.userRepo.upsertByAirtableId(airtableRecordId, userData, profileData);

    // Sync tags (from Airtable multi-select fields)
    const industries = fields.Industries || [];
    const technologies = fields.Technologies || [];
    const stage = fields.Stage ? [fields.Stage] : [];

    await Promise.all([
      this.tagRepo.syncUserTags(user.id, 'industry', industries, 'airtable'),
      this.tagRepo.syncUserTags(user.id, 'technology', technologies, 'airtable'),
      this.tagRepo.syncUserTags(user.id, 'stage', stage, 'airtable'),
    ]);
  }

  private async handleUserDeletion(airtableRecordId: string): Promise<void> {
    // Soft delete user
    await this.userRepo.softDeleteByAirtableId(airtableRecordId);
    
    // Send notification to affected users and coordinators
    // Implementation...
  }

  private mapRole(airtableRole: string): UserRole {
    const roleMap: Record<string, UserRole> = {
      'Mentee': 'mentee',
      'Mentor': 'mentor',
      'Coordinator': 'coordinator',
    };
    
    return roleMap[airtableRole] || 'mentee';
  }
}
```

### 8.10 Error Handling & Custom Errors

**Custom Error Classes:**
```typescript
// apps/api/src/lib/errors.ts

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} with identifier ${identifier} not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 409, 'CONFLICT', details);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends ApiError {
  constructor(retryAfter: number) {
    super(`Rate limit exceeded. Try again in ${retryAfter} seconds`, 429, 'RATE_LIMIT_EXCEEDED', {
      retry_after: retryAfter,
    });
    this.name = 'RateLimitError';
  }
}
```

### 8.11 Utility Functions

**Database Client:**
```typescript
// apps/api/src/lib/db.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../types/bindings';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(env: Env): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }
  
  return supabaseInstance;
}
```

**Constants:**
```typescript
// apps/api/src/lib/constants.ts

export const REPUTATION_TIERS = {
  BRONZE: { min: 0, max: 3.0, bookingsPerWeek: 2 },
  SILVER: { min: 3.0, max: 4.0, bookingsPerWeek: 5 },
  GOLD: { min: 4.0, max: 4.5, bookingsPerWeek: 10 },
  PLATINUM: { min: 4.5, max: 5.0, bookingsPerWeek: Infinity },
} as const;

export const SLOT_GENERATION_WINDOW_DAYS = 30;

export const LATE_CANCELLATION_HOURS = 2;

export const OVERRIDE_EXPIRATION_DAYS = 7;

export const DEFAULT_REPUTATION_SCORE = 3.5;

export const PROBATIONARY_PERIOD_DAYS = 90;
```

### 8.12 Backend Testing Strategy

**Unit Tests (Services):**
```typescript
// apps/api/src/services/booking.service.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingService } from './booking.service';
import { BookingRepository } from '../repositories/booking.repository';
import { UserRepository } from '../repositories/user.repository';
import { ApiError } from '../lib/errors';

// Mock repositories
vi.mock('../repositories/booking.repository');
vi.mock('../repositories/user.repository');

describe('BookingService', () => {
  let bookingService: BookingService;
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = {
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-key',
      // ... other env vars
    } as Env;

    bookingService = new BookingService(mockEnv);
  });

  describe('createBooking', () => {
    it('should create booking successfully when all validations pass', async () => {
      // Mock data
      const menteeId = 'mentee-123';
      const bookingData = {
        time_slot_id: 'slot-123',
        meeting_goal: 'Discuss product strategy and market fit analysis',
        materials_urls: ['https://example.com/deck.pdf'],
      };

      // Mock repository responses
      vi.mocked(UserRepository.prototype.findById).mockResolvedValueOnce({
        id: menteeId,
        role: 'mentee',
        reputation_tier: 'silver',
        is_active: true,
      } as any);

      // Execute
      const result = await bookingService.createBooking(menteeId, bookingData);

      // Assert
      expect(result).toBeDefined();
      expect(result.meeting_goal).toBe(bookingData.meeting_goal);
    });

    it('should throw error when mentee calendar not connected', async () => {
      const menteeId = 'mentee-123';
      const bookingData = {
        time_slot_id: 'slot-123',
        meeting_goal: 'Test meeting',
        materials_urls: [],
      };

      vi.mocked(UserRepository.prototype.findById).mockResolvedValueOnce({
        id: menteeId,
        role: 'mentee',
        is_active: true,
      } as any);

      // Mock no calendar connection
      vi.mocked(CalendarService.prototype.getCalendarConnection).mockResolvedValueOnce(null);

      await expect(
        bookingService.createBooking(menteeId, bookingData)
      ).rejects.toThrow(ApiError);
      
      await expect(
        bookingService.createBooking(menteeId, bookingData)
      ).rejects.toMatchObject({
        code: 'CALENDAR_NOT_CONNECTED',
        statusCode: 403,
      });
    });

    it('should throw error when tier restrictions not met', async () => {
      // Bronze mentee trying to book Gold mentor
      const menteeId = 'mentee-123';
      const bookingData = {
        time_slot_id: 'slot-123',
        meeting_goal: 'Test meeting',
      };

      vi.mocked(UserRepository.prototype.findById)
        .mockResolvedValueOnce({ // Mentee
          id: menteeId,
          role: 'mentee',
          reputation_tier: 'bronze',
          is_active: true,
        } as any)
        .mockResolvedValueOnce({ // Mentor
          id: 'mentor-123',
          role: 'mentor',
          reputation_tier: 'gold',
          is_active: true,
        } as any);

      await expect(
        bookingService.createBooking(menteeId, bookingData)
      ).rejects.toMatchObject({
        code: 'TIER_RESTRICTION',
        statusCode: 403,
      });
    });
  });

  describe('cancelBooking', () => {
    it('should apply late cancellation penalty when within 2 hours', async () => {
      const bookingId = 'booking-123';
      const userId = 'user-123';

      // Mock booking 1 hour away
      const meetingTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      vi.mocked(BookingRepository.prototype.findById).mockResolvedValueOnce({
        id: bookingId,
        mentor_id: 'mentor-123',
        mentee_id: userId,
        meeting_start_time: meetingTime,
        status: 'confirmed',
      } as any);

      const reputationSpy = vi.spyOn(ReputationService.prototype, 'applyLateCancellationPenalty');

      await bookingService.cancelBooking(bookingId, userId);

      expect(reputationSpy).toHaveBeenCalledWith(userId);
    });
  });
});
```

**Integration Tests (API Routes):**
```typescript
// apps/api/src/routes/bookings.test.ts

import { describe, it, expect, beforeAll } from 'vitest';
import app from '../index';

describe('Booking Routes', () => {
  let authToken: string;

  beforeAll(async () => {
    // Get auth token for testing
    authToken = await getTestAuthToken();
  });

  describe('POST /bookings', () => {
    it('should create booking with valid data', async () => {
      const response = await app.request('/v1/bookings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          time_slot_id: 'test-slot-id',
          meeting_goal: 'Discuss product-market fit strategy and customer acquisition',
          materials_urls: ['https://example.com/deck.pdf'],
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.status).toBe('confirmed');
    });

    it('should return 400 for invalid meeting goal', async () => {
      const response = await app.request('/v1/bookings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          time_slot_id: 'test-slot-id',
          meeting_goal: 'Short', // Less than 10 characters
        }),
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 without auth token', async () => {
      const response = await app.request('/v1/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          time_slot_id: 'test-slot-id',
          meeting_goal: 'Test meeting goal',
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /bookings/my-bookings', () => {
    it('should return user bookings', async () => {
      const response = await app.request('/v1/bookings/my-bookings', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.bookings).toBeInstanceOf(Array);
      expect(data.total).toBeGreaterThanOrEqual(0);
    });
  });
});
```

**Worker Test Helper:**
```typescript
// apps/api/src/lib/test-helpers.ts

import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import app from '../index';

export async function getTestAuthToken(): Promise<string> {
  // Generate test JWT token
  // Implementation depends on your auth setup
  return 'test-token';
}

export function getMockEnv(): Env {
  return {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    SUPABASE_JWT_SECRET: 'test-jwt-secret',
    // ... other env vars
    CACHE: {} as KVNamespace,
    RATE_LIMIT: {} as KVNamespace,
  } as Env;
}
```

### 8.13 Performance Considerations

**1. Connection Pooling:**
Supabase client automatically handles connection pooling for Postgres connections.

**2. Caching Strategy:**
```typescript
// apps/api/src/lib/cache.ts

import type { Env } from '../types/bindings';

export async function cacheGet<T>(
  env: Env,
  key: string
): Promise<T | null> {
  const cached = await env.CACHE.get(key);
  return cached ? JSON.parse(cached) : null;
}

export async function cacheSet<T>(
  env: Env,
  key: string,
  value: T,
  ttlSeconds: number = 300 // 5 minutes default
): Promise<void> {
  await env.CACHE.put(key, JSON.stringify(value), {
    expirationTtl: ttlSeconds,
  });
}

export async function cacheInvalidate(env: Env, pattern: string): Promise<void> {
  // KV doesn't support pattern deletion, so we track keys
  const keys = await env.CACHE.list({ prefix: pattern });
  await Promise.all(
    keys.keys.map(key => env.CACHE.delete(key.name))
  );
}
```

**3. Query Optimization:**
- Use Supabase's select with specific columns
- Implement pagination for large result sets
- Use database indexes (defined in migrations)

**4. Edge Computing Benefits:**
- Workers run at 300+ edge locations globally
- Sub-millisecond cold starts
- Automatic geographic load balancing

### 8.14 Security Best Practices

**1. Environment Variable Validation:**
```typescript
// apps/api/src/lib/env-validation.ts

export function validateEnv(env: Env): void {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_JWT_SECRET',
    'JWT_SECRET',
    'WEBHOOK_SECRET',
  ];

  for (const key of required) {
    if (!env[key as keyof Env]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}
```

**2. SQL Injection Prevention:**
- Use Supabase client with parameterized queries
- Never concatenate SQL strings

**3. Rate Limiting:**
Applied per-route or globally (see 8.4)

**4. Input Sanitization:**
All inputs validated via Zod schemas before processing

**5. Secrets Management:**
- Store secrets in Cloudflare Secrets (encrypted)
- Never log sensitive data
- Rotate keys regularly

### 8.15 Deployment Configuration

**wrangler.toml:**
```toml
# apps/api/wrangler.toml

name = "cf-office-hours-api"
main = "src/index.ts"
compatibility_date = "2025-03-11"
compatibility_flags = ["nodejs_compat"]

[build]
command = "npm run build"

[vars]
ENVIRONMENT = "production"

# KV Namespaces
[[kv_namespaces]]
binding = "CACHE"
id = "your-cache-namespace-id"
preview_id = "your-cache-preview-id"

[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "your-ratelimit-namespace-id"
preview_id = "your-ratelimit-preview-id"

# Durable Objects
[[durable_objects.bindings]]
name = "SLOT_GENERATOR"
class_name = "SlotGenerator"
script_name = "cf-office-hours-api"

# Secrets (set via CLI)
# wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# wrangler secret put SUPABASE_JWT_SECRET
# wrangler secret put GOOGLE_CLIENT_SECRET
# wrangler secret put MICROSOFT_CLIENT_SECRET
# wrangler secret put AIRTABLE_API_KEY
# wrangler secret put JWT_SECRET
# wrangler secret put WEBHOOK_SECRET

# Routes
routes = [
  { pattern = "api.officehours.youcanjustdothings.io/*", zone_name = "officehours.youcanjustdothings.io" }
]

# Development
[env.development]
vars = { ENVIRONMENT = "development" }

# Staging
[env.staging]
vars = { ENVIRONMENT = "staging" }
routes = [
  { pattern = "api-staging.officehours.youcanjustdothings.io/*", zone_name = "officehours.youcanjustdothings.io" }
]
```

**GitHub Actions Deployment:**
```yaml
# .github/workflows/deploy-api.yml

name: Deploy API

on:
  push:
    branches:
      - main
    paths:
      - 'apps/api/**'
      - 'packages/shared/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build --workspace=apps/api
        
      - name: Run tests
        run: npm test --workspace=apps/api
        
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: 'apps/api'
          command: deploy --env production
```

---

**Section 8 Complete.** This comprehensive backend architecture provides:
- ✅ Layered architecture with clear separation of concerns
- ✅ Type-safe Hono routes with OpenAPI generation
- ✅ Middleware for auth, RBAC, validation, rate limiting
- ✅ Service layer for business logic orchestration
- ✅ Repository pattern for data access abstraction
- ✅ Provider interfaces for external integrations
- ✅ Durable Objects for background jobs
- ✅ Webhook handling for Airtable sync
- ✅ Comprehensive error handling
- ✅ Testing strategy with unit and integration tests
- ✅ Performance optimizations (caching, edge deployment)
- ✅ Security best practices
- ✅ Production deployment configuration


## 9. Unified Project Structure

This section defines the complete monorepo structure, package organization, dependency management, build configuration, and development workflows. The project uses **npm workspaces** for monorepo management without additional tooling complexity.

### 9.1 Complete Monorepo Structure

```
cf-office-hours/
├── .github/                         # GitHub configuration
│   ├── workflows/                   # CI/CD pipelines
│   │   ├── deploy-api.yml          # API deployment
│   │   ├── deploy-web.yml          # Frontend deployment
│   │   ├── test.yml                # Run tests on PR
│   │   └── lint.yml                # Code quality checks
│   └── CODEOWNERS                  # Code ownership
├── apps/                            # Application packages
│   ├── web/                        # React frontend (Cloudflare Pages)
│   │   ├── public/
│   │   ├── src/
│   │   ├── e2e/                    # Playwright tests
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── playwright.config.ts
│   │   ├── vitest.config.ts
│   │   └── package.json
│   └── api/                        # Cloudflare Workers API
│       ├── src/
│       ├── wrangler.toml
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       └── package.json
├── packages/                        # Shared packages
│   ├── shared/                     # Shared types, schemas, utilities
│   │   ├── src/
│   │   │   ├── types/              # TypeScript types/interfaces
│   │   │   ├── schemas/            # Zod validation schemas
│   │   │   ├── constants/          # Shared constants
│   │   │   └── utils/              # Shared utilities
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── config/                     # Shared configuration
│       ├── eslint/
│       │   └── base.js             # Base ESLint config
│       ├── typescript/
│       │   └── tsconfig.base.json  # Base TypeScript config
│       └── package.json
├── docs/                            # Documentation
│   ├── architecture.md             # This document
│   ├── prd.md                      # Product requirements
│   └── api/                        # API documentation
├── scripts/                         # Build and utility scripts
│   ├── generate-api-types.ts      # OpenAPI type generation
│   ├── setup-dev.ts               # Development setup
│   └── seed-database.ts           # Database seeding
├── .vscode/                        # VS Code configuration
│   ├── settings.json
│   ├── extensions.json
│   └── launch.json
├── .editorconfig                   # Editor configuration
├── .gitignore                      # Git ignore rules
├── .prettierrc                     # Prettier configuration
├── .prettierignore                 # Prettier ignore rules
├── .npmrc                          # npm configuration
├── package.json                    # Root package.json (workspaces)
├── package-lock.json               # Lockfile
├── tsconfig.json                   # Root TypeScript config
├── README.md                       # Project documentation
└── LICENSE                         # License file
```

### 9.2 Root Package Configuration

**Root package.json:**
```json
{
  "name": "cf-office-hours",
  "version": "1.0.0",
  "private": true,
  "description": "Capital Factory Office Hours Platform - Monorepo",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "npm run dev --workspaces --if-present",
    "dev:web": "npm run dev --workspace=apps/web",
    "dev:api": "npm run dev --workspace=apps/api",
    "build": "npm run build --workspaces --if-present",
    "build:web": "npm run build --workspace=apps/web",
    "build:api": "npm run build --workspace=apps/api",
    "test": "npm run test --workspaces --if-present",
    "test:web": "npm run test --workspace=apps/web",
    "test:api": "npm run test --workspace=apps/api",
    "test:e2e": "npm run test:e2e --workspace=apps/web",
    "lint": "eslint . --ext .ts,.tsx --max-warnings 0",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "type-check": "tsc --noEmit",
    "generate:api-types": "node scripts/generate-api-types.js",
    "setup": "node scripts/setup-dev.js",
    "clean": "rm -rf node_modules apps/*/node_modules packages/*/node_modules apps/*/dist apps/api/.wrangler"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0",
    "eslint": "^8.57.0",
    "prettier": "^3.2.4",
    "typescript": "^5.7.2"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
```

### 9.3 Workspace Package Configuration

**Frontend App (apps/web/package.json):**
```json
{
  "name": "@cf-office-hours/web",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  },
  "dependencies": {
    "@cf-office-hours/shared": "*",
    "@hookform/resolvers": "^3.3.4",
    "@radix-ui/react-avatar": "^1.0.4",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-toast": "^1.1.5",
    "@radix-ui/react-tooltip": "^1.0.7",
    "@supabase/supabase-js": "^2.39.3",
    "@tanstack/react-query": "^5.17.19",
    "@tanstack/react-query-devtools": "^5.17.19",
    "@tanstack/react-virtual": "^3.0.1",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "date-fns": "^3.2.0",
    "lucide-react": "^0.312.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.52.0",
    "react-router-dom": "^6.21.3",
    "tailwind-merge": "^2.2.1",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.23.8",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "@cf-office-hours/config": "*",
    "@playwright/test": "^1.50.0",
    "@testing-library/react": "^14.1.2",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.17",
    "jsdom": "^24.0.0",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.1",
    "vite": "^5.0.12",
    "vitest": "^3.0.0"
  }
}
```

**Backend API (apps/api/package.json):**
```json
{
  "name": "@cf-office-hours/api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "build": "esbuild src/index.ts --bundle --format=esm --outfile=dist/index.js",
    "deploy": "wrangler deploy",
    "deploy:staging": "wrangler deploy --env staging",
    "test": "vitest run",
    "test:watch": "vitest",
    "tail": "wrangler tail"
  },
  "dependencies": {
    "@cf-office-hours/shared": "*",
    "@hono/zod-openapi": "^0.9.5",
    "@supabase/supabase-js": "^2.39.3",
    "airtable": "^0.12.2",
    "googleapis": "^131.0.0",
    "hono": "^4.0.2",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@cf-office-hours/config": "*",
    "@cloudflare/workers-types": "^4.20240117.0",
    "esbuild": "^0.20.0",
    "vitest": "^3.0.0",
    "wrangler": "^3.78.12"
  }
}
```

**Shared Package (packages/shared/package.json):**
```json
{
  "name": "@cf-office-hours/shared",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./types/*": "./src/types/*.ts",
    "./schemas/*": "./src/schemas/*.ts",
    "./constants/*": "./src/constants/*.ts",
    "./utils/*": "./src/utils/*.ts"
  },
  "dependencies": {
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@cf-office-hours/config": "*",
    "typescript": "^5.7.2"
  }
}
```

**Shared Config Package (packages/config/package.json):**
```json
{
  "name": "@cf-office-hours/config",
  "version": "1.0.0",
  "private": true,
  "files": [
    "eslint",
    "typescript"
  ]
}
```

### 9.4 TypeScript Configuration

**Root TypeScript Config (tsconfig.json):**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "incremental": true,
    "composite": false
  },
  "exclude": ["node_modules", "dist", ".wrangler", "build"]
}
```

**Base TypeScript Config (packages/config/typescript/tsconfig.base.json):**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowSyntheticDefaultImports": true
  }
}
```

**Frontend TypeScript Config (apps/web/tsconfig.json):**
```json
{
  "extends": "../../packages/config/typescript/tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["../../packages/shared/src/*"]
    },
    "types": ["vite/client", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [
    { "path": "../../packages/shared" }
  ]
}
```

**Backend TypeScript Config (apps/api/tsconfig.json):**
```json
{
  "extends": "../../packages/config/typescript/tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["../../packages/shared/src/*"]
    }
  },
  "include": ["src"],
  "references": [
    { "path": "../../packages/shared" }
  ]
}
```

**Shared Package TypeScript Config (packages/shared/tsconfig.json):**
```json
{
  "extends": "../config/typescript/tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

### 9.5 ESLint Configuration

**Base ESLint Config (packages/config/eslint/base.js):**
```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
  },
  env: {
    node: true,
    es2022: true,
  },
};
```

**Frontend ESLint Config (apps/web/.eslintrc.cjs):**
```javascript
module.exports = {
  extends: ['../../packages/config/eslint/base.js'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  env: {
    browser: true,
  },
  rules: {
    'react/react-in-jsx-scope': 'off', // Not needed in React 18+
  },
};
```

**Backend ESLint Config (apps/api/.eslintrc.cjs):**
```javascript
module.exports = {
  extends: ['../../packages/config/eslint/base.js'],
  env: {
    node: true,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'off', // Allow any for Hono context
  },
};
```

### 9.6 Build Pipeline & Scripts

**API Type Generation Script (scripts/generate-api-types.ts):**
```typescript
// scripts/generate-api-types.ts
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const API_URL = process.env.API_URL || 'http://localhost:8787';
const OUTPUT_FILE = path.join(
  __dirname,
  '../packages/shared/src/types/api.generated.ts'
);

async function generateTypes() {
  console.log('🔄 Fetching OpenAPI spec from:', `${API_URL}/api/openapi.json`);

  try {
    // Generate TypeScript types from OpenAPI spec
    execSync(
      `npx openapi-typescript ${API_URL}/api/openapi.json -o ${OUTPUT_FILE}`,
      { stdio: 'inherit' }
    );

    console.log('✅ API types generated successfully!');
    console.log('📄 Output:', OUTPUT_FILE);
  } catch (error) {
    console.error('❌ Failed to generate API types:', error);
    process.exit(1);
  }
}

generateTypes();
```

**Development Setup Script (scripts/setup-dev.ts):**
```typescript
// scripts/setup-dev.ts
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ENV_EXAMPLE_FILES = [
  { from: 'apps/web/.env.example', to: 'apps/web/.env' },
  { from: 'apps/api/.env.example', to: 'apps/api/.env' },
];

function setupEnvironmentFiles() {
  console.log('🔧 Setting up environment files...\n');

  for (const { from, to } of ENV_EXAMPLE_FILES) {
    const fromPath = path.join(__dirname, '..', from);
    const toPath = path.join(__dirname, '..', to);

    if (!fs.existsSync(toPath)) {
      if (fs.existsSync(fromPath)) {
        fs.copyFileSync(fromPath, toPath);
        console.log(`✅ Created ${to} from ${from}`);
      } else {
        console.warn(`⚠️  Warning: ${from} not found`);
      }
    } else {
      console.log(`ℹ️  ${to} already exists, skipping`);
    }
  }
}

function installDependencies() {
  console.log('\n📦 Installing dependencies...\n');
  execSync('npm install', { stdio: 'inherit' });
}

function setupGitHooks() {
  console.log('\n🪝 Setting up git hooks...\n');
  // Add Husky or other git hook setup if needed
}

function main() {
  console.log('🚀 CF Office Hours - Development Setup\n');
  console.log('=====================================\n');

  setupEnvironmentFiles();
  installDependencies();
  setupGitHooks();

  console.log('\n✨ Setup complete! Run `npm run dev` to start development.\n');
}

main();
```

### 9.7 Development Workflow Commands

**Common Development Tasks:**

```bash
# Initial setup
npm run setup

# Start all apps in development mode
npm run dev

# Start specific app
npm run dev:web      # Frontend only
npm run dev:api      # Backend only

# Build all apps
npm run build

# Build specific app
npm run build:web
npm run build:api

# Run tests
npm run test         # All tests
npm run test:web     # Frontend unit tests
npm run test:api     # Backend unit tests
npm run test:e2e     # E2E tests (Playwright)

# Code quality
npm run lint         # Check all code
npm run lint:fix     # Auto-fix issues
npm run format       # Format all files
npm run format:check # Check formatting
npm run type-check   # TypeScript check all packages

# Generate API types from OpenAPI spec
npm run generate:api-types

# Clean all build artifacts and node_modules
npm run clean

# Deploy (production)
npm run build
npm run deploy:api   # Deploy API to Cloudflare Workers
npm run deploy:web   # Deploy frontend to Cloudflare Pages
```

### 9.8 Environment Variables

**Frontend (.env.example):**
```bash
# apps/web/.env.example

# API Configuration
VITE_API_BASE_URL=http://localhost:8787/v1

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Feature Flags
VITE_ENABLE_REALTIME=true
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true

# OAuth Redirect URLs (for local development)
VITE_GOOGLE_OAUTH_REDIRECT=http://localhost:3000/auth/callback
VITE_MICROSOFT_OAUTH_REDIRECT=http://localhost:3000/auth/callback
```

**Backend (.env.example):**
```bash
# apps/api/.env.example

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# Airtable Configuration
AIRTABLE_API_KEY=your-airtable-api-key
AIRTABLE_BASE_ID=your-base-id

# Security
JWT_SECRET=your-jwt-secret
WEBHOOK_SECRET=your-webhook-secret

# Environment
NODE_ENV=development
```

### 9.9 VS Code Configuration

**Workspace Settings (.vscode/settings.json):**
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "files.exclude": {
    "**/.git": true,
    "**/node_modules": true,
    "**/.wrangler": true,
    "**/dist": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/package-lock.json": true,
    "**/.wrangler": true,
    "**/dist": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

**Recommended Extensions (.vscode/extensions.json):**
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-playwright.playwright",
    "cloudflare.vscode-cloudflare-workers",
    "supabase.supabase-vscode"
  ]
}
```

**Launch Configuration (.vscode/launch.json):**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend Tests",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "test:watch", "--workspace=apps/api"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Frontend Tests",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "test:watch", "--workspace=apps/web"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### 9.10 Git Configuration

**.gitignore:**
```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
.nyc_output/

# Production builds
dist/
build/
.wrangler/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
.pnpm-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json
.idea/
*.swp
*.swo
*~

# Temporary files
tmp/
temp/
*.tmp

# Generated files
packages/shared/src/types/api.generated.ts

# Playwright
test-results/
playwright-report/
playwright/.cache/
```

**.prettierrc:**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

**.editorconfig:**
```ini
# EditorConfig is awesome: https://EditorConfig.org

root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2

[*.md]
trim_trailing_whitespace = false

[*.{yml,yaml}]
indent_size = 2
```

### 9.11 Dependency Management Best Practices

**1. Version Strategy:**
- Use exact versions for critical dependencies
- Use caret (^) for development dependencies
- Lock versions with `package-lock.json`

**2. Security:**
```bash
# Regular security audits
npm audit

# Automatic fixes
npm audit fix

# Update dependencies
npm update

# Check for outdated packages
npm outdated
```

**3. Workspace Dependencies:**
```json
{
  "dependencies": {
    "@cf-office-hours/shared": "*"  // Uses local workspace version
  }
}
```

**4. Hoisting:**
npm workspaces automatically hoists shared dependencies to the root `node_modules`, reducing duplication.

### 9.12 Build Optimization

**Vite Build Optimization (apps/web/vite.config.ts):**
```typescript
export default defineConfig({
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs in production
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'query-vendor': ['@tanstack/react-query'],
        },
      },
    },
    sourcemap: true,
  },
});
```

**esbuild for Workers (apps/api):**
Workers uses esbuild via Wrangler, configured in `wrangler.toml`:
```toml
[build]
command = "npm run build"

[build.upload]
format = "service-worker"
```

### 9.13 Continuous Integration

**GitHub Actions Test Workflow (.github/workflows/test.yml):**
```yaml
name: Test

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npm run type-check
      
      - name: Run tests
        run: npm run test
      
      - name: E2E tests
        run: npm run test:e2e
        
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: |
            apps/web/test-results/
            apps/web/playwright-report/
```

---

**Section 9 Complete.** This unified project structure provides:
- ✅ Complete monorepo organization with npm workspaces
- ✅ Shared packages for types, schemas, and configuration
- ✅ TypeScript project references for type checking
- ✅ Consistent ESLint and Prettier configuration
- ✅ Development scripts for common tasks
- ✅ Environment variable management
- ✅ VS Code workspace configuration
- ✅ Git and editor configurations
- ✅ Build optimization strategies
- ✅ CI/CD pipeline setup


## 10. Development Workflow

This section covers the complete development workflow, from initial setup through code review and collaboration practices. It provides practical guidance for developers working on the CF Office Hours platform.

### 10.1 Initial Development Setup

#### 10.1.0 Repository Initialization (First-Time Setup Only)

**For Project Creators (one-time setup):**

This section applies only to the initial repository creation. Regular developers should skip to Section 10.1.1 and use `git clone` instead.

```bash
# 1. Create repository
mkdir cf-office-hours
cd cf-office-hours
git init

# 2. Create base monorepo structure
mkdir -p apps/{web,api}
mkdir -p packages/{shared,config}
mkdir -p docs scripts .github/workflows supabase/migrations

# 3. Create root package.json
cat > package.json << 'EOF'
{
  "name": "cf-office-hours",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "setup": "node scripts/setup-dev.js",
    "dev": "npm run dev --workspaces --if-present"
  }
}
EOF

# 4. Add configuration files (from Section 9.10)
# Copy .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
.wrangler/
.env
.env.local
*.log
.DS_Store
EOF

# Copy .prettierrc
cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
EOF

# Copy .editorconfig (see Section 9.10 for full content)

# 5. Create README.md
cat > README.md << 'EOF'
# CF Office Hours Platform

Intelligent mentor-mentee matching and scheduling platform for Capital Factory.

## Quick Start

\`\`\`bash
npm run setup
npm run dev
\`\`\`

See [Development Workflow](docs/architecture.md#10-development-workflow) for complete setup instructions.

## Documentation

- [Product Requirements](docs/prd.md)
- [Architecture Document](docs/architecture.md)
- [User Guide](docs/user-guide/index.md)
- [Coordinator Manual](docs/coordinator-manual/index.md)

## Tech Stack

- **Frontend:** React + Vite + Shadcn/ui
- **Backend:** Cloudflare Workers + Hono
- **Database:** Supabase (Postgres)
- **Auth:** Supabase Auth

## License

[License Type - specify during repository setup]
EOF

# 6. Create .env.example files
cat > apps/web/.env.example << 'EOF'
VITE_API_BASE_URL=http://localhost:8787/v1
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
EOF

cat > apps/api/.env.example << 'EOF'
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
EOF

# 7. Initial commit
git add .
git commit -m "chore: initial project setup with monorepo structure"

# 8. Create remote repository and push
git remote add origin https://github.com/capital-factory/cf-office-hours.git
git branch -M main
git push -u origin main
```

**Initial Commit Checklist:**
- ✅ Repository structure created per Section 9.1
- ✅ Root package.json with workspaces configured
- ✅ Base configuration files (.gitignore, .prettierrc, .editorconfig)
- ✅ Documentation files (README.md)
- ✅ Environment templates (.env.example files)
- ✅ Directory structure for apps, packages, docs

**Note:** This is a one-time setup documented for completeness. Regular developers will use the standard `git clone` workflow described in Section 10.1.1.

---

#### 10.1.1 Regular Developer Setup

**Prerequisites:**
- Node.js 20.x or higher
- npm 10.x or higher
- Git
- VS Code (recommended) or preferred IDE
- Cloudflare account (for deployment)
- Supabase account (for database)

**Setup Steps:**

```bash
# 1. Clone the repository
git clone https://github.com/capital-factory/cf-office-hours.git
cd cf-office-hours

# 2. Run automated setup script
npm run setup

# This script will:
# - Copy .env.example to .env for each app
# - Install all dependencies
# - Set up git hooks (if configured)

# 3. Configure environment variables
# Edit apps/web/.env with your Supabase and API URLs
# Edit apps/api/.env with your service keys and secrets

# 4. Start Supabase locally (optional)
npx supabase init
npx supabase start

# 5. Run database migrations
npx supabase db push

# 6. Seed development data (optional)
npm run seed

# 7. Start development servers
npm run dev

# This starts both:
# - Frontend: http://localhost:3000
# - API: http://localhost:8787
```

**Verifying Setup:**

```bash
# Check all packages are installed
npm list --workspaces

# Type check all code
npm run type-check

# Run linter
npm run lint

# Run tests
npm run test
```

#### 10.1.6 Database Migrations

**Migration Strategy:**

The CF Office Hours platform uses Supabase CLI for database schema version control. All schema changes must be implemented as migrations stored in `supabase/migrations/`.

**Running Migrations Locally:**

```bash
# Apply all pending migrations
npx supabase db push

# Create new migration
npx supabase migration new add_user_tags_table

# View migration status
npx supabase migration list

# Reset database (DEV ONLY - destructive)
npx supabase db reset
```

**Migration File Structure:**

```
supabase/
├── migrations/
│   ├── 20250102000000_initial_schema.sql
│   ├── 20250103000000_full_schema.sql
│   ├── 20250104000000_add_calendar_integrations.sql
│   ├── 20250105000000_add_reputation_fields.sql
│   └── ...
├── seed.sql                # Development seed data
└── config.toml             # Supabase project configuration
```

**Migration Naming Convention:**

- **Format:** `{YYYYMMDDHHMMSS}_{description}.sql`
- **Description:** snake_case, descriptive (e.g., `add_reputation_tiers`, `update_bookings_constraints`)
- **Example:** `20250102143022_add_audit_log_table.sql`

**Migration Best Practices:**

1. **Always test locally before committing**
   ```bash
   npx supabase db push
   npm run test  # Verify nothing broke
   ```

2. **Include both UP and DOWN migration paths**
   ```sql
   -- Migration UP
   CREATE TABLE bookings (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     ...
   );
   
   -- Migration DOWN (in comments for Supabase)
   -- DROP TABLE IF EXISTS bookings CASCADE;
   ```

3. **Make migrations atomic** - Single logical change per file
   - ✅ Good: `add_user_tags_table.sql` creates user_tags table only
   - ❌ Bad: `update_schema.sql` adds 5 unrelated tables

4. **Never edit committed migrations** - Create new migration to fix issues
   - If a migration has been applied to staging/production, create a corrective migration instead of editing the original

5. **Document breaking changes** in migration file comments
   ```sql
   -- BREAKING CHANGE: This migration removes the `legacy_user_id` column
   -- from the bookings table. Applications must use `airtable_record_id` instead.
   ```

**Applying Migrations to Environments:**

```bash
# Local development
npx supabase db push

# Staging (via CI/CD or manual)
npx supabase link --project-ref staging-project-ref
npx supabase db push

# Production (via CI/CD)
# See Section 11.5 for deployment pipeline
```

**Migration Testing:**

Before committing a migration, verify:
1. Migration applies cleanly to fresh database
2. Migration is idempotent (can run multiple times safely)
3. All existing tests still pass
4. RLS policies still work as expected
5. Sample queries return expected results

**Troubleshooting Migrations:**

```bash
# Check for syntax errors
npx supabase db lint

# View migration SQL without applying
cat supabase/migrations/20250102000000_add_table.sql

# Manually apply SQL via Supabase Studio (if CLI fails)
# Dashboard → SQL Editor → Paste migration → Run
```

**Related Documentation:**
- INFRA-DB-003: Database Migration Tooling Setup (Epic 1, Story 21)
- Section 11.8: Database Migration Rollback procedures
- Section 4.1: Database Schema Design

---

### 10.2 Local Development

**Starting Development Servers:**

```bash
# Start all services (frontend + backend)
npm run dev

# Or start individually:
npm run dev:web    # Frontend only on http://localhost:3000
npm run dev:api    # Backend only on http://localhost:8787

# Tail API logs
npm run tail --workspace=apps/api
```

**Hot Module Replacement (HMR):**
- Frontend: Vite provides instant HMR for React components
- Backend: Wrangler automatically reloads on file changes
- Shared package changes: Workspaces automatically detect changes

**Using Local Supabase:**

```bash
# Start local Supabase (optional for development)
npx supabase start

# Access local services:
# - Studio: http://localhost:54323
# - API: http://localhost:54321
# - Database: postgresql://postgres:postgres@localhost:54322/postgres

# Stop Supabase
npx supabase stop
```

### 10.3 Testing Practices

**Unit Testing (Vitest):**

```bash
# Run all unit tests
npm run test

# Run tests for specific workspace
npm run test:web
npm run test:api

# Watch mode for TDD
npm run test:watch --workspace=apps/web

# Run with coverage
npm run test -- --coverage
```

**Example Unit Test:**
```typescript
// apps/api/src/services/booking.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingService } from './booking.service';

describe('BookingService', () => {
  let service: BookingService;
  
  beforeEach(() => {
    service = new BookingService(mockEnv);
  });

  it('should create booking when all validations pass', async () => {
    // Arrange
    const menteeId = 'test-mentee-id';
    const bookingData = { /* ... */ };
    
    // Act
    const result = await service.createBooking(menteeId, bookingData);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.status).toBe('confirmed');
  });
});
```

**Component Testing:**

```bash
# Run component tests with Testing Library
npm run test:web

# Watch mode
npm run test:watch --workspace=apps/web
```

**Example Component Test:**
```typescript
// apps/web/src/components/common/UserAvatar.test.tsx
import { render, screen } from '@testing-library/react';
import { UserAvatar } from './UserAvatar';

describe('UserAvatar', () => {
  it('displays initials when no avatar URL provided', () => {
    render(<UserAvatar user={{ name: 'John Doe' }} />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });
});
```

**End-to-End Testing (Playwright):**

```bash
# Run E2E tests headless
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui --workspace=apps/web

# Debug specific test
npx playwright test booking-flow --debug
```

**Example E2E Test:**
```typescript
// apps/web/e2e/booking-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete booking flow', async ({ page }) => {
  await page.goto('/mentors');
  await page.click('[data-testid="mentor-card-first"] >> text=Book Now');
  await page.click('[data-testid="time-slot-button"]:not([disabled]):first');
  await page.fill('[name="meeting_goal"]', 'Discuss product-market fit');
  await page.click('text=Confirm Booking');
  await expect(page.locator('text=Booking Confirmed')).toBeVisible();
});
```

### 10.4 Debugging Strategies

**Frontend Debugging:**

1. **React DevTools:**
   - Install React DevTools browser extension
   - Inspect component tree, props, and state
   - Profile component re-renders

2. **React Query DevTools:**
   ```typescript
   // Already configured in apps/web/src/App.tsx
   import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
   
   // Visible in development only
   {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
   ```

3. **VS Code Debugger:**
   ```json
   // .vscode/launch.json
   {
     "type": "chrome",
     "request": "launch",
     "name": "Debug Frontend",
     "url": "http://localhost:3000",
     "webRoot": "${workspaceFolder}/apps/web/src"
   }
   ```

4. **Console Logging:**
   ```typescript
   // Use structured logging
   console.log('[BookingForm]', { selectedSlot, formData });
   ```

**Backend Debugging:**

1. **Wrangler Tail (Live Logs):**
   ```bash
   npm run tail --workspace=apps/api
   
   # Filter logs
   wrangler tail --format json | grep "error"
   ```

2. **Local Workers Inspector:**
   - Wrangler dev automatically enables DevTools
   - Access at: `chrome://inspect`

3. **Console Logging:**
   ```typescript
   // Structured logging in Workers
   console.log({
     event: 'booking_created',
     bookingId: booking.id,
     mentorId: mentor.id,
     menteeId: mentee.id,
   });
   ```

4. **Request/Response Inspection:**
   ```typescript
   // Log incoming requests
   app.use('*', async (c, next) => {
     console.log(`${c.req.method} ${c.req.url}`);
     await next();
   });
   ```

**Database Debugging:**

1. **Supabase Studio:**
   - Access: https://app.supabase.com (production)
   - Or: http://localhost:54323 (local)
   - Browse tables, run SQL queries, view logs

2. **SQL Query Logging:**
   ```typescript
   // Enable query logging in development
   const supabase = createClient(url, key, {
     db: { schema: 'public' },
     global: {
       headers: { 'x-my-custom-header': 'debug' },
     },
   });
   ```

### 10.5 Code Quality & Standards

**Pre-commit Checks:**

```bash
# Run before committing
npm run lint        # ESLint
npm run format      # Prettier
npm run type-check  # TypeScript
npm run test        # All tests
```

**Linting:**

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix

# Lint specific file
npx eslint apps/web/src/components/UserCard.tsx
```

**Formatting:**

```bash
# Format all files
npm run format

# Check formatting without changes
npm run format:check

# Format specific directory
npx prettier --write "apps/web/src/components/**/*.tsx"
```

**Type Checking:**

```bash
# Check all packages
npm run type-check

# Check specific workspace
npx tsc --noEmit --project apps/web/tsconfig.json
```

### 10.6 Git Workflow

**Branch Strategy:**

```bash
# Main branches
main        # Production-ready code
develop     # Integration branch for features

# Feature branches
feature/booking-flow
feature/calendar-integration
fix/booking-race-condition
docs/api-documentation
```

**Creating a Feature Branch:**

```bash
# Start from develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/mentor-ratings

# Work on your feature...
git add .
git commit -m "feat(ratings): implement mentor rating component"

# Push to remote
git push origin feature/mentor-ratings
```

**Commit Message Format:**

Follow conventional commits format. See **Section 14.15 (Git Commit Standards)** for detailed commit message format, types, and examples.

### 10.7 Pull Request Process

**Creating a Pull Request:**

1. **Ensure Branch is Up-to-Date:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout feature/your-feature
   git merge develop
   # Resolve any conflicts
   ```

2. **Run Quality Checks:**
   ```bash
   npm run lint
   npm run type-check
   npm run test
   ```

3. **Push and Create PR:**
   ```bash
   git push origin feature/your-feature
   # Create PR on GitHub
   ```

**PR Template:**

```markdown
## Description
Brief description of the changes and why they're needed.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #123

## How Has This Been Tested?
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Manual testing

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] All tests passing

## Screenshots (if applicable)
[Add screenshots for UI changes]
```

**Code Review Guidelines:**

**For Authors:**
- Keep PRs focused and reasonably sized (<500 lines)
- Write clear descriptions and link related issues
- Respond to feedback promptly
- Run all checks before requesting review

**For Reviewers:**
- Review within 24 hours if possible
- Focus on logic, architecture, and maintainability
- Be constructive and specific in feedback
- Approve when ready, request changes if needed

### 10.8 Troubleshooting Common Issues

**Issue: Port Already in Use**

```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev:web
```

**Issue: Module Not Found**

```bash
# Clear node_modules and reinstall
npm run clean
npm install

# Clear build cache
rm -rf apps/web/node_modules/.vite
rm -rf apps/api/.wrangler
```

**Issue: TypeScript Errors After Update**

```bash
# Regenerate TypeScript build info
npm run type-check

# Clear TypeScript cache
rm -rf apps/*/tsconfig.tsbuildinfo
```

**Issue: Supabase Connection Fails**

```bash
# Check environment variables
cat apps/web/.env | grep SUPABASE
cat apps/api/.env | grep SUPABASE

# Test Supabase connection
curl https://your-project.supabase.co/rest/v1/ \
  -H "apikey: your-anon-key"
```

**Issue: Wrangler Authentication**

```bash
# Login to Cloudflare
npx wrangler login

# Verify authentication
npx wrangler whoami
```

### 10.9 Performance Profiling

**Frontend Performance:**

1. **React DevTools Profiler:**
   - Enable profiling in React DevTools
   - Record interaction
   - Analyze component render times

2. **Lighthouse:**
   ```bash
   # Run Lighthouse audit
   npx lighthouse http://localhost:3000 --view
   ```

3. **Bundle Analysis:**
   ```bash
   # Analyze bundle size
   npm run build:web
   npx vite-bundle-visualizer apps/web/dist/stats.html
   ```

**Backend Performance:**

1. **Worker Analytics:**
   - View in Cloudflare dashboard
   - Monitor request rates, errors, CPU time

2. **Profiling with console.time:**
   ```typescript
   console.time('database-query');
   const users = await userRepo.findAll();
   console.timeEnd('database-query');
   ```

### 10.10 Documentation Practices

**Code Documentation:**

```typescript
/**
 * Creates a new booking after validating tier restrictions and calendar conflicts.
 * 
 * @param menteeId - UUID of the mentee making the booking
 * @param data - Booking request data including time slot and meeting goal
 * @returns Promise resolving to the created booking with participant details
 * 
 * @throws {ApiError} CALENDAR_NOT_CONNECTED if mentee calendar not connected
 * @throws {ApiError} TIER_RESTRICTION if mentee tier too low for mentor
 * @throws {ApiError} CALENDAR_CONFLICT if time conflicts with existing event
 * 
 * @example
 * const booking = await bookingService.createBooking('mentee-id', {
 *   time_slot_id: 'slot-123',
 *   meeting_goal: 'Discuss product-market fit strategy',
 * });
 */
async createBooking(menteeId: string, data: CreateBookingRequest): Promise<Booking> {
  // Implementation
}
```

**API Documentation:**

API documentation is auto-generated from OpenAPI spec:
- Access Swagger UI: http://localhost:8787/api/docs
- OpenAPI JSON: http://localhost:8787/api/openapi.json

**Architecture Documentation:**

Update this architecture document when making significant changes:
- Data model changes
- New API endpoints
- Architecture decisions
- Technology updates

### 10.11 Collaboration Best Practices

**Communication:**
- Use PR comments for code-specific discussions
- Use issue tracker for feature planning and bug tracking
- Use Slack/Discord for quick questions
- Document decisions in architecture docs

**Pair Programming:**
- Use VS Code Live Share for remote pairing
- Share screens for complex debugging
- Rotate pairs regularly

**Knowledge Sharing:**
- Write clear commit messages
- Document complex logic with comments
- Update README when workflows change
- Conduct code reviews as learning opportunities

**Conflict Resolution:**
```bash
# Fetch latest changes
git fetch origin

# View conflicts
git diff origin/develop

# Merge and resolve
git merge origin/develop
# Resolve conflicts in VS Code
git add .
git commit -m "merge: resolve conflicts with develop"
```

---


## 11. Deployment Architecture

This section covers the production deployment strategy, infrastructure configuration, CI/CD pipelines, environment management, and operational procedures for the CF Office Hours platform.

### 11.1 Deployment Overview

**Platform Architecture:**
- **Frontend:** Cloudflare Pages (global edge network)
- **Backend:** Cloudflare Workers (serverless edge functions)
- **Database:** Supabase (hosted Postgres)
- **Storage:** Supabase Storage (S3-compatible)
- **Auth:** Supabase Auth (JWT-based)

**Deployment Strategy:**
- Zero-downtime deployments
- Automatic HTTPS with Cloudflare SSL
- Global edge deployment (300+ locations)
- Git-based deployments (push to deploy)

### 11.2 Environment Strategy

**Environments:**

| Environment | Purpose | Deployment | URL Pattern |
|------------|---------|------------|-------------|
| **Development** | Local development | Manual | localhost:3000, localhost:8787 |
| **Staging** | Pre-production testing | Automatic (develop branch) | staging.officehours.youcanjustdothings.io |
| **Production** | Live application | Manual (main branch) | officehours.youcanjustdothings.io |

**Environment Variables Management:**

```bash
# Development (local .env files)
apps/web/.env
apps/api/.env

# Staging
# Cloudflare Pages: Set in dashboard under "Environment variables"
# Cloudflare Workers: Use wrangler secrets

# Production
# Cloudflare Pages: Set in dashboard
# Cloudflare Workers: Use wrangler secrets for sensitive data
```

### 11.3 Frontend Deployment (Cloudflare Pages)

**Initial Setup:**

```bash
# 1. Login to Cloudflare
npx wrangler login

# 2. Create Cloudflare Pages project
# Via Cloudflare Dashboard:
# - Connect GitHub repository
# - Select "cf-office-hours" repo
# - Framework preset: Vite
# - Build command: npm run build:web
# - Build output directory: apps/web/dist
# - Root directory: /
```

**Build Configuration:**

```bash
# Cloudflare Pages build settings
Build command: npm run build --workspace=apps/web
Build output directory: apps/web/dist
Root directory: /
Node version: 20
```

**Environment Variables (Pages Dashboard):**

```
Production:
VITE_API_BASE_URL=https://api.officehours.youcanjustdothings.io/v1
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_ENABLE_REALTIME=true
VITE_ENABLE_ANALYTICS=true

Preview (Staging):
VITE_API_BASE_URL=https://api-staging.officehours.youcanjustdothings.io/v1
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-staging-anon-key
VITE_ENABLE_REALTIME=true
VITE_ENABLE_ANALYTICS=false
```

**Custom Domain Setup:**

```bash
# 1. Add custom domain in Cloudflare Pages dashboard
# - Production: officehours.youcanjustdothings.io
# - Staging: staging.officehours.youcanjustdothings.io

# 2. Configure DNS (automatically handled by Cloudflare)
# - CNAME record pointing to Cloudflare Pages

# 3. Enable automatic HTTPS (enabled by default)
```

**Deployment Process:**

```bash
# Automatic deployment on git push
git push origin main          # Deploys to production
git push origin develop       # Deploys to staging

# Manual deployment via CLI
npx wrangler pages deploy apps/web/dist --project-name=cf-office-hours

# View deployment logs
# Access via Cloudflare Dashboard > Pages > cf-office-hours > Deployments
```

### 11.4 Backend Deployment (Cloudflare Workers)

**wrangler.toml Configuration:**

```toml
# apps/api/wrangler.toml

name = "cf-office-hours-api"
main = "src/index.ts"
compatibility_date = "2025-03-11"
compatibility_flags = ["nodejs_compat"]

# Production environment
[env.production]
vars = { ENVIRONMENT = "production" }
routes = [
  { pattern = "api.officehours.youcanjustdothings.io/*", zone_name = "officehours.youcanjustdothings.io" }
]

[[env.production.kv_namespaces]]
binding = "CACHE"
id = "production-cache-namespace-id"

[[env.production.kv_namespaces]]
binding = "RATE_LIMIT"
id = "production-ratelimit-namespace-id"

[[env.production.durable_objects.bindings]]
name = "SLOT_GENERATOR"
class_name = "SlotGenerator"
script_name = "cf-office-hours-api"

# Staging environment
[env.staging]
vars = { ENVIRONMENT = "staging" }
routes = [
  { pattern = "api-staging.officehours.youcanjustdothings.io/*", zone_name = "officehours.youcanjustdothings.io" }
]

[[env.staging.kv_namespaces]]
binding = "CACHE"
id = "staging-cache-namespace-id"

[[env.staging.kv_namespaces]]
binding = "RATE_LIMIT"
id = "staging-ratelimit-namespace-id"
```

**Setting Secrets:**

```bash
# Production secrets
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
npx wrangler secret put SUPABASE_JWT_SECRET --env production
npx wrangler secret put GOOGLE_CLIENT_SECRET --env production
npx wrangler secret put MICROSOFT_CLIENT_SECRET --env production
npx wrangler secret put AIRTABLE_API_KEY --env production
npx wrangler secret put JWT_SECRET --env production
npx wrangler secret put WEBHOOK_SECRET --env production

# Staging secrets
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env staging
# ... repeat for other secrets
```

**Deployment Process:**

```bash
# Deploy to production
npm run build:api
npx wrangler deploy --env production

# Deploy to staging
npm run build:api
npx wrangler deploy --env staging

# View deployment status
npx wrangler deployments list --env production

# Rollback to previous version
npx wrangler rollback --env production
```

### 11.5 Database Deployment (Supabase)

**Migration Strategy:**

```bash
# 1. Create migration locally
npx supabase migration new add_booking_table

# 2. Write migration SQL
# Edit supabase/migrations/XXX_add_booking_table.sql

# 3. Apply to local database
npx supabase db push

# 4. Test locally
npm run test:api

# 5. Apply to staging
# Via Supabase Dashboard > Database > Migrations
# Or using Supabase CLI:
npx supabase db push --project-ref staging-project-ref

# 6. Verify staging
curl https://api-staging.officehours.youcanjustdothings.io/health

# 7. Apply to production
npx supabase db push --project-ref production-project-ref
```

**Row Level Security (RLS) Deployment:**

```sql
-- Always deploy RLS policies with tables
-- Example: supabase/migrations/XXX_booking_rls.sql

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own bookings
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (mentor_id = auth.uid() OR mentee_id = auth.uid());

-- Policy: Mentees can create bookings
CREATE POLICY "Mentees can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    mentee_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'mentee'
    )
  );
```

**Backup Strategy:**

```bash
# Supabase provides automatic daily backups
# Point-in-Time Recovery (PITR) available

# Manual backup
npx supabase db dump -f backup.sql --project-ref production-project-ref

# Restore from backup
npx supabase db restore backup.sql --project-ref production-project-ref
```

### 11.6 CI/CD Pipeline

**GitHub Actions Workflow:**

**.github/workflows/deploy-production.yml:**

```yaml
name: Deploy Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npm run type-check
      
      - name: Run tests
        run: npm run test
      
      - name: Build
        run: npm run build

  deploy-api:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run Database Migrations
        run: |
          npx supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
          npx supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: 'apps/api'
          command: deploy --env production
  
  deploy-web:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build frontend
        run: npm run build:web
        env:
          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy apps/web/dist --project-name=cf-office-hours
```

**.github/workflows/deploy-staging.yml:**

```yaml
name: Deploy Staging

on:
  push:
    branches: [develop]
  workflow_dispatch:

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Deploy API to staging
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: 'apps/api'
          command: deploy --env staging
      
      - name: Build and deploy frontend to staging
        run: |
          npm run build:web
          npx wrangler pages deploy apps/web/dist --project-name=cf-office-hours --branch=staging
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          VITE_API_BASE_URL: ${{ secrets.STAGING_API_BASE_URL }}
```

**Required GitHub Secrets:**

```
CLOUDFLARE_API_TOKEN
VITE_API_BASE_URL
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
STAGING_API_BASE_URL
```

### 11.7 Monitoring & Health Checks

**Health Check Endpoint:**

```typescript
// apps/api/src/index.ts
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
    version: '1.0.0',
  });
});
```

**Uptime Monitoring:**

```bash
# Use Cloudflare's built-in monitoring
# Access: Cloudflare Dashboard > Analytics > Workers

# External monitoring options:
# - UptimeRobot (free for 50 monitors)
# - Pingdom
# - StatusCake

# Example health check configuration:
# URL: https://api.officehours.youcanjustdothings.io/health
# Interval: 5 minutes
# Alert on: 3 consecutive failures
```

**Analytics:**

```javascript
// Cloudflare Pages automatically tracks:
// - Page views
// - Request counts
// - Error rates
// - Geographic distribution

// Access via Cloudflare Dashboard > Pages > Analytics
```

### 11.8 Rollback Procedures

**Frontend Rollback:**

```bash
# Via Cloudflare Dashboard:
# 1. Go to Pages > cf-office-hours > Deployments
# 2. Find previous working deployment
# 3. Click "..." > "Rollback to this deployment"

# Via CLI:
npx wrangler pages deployment list --project-name=cf-office-hours
npx wrangler pages deployment rollback <deployment-id>
```

**Backend Rollback:**

```bash
# List recent deployments
npx wrangler deployments list --env production

# Rollback to specific version
npx wrangler rollback --env production

# Or deploy previous version from git
git checkout <previous-commit>
npx wrangler deploy --env production
git checkout main
```

**Database Migration Rollback:**

Supabase doesn't support automatic migration rollback. Follow this manual rollback process:

**Emergency Rollback Process:**

```bash
# 1. Identify Failed Migration
npx supabase migration list
# Look for the last applied migration

# 2. Create Rollback Migration
npx supabase migration new rollback_booking_changes

# 3. Write Reverse SQL (in the new migration file)
# Example: If original migration added a column, remove it:
# ALTER TABLE bookings DROP COLUMN IF EXISTS new_column CASCADE;
# 
# Example: If original migration created a table, drop it:
# DROP TABLE IF EXISTS new_table CASCADE;

# 4. Test Rollback Locally First
npx supabase db push  # Apply to local database
npm run test          # Verify application still works

# 5. Apply Rollback to Production
npx supabase link --project-ref production-project-ref
npx supabase db push

# 6. Verify Application Health
curl https://api.officehours.youcanjustdothings.io/health
npm run test:e2e  # Run critical path tests
```

**Restore from Backup (if rollback fails):**

```bash
# Access Supabase Dashboard → Database → Backups
# 1. Identify last known good backup (before failed migration)
# 2. Click "Restore" on the backup
# 3. Confirm restoration (creates new database instance)
# 4. Update connection strings in application
# 5. Verify data integrity
```

**Migration Rollback Safety Checklist:**

Before rolling back a migration:
- [ ] Database backup created (automatic daily backup confirmed)
- [ ] Rollback migration script tested locally
- [ ] Data validation queries prepared
- [ ] Rollback window communicated to users (if downtime expected)
- [ ] Application code compatible with rolled-back schema
- [ ] All dependent services notified (frontend, workers)
- [ ] Post-rollback verification plan documented

After rollback:
- [ ] Application health check passed
- [ ] Critical user flows tested (booking, authentication)
- [ ] No data loss confirmed via validation queries
- [ ] Error logs reviewed for post-rollback issues
- [ ] Incident postmortem documented

**Common Rollback Scenarios:**

1. **Column Addition Gone Wrong:**
   ```sql
   -- Rollback migration:
   ALTER TABLE users DROP COLUMN IF EXISTS problematic_column CASCADE;
   ```

2. **Index Creation Causing Performance Issues:**
   ```sql
   -- Rollback migration:
   DROP INDEX IF EXISTS idx_problematic_index;
   ```

3. **RLS Policy Breaking Access:**
   ```sql
   -- Rollback migration:
   DROP POLICY IF EXISTS "problematic_policy" ON tablename;
   -- Recreate original policy
   ```

**Related Documentation:**
- Section 10.1.6: Database Migration workflow
- INFRA-DB-003: Migration Tooling Setup
- Section 11.5: CI/CD Pipeline (includes migration automation)
```

### 11.9 Disaster Recovery

**Backup Strategy:**

```bash
# Database backups (Supabase automatic)
# - Daily automatic backups
# - 7-day retention on free tier
# - Point-in-Time Recovery available on Pro tier

# Manual backup before major changes
npx supabase db dump -f backup-$(date +%Y%m%d).sql

# Store backups securely
# - S3 bucket
# - GitHub repository (private, for schema only)
# - Local encrypted storage
```

**Recovery Procedures:**

1. **Database Failure:**
   ```bash
   # Restore from latest backup
   npx supabase db restore backup-latest.sql --project-ref production-project-ref
   ```

2. **Worker Outage:**
   ```bash
   # Rollback to last working version
   npx wrangler rollback --env production
   
   # Or redeploy current version
   npx wrangler deploy --env production
   ```

3. **Pages Outage:**
   ```bash
   # Rollback to previous deployment
   npx wrangler pages deployment rollback <last-working-deployment-id>
   ```

4. **Complete Platform Failure:**
   - Cloudflare status: https://www.cloudflarestatus.com/
   - Supabase status: https://status.supabase.com/
   - Wait for platform recovery
   - Verify all services after recovery

### 11.10 Performance Optimization

**Cloudflare Settings:**

1. **Caching:**
   ```toml
   # wrangler.toml
   [env.production]
   # Cache static assets aggressively
   [env.production.cache]
   ttl = 3600  # 1 hour
   ```

2. **Compression:**
   - Brotli compression enabled by default on Cloudflare
   - Gzip fallback for older browsers

3. **HTTP/3:**
   - Enabled by default on Cloudflare
   - Improves performance over slow connections

**Database Optimization:**

```sql
-- Add indexes for common queries
CREATE INDEX idx_bookings_mentor_id ON bookings(mentor_id);
CREATE INDEX idx_bookings_mentee_id ON bookings(mentee_id);
CREATE INDEX idx_bookings_meeting_start ON bookings(meeting_start_time);
CREATE INDEX idx_time_slots_mentor ON time_slots(mentor_id, start_time) WHERE NOT is_booked;
CREATE INDEX idx_users_reputation_tier ON users(reputation_tier);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM bookings WHERE mentor_id = 'xxx';
```

### 11.11 Security Hardening

**HTTP Headers (Cloudflare Pages):**

```typescript
// apps/web/_headers (Cloudflare Pages Headers file)
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.officehours.youcanjustdothings.io;
```

**Rate Limiting:**

```typescript
// Already implemented in middleware (Section 8.4)
// Adjust limits per route:
app.use('/api/bookings', rateLimitMiddleware({ 
  windowMs: 60000, 
  maxRequests: 10 
}));
```

**DDoS Protection:**

- Cloudflare's DDoS protection enabled by default
- Workers rate limiting provides additional protection
- Supabase has built-in connection limits

### 11.12 Cost Management

**Cloudflare Free Tier Limits:**

| Service | Free Tier | Usage Estimate (500 users) |
|---------|-----------|---------------------------|
| Workers | 100,000 requests/day | ~5,000 requests/day ✅ |
| Pages | Unlimited bandwidth | Unlimited ✅ |
| KV Reads | 100,000/day | ~10,000/day ✅ |
| KV Writes | 1,000/day | ~500/day ✅ |
| Durable Objects | 1 million requests/month | ~50,000/month ✅ |

**Supabase Free Tier Limits:**

| Resource | Free Tier | Usage Estimate |
|----------|-----------|----------------|
| Database | 500 MB | ~100 MB ✅ |
| Storage | 1 GB | ~200 MB ✅ |
| Bandwidth | 2 GB | ~500 MB ✅ |
| Monthly Active Users | Unlimited | 500 ✅ |

**Cost Optimization Tips:**

1. **Use KV for Caching:**
   - Cache frequent queries
   - Reduce database load
   - Free tier sufficient for MVP

2. **Optimize Images:**
   - Use Cloudflare Image Resizing (paid)
   - Or compress before upload
   - Store in Supabase Storage

3. **Lazy Load Resources:**
   - Code splitting in frontend
   - Load features on-demand
   - Reduces bandwidth usage

### 11.13 Deployment Checklist

**Pre-Deployment:**
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Database migrations tested in staging
- [ ] Environment variables configured
- [ ] Performance testing completed
- [ ] Security scan passed
- [ ] Documentation updated

**Deployment:**
- [ ] Deploy to staging first
- [ ] Verify staging functionality
- [ ] Run smoke tests on staging
- [ ] Deploy to production
- [ ] Verify production health
- [ ] Monitor error rates
- [ ] Check analytics dashboard

**Post-Deployment:**
- [ ] Verify all critical paths working
- [ ] Monitor logs for errors
- [ ] Check database performance
- [ ] Verify email notifications
- [ ] Test calendar integrations
- [ ] Update status page
- [ ] Communicate to team

**Rollback Criteria:**
- Error rate >5%
- Response time >2s for 95th percentile
- Critical feature broken
- Security vulnerability discovered

---


**Section 11 Complete.** This deployment architecture provides:
- ✅ Complete deployment strategy for Cloudflare Pages and Workers
- ✅ Environment management (development, staging, production)
- ✅ CI/CD pipeline with GitHub Actions
- ✅ Database migration and RLS deployment procedures
- ✅ Monitoring, health checks, and alerting
- ✅ Rollback and disaster recovery procedures
- ✅ Performance optimization strategies
- ✅ Security hardening and rate limiting
- ✅ Cost management within free tier limits
- ✅ Comprehensive deployment checklists


## 12. Security and Performance

This section covers comprehensive security best practices, authentication implementation details, data protection strategies, and performance optimization techniques for the CF Office Hours platform.

### 12.1 Security Architecture Overview

**Defense in Depth Strategy:**
- Multiple layers of security controls
- Principle of least privilege
- Fail-safe defaults
- Security by design

**Key Security Domains:**
1. Authentication & Authorization
2. Data Protection
3. API Security
4. Frontend Security
5. Infrastructure Security
6. Compliance & Privacy

### 12.2 Authentication & Authorization

**Authentication Flow (Supabase Auth):**

```typescript
// apps/web/src/lib/auth.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// Magic link authentication
export async function signInWithMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  
  if (error) throw error;
}

// OAuth authentication (Google/Microsoft)
export async function signInWithOAuth(provider: 'google' | 'azure') {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: provider === 'google' 
        ? 'openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events'
        : 'openid email profile Calendars.ReadWrite',
    },
  });
  
  if (error) throw error;
}
```

**JWT Token Management:**

```typescript
// apps/api/src/middleware/auth.ts
import { verify } from '@tsndr/cloudflare-worker-jwt';

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload> {
  const isValid = await verify(token, secret);
  
  if (!isValid) {
    throw new AppError(401, 'Invalid or expired token', 'UNAUTHORIZED');
  }
  
  const payload = JSON.parse(atob(token.split('.')[1]));
  
  // Check token expiration
  if (payload.exp && Date.now() >= payload.exp * 1000) {
    throw new AppError(401, 'Token expired', 'TOKEN_EXPIRED');
  }
  
  return payload;
}

// Auth middleware
export const requireAuth = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(401, 'Missing authentication token', 'UNAUTHORIZED');
  }
  
  const token = authHeader.substring(7);
  const payload = await verifyJWT(token, c.env.SUPABASE_JWT_SECRET);
  
  // Fetch user from database
  const user = await c.env.db
    .from('users')
    .select('*')
    .eq('id', payload.sub)
    .is('deleted_at', null)
    .single();
  
  if (!user) {
    throw new AppError(401, 'User not found', 'USER_NOT_FOUND');
  }
  
  c.set('user', user);
  await next();
};
```

**Role-Based Access Control (RBAC):**

```typescript
// apps/api/src/middleware/rbac.ts
export const requireRole = (...allowedRoles: Role[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    
    if (!user) {
      throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');
    }
    
    if (!allowedRoles.includes(user.role)) {
      throw new AppError(403, 'Insufficient permissions', 'FORBIDDEN');
    }
    
    await next();
  };
};

// Usage in routes
app.get('/api/admin/users', 
  requireAuth, 
  requireRole('coordinator'),
  async (c) => {
    // Only coordinators can access
  }
);
```

**Row Level Security (RLS) Policies:**

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Coordinators can manage all users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'coordinator'
    )
  );

-- Bookings table policies
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    mentor_id = auth.uid() 
    OR mentee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'coordinator'
    )
  );

CREATE POLICY "Mentees can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    mentee_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('mentee', 'mentor')
    )
  );

-- Ratings table policies
CREATE POLICY "Users can view ratings they gave or received"
  ON ratings FOR SELECT
  TO authenticated
  USING (
    rater_id = auth.uid() 
    OR rated_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'coordinator'
    )
  );

CREATE POLICY "Users can create ratings for their bookings"
  ON ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    rater_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM bookings 
      WHERE id = NEW.booking_id
      AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
      AND status = 'completed'
    )
  );
```

### 12.3 Data Protection

**Encryption at Rest:**
- **Database:** Supabase provides automatic encryption at rest (AES-256)
- **Storage:** Supabase Storage encrypts all objects
- **Sensitive Fields:** Additional application-level encryption for PII

**Sensitive Data Handling:**

```typescript
// apps/api/src/utils/encryption.ts
import { createHash, randomBytes } from 'crypto';

// Hash sensitive identifiers (one-way)
export function hashIdentifier(value: string): string {
  return createHash('sha256')
    .update(value)
    .digest('hex');
}

// Generate secure tokens
export function generateSecureToken(): string {
  return randomBytes(32).toString('base64url');
}

// Example: Hash phone numbers for analytics while preserving privacy
export function anonymizePhoneNumber(phone: string): string {
  return hashIdentifier(phone);
}
```

**Data Sanitization:**

```typescript
// apps/api/src/utils/sanitization.ts
import DOMPurify from 'isomorphic-dompurify';

// Sanitize user input to prevent XSS
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
  });
}

// Sanitize before storing in database
export function sanitizeUserInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .substring(0, 1000); // Limit length
}
```

**GDPR Compliance:**

```typescript
// apps/api/src/services/gdpr.service.ts
export class GDPRService {
  // Export all user data
  async exportUserData(userId: string): Promise<UserDataExport> {
    const [user, bookings, ratings, tags] = await Promise.all([
      this.db.from('users').select('*').eq('id', userId).single(),
      this.db.from('bookings').select('*').or(`mentor_id.eq.${userId},mentee_id.eq.${userId}`),
      this.db.from('ratings').select('*').or(`rater_id.eq.${userId},rated_user_id.eq.${userId}`),
      this.db.from('user_tags').select('*').eq('user_id', userId),
    ]);
    
    return {
      user,
      bookings,
      ratings,
      tags,
      exportedAt: new Date().toISOString(),
    };
  }
  
  // Delete user data (GDPR right to be forgotten)
  async deleteUserData(userId: string): Promise<void> {
    // Hard delete user data
    await this.db.from('users').delete().eq('id', userId);
    
    // Anonymize historical records
    await this.db
      .from('bookings')
      .update({ 
        meeting_goal: '[DELETED]',
        materials_urls: [],
      })
      .or(`mentor_id.eq.${userId},mentee_id.eq.${userId}`);
    
    // Log deletion for audit
    await this.auditLog.log({
      action: 'gdpr_deletion',
      userId,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### 12.4 API Security

**Input Validation (Zod):**

```typescript
// apps/api/src/schemas/booking.schema.ts
import { z } from 'zod';

export const CreateBookingSchema = z.object({
  time_slot_id: z.string().uuid(),
  meeting_goal: z.string()
    .min(10, 'Meeting goal must be at least 10 characters')
    .max(1000, 'Meeting goal must be less than 1000 characters')
    .refine(val => sanitizeUserInput(val) === val, {
      message: 'Meeting goal contains invalid characters',
    }),
  materials_urls: z.array(
    z.string().url('Invalid URL format')
  ).max(5, 'Maximum 5 material URLs allowed').optional(),
});

// Automatic validation in routes
app.post('/api/bookings', 
  zValidator('json', CreateBookingSchema),
  async (c) => {
    const data = c.req.valid('json'); // Type-safe and validated
    // Process booking...
  }
);
```

**Rate Limiting:**

```typescript
// apps/api/src/middleware/rate-limit.ts
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export class RateLimiter {
  constructor(
    private kv: KVNamespace,
    private config: RateLimitConfig
  ) {}
  
  async checkLimit(identifier: string): Promise<boolean> {
    const key = `ratelimit:${identifier}`;
    const current = await this.kv.get(key);
    
    if (!current) {
      await this.kv.put(key, '1', { 
        expirationTtl: Math.floor(this.config.windowMs / 1000) 
      });
      return true;
    }
    
    const count = parseInt(current, 10);
    
    if (count >= this.config.maxRequests) {
      return false;
    }
    
    await this.kv.put(key, String(count + 1), { 
      expirationTtl: Math.floor(this.config.windowMs / 1000) 
    });
    return true;
  }
}

// Middleware
export const rateLimitMiddleware = (config: RateLimitConfig) => {
  return async (c: Context, next: Next) => {
    const identifier = c.get('user')?.id || c.req.header('cf-connecting-ip') || 'anonymous';
    const limiter = new RateLimiter(c.env.RATE_LIMIT, config);
    
    const allowed = await limiter.checkLimit(identifier);
    
    if (!allowed) {
      throw new AppError(429, 'Too many requests', 'RATE_LIMIT_EXCEEDED');
    }
    
    await next();
  };
};

// Apply to routes
app.post('/api/bookings', 
  rateLimitMiddleware({ windowMs: 60000, maxRequests: 10 }),
  async (c) => { /* ... */ }
);
```

**CORS Configuration:**

```typescript
// apps/api/src/middleware/cors.ts
import { cors } from 'hono/cors';

export const corsMiddleware = cors({
  origin: [
    'http://localhost:3000',
    'https://officehours.youcanjustdothings.io',
    'https://staging.officehours.youcanjustdothings.io',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 600,
  credentials: true,
});
```

**SQL Injection Prevention:**

```typescript
// Always use parameterized queries via Supabase client
// ✅ SAFE: Supabase automatically parameterizes
const user = await supabase
  .from('users')
  .select('*')
  .eq('email', userInput) // Automatically escaped
  .single();

// ❌ UNSAFE: Never use string concatenation
// const query = `SELECT * FROM users WHERE email = '${userInput}'`;

// For complex queries, use prepared statements
const { data } = await supabase.rpc('get_user_bookings', {
  p_user_id: userId,
  p_start_date: startDate,
});
```

### 12.5 Frontend Security

**XSS Prevention:**

```typescript
// apps/web/src/components/common/SafeHtml.tsx
import DOMPurify from 'dompurify';

interface SafeHtmlProps {
  html: string;
  allowedTags?: string[];
}

export function SafeHtml({ html, allowedTags }: SafeHtmlProps) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: allowedTags || ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  });
  
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}

// Usage
<SafeHtml html={userProvidedContent} />
```

**CSRF Protection:**

```typescript
// Not required for JWT-based auth with proper CORS
// Supabase handles CSRF tokens for session-based auth automatically

// For additional protection on sensitive operations:
export async function generateCSRFToken(): Promise<string> {
  const token = crypto.randomUUID();
  sessionStorage.setItem('csrf_token', token);
  return token;
}

export function verifyCSRFToken(token: string): boolean {
  const storedToken = sessionStorage.getItem('csrf_token');
  return token === storedToken;
}
```

**Secure Storage:**

```typescript
// apps/web/src/lib/secure-storage.ts

// ✅ SAFE: Store JWT in memory or localStorage (acceptable for this use case)
// Supabase handles token storage securely
export const supabase = createClient(url, key, {
  auth: {
    persistSession: true, // Stores in localStorage
    autoRefreshToken: true,
  },
});

// ❌ NEVER store sensitive data in localStorage without encryption
// ❌ NEVER store passwords or credit cards client-side

// For sensitive client-side data (if needed):
export class SecureStorage {
  private encryptionKey: CryptoKey | null = null;
  
  async init() {
    // Derive key from user session (example)
    const session = await supabase.auth.getSession();
    if (session.data.session) {
      this.encryptionKey = await this.deriveKey(session.data.session.access_token);
    }
  }
  
  private async deriveKey(password: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: enc.encode('salt'), iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
}
```

**Content Security Policy:**

```typescript
// apps/web/_headers (Cloudflare Pages)
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://api.officehours.youcanjustdothings.io https://accounts.google.com https://login.microsoftonline.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### 12.6 Performance Optimization

**Frontend Performance:**

**1. Code Splitting:**

```typescript
// apps/web/src/App.tsx
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Lazy load routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MentorDirectory = lazy(() => import('./pages/MentorDirectory'));
const BookingFlow = lazy(() => import('./pages/BookingFlow'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/mentors" element={<MentorDirectory />} />
        <Route path="/book/:mentorId" element={<BookingFlow />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Suspense>
  );
}
```

**2. React Query Optimization:**

```typescript
// apps/web/src/hooks/useBookings.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Optimized query with stale time and cache time
export function useBookings() {
  return useQuery({
    queryKey: ['bookings', 'my-bookings'],
    queryFn: fetchMyBookings,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

// Optimistic updates
export function useCreateBooking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createBooking,
    onMutate: async (newBooking) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['bookings'] });
      
      // Snapshot previous value
      const previousBookings = queryClient.getQueryData(['bookings', 'my-bookings']);
      
      // Optimistically update
      queryClient.setQueryData(['bookings', 'my-bookings'], (old: Booking[]) => [
        ...old,
        { ...newBooking, id: 'temp-id', status: 'confirmed' },
      ]);
      
      return { previousBookings };
    },
    onError: (err, newBooking, context) => {
      // Rollback on error
      queryClient.setQueryData(['bookings', 'my-bookings'], context.previousBookings);
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
```

**3. Memoization:**

```typescript
// apps/web/src/components/MentorCard.tsx
import { memo, useMemo } from 'react';

interface MentorCardProps {
  mentor: Mentor;
  onBook: (mentorId: string) => void;
}

export const MentorCard = memo(function MentorCard({ mentor, onBook }: MentorCardProps) {
  // Memoize expensive calculations
  const matchScore = useMemo(() => {
    return calculateMatchScore(mentor, currentUser);
  }, [mentor.id, currentUser.id]);
  
  // Memoize event handlers to prevent re-renders
  const handleBook = useCallback(() => {
    onBook(mentor.id);
  }, [mentor.id, onBook]);
  
  return (
    <Card>
      <h3>{mentor.name}</h3>
      <p>Match: {matchScore}%</p>
      <Button onClick={handleBook}>Book</Button>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo
  return prevProps.mentor.id === nextProps.mentor.id 
    && prevProps.mentor.updated_at === nextProps.mentor.updated_at;
});
```

**4. Virtual Scrolling:**

```typescript
// apps/web/src/components/MentorList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

export function MentorList({ mentors }: { mentors: Mentor[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: mentors.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Estimated item height
    overscan: 5, // Render 5 extra items above/below viewport
  });
  
  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const mentor = mentors[virtualRow.index];
          return (
            <div
              key={mentor.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <MentorCard mentor={mentor} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Backend Performance:**

**1. Database Query Optimization:**

```sql
-- Add composite indexes for common queries
CREATE INDEX idx_bookings_mentor_start 
  ON bookings(mentor_id, meeting_start_time) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_time_slots_availability 
  ON time_slots(mentor_id, start_time, is_booked) 
  WHERE deleted_at IS NULL AND is_booked = false;

CREATE INDEX idx_users_search 
  ON users USING gin(to_tsvector('english', name || ' ' || COALESCE(bio, '')))
  WHERE deleted_at IS NULL;

-- Use EXPLAIN ANALYZE to optimize queries
EXPLAIN ANALYZE
SELECT b.*, u1.name as mentor_name, u2.name as mentee_name
FROM bookings b
JOIN users u1 ON b.mentor_id = u1.id
JOIN users u2 ON b.mentee_id = u2.id
WHERE b.mentor_id = 'xxx'
  AND b.meeting_start_time > NOW()
  AND b.deleted_at IS NULL
ORDER BY b.meeting_start_time;
```

**2. Caching with KV:**

```typescript
// apps/api/src/services/cache.service.ts
export class CacheService {
  constructor(private kv: KVNamespace) {}
  
  async get<T>(key: string): Promise<T | null> {
    const cached = await this.kv.get(key, 'json');
    return cached as T | null;
  }
  
  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    await this.kv.put(key, JSON.stringify(value), {
      expirationTtl: ttl,
    });
  }
  
  async delete(key: string): Promise<void> {
    await this.kv.delete(key);
  }
}

// Usage in services
export class MentorService {
  async getMentorProfile(mentorId: string): Promise<Mentor> {
    const cacheKey = `mentor:${mentorId}`;
    
    // Check cache first
    const cached = await this.cache.get<Mentor>(cacheKey);
    if (cached) return cached;
    
    // Fetch from database
    const mentor = await this.repository.findById(mentorId);
    
    // Cache for 10 minutes
    await this.cache.set(cacheKey, mentor, 600);
    
    return mentor;
  }
}
```

**3. Connection Pooling:**

```typescript
// Supabase client handles connection pooling automatically
// For custom database connections (if needed):
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Use pooled connections
export async function query(text: string, params: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  
  console.log('Query executed', { text, duration, rows: res.rowCount });
  return res;
}
```

**4. Response Compression:**

```typescript
// Cloudflare automatically handles compression
// For additional optimization, compress large responses:
import { compress } from 'hono/compress';

app.use('*', compress());

// Or selectively compress:
app.get('/api/mentors', compress(), async (c) => {
  const mentors = await getMentors();
  return c.json(mentors);
});
```

### 12.7 Performance Monitoring

**Frontend Metrics:**

```typescript
// apps/web/src/lib/performance.ts
export function trackPageLoad() {
  if ('performance' in window) {
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      console.log('Performance Metrics', {
        dns: perfData.domainLookupEnd - perfData.domainLookupStart,
        tcp: perfData.connectEnd - perfData.connectStart,
        request: perfData.responseStart - perfData.requestStart,
        response: perfData.responseEnd - perfData.responseStart,
        dom: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        load: perfData.loadEventEnd - perfData.loadEventStart,
      });
    });
  }
}

// Track specific operations
export function trackOperation<T>(name: string, operation: () => Promise<T>): Promise<T> {
  const start = performance.now();
  
  return operation().finally(() => {
    const duration = performance.now() - start;
    console.log(`Operation: ${name} took ${duration.toFixed(2)}ms`);
  });
}
```

**Backend Metrics:**

```typescript
// apps/api/src/middleware/metrics.ts
export const metricsMiddleware = async (c: Context, next: Next) => {
  const start = Date.now();
  const path = new URL(c.req.url).pathname;
  
  await next();
  
  const duration = Date.now() - start;
  const status = c.res.status;
  
  // Log metrics
  console.log({
    method: c.req.method,
    path,
    status,
    duration,
    timestamp: new Date().toISOString(),
  });
  
  // Track slow queries
  if (duration > 2000) {
    console.warn('Slow request detected', { path, duration });
  }
};
```

### 12.8 Security Checklist

**Development:**
- [ ] All dependencies up to date
- [ ] No hardcoded secrets in code
- [ ] Input validation on all user inputs
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitize HTML)
- [ ] CSRF tokens for sensitive operations

**Deployment:**
- [ ] HTTPS enabled (Cloudflare SSL)
- [ ] Secure headers configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Secrets stored in environment variables
- [ ] Database RLS policies enabled
- [ ] File upload size limits enforced
- [ ] Error messages don't leak sensitive info

**Ongoing:**
- [ ] Regular security audits
- [ ] Dependency vulnerability scanning
- [ ] Monitor authentication failures
- [ ] Review access logs
- [ ] Update dependencies regularly
- [ ] Rotate secrets periodically

---


## 13. Testing Strategy

This section outlines the comprehensive testing approach for the CF Office Hours platform, covering unit testing, integration testing, end-to-end testing, and testing best practices.

### 13.1 Testing Philosophy

**Testing Pyramid:**
```
              /\
             /  \
            / E2E \          (Few - High value, slow)
           /------\
          /  Inte- \
         / gration  \        (Some - Medium value, medium speed)
        /------------\
       /              \
      /  Unit Tests    \     (Many - Fast, focused)
     /------------------\
```

**Testing Principles:**
1. **Test behavior, not implementation** - Focus on what the code does, not how
2. **Write tests first when fixing bugs** - Reproduce the bug, then fix it
3. **Keep tests simple and readable** - Tests are documentation
4. **Test the happy path and edge cases** - Cover success and failure scenarios
5. **Use meaningful test names** - Describe what is being tested
6. **Keep tests isolated** - Each test should be independent

**Test Coverage Goals:**
- **Unit Tests:** >80% code coverage
- **Integration Tests:** Cover all API endpoints
- **E2E Tests:** Cover critical user journeys
- **Total Coverage:** Aim for >75% overall

### 13.2 Unit Testing (Vitest)

**Setup:**

```typescript
// vitest.config.ts (workspace root)
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.test.ts', '**/*.spec.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Unit Test Examples:**

**1. Testing Utilities:**

```typescript
// apps/api/src/utils/reputation.test.ts
import { describe, it, expect } from 'vitest';
import { calculateReputationScore, determineTier } from './reputation';

describe('Reputation Calculator', () => {
  describe('calculateReputationScore', () => {
    it('should calculate score correctly for user with ratings', () => {
      const user = {
        totalRatings: 10,
        averageRating: 4.5,
        completionRate: 0.9,
        responseTime: '12h',
        tenureMonths: 6,
      };
      
      const result = calculateReputationScore(user);
      
      expect(result.score).toBeCloseTo(4.86, 2); // (4.5 × 0.9 × 1.2) + 0.6
      expect(result.breakdown.averageRating).toBe(4.5);
      expect(result.breakdown.completionRate).toBe(0.9);
      expect(result.breakdown.responsivenessFactor).toBe(1.2);
      expect(result.breakdown.tenureBonus).toBe(0.6);
    });
    
    it('should apply probationary clamp for new users', () => {
      const user = {
        totalRatings: 2, // Less than 3
        averageRating: 3.0,
        completionRate: 0.8,
        responseTime: '48h',
        tenureMonths: 1,
      };
      
      const result = calculateReputationScore(user);
      
      expect(result.score).toBe(3.5); // Clamped to 3.5
      expect(result.breakdown.isProbationary).toBe(true);
    });
    
    it('should not clamp probationary users with high scores', () => {
      const user = {
        totalRatings: 2,
        averageRating: 5.0,
        completionRate: 1.0,
        responseTime: '6h',
        tenureMonths: 1,
      };
      
      const result = calculateReputationScore(user);
      
      expect(result.score).toBeGreaterThan(3.5);
      expect(result.breakdown.isProbationary).toBe(false);
    });
  });
  
  describe('determineTier', () => {
    it('should assign correct tiers based on score', () => {
      expect(determineTier(2.5)).toBe('bronze');
      expect(determineTier(3.0)).toBe('silver');
      expect(determineTier(3.5)).toBe('silver');
      expect(determineTier(4.0)).toBe('gold');
      expect(determineTier(4.5)).toBe('platinum');
      expect(determineTier(5.0)).toBe('platinum');
    });
  });
});
```

**2. Testing Services:**

```typescript
// apps/api/src/services/booking.service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookingService } from './booking.service';

describe('BookingService', () => {
  let service: BookingService;
  let mockRepository: any;
  let mockCalendarProvider: any;
  
  beforeEach(() => {
    mockRepository = {
      findSlotById: vi.fn(),
      createBooking: vi.fn(),
      getUserById: vi.fn(),
    };
    
    mockCalendarProvider = {
      checkConflicts: vi.fn(),
      createEvent: vi.fn(),
    };
    
    service = new BookingService(mockRepository, mockCalendarProvider);
  });
  
  describe('createBooking', () => {
    it('should create booking when all validations pass', async () => {
      // Arrange
      const menteeId = 'mentee-123';
      const bookingData = {
        time_slot_id: 'slot-123',
        meeting_goal: 'Discuss product-market fit',
      };
      
      const mockSlot = {
        id: 'slot-123',
        mentor_id: 'mentor-123',
        is_booked: false,
        start_time: new Date('2025-10-10T14:00:00Z'),
        end_time: new Date('2025-10-10T14:30:00Z'),
      };
      
      const mockMentee = { id: menteeId, reputation_tier: 'silver' };
      const mockMentor = { id: 'mentor-123', reputation_tier: 'gold' };
      
      mockRepository.findSlotById.mockResolvedValue(mockSlot);
      mockRepository.getUserById
        .mockResolvedValueOnce(mockMentee)
        .mockResolvedValueOnce(mockMentor);
      mockCalendarProvider.checkConflicts.mockResolvedValue(false);
      mockRepository.createBooking.mockResolvedValue({
        id: 'booking-123',
        ...bookingData,
        status: 'confirmed',
      });
      
      // Act
      const result = await service.createBooking(menteeId, bookingData);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe('confirmed');
      expect(mockCalendarProvider.checkConflicts).toHaveBeenCalledWith(
        mockMentor.id,
        mockSlot.start_time,
        mockSlot.end_time
      );
      expect(mockRepository.createBooking).toHaveBeenCalled();
    });
    
    it('should throw error if slot is already booked', async () => {
      const bookingData = {
        time_slot_id: 'slot-123',
        meeting_goal: 'Test',
      };
      
      mockRepository.findSlotById.mockResolvedValue({
        id: 'slot-123',
        is_booked: true,
      });
      
      await expect(
        service.createBooking('mentee-123', bookingData)
      ).rejects.toThrow('Slot is already booked');
    });
    
    it('should throw error if calendar conflict detected', async () => {
      const mockSlot = {
        id: 'slot-123',
        mentor_id: 'mentor-123',
        is_booked: false,
        start_time: new Date('2025-10-10T14:00:00Z'),
        end_time: new Date('2025-10-10T14:30:00Z'),
      };
      
      mockRepository.findSlotById.mockResolvedValue(mockSlot);
      mockRepository.getUserById.mockResolvedValue({ reputation_tier: 'silver' });
      mockCalendarProvider.checkConflicts.mockResolvedValue(true);
      
      await expect(
        service.createBooking('mentee-123', { time_slot_id: 'slot-123', meeting_goal: 'Test' })
      ).rejects.toThrow('Calendar conflict detected');
    });
  });
});
```

**3. Testing React Components:**

```typescript
// apps/web/src/components/common/UserAvatar.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { UserAvatar } from './UserAvatar';

describe('UserAvatar', () => {
  it('renders avatar image when URL is provided', () => {
    const user = {
      name: 'John Doe',
      avatar_url: 'https://example.com/avatar.jpg',
    };
    
    render(<UserAvatar user={user} />);
    
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', user.avatar_url);
    expect(img).toHaveAttribute('alt', user.name);
  });
  
  it('renders initials when no avatar URL provided', () => {
    const user = {
      name: 'John Doe',
      avatar_url: null,
    };
    
    render(<UserAvatar user={user} />);
    
    expect(screen.getByText('JD')).toBeInTheDocument();
  });
  
  it('renders single letter for single-word names', () => {
    const user = {
      name: 'Madonna',
      avatar_url: null,
    };
    
    render(<UserAvatar user={user} />);
    
    expect(screen.getByText('M')).toBeInTheDocument();
  });
  
  it('applies correct size class', () => {
    const user = { name: 'John Doe' };
    
    const { container } = render(<UserAvatar user={user} size="lg" />);
    
    const avatar = container.firstChild;
    expect(avatar).toHaveClass('h-12', 'w-12');
  });
});
```

**4. Testing React Hooks:**

```typescript
// apps/web/src/hooks/useBookings.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBookings, useCreateBooking } from './useBookings';
import * as api from '../lib/api';

// Mock API
vi.mock('../lib/api');

describe('useBookings', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  it('fetches bookings successfully', async () => {
    const mockBookings = [
      { id: '1', mentor_id: 'mentor-1', status: 'confirmed' },
      { id: '2', mentor_id: 'mentor-2', status: 'confirmed' },
    ];
    
    vi.mocked(api.fetchMyBookings).mockResolvedValue(mockBookings);
    
    const { result } = renderHook(() => useBookings(), { wrapper });
    
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    
    expect(result.current.data).toEqual(mockBookings);
  });
  
  it('handles fetch error gracefully', async () => {
    vi.mocked(api.fetchMyBookings).mockRejectedValue(new Error('Network error'));
    
    const { result } = renderHook(() => useBookings(), { wrapper });
    
    await waitFor(() => expect(result.current.isError).toBe(true));
    
    expect(result.current.error).toBeDefined();
  });
});
```

### 13.3 Integration Testing

**API Integration Tests:**

```typescript
// apps/api/src/routes/bookings.integration.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, createTestUser, createTestSlot } from '../test-utils';

describe('Bookings API', () => {
  let app: Hono;
  let testUser: User;
  let authToken: string;
  
  beforeAll(async () => {
    app = await createTestApp();
  });
  
  beforeEach(async () => {
    // Create test user and get auth token
    testUser = await createTestUser({ role: 'mentee' });
    authToken = await getAuthToken(testUser.id);
  });
  
  afterAll(async () => {
    await cleanupTestDatabase();
  });
  
  describe('POST /api/bookings', () => {
    it('creates booking successfully with valid data', async () => {
      // Arrange
      const mentor = await createTestUser({ role: 'mentor' });
      const slot = await createTestSlot({ mentor_id: mentor.id });
      
      const bookingData = {
        time_slot_id: slot.id,
        meeting_goal: 'Discuss product-market fit strategy for SaaS startup',
      };
      
      // Act
      const response = await app.request('/api/bookings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });
      
      // Assert
      expect(response.status).toBe(201);
      
      const booking = await response.json();
      expect(booking).toMatchObject({
        time_slot_id: slot.id,
        mentee_id: testUser.id,
        mentor_id: mentor.id,
        status: 'confirmed',
      });
    });
    
    it('returns 400 for invalid meeting goal', async () => {
      const slot = await createTestSlot();
      
      const response = await app.request('/api/bookings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          time_slot_id: slot.id,
          meeting_goal: 'Too short', // Less than 10 characters
        }),
      });
      
      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.error.code).toBe('VALIDATION_ERROR');
    });
    
    it('returns 409 if slot is already booked', async () => {
      const slot = await createTestSlot({ is_booked: true });
      
      const response = await app.request('/api/bookings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          time_slot_id: slot.id,
          meeting_goal: 'Test meeting goal that is long enough',
        }),
      });
      
      expect(response.status).toBe(409);
      const error = await response.json();
      expect(error.error.code).toBe('SLOT_UNAVAILABLE');
    });
    
    it('returns 401 without authentication', async () => {
      const response = await app.request('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          time_slot_id: 'slot-123',
          meeting_goal: 'Test',
        }),
      });
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('GET /api/bookings/my-bookings', () => {
    it('returns user bookings', async () => {
      // Create test bookings
      await createTestBooking({ mentee_id: testUser.id });
      await createTestBooking({ mentee_id: testUser.id });
      
      const response = await app.request('/api/bookings/my-bookings', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      expect(response.status).toBe(200);
      
      const bookings = await response.json();
      expect(bookings).toHaveLength(2);
      expect(bookings[0].mentee_id).toBe(testUser.id);
    });
  });
});
```

**Database Integration Tests:**

```typescript
// apps/api/src/repositories/booking.repository.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BookingRepository } from './booking.repository';
import { createTestDatabase, cleanupTestDatabase } from '../test-utils';

describe('BookingRepository', () => {
  let repository: BookingRepository;
  let db: SupabaseClient;
  
  beforeEach(async () => {
    db = await createTestDatabase();
    repository = new BookingRepository(db);
  });
  
  afterEach(async () => {
    await cleanupTestDatabase(db);
  });
  
  describe('create', () => {
    it('creates booking with all fields', async () => {
      const bookingData = {
        time_slot_id: 'slot-123',
        mentor_id: 'mentor-123',
        mentee_id: 'mentee-123',
        meeting_goal: 'Test meeting',
        status: 'confirmed' as const,
      };
      
      const booking = await repository.create(bookingData);
      
      expect(booking).toMatchObject(bookingData);
      expect(booking.id).toBeDefined();
      expect(booking.created_at).toBeDefined();
    });
    
    it('marks time slot as booked', async () => {
      const slot = await createTestSlot({ is_booked: false });
      
      await repository.create({
        time_slot_id: slot.id,
        mentor_id: 'mentor-123',
        mentee_id: 'mentee-123',
        meeting_goal: 'Test',
        status: 'confirmed',
      });
      
      const updatedSlot = await db
        .from('time_slots')
        .select('is_booked')
        .eq('id', slot.id)
        .single();
      
      expect(updatedSlot.is_booked).toBe(true);
    });
  });
  
  describe('findByUserId', () => {
    it('returns bookings for mentee', async () => {
      const menteeId = 'mentee-123';
      await createTestBooking({ mentee_id: menteeId });
      await createTestBooking({ mentee_id: menteeId });
      await createTestBooking({ mentee_id: 'other-mentee' });
      
      const bookings = await repository.findByUserId(menteeId);
      
      expect(bookings).toHaveLength(2);
      expect(bookings.every(b => b.mentee_id === menteeId)).toBe(true);
    });
    
    it('returns bookings for mentor', async () => {
      const mentorId = 'mentor-123';
      await createTestBooking({ mentor_id: mentorId });
      await createTestBooking({ mentor_id: 'other-mentor' });
      
      const bookings = await repository.findByUserId(mentorId);
      
      expect(bookings).toHaveLength(1);
      expect(bookings[0].mentor_id).toBe(mentorId);
    });
    
    it('excludes soft-deleted bookings', async () => {
      const menteeId = 'mentee-123';
      await createTestBooking({ mentee_id: menteeId });
      await createTestBooking({ mentee_id: menteeId, deleted_at: new Date() });
      
      const bookings = await repository.findByUserId(menteeId);
      
      expect(bookings).toHaveLength(1);
    });
  });
});
```

### 13.4 End-to-End Testing (Playwright)

**Playwright Configuration:**

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**E2E Test Examples:**

```typescript
// apps/web/e2e/booking-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as mentee
    await page.goto('/login');
    await page.fill('[name="email"]', 'mentee@test.com');
    await page.click('button:has-text("Send Magic Link")');
    
    // Mock magic link authentication (or use test user)
    await page.goto('/auth/callback?token=test-token');
  });
  
  test('complete booking flow end-to-end', async ({ page }) => {
    // Navigate to mentor directory
    await page.goto('/mentors');
    await expect(page.locator('h1')).toContainText('Find Mentors');
    
    // Search for mentor
    await page.fill('[placeholder="Search mentors..."]', 'Product Strategy');
    await page.waitForSelector('[data-testid="mentor-card"]');
    
    // Click on first mentor
    await page.click('[data-testid="mentor-card"]:first-child');
    await expect(page).toHaveURL(/\/mentors\/.+/);
    
    // Click Book Meeting button
    await page.click('button:has-text("Book Meeting")');
    await expect(page).toHaveURL(/\/book\/.+/);
    
    // Select time slot
    await page.click('[data-testid="time-slot-button"]:not([disabled]):first');
    
    // Fill meeting details
    await page.fill('[name="meeting_goal"]', 'I want to discuss product-market fit for my SaaS startup');
    await page.fill('[name="materials_url_0"]', 'https://example.com/deck.pdf');
    
    // Confirm booking
    await page.click('button:has-text("Confirm Booking")');
    
    // Verify success
    await expect(page.locator('text=Booking Confirmed')).toBeVisible();
    await expect(page.locator('text=Google Meet')).toBeVisible();
    
    // Navigate to My Bookings
    await page.click('a:has-text("My Bookings")');
    await expect(page).toHaveURL('/bookings');
    
    // Verify booking appears in list
    await expect(page.locator('[data-testid="booking-card"]').first()).toBeVisible();
  });
  
  test('shows error when slot is already booked', async ({ page, context }) => {
    // Open two browser contexts to simulate concurrent booking
    const page2 = await context.newPage();
    
    await page.goto('/book/mentor-123');
    await page2.goto('/book/mentor-123');
    
    // Both select same slot
    const slotButton = '[data-testid="time-slot-button"]:first';
    await page.click(slotButton);
    await page2.click(slotButton);
    
    // First user books successfully
    await page.fill('[name="meeting_goal"]', 'First booking');
    await page.click('button:has-text("Confirm Booking")');
    await expect(page.locator('text=Booking Confirmed')).toBeVisible();
    
    // Second user sees error
    await page2.fill('[name="meeting_goal"]', 'Second booking');
    await page2.click('button:has-text("Confirm Booking")');
    await expect(page2.locator('text=slot was just booked')).toBeVisible();
  });
  
  test('validates meeting goal length', async ({ page }) => {
    await page.goto('/book/mentor-123');
    await page.click('[data-testid="time-slot-button"]:first');
    
    // Try to submit with short goal
    await page.fill('[name="meeting_goal"]', 'Too short');
    await page.click('button:has-text("Confirm Booking")');
    
    // Should show validation error
    await expect(page.locator('text=at least 10 characters')).toBeVisible();
  });
});
```

**Visual Regression Testing:**

```typescript
// apps/web/e2e/visual-regression.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('mentor directory matches snapshot', async ({ page }) => {
    await page.goto('/mentors');
    await page.waitForSelector('[data-testid="mentor-card"]');
    
    await expect(page).toHaveScreenshot('mentor-directory.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
  
  test('booking form matches snapshot', async ({ page }) => {
    await page.goto('/book/mentor-123');
    await page.click('[data-testid="time-slot-button"]:first');
    
    await expect(page.locator('[data-testid="booking-form"]')).toHaveScreenshot('booking-form.png');
  });
});
```

---

### 13.5 Chrome DevTools MCP (Alternative/Complement to Playwright)

**Overview:**

Chrome DevTools MCP is Chrome's native Model Context Protocol tool for browser automation and debugging. It provides an alternative or complement to Playwright for E2E testing and debugging.

**Key Advantages:**
- **Native Chrome Integration** - Direct access to Chrome DevTools capabilities
- **Performance Analysis** - Built-in performance tracing and Core Web Vitals
- **Console Log Viewing** - Direct access to console messages
- **Network Inspection** - Full network request/response inspection
- **No Third-Party Dependencies** - Native Chrome tooling

**Installation:**

```bash
# Install Chrome DevTools MCP
npm install chrome-devtools-mcp

# Configure in MCP client (e.g., Claude Desktop)
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest --yes
```

**Configuration Example:**

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "chrome-devtools-mcp@latest",
        "--yes",
        "--isolated=true",
        "--headless=false"
      ]
    }
  }
}
```

**Use Cases:**

**1. E2E Testing:**
```typescript
// Using Chrome DevTools MCP for E2E testing
// Can be used alongside or instead of Playwright

// Navigate and interact
await navigatePage('https://officehours.youcanjustdothings.io');
await fill({ uid: 'email-input', value: 'mentee@test.com' });
await click({ uid: 'login-button' });

// Take snapshots for validation
const snapshot = await takeSnapshot();
// Verify elements are present in snapshot

// Capture console messages
const consoleLogs = await listConsoleMessages();
// Verify no errors in console
```

**2. Performance Testing:**
```typescript
// Start performance trace
await performanceStartTrace({ reload: true, autoStop: false });

// Interact with the application
await navigatePage('https://officehours.youcanjustdothings.io/book/mentor-123');
await click({ uid: 'time-slot-button' });
await fillForm({
  elements: [
    { uid: 'meeting-goal', value: 'Discuss product strategy' }
  ]
});

// Stop trace and analyze
await performanceStopTrace();
const insights = await performanceAnalyzeInsight({ insightName: 'LCPBreakdown' });
// Verify Core Web Vitals are within acceptable ranges
```

**3. Network Debugging:**
```typescript
// Navigate to page
await navigatePage('https://officehours.youcanjustdothings.io/bookings');

// List all network requests
const requests = await listNetworkRequests({
  resourceTypes: ['fetch', 'xhr'],
  pageSize: 50
});

// Get specific request details
const bookingRequest = await getNetworkRequest({
  url: '/api/bookings'
});

// Verify API responses
// bookingRequest.response.status === 200
// bookingRequest.response.body contains expected data
```

**4. Console Log Verification:**
```typescript
// Navigate and perform actions
await navigatePage('https://officehours.youcanjustdothings.io');
await click({ uid: 'book-meeting-button' });

// Check console for errors
const consoleMessages = await listConsoleMessages();
const errors = consoleMessages.filter(msg => msg.level === 'error');

// Verify no console errors
if (errors.length > 0) {
  throw new Error(`Console errors found: ${JSON.stringify(errors)}`);
}
```

**5. Visual Testing:**
```typescript
// Take screenshot for visual regression
await navigatePage('https://officehours.youcanjustdothings.io/mentors');
await waitFor({ text: 'Find Mentors' });

// Take full page screenshot
await takeScreenshot({
  fullPage: true,
  format: 'png',
  filePath: './screenshots/mentor-directory.png'
});

// Take element screenshot
await takeScreenshot({
  uid: 'booking-card',
  format: 'png',
  filePath: './screenshots/booking-card.png'
});
```

**Comparison: Chrome DevTools MCP vs Playwright**

| Feature | Chrome DevTools MCP | Playwright |
|---------|---------------------|------------|
| **Browser Support** | Chrome only | Chrome, Firefox, Safari, Edge |
| **Performance Tracing** | ✅ Native Chrome tracing | ⚠️ Limited |
| **Console Access** | ✅ Direct access | ⚠️ Via API |
| **Network Inspection** | ✅ Full DevTools access | ✅ Built-in |
| **Test Framework** | ❌ Bring your own | ✅ Full framework |
| **CI/CD Integration** | ✅ Headless mode | ✅ Mature support |
| **Learning Curve** | Medium (MCP-based) | Low (Test framework) |
| **Debugging** | ✅ Native DevTools | ✅ Built-in tools |

**Recommendation:**

- **Use Playwright for:** Cross-browser E2E testing, comprehensive test suites, CI/CD pipelines
- **Use Chrome DevTools MCP for:** Performance analysis, detailed debugging, Chrome-specific testing, console log verification
- **Use Both:** Playwright for main E2E tests, Chrome DevTools MCP for performance and debugging workflows

**Example Hybrid Approach:**

```typescript
// Main E2E tests with Playwright
// apps/web/e2e/booking-flow.spec.ts (Playwright)
test('booking flow works across browsers', async ({ page }) => {
  // Standard Playwright test (runs on Chrome, Firefox, Safari)
});

// Performance tests with Chrome DevTools MCP
// apps/web/performance/booking-performance.ts (Chrome DevTools MCP)
async function testBookingPerformance() {
  await performanceStartTrace({ reload: true });
  // ... perform booking flow
  await performanceStopTrace();
  const insights = await performanceAnalyzeInsight({ insightName: 'LCPBreakdown' });
  // Verify LCP < 2.5s
}
```

**Developer Workflow:**

1. **Local Development:** Use Chrome DevTools MCP for debugging and console log inspection
2. **CI/CD Pipeline:** Use Playwright for comprehensive cross-browser E2E tests
3. **Performance Monitoring:** Use Chrome DevTools MCP for periodic performance audits
4. **Bug Investigation:** Use Chrome DevTools MCP to reproduce and inspect console/network issues

---

### 13.6 API Contract Testing

**OpenAPI Validation:**

```typescript
// apps/api/src/test-utils/contract-testing.ts
import { OpenAPIValidator } from 'express-openapi-validator';
import { readFileSync } from 'fs';

export async function validateAPIContract(
  endpoint: string,
  method: string,
  request: any,
  response: any
) {
  const openApiSpec = JSON.parse(
    readFileSync('./openapi.json', 'utf-8')
  );
  
  const validator = new OpenAPIValidator({
    apiSpec: openApiSpec,
    validateRequests: true,
    validateResponses: true,
  });
  
  // Validate request
  const requestValidation = validator.validateRequest({
    path: endpoint,
    method,
    body: request.body,
    headers: request.headers,
  });
  
  if (requestValidation.errors.length > 0) {
    throw new Error(`Request validation failed: ${JSON.stringify(requestValidation.errors)}`);
  }
  
  // Validate response
  const responseValidation = validator.validateResponse({
    path: endpoint,
    method,
    status: response.status,
    body: response.body,
  });
  
  if (responseValidation.errors.length > 0) {
    throw new Error(`Response validation failed: ${JSON.stringify(responseValidation.errors)}`);
  }
}

// Usage in tests
test('POST /api/bookings conforms to OpenAPI spec', async () => {
  const request = {
    body: { time_slot_id: 'slot-123', meeting_goal: 'Test' },
    headers: { 'Authorization': 'Bearer token' },
  };
  
  const response = await app.request('/api/bookings', {
    method: 'POST',
    ...request,
  });
  
  await validateAPIContract('/api/bookings', 'POST', request, {
    status: response.status,
    body: await response.json(),
  });
});
```

### 13.7 Test Utilities

**Test Data Factories:**

```typescript
// apps/api/src/test-utils/factories.ts
import { faker } from '@faker-js/faker';

export function createTestUser(overrides?: Partial<User>): User {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    role: 'mentee',
    reputation_score: 3.5,
    reputation_tier: 'silver',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    ...overrides,
  };
}

export function createTestBooking(overrides?: Partial<Booking>): Booking {
  return {
    id: faker.string.uuid(),
    time_slot_id: faker.string.uuid(),
    mentor_id: faker.string.uuid(),
    mentee_id: faker.string.uuid(),
    meeting_goal: faker.lorem.paragraph(),
    status: 'confirmed',
    meeting_start_time: faker.date.future(),
    meeting_end_time: faker.date.future(),
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    ...overrides,
  };
}

export function createTestSlot(overrides?: Partial<TimeSlot>): TimeSlot {
  const start = faker.date.future();
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  
  return {
    id: faker.string.uuid(),
    availability_block_id: faker.string.uuid(),
    mentor_id: faker.string.uuid(),
    start_time: start,
    end_time: end,
    is_booked: false,
    booking_id: null,
    created_at: new Date(),
    deleted_at: null,
    ...overrides,
  };
}
```

**Mock Data:**

```typescript
// apps/web/src/test-utils/mocks.ts
import { rest } from 'msw';
import { setupServer } from 'msw/node';

export const handlers = [
  rest.get('/api/mentors', (req, res, ctx) => {
    return res(
      ctx.json([
        { id: '1', name: 'John Doe', expertise: 'Product Strategy' },
        { id: '2', name: 'Jane Smith', expertise: 'Marketing' },
      ])
    );
  }),
  
  rest.post('/api/bookings', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        id: 'booking-123',
        status: 'confirmed',
        meeting_start_time: new Date().toISOString(),
      })
    );
  }),
];

export const server = setupServer(...handlers);

// Setup
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### 13.8 Testing Best Practices

**1. Arrange-Act-Assert Pattern:**

```typescript
test('should calculate total price', () => {
  // Arrange - Set up test data
  const items = [
    { price: 10, quantity: 2 },
    { price: 5, quantity: 3 },
  ];
  
  // Act - Execute the functionality
  const total = calculateTotal(items);
  
  // Assert - Verify the result
  expect(total).toBe(35);
});
```

**2. Test Naming Convention:**

```typescript
// Good: Descriptive test names
test('should return 409 when slot is already booked');
test('should calculate reputation score with probationary clamp for new users');

// Bad: Vague test names
test('booking test');
test('reputation');
```

**3. One Assertion Per Test (when practical):**

```typescript
// Good: Focused tests
test('should create booking with correct mentor_id', async () => {
  const booking = await createBooking(data);
  expect(booking.mentor_id).toBe('mentor-123');
});

test('should create booking with confirmed status', async () => {
  const booking = await createBooking(data);
  expect(booking.status).toBe('confirmed');
});

// Acceptable: Related assertions
test('should create booking with all required fields', async () => {
  const booking = await createBooking(data);
  expect(booking.mentor_id).toBe('mentor-123');
  expect(booking.mentee_id).toBe('mentee-123');
  expect(booking.status).toBe('confirmed');
});
```

**4. Avoid Test Interdependence:**

```typescript
// Bad: Tests depend on each other
test('create user', () => {
  globalUser = createUser();
});

test('update user', () => {
  updateUser(globalUser); // Depends on previous test
});

// Good: Independent tests
test('create user', () => {
  const user = createUser();
  expect(user).toBeDefined();
});

test('update user', () => {
  const user = createUser(); // Create fresh data
  const updated = updateUser(user);
  expect(updated).toBeDefined();
});
```

**5. Use Test Doubles Appropriately:**

```typescript
// Mock: Replace entire implementation
const mockRepository = {
  findById: vi.fn().mockResolvedValue(testUser),
};

// Spy: Observe real implementation
const spy = vi.spyOn(repository, 'findById');
await service.getUser('123');
expect(spy).toHaveBeenCalledWith('123');

// Stub: Provide canned responses
const stub = vi.fn();
stub.mockReturnValueOnce('first call');
stub.mockReturnValueOnce('second call');
```

### 13.9 CI/CD Integration

**GitHub Actions Workflow:**

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
  
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: supabase/postgres
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
  
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### 13.10 Test Coverage Goals

**Coverage Metrics:**
- **Statements:** >80%
- **Branches:** >75%
- **Functions:** >80%
- **Lines:** >80%

**Priority Areas for Coverage:**
1. Business logic (services, repositories)
2. API routes and middleware
3. Utility functions
4. Critical user flows (booking, authentication)

**Acceptable Lower Coverage:**
- UI components (<70% acceptable)
- Configuration files
- Type definitions

### 13.11 Test Coverage by Epic

This subsection maps the PRD's epic structure to specific test coverage expectations, ensuring comprehensive testing aligned with the Walking Skeleton approach.

**Epic 0: Walking Skeleton (END-TO-END MVP)**
- **Target Coverage:** 80% for booking flow
- **Critical Paths:**
  - `POST /auth/magic-link` → Email authentication flow
  - `GET /users/:id/profile` → Profile retrieval
  - `POST /availability` → Mentor creates availability
  - `GET /availability/slots` → Mentee browses slots
  - `POST /bookings` → Complete booking creation with race condition handling
  - `GET /bookings` → View bookings dashboard
- **Unit Tests Required:**
  - Date/time utilities (timezone conversions)
  - Slot generation logic
  - Basic validation schemas (Zod)
- **Integration Tests Required:**
  - Full booking flow with database transactions
  - Concurrent booking attempts (race condition test)
  - RLS policy enforcement
- **E2E Tests Required:**
  - Complete user journey: Login → Browse → Book → Confirm

**Epic 1: Infrastructure Depth**
- **Target Coverage:** 85% for error handling, validation, logging
- **Focus Areas:**
  - Centralized error handler middleware
  - Zod validation for all API endpoints
  - OpenAPI spec generation and validation
  - Rate limiting middleware
  - Soft delete query helpers
- **Unit Tests Required:**
  - Custom error classes (AppError, ValidationError, etc.)
  - Error message dictionary lookups
  - Validation schema edge cases
- **Integration Tests Required:**
  - API contract tests against OpenAPI spec
  - Rate limiting behavior (burst and sustained)
  - Error response format consistency

**Epic 2: Authentication & Profile Depth**
- **Target Coverage:** 90% for auth flows (critical security)
- **Critical Paths:**
  - OAuth combined flow (Google + calendar in one consent)
  - OAuth combined flow (Microsoft + calendar in one consent)
  - Email whitelist validation
  - Magic link post-login calendar connection
  - Tag selection and taxonomy management
- **Unit Tests Required:**
  - Tag normalization logic (lowercase_snake_case)
  - Avatar cropping metadata calculations
  - Profile validation rules
- **Integration Tests Required:**
  - OAuth callback handling with calendar tokens
  - Email whitelist enforcement (reject unauthorized)
  - Tag approval workflow
  - Profile update with tag changes
- **E2E Tests Required:**
  - Complete OAuth signup with calendar connection
  - Profile editing with tag selection

**Epic 3: Calendar Integration**
- **Target Coverage:** 85% for calendar providers
- **Focus Areas:**
  - `ICalendarProvider` interface implementations
  - Google Calendar provider (OAuth, conflict check, event creation)
  - Microsoft Outlook provider (OAuth, conflict check, event creation)
  - Google Meet link generation
  - Token refresh logic
- **Unit Tests Required:**
  - Calendar event parsing/formatting
  - Conflict detection algorithms
  - Token expiration handling
- **Integration Tests Required:**
  - Mock calendar API responses
  - Conflict check before booking
  - Event creation on successful booking
  - Calendar disconnection (preserve existing bookings)
- **E2E Tests Required:**
  - Connect calendar post-login
  - Book meeting with automatic calendar event

**Epic 4: Availability & Booking Depth**
- **Target Coverage:** 85% for booking logic
- **Critical Paths:**
  - Recurring availability (weekly, monthly, quarterly)
  - Slot generation (30-day rolling window)
  - Booking cancellation (within 2hrs = responsiveness penalty)
  - Late cancellation detection
  - Real-time slot updates via Supabase Realtime
- **Unit Tests Required:**
  - Slot generation for recurrence patterns
  - Buffer time calculations
  - Cancellation eligibility logic
- **Integration Tests Required:**
  - Availability block CRUD
  - Slot generation on availability save
  - Booking with calendar conflict check
  - Cancellation cascade (update reputation)
- **E2E Tests Required:**
  - Mentor creates recurring availability
  - Mentee books and cancels meeting

**Epic 5: Airtable Integration**
- **Target Coverage:** 80% for sync logic
- **Focus Areas:**
  - Webhook signature validation
  - Field mapping (Airtable → Supabase)
  - Tag normalization and sync
  - Taxonomy sync
  - User deletion handling (soft delete + cascade)
- **Unit Tests Required:**
  - Field mapping transformations
  - Tag normalization (spaces → underscores)
  - Role enum mapping (case-insensitive)
- **Integration Tests Required:**
  - Webhook payload processing
  - Idempotent upsert (same record twice)
  - User deletion cascade (cancel future meetings)
  - Unrecognized column handling (log warning, continue)
- **E2E Tests Required:**
  - Simulate Airtable webhook → verify sync

**Epic 6: Matching & Discovery**
- **Target Coverage:** 85% for matching algorithms
- **Focus Areas:**
  - `IMatchingEngine` interface
  - Tag-based matching algorithm
  - Match score calculations
  - Match explanation generation
  - Mentor/mentee directory filtering
- **Unit Tests Required:**
  - Tag overlap scoring (60% weight)
  - Stage compatibility (20% weight)
  - Reputation tier compatibility (20% weight)
  - Match explanation formatting
- **Integration Tests Required:**
  - Find mentors with filters (tags, tier, dormancy)
  - Match score calculation with real data
  - Personalized recommendations
- **E2E Tests Required:**
  - Mentee searches mentors with filters
  - Mentor sends meeting interest (auto-creates override if needed)

**Epic 7: Reputation & Ratings**
- **Target Coverage:** 95% for reputation calculator (business-critical)
- **Focus Areas:**
  - `IReputationCalculator` interface
  - Reputation score formula (rating × completion × responsiveness + tenure)
  - Probationary clamp (< 3 ratings, min 3.5)
  - Tier assignment (Bronze/Silver/Gold/Platinum)
  - Booking limits enforcement
  - Tier restriction checks
  - Override request workflow
- **Unit Tests Required:**
  - Score calculation with all edge cases:
    - New user (< 3 ratings, score < 3.5) → clamped to 3.5
    - New user (< 3 ratings, score > 3.5) → not clamped
    - Established user (≥ 3 ratings) → calculated score
  - Responsiveness factor calculation (1.2× / 1.0× / 0.8×)
  - Tenure bonus (0.1/month, max 1.0)
  - Tier determination for boundary values (3.0, 4.0, 4.5)
  - Booking limit by tier (2/5/10/unlimited)
- **Integration Tests Required:**
  - Rating submission (mutual requirement)
  - Reputation recalculation trigger (after rating)
  - Tier-based booking limit enforcement
  - Tier restriction check (Bronze cannot book Gold/Platinum)
  - Override request creation and approval
  - Override expiration (7 days)
- **E2E Tests Required:**
  - Complete booking → rate session → see updated reputation
  - Attempt booking above tier → request override → coordinator approves

**Epic 8: Admin & Coordinator Tools**
- **Target Coverage:** 80% for admin operations
- **Focus Areas:**
  - User management (manual reputation override, user deactivation)
  - Override request dashboard
  - Tag approval workflow
  - White-glove scheduling (bypass tier restrictions)
  - Audit logging
- **Unit Tests Required:**
  - Reputation override validation
  - Audit log entry formatting
- **Integration Tests Required:**
  - Manual reputation score override
  - Tag approval (user_request → approved)
  - Override request approval/denial
  - White-glove booking creation
  - Audit log retrieval
- **E2E Tests Required:**
  - Coordinator approves tier override request
  - Coordinator approves new taxonomy tag

---

**Test Coverage Summary Table:**

| Epic | Coverage Target | Critical Focus | Test Priorities |
|------|----------------|----------------|-----------------|
| Epic 0 | 80% | Booking flow | E2E journey, race conditions |
| Epic 1 | 85% | Infrastructure | Error handling, validation |
| Epic 2 | 90% | Auth security | OAuth flows, whitelist |
| Epic 3 | 85% | Calendar integration | Provider interfaces, conflict check |
| Epic 4 | 85% | Booking logic | Recurrence, cancellation |
| Epic 5 | 80% | Airtable sync | Webhook, field mapping |
| Epic 6 | 85% | Matching | Algorithm accuracy |
| Epic 7 | 95% | Reputation | Formula correctness, edge cases |
| Epic 8 | 80% | Admin tools | Override workflows |

---



**Section 13 Complete.** This testing strategy provides:
- ✅ Comprehensive testing philosophy and pyramid
- ✅ Unit testing with Vitest for utilities, services, and components
- ✅ Integration testing for API endpoints and database operations
- ✅ End-to-end testing with Playwright for user journeys
- ✅ API contract testing with OpenAPI validation
- ✅ Test utilities, factories, and mock data
- ✅ Testing best practices and patterns
- ✅ CI/CD integration workflows
- ✅ Test coverage goals and metrics


## 14. Coding Standards

This section defines the coding standards, conventions, and best practices for the CF Office Hours platform. Consistent code style improves readability, maintainability, and collaboration across the development team.

### 14.1 General Principles

**Core Values:**
- **Readability over cleverness** - Write code that's easy to understand
- **Consistency over perfection** - Follow established patterns
- **Explicit over implicit** - Make intentions clear
- **Type safety first** - Leverage TypeScript's type system
- **Fail fast** - Validate early, provide clear error messages

**Code Review Standards:**
- All code changes require PR approval
- PRs should be focused and reviewable (<400 lines changed)
- Self-review before requesting review
- Address all feedback before merging

---

### 14.2 TypeScript Standards

**Type Annotations:**

```typescript
// ✅ Good: Explicit return types for public functions
export const calculateReputationScore = (userId: string): Promise<ReputationScore> => {
  // implementation
};

// ✅ Good: Type parameters for generics
const fetchData = async <T>(endpoint: string): Promise<T> => {
  // implementation
};

// ❌ Avoid: Implicit return types for public functions
export const calculateReputationScore = (userId: string) => {
  // unclear what this returns
};

// ❌ Avoid: Using `any`
const processData = (data: any) => {
  // loses type safety
};
```

**Type Definitions:**

```typescript
// ✅ Good: Interface for object shapes
interface IUserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

// ✅ Good: Type for unions, primitives, or computed types
type ReputationTier = 'bronze' | 'silver' | 'gold' | 'platinum';
type UserRole = 'mentee' | 'mentor' | 'coordinator';

// ✅ Good: Props interface with I prefix
interface IButtonProps {
  variant: 'primary' | 'secondary' | 'destructive';
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}
```

**Utility Types:**

```typescript
// Use built-in utility types where appropriate
type PartialUser = Partial<IUser>;
type ReadonlyUser = Readonly<IUser>;
type UserWithoutEmail = Omit<IUser, 'email'>;
type UserIdAndName = Pick<IUser, 'id' | 'name'>;
```

**Type Guards:**

```typescript
// ✅ Good: Type guards for runtime checks
const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
```

---

### 14.3 File Size & Atomicity

**File Length Guidelines:**

```typescript
// ✅ Good: Focused, single-purpose files
// src/services/reputation-calculator.ts (~150 lines)
export class ReputationCalculator {
  calculateScore(userId: string): Promise<IReputationScore> {
    // Implementation
  }
}

// ❌ Avoid: Large, multi-purpose files
// src/services/booking-service.ts (~800 lines)
// Should be split into: booking-service.ts, booking-validator.ts, booking-notifier.ts, etc.
```

**Guidelines:**
- **Target:** <200 lines of code per file (excluding comments, imports, blank lines)
- **Hard Limit:** Files exceeding 200 lines should be evaluated for refactoring
- **Atomicity:** Each file should have a single, clear responsibility
- **Exceptions:** Complex components or services may exceed 200 lines if they're cohesive and refactoring would reduce clarity

**Refactoring Strategies:**

```typescript
// Before: Large service file (~400 lines)
// src/services/booking-service.ts
export class BookingService {
  async createBooking() { /* 100 lines */ }
  async validateBooking() { /* 80 lines */ }
  async sendNotifications() { /* 60 lines */ }
  async updateCalendar() { /* 80 lines */ }
  // ... more methods
}

// After: Split into focused files
// src/services/booking/booking-service.ts (~120 lines)
// src/services/booking/booking-validator.ts (~80 lines)
// src/services/booking/booking-notifier.ts (~60 lines)
// src/services/booking/calendar-updater.ts (~80 lines)
```

**When to Split:**
- Multiple unrelated responsibilities in one file
- Difficulty naming the file (indicates multiple purposes)
- Frequent merge conflicts (indicates too much activity in one file)
- Hard to understand or navigate
- Many private helper functions (extract to separate utility file)

---

### 14.4 File Organization & Naming

**File Naming Conventions:**

| File Type | Convention | Example |
|-----------|------------|---------|
| React Components | PascalCase.tsx | `UserAvatar.tsx`, `BookingCard.tsx` |
| Hooks | camelCase.ts (prefix: use) | `useAuth.ts`, `useBookings.ts` |
| Utilities | kebab-case.ts | `date-utils.ts`, `string-helpers.ts` |
| Services | kebab-case.ts | `booking-service.ts`, `reputation-calculator.ts` |
| Types | kebab-case.ts | `booking-types.ts`, `user-types.ts` |
| Tests | matches source + .test | `booking-service.test.ts`, `UserAvatar.test.tsx` |
| Constants | kebab-case.ts or SCREAMING_SNAKE_CASE.ts | `api-constants.ts`, `APP_CONFIG.ts` |

**Directory Structure (Frontend):**

```
src/
├── components/          # Reusable UI components
│   ├── common/          # Shared components (Button, Input, etc.)
│   ├── booking/         # Booking-specific components
│   ├── profile/         # Profile-specific components
│   └── layout/          # Layout components (Header, Nav, etc.)
├── features/            # Feature-based modules
│   ├── auth/            # Authentication feature
│   ├── bookings/        # Booking feature
│   └── profiles/        # Profile feature
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions, API clients
├── pages/               # Route components
├── types/               # TypeScript type definitions
├── styles/              # Global styles, theme
└── config/              # Configuration files

```

**Directory Structure (Backend):**

```
src/
├── routes/              # API route handlers
├── services/            # Business logic layer
├── repositories/        # Data access layer
├── providers/           # External service providers (calendar, matching, etc.)
├── middleware/          # Hono middleware
├── lib/                 # Utility functions
├── types/               # TypeScript type definitions
├── schemas/             # Zod validation schemas
└── config/              # Configuration files
```

**Import Aliases:**

Configure TypeScript path aliases for cleaner imports:

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/components/*": ["./src/components/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"],
      "@/features/*": ["./src/features/*"]
    }
  }
}
```

---

### 14.5 Import Order & Organization

**Import Grouping (with section headers):**

```typescript
// External dependencies
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

// Internal modules
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { BookingCard } from '@/components/booking/BookingCard';

// Types
import type { IBooking } from '@/types/booking-types';
import type { IUser } from '@/types/user-types';

// Styles
import './BookingList.css';
```

**Import Rules:**
1. Group imports with blank lines and comments
2. Sort alphabetically within each group
3. Prefer named imports over default imports for tree-shaking
4. Avoid relative imports beyond one level (use aliases instead)

```typescript
// ❌ Avoid: Deep relative imports
import { Button } from '../../../components/common/Button';

// ✅ Good: Use path aliases
import { Button } from '@/components/common/Button';
```

---

### 14.6 Naming Conventions

**Variables & Functions:**

```typescript
// ✅ Good: Descriptive, camelCase
const bookingCount = 10;
const isUserActive = true;
const fetchUserProfile = async (userId: string): Promise<IUserProfile> => { /* ... */ };

// ❌ Avoid: Abbreviations, unclear names
const cnt = 10;
const flg = true;
const getData = async (id: string) => { /* ... */ };
```

**Constants:**

```typescript
// ✅ Good: SCREAMING_SNAKE_CASE for true constants
const MAX_BOOKING_LIMIT = 10;
const API_BASE_URL = 'https://api.officehours.youcanjustdothings.io';

// ✅ Good: camelCase for config objects
const appConfig = {
  maxBookingLimit: 10,
  apiBaseUrl: 'https://api.officehours.youcanjustdothings.io',
} as const;
```

**React Components:**

```typescript
// ✅ Good: PascalCase, descriptive names
export const UserProfileCard = ({ user }: IUserProfileCardProps) => {
  // implementation
};

// ✅ Good: Component file matches component name
// File: UserProfileCard.tsx
```

**Custom Hooks:**

```typescript
// ✅ Good: Always prefix with 'use', camelCase
export const useBookings = () => {
  // hook logic
};

export const useAuth = () => {
  // hook logic
};

// ❌ Avoid: Missing 'use' prefix
export const getBookings = () => {
  // this looks like a regular function, not a hook
};
```

**Interfaces & Types:**

```typescript
// ✅ Good: I prefix for interfaces
interface IUser {
  id: string;
  name: string;
}

interface IButtonProps {
  onClick: () => void;
  children: React.ReactNode;
}

// ✅ Good: Type for unions, aliases
type UserRole = 'mentee' | 'mentor' | 'coordinator';
type AsyncResult<T> = Promise<T | null>;

// ✅ Good: Enum for related constants (use sparingly, prefer unions)
enum BookingStatus {
  Confirmed = 'confirmed',
  Completed = 'completed',
  Canceled = 'canceled',
}
```

**Boolean Variables:**

```typescript
// ✅ Good: Use is/has/can/should prefixes
const isLoading = false;
const hasPermission = true;
const canBookMentor = false;
const shouldShowBanner = true;

// ❌ Avoid: Unclear boolean names
const loading = false;
const permission = true;
```

**API Routes:**

```typescript
// ✅ Good: Lowercase, kebab-case, RESTful
GET  /api/bookings
POST /api/bookings
GET  /api/bookings/:id
PUT  /api/bookings/:id
DELETE /api/bookings/:id

GET  /api/tier-overrides/requests
POST /api/tier-overrides/:id/approve

// ❌ Avoid: camelCase, unclear structure
GET  /api/getBookings
POST /api/createBooking
```

---

### 14.7 Function Standards

**Function Declarations:**

```typescript
// ✅ Good: Arrow functions with explicit return types
export const calculateReputationScore = async (userId: string): Promise<number> => {
  // implementation
  return score;
};

// ✅ Good: Named function for React components
export function UserProfileCard({ user }: IUserProfileCardProps) {
  return <div>{user.name}</div>;
}

// ✅ Good: Named function for custom hooks
export function useBookings(userId: string) {
  const [bookings, setBookings] = useState<IBooking[]>([]);
  // hook logic
  return { bookings, refetch };
}

// ❌ Avoid: Missing return type for public functions
export const calculateReputationScore = async (userId: string) => {
  return score;
};
```

**Function Length:**
- Keep functions focused (single responsibility)
- Target: <50 lines per function
- If longer, consider extracting helper functions

**Function Parameters:**
- Max 3 parameters; use object destructuring for more
- Required parameters first, optional last

```typescript
// ✅ Good: Object destructuring for multiple params
interface ICreateBookingParams {
  mentorId: string;
  menteeId: string;
  timeSlotId: string;
  meetingGoal: string;
  materialsUrls?: string[];
}

const createBooking = async (params: ICreateBookingParams): Promise<IBooking> => {
  const { mentorId, menteeId, timeSlotId, meetingGoal, materialsUrls } = params;
  // implementation
};

// ❌ Avoid: Too many individual parameters
const createBooking = async (
  mentorId: string,
  menteeId: string,
  timeSlotId: string,
  meetingGoal: string,
  materialsUrls?: string[]
): Promise<IBooking> => {
  // hard to read, easy to mix up order
};
```

---

### 14.8 React Component Standards

**Component Structure:**

```typescript
// External dependencies
import React, { useState, useEffect } from 'react';

// Internal modules
import { Button } from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';

// Types
import type { IBooking } from '@/types/booking-types';

// Styles (if component-specific)
import './BookingCard.css';

/**
 * Displays a booking card with meeting details and actions.
 *
 * @param booking - The booking data to display
 * @param onCancel - Callback when cancel button is clicked
 */
interface IBookingCardProps {
  booking: IBooking;
  onCancel?: (bookingId: string) => void;
}

export function BookingCard({ booking, onCancel }: IBookingCardProps) {
  // 1. Hooks (useState, useEffect, custom hooks)
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  // 2. Effects
  useEffect(() => {
    // side effects
  }, [booking.id]);

  // 3. Event handlers
  const handleCancel = () => {
    if (onCancel) {
      onCancel(booking.id);
    }
  };

  // 4. Render logic
  const canCancel = user.id === booking.menteeId || user.id === booking.mentorId;

  // 5. Return JSX
  return (
    <div className="booking-card">
      {/* component content */}
    </div>
  );
}
```

**Component Exports:**

```typescript
// ✅ Good: Named exports for components (better for tree-shaking, refactoring)
export function UserAvatar({ url, name }: IUserAvatarProps) {
  // implementation
}

// ✅ Good: Default export for pages/routes
export default function BookingsPage() {
  // implementation
}
```

**Props Destructuring:**

```typescript
// ✅ Good: Destructure props in function signature
export function Button({ variant, onClick, children, disabled = false }: IButtonProps) {
  // implementation
}

// ❌ Avoid: Using props object directly
export function Button(props: IButtonProps) {
  return <button onClick={props.onClick}>{props.children}</button>;
}
```

**Conditional Rendering:**

```typescript
// ✅ Good: Early returns for simple conditions
if (!user) {
  return <div>Loading...</div>;
}

// ✅ Good: Ternary for simple inline conditions
{isLoading ? <Spinner /> : <Content />}

// ✅ Good: Logical AND for conditional rendering
{hasError && <ErrorMessage error={error} />}

// ❌ Avoid: Complex nested ternaries
{isLoading ? <Spinner /> : hasError ? <Error /> : hasData ? <Content /> : <Empty />}

// ✅ Better: Extract to variable or early returns
const renderContent = () => {
  if (isLoading) return <Spinner />;
  if (hasError) return <Error />;
  if (!hasData) return <Empty />;
  return <Content />;
};
```

---

### 14.9 Documentation Standards

**JSDoc Comments (Required for Public Functions):**

```typescript
/**
 * Calculates the reputation score for a user based on ratings, completion rate,
 * responsiveness, and tenure.
 *
 * @param userId - The unique identifier of the user
 * @returns A promise that resolves to the calculated reputation score with breakdown
 * @throws {AppError} If user is not found or calculation fails
 *
 * @example
 * ```typescript
 * const score = await calculateReputationScore('user-123');
 * console.log(score.score); // 4.2
 * console.log(score.tier); // 'gold'
 * ```
 */
export const calculateReputationScore = async (userId: string): Promise<IReputationScore> => {
  // implementation
};
```

**Inline Comments (Minimal, for Complex Logic Only):**

```typescript
// ✅ Good: Explain WHY, not WHAT
const calculateReputationScore = async (userId: string): Promise<number> => {
  const ratings = await fetchRatings(userId);
  const averageRating = calculateAverage(ratings);

  // Probationary clamp: New users with <3 ratings cannot drop below 3.5 (per FR48)
  if (ratings.length < 3 && rawScore < 3.5) {
    return 3.5;
  }

  return rawScore;
};

// ❌ Avoid: Stating the obvious
const totalCount = bookings.length; // Get the length of bookings array
if (totalCount > 0) { // Check if totalCount is greater than 0
  // process bookings
}
```

**Component Documentation:**

```typescript
/**
 * Displays a user's reputation score with visual breakdown.
 *
 * Shows the overall score, tier badge, and detailed breakdown of contributing factors:
 * - Average rating from peer reviews
 * - Completion rate (percentage of attended sessions)
 * - Responsiveness factor (booking/cancellation behavior)
 * - Tenure bonus (longevity on platform)
 *
 * @param userId - The user whose reputation to display
 * @param showBreakdown - Whether to show the detailed breakdown (default: true)
 */
interface IReputationDisplayProps {
  userId: string;
  showBreakdown?: boolean;
}

export function ReputationDisplay({ userId, showBreakdown = true }: IReputationDisplayProps) {
  // implementation
}
```

**README Documentation:**
- Every feature module should have a README.md
- Document:
  - Purpose and overview
  - Key files and their roles
  - External dependencies
  - Configuration requirements
  - Testing approach

---

### 14.10 Error Handling Standards

**Error Throwing:**

```typescript
// ✅ Good: Use custom AppError with codes
throw new AppError(404, 'User not found', 'USER_NOT_FOUND');

// ✅ Good: Validate early, fail fast
const createBooking = async (params: ICreateBookingParams): Promise<IBooking> => {
  if (!params.mentorId) {
    throw new AppError(400, 'Mentor ID is required', 'MISSING_MENTOR_ID');
  }

  // continue with logic
};

// ❌ Avoid: Throwing strings
throw 'User not found';

// ❌ Avoid: Silent failures
const user = await fetchUser(userId);
if (!user) {
  return null; // caller won't know what went wrong
}
```

**Try-Catch Usage:**

```typescript
// ✅ Good: Catch at the right level, add context
const fetchUserProfile = async (userId: string): Promise<IUserProfile> => {
  try {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user profile:', { userId, error });
    throw new AppError(500, 'Failed to load user profile', 'PROFILE_FETCH_ERROR');
  }
};

// ❌ Avoid: Swallowing errors
try {
  await riskyOperation();
} catch (error) {
  // silent failure
}

// ❌ Avoid: Catching too broadly
try {
  const user = await fetchUser(userId);
  const bookings = await fetchBookings(userId);
  const ratings = await fetchRatings(userId);
  // which one failed?
} catch (error) {
  toast.error('Something went wrong');
}
```

---

### 14.11 Testing Standards

**Test File Naming:**
- Match source file: `booking-service.ts` → `booking-service.test.ts`
- Place tests next to source (preferred) or mirror structure in `__tests__/`

**Test Structure:**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateReputationScore } from './reputation-calculator';

describe('calculateReputationScore', () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks();
  });

  it('should calculate correct score for new user with probationary clamp', async () => {
    // Arrange
    const userId = 'user-123';
    const mockRatings = [
      { score: 2, raterId: 'user-1' },
      { score: 3, raterId: 'user-2' },
    ];

    // Act
    const result = await calculateReputationScore(userId);

    // Assert
    expect(result.score).toBe(3.5); // Probationary clamp applied
    expect(result.breakdown.isProbationary).toBe(true);
  });

  it('should throw AppError when user not found', async () => {
    // Arrange
    const userId = 'nonexistent';

    // Act & Assert
    await expect(calculateReputationScore(userId)).rejects.toThrow('User not found');
  });
});
```

**Test Coverage Goals:**
- **Unit Tests**: 80%+ coverage for business logic (services, utilities, calculators)
- **Integration Tests**: Critical API endpoints, database operations
- **E2E Tests**: Key user journeys (booking flow, tier override)
- **Component Tests**: Complex stateful components, forms

**What to Test:**
- ✅ Business logic (reputation calculation, matching algorithms)
- ✅ API contracts (request/response validation)
- ✅ Error handling paths
- ✅ Edge cases (empty states, boundary values)
- ❌ Don't test: Implementation details, third-party libraries, trivial getters/setters

---

### 14.12 Performance Best Practices

**Frontend:**

```typescript
// ✅ Good: Memoize expensive calculations
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(data);
}, [data]);

// ✅ Good: Memoize callbacks passed to children
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// ✅ Good: Lazy load route components
const BookingsPage = lazy(() => import('./pages/BookingsPage'));

// ❌ Avoid: Creating objects/functions in render
function MyComponent() {
  return <Child onClick={() => console.log('clicked')} />; // New function every render
}
```

**Backend:**

```typescript
// ✅ Good: Use database indexes for common queries
// In migration:
CREATE INDEX idx_bookings_mentee_id ON bookings(mentee_id);
CREATE INDEX idx_time_slots_mentor_start ON time_slots(mentor_id, start_time);

// ✅ Good: Batch database operations
const users = await db.from('users').select('*').in('id', userIds);

// ❌ Avoid: N+1 queries
for (const booking of bookings) {
  const user = await db.from('users').select('*').eq('id', booking.userId).single();
}
```

---

### 14.13 Security Best Practices

**Input Validation:**

```typescript
// ✅ Good: Validate all inputs with Zod
const CreateBookingSchema = z.object({
  mentorId: z.string().uuid(),
  timeSlotId: z.string().uuid(),
  meetingGoal: z.string().min(10).max(1000),
});

// ✅ Good: Sanitize user input before rendering
import DOMPurify from 'dompurify';
const sanitizedContent = DOMPurify.sanitize(userInput);
```

**Authentication & Authorization:**

```typescript
// ✅ Good: Check auth on every protected endpoint
app.get('/api/bookings/:id', requireAuth, async (c) => {
  const user = c.get('user');
  // implementation
});

// ✅ Good: Validate user can access resource
const booking = await getBooking(bookingId);
if (booking.menteeId !== user.id && booking.mentorId !== user.id && user.role !== 'coordinator') {
  throw new AppError(403, 'Insufficient permissions', 'FORBIDDEN');
}
```

**Environment Variables:**

```typescript
// ✅ Good: Validate environment variables at startup
const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(32),
});

const env = envSchema.parse(process.env);

// ❌ Avoid: Using process.env directly without validation
const supabaseUrl = process.env.SUPABASE_URL; // Could be undefined
```

---

### 14.14 Accessibility Standards

**Semantic HTML:**

```tsx
// ✅ Good: Use semantic HTML elements
<nav>
  <ul>
    <li><a href="/bookings">My Bookings</a></li>
  </ul>
</nav>

<main>
  <article>
    <h1>Booking Details</h1>
  </article>
</main>

// ❌ Avoid: Divs for everything
<div className="nav">
  <div className="link">My Bookings</div>
</div>
```

**ARIA Labels:**

```tsx
// ✅ Good: Add labels for screen readers
<button
  aria-label="Cancel booking with John Doe on March 15"
  onClick={handleCancel}
>
  <X /> {/* Icon only */}
</button>

// ✅ Good: Use aria-describedby for additional context
<input
  id="meeting-goal"
  aria-describedby="meeting-goal-help"
/>
<p id="meeting-goal-help">Describe what you'd like to discuss (min 10 characters)</p>
```

**Keyboard Navigation:**

```tsx
// ✅ Good: Ensure all interactive elements are keyboard accessible
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Click me
</div>
```

---

### 14.15 Git Commit Standards

**Commit Message Format:**

```
type(scope): summary

Description (optional)

- Additional details
- Related changes

Refs: #issue-number
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style/formatting (no functional changes)
- `refactor`: Code refactoring (no functional changes)
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates

**Examples:**

```
feat(booking): add real-time slot availability updates

Implement Supabase Realtime subscription for time_slots table.
Slots now disappear immediately when booked by another user.

- Add useRealtimeSlots hook
- Update SlotPicker component to subscribe to changes
- Add toast notification for concurrent booking attempts

Refs: #42

---

fix(reputation): apply probationary clamp for new users

New users with <3 ratings cannot drop below 3.5 score.

Refs: #67

---

refactor(api): extract auth middleware to separate module

- Move requireAuth to middleware/auth.ts
- Add requireRole helper for RBAC
- Update all routes to use new middleware

Refs: #89
```

**Commit Best Practices:**
- Commit often (logical chunks of work)
- Write clear, descriptive messages
- Reference related issues/PRs
- Keep commits focused (one concern per commit)
- Use present tense ("add feature" not "added feature")

---

### 14.16 Code Review Checklist

**Before Submitting PR:**
- [ ] Code follows style guide and conventions
- [ ] All tests pass locally
- [ ] No linter errors or warnings
- [ ] TypeScript compiles without errors
- [ ] Added/updated tests for new functionality
- [ ] Updated relevant documentation
- [ ] Self-reviewed code for obvious issues
- [ ] Checked for sensitive data (no secrets committed)

**For Reviewers:**
- [ ] Code is readable and maintainable
- [ ] Logic is sound and follows requirements
- [ ] Edge cases are handled
- [ ] Error handling is appropriate
- [ ] Tests are comprehensive
- [ ] No security vulnerabilities introduced
- [ ] Performance considerations addressed
- [ ] Breaking changes are documented

---

**Section 14 Complete.** This coding standards guide provides:
- ✅ TypeScript standards (types, interfaces, utility types)
- ✅ File size guidelines (<200 lines of code per file, atomicity principles)
- ✅ File organization and naming conventions
- ✅ Import order with section headers
- ✅ Function and component standards
- ✅ Documentation requirements (JSDoc, inline comments)
- ✅ Error handling patterns
- ✅ Testing standards and coverage goals
- ✅ Performance best practices
- ✅ Security best practices
- ✅ Accessibility standards
- ✅ Git commit conventions
- ✅ Code review checklist


## 15. Error Handling Strategy

This section defines the comprehensive error handling strategy for the CF Office Hours platform, covering frontend error boundaries, backend error handling, logging practices, and user-facing error messages.

### 15.1 Error Handling Philosophy

**Core Principles:**
- **Centralized handling** - Consistent error processing across the application
- **User-friendly messages** - Avoid technical jargon, provide actionable guidance
- **Fail gracefully** - Degrade functionality rather than crash
- **Log comprehensively** - Capture context for debugging (dev/staging only by default)
- **Explicit over silent** - Surface errors clearly, never swallow them

**Error Categories:**
1. **User Errors** - Validation failures, permission issues (400s)
2. **System Errors** - Server failures, database issues (500s)
3. **External Errors** - Third-party API failures (calendar, Airtable)
4. **Network Errors** - Connectivity issues, timeouts

---

### 15.2 Frontend Error Handling

#### 15.2.1 Error Boundary Strategy

**Global Error Boundary:**

Catches all unhandled React errors across the entire application.

```typescript
// src/components/ErrorBoundary.tsx

// External dependencies
import React, { Component, ErrorInfo, ReactNode } from 'react';

// Internal modules
import { logger } from '@/lib/logger';
import { ErrorFallback } from '@/components/ErrorFallback';

// Types
interface IErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface IErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global error boundary that catches all unhandled React errors.
 * Displays a fallback UI and logs errors for debugging.
 */
export class ErrorBoundary extends Component<IErrorBoundaryProps, IErrorBoundaryState> {
  constructor(props: IErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): IErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('React Error Boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}
```

**Feature-Level Error Boundary (Booking Flow):**

Provides better UX for the critical booking flow by isolating errors.

```typescript
// src/features/bookings/BookingErrorBoundary.tsx

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/lib/toast';

/**
 * Error boundary for the booking flow.
 * Provides booking-specific error handling and recovery.
 */
export function BookingErrorBoundary({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const handleError = (error: Error) => {
    toast.error('Something went wrong with your booking. Please try again.');
    logger.error('Booking flow error:', { error: error.message });
  };

  const handleReset = () => {
    navigate('/bookings');
  };

  return (
    <ErrorBoundary
      onError={handleError}
      fallback={
        <div className="error-container">
          <h2>Booking Error</h2>
          <p>We encountered an issue processing your booking.</p>
          <button onClick={handleReset}>Return to Bookings</button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
```

**Error Fallback Component:**

```typescript
// src/components/ErrorFallback.tsx

interface IErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

export function ErrorFallback({ error, onReset }: IErrorFallbackProps) {
  return (
    <div className="error-fallback">
      <div className="error-content">
        <h1>Something went wrong</h1>
        <p>We're sorry, but something unexpected happened.</p>

        {import.meta.env.DEV && error && (
          <details className="error-details">
            <summary>Error Details (Dev Only)</summary>
            <pre>{error.message}</pre>
            <pre>{error.stack}</pre>
          </details>
        )}

        <div className="error-actions">
          <button onClick={onReset}>Try Again</button>
          <button onClick={() => window.location.href = '/'}>
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

#### 15.2.2 API Client Error Handling

**Centralized API Client:**

```typescript
// src/lib/api-client.ts

// External dependencies
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

// Internal modules
import { logger } from '@/lib/logger';
import { toast } from '@/lib/toast';
import { getErrorMessage } from '@/lib/error-messages';

// Types
import type { IApiError } from '@/types/api-types';

/**
 * Centralized API client with consistent error handling and user feedback.
 */
class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor: Add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor: Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<IApiError>) => {
        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  private handleError(error: AxiosError<IApiError>): void {
    const status = error.response?.status;
    const errorCode = error.response?.data?.error?.code;
    const errorMessage = error.response?.data?.error?.message;

    logger.error('API Error:', {
      status,
      errorCode,
      message: errorMessage,
      url: error.config?.url,
    });

    // Handle specific status codes
    switch (status) {
      case 401:
        // Session expired
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        break;

      case 403:
        // Forbidden
        const forbiddenMessage = getErrorMessage(errorCode, 'You do not have permission to perform this action.');
        toast.error(forbiddenMessage);
        break;

      case 404:
        // Not found
        const notFoundMessage = getErrorMessage(errorCode, 'Resource not found.');
        toast.error(notFoundMessage);
        break;

      case 409:
        // Conflict (e.g., slot already booked, tier restriction)
        const conflictMessage = getErrorMessage(errorCode, errorMessage || 'A conflict occurred.');
        toast.error(conflictMessage);
        break;

      case 422:
        // Validation error
        const validationMessage = getErrorMessage(errorCode, errorMessage || 'Please check your input and try again.');
        toast.error(validationMessage);
        break;

      case 500:
      case 502:
      case 503:
        // Server errors
        toast.error('Server error. Please try again later.');
        break;

      default:
        // Generic error
        if (error.message === 'Network Error') {
          toast.error('Network error. Please check your connection.');
        } else {
          const genericMessage = getErrorMessage(errorCode, 'An unexpected error occurred.');
          toast.error(genericMessage);
        }
    }
  }

  /**
   * Performs a GET request.
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  /**
   * Performs a POST request.
   */
  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  /**
   * Performs a PUT request.
   */
  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  /**
   * Performs a DELETE request.
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
```

---

#### 15.2.3 Error Message Dictionary

**Centralized Error Messages:**

```typescript
// src/lib/error-messages.ts

/**
 * Centralized error message dictionary.
 * Maps error codes to user-friendly messages.
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Authentication & Authorization
  UNAUTHORIZED: 'You need to be logged in to perform this action.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  EMAIL_NOT_WHITELISTED: 'Your email is not authorized. Please contact an administrator for access.',

  // User & Profile
  USER_NOT_FOUND: 'User not found.',
  PROFILE_NOT_FOUND: 'Profile not found.',
  PROFILE_FETCH_ERROR: 'Failed to load user profile. Please try again.',

  // Bookings
  BOOKING_NOT_FOUND: 'Booking not found.',
  SLOT_UNAVAILABLE: 'This time slot is no longer available. Please select another slot.',
  SLOT_ALREADY_BOOKED: 'This slot was just booked by another user. Please select another slot.',
  CALENDAR_CONFLICT: 'You have a conflicting event on your calendar at this time.',
  BOOKING_LIMIT_REACHED: 'You have reached your weekly booking limit for your tier.',
  CALENDAR_CONNECTION_REQUIRED: 'Please connect your calendar to book meetings.',
  BOOKING_TOO_SOON: 'Bookings must be made at least 1 day in advance.',

  // Reputation & Tiers
  TIER_RESTRICTION: 'This mentor requires a higher reputation tier. You can request an exception.',
  DORMANT_USER: 'This user is currently inactive. Please contact a coordinator for assistance.',

  // Availability
  AVAILABILITY_NOT_FOUND: 'Availability block not found.',
  AVAILABILITY_HAS_BOOKINGS: 'Cannot delete availability with confirmed bookings. Cancel the bookings first.',

  // Tier Overrides
  OVERRIDE_REQUEST_NOT_FOUND: 'Override request not found.',
  OVERRIDE_ALREADY_USED: 'This override has already been used.',
  OVERRIDE_EXPIRED: 'This override request has expired.',

  // Calendar Integration
  CALENDAR_PROVIDER_ERROR: 'Failed to connect to your calendar provider. Please try again.',
  CALENDAR_TOKEN_EXPIRED: 'Your calendar connection has expired. Please reconnect.',

  // Airtable Sync
  AIRTABLE_SYNC_ERROR: 'Failed to sync data from Airtable.',

  // Validation
  VALIDATION_ERROR: 'Please check your input and try again.',
  MISSING_REQUIRED_FIELD: 'Please fill in all required fields.',

  // Generic
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again later.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
};

/**
 * Gets a user-friendly error message for a given error code.
 *
 * @param errorCode - The error code from the API
 * @param fallback - Fallback message if error code not found
 * @returns User-friendly error message
 */
export const getErrorMessage = (
  errorCode: string | undefined,
  fallback: string = ERROR_MESSAGES.INTERNAL_ERROR
): string => {
  if (!errorCode) {
    return fallback;
  }

  return ERROR_MESSAGES[errorCode] || fallback;
};

/**
 * Gets multiple error messages for validation errors.
 *
 * @param errors - Array of error codes
 * @returns Array of user-friendly error messages
 */
export const getErrorMessages = (errors: string[]): string[] => {
  return errors.map((code) => getErrorMessage(code));
};
```

---

### 15.3 Backend Error Handling

#### 15.3.1 Custom Error Classes

```typescript
// src/lib/errors.ts

/**
 * Base application error class.
 * Use this for all application-specific errors.
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(401, message, 'UNAUTHORIZED');
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(403, message, 'FORBIDDEN');
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string, code?: string) {
    super(409, message, code || 'CONFLICT');
    this.name = 'ConflictError';
  }
}
```

---

#### 15.3.2 Error Handler Middleware

```typescript
// src/middleware/error-handler.ts

// External dependencies
import { Context } from 'hono';
import { ZodError } from 'zod';

// Internal modules
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
} from '@/lib/errors';
import { logger } from '@/lib/logger';

// Types
interface IErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

/**
 * Centralized error handler middleware for Hono.
 * Catches all errors and returns consistent JSON responses.
 */
export const errorHandler = (err: Error, c: Context): Response => {
  // Log error with context
  logger.error('API Error:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
  });

  // Handle AppError and subclasses
  if (err instanceof AppError) {
    const response: IErrorResponse = {
      error: {
        message: err.message,
        code: err.code,
        ...(err.details && { details: err.details }),
      },
    };
    return c.json(response, err.statusCode);
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const response: IErrorResponse = {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: err.errors,
      },
    };
    return c.json(response, 400);
  }

  // Handle Supabase/PostgreSQL errors
  if (err.message?.includes('duplicate key') || err.message?.includes('violates unique constraint')) {
    const response: IErrorResponse = {
      error: {
        message: 'A record with this information already exists',
        code: 'DUPLICATE_RECORD',
      },
    };
    return c.json(response, 409);
  }

  if (err.message?.includes('foreign key constraint')) {
    const response: IErrorResponse = {
      error: {
        message: 'Referenced resource does not exist',
        code: 'INVALID_REFERENCE',
      },
    };
    return c.json(response, 400);
  }

  // Generic error (don't expose internal details)
  const response: IErrorResponse = {
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  };
  return c.json(response, 500);
};
```

**Apply to Hono App:**

```typescript
// src/index.ts

import { Hono } from 'hono';
import { errorHandler } from '@/middleware/error-handler';

const app = new Hono();

// Apply error handler
app.onError(errorHandler);

// Routes...
```

---

#### 15.3.3 Error Usage in Routes

```typescript
// src/routes/bookings.ts

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { AppError, ConflictError, NotFoundError } from '@/lib/errors';
import { CreateBookingSchema } from '@/schemas/booking-schemas';

const bookingsRouter = new Hono();

bookingsRouter.post('/', zValidator('json', CreateBookingSchema), async (c) => {
  const user = c.get('user');
  const input = c.req.valid('json');

  // Validate slot availability
  const slot = await getSlot(input.timeSlotId);
  if (!slot) {
    throw new NotFoundError('Time slot');
  }

  if (slot.is_booked) {
    throw new ConflictError(
      'This slot is no longer available',
      'SLOT_UNAVAILABLE'
    );
  }

  // Check calendar conflicts
  const hasConflict = await calendarProvider.checkConflicts(
    user.id,
    slot.start_time,
    slot.end_time
  );

  if (hasConflict) {
    throw new ConflictError(
      'You have a conflicting event on your calendar',
      'CALENDAR_CONFLICT'
    );
  }

  // Check booking limits
  const weeklyBookings = await getWeeklyBookingCount(user.id);
  const bookingLimit = await getBookingLimit(user.id);

  if (weeklyBookings >= bookingLimit) {
    throw new AppError(
      403,
      'Weekly booking limit reached for your tier',
      'BOOKING_LIMIT_REACHED'
    );
  }

  // Create booking
  const booking = await createBooking({
    ...input,
    menteeId: user.id,
  });

  return c.json({ booking }, 201);
});

export { bookingsRouter };
```

---

### 15.4 Logging Strategy

#### 15.4.1 Logger Implementation

```typescript
// src/lib/logger.ts

/**
 * Centralized logger with environment-aware output.
 * Logs to console in development and staging.
 * Production logging can be toggled via environment variable.
 */
class Logger {
  private shouldLog: boolean;

  constructor() {
    // Log in dev/staging by default
    // Production logging controlled by ENABLE_LOGGING env var
    const env = import.meta.env.MODE || process.env.NODE_ENV;
    const enableLogging = import.meta.env.VITE_ENABLE_LOGGING || process.env.ENABLE_LOGGING;

    this.shouldLog = env !== 'production' || enableLogging === 'true';
  }

  /**
   * Logs an informational message.
   */
  info(message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog) return;

    console.log(`[INFO] ${message}`, meta || '');
  }

  /**
   * Logs a warning message.
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog) return;

    console.warn(`[WARN] ${message}`, meta || '');
  }

  /**
   * Logs an error message.
   */
  error(message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog) return;

    console.error(`[ERROR] ${message}`, meta || '');
  }

  /**
   * Logs a debug message (dev only).
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    const env = import.meta.env.MODE || process.env.NODE_ENV;
    if (env !== 'development') return;

    console.debug(`[DEBUG] ${message}`, meta || '');
  }
}

export const logger = new Logger();
```

---

#### 15.4.2 Logging Best Practices

**What to Log:**

```typescript
// ✅ Good: Log important events with context
logger.info('User created booking', {
  userId: user.id,
  bookingId: booking.id,
  mentorId: booking.mentorId,
  slotTime: booking.start_time,
});

// ✅ Good: Log errors with full context
logger.error('Failed to create calendar event', {
  userId: user.id,
  bookingId: booking.id,
  provider: user.calendarProvider,
  error: error.message,
  stack: error.stack,
});

// ✅ Good: Log external API failures
logger.warn('Airtable sync failed', {
  attempt: retryCount,
  error: error.message,
  recordsProcessed: successCount,
});

// ❌ Avoid: Logging sensitive data
logger.info('User logged in', {
  email: user.email,
  password: user.password, // Never log passwords!
  token: authToken, // Never log tokens!
});

// ❌ Avoid: Excessive logging in hot paths
for (const booking of bookings) {
  logger.debug('Processing booking', { booking }); // Too verbose
}
```

**Structured Logging:**

```typescript
// ✅ Good: Consistent log structure
logger.error('API request failed', {
  path: req.path,
  method: req.method,
  status: response.status,
  duration: Date.now() - startTime,
  userId: user?.id,
  error: error.message,
});
```

---

### 15.5 Async Error Handling

**Promise Error Handling:**

```typescript
// ✅ Good: Always handle promise rejections
const fetchUserData = async (userId: string): Promise<IUser> => {
  try {
    const user = await apiClient.get<IUser>(`/users/${userId}`);
    return user;
  } catch (error) {
    logger.error('Failed to fetch user data', { userId, error });
    throw new AppError(500, 'Failed to load user data', 'USER_FETCH_ERROR');
  }
};

// ✅ Good: Handle multiple async operations separately
const loadBookingData = async (bookingId: string) => {
  try {
    const booking = await fetchBooking(bookingId);
    const mentor = await fetchUser(booking.mentorId);
    const mentee = await fetchUser(booking.menteeId);

    return { booking, mentor, mentee };
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error; // Re-throw specific errors
    }
    logger.error('Failed to load booking data', { bookingId, error });
    throw new AppError(500, 'Failed to load booking details');
  }
};
```

**React Query Error Handling:**

```typescript
// src/hooks/useBookings.ts

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { logger } from '@/lib/logger';

export const useBookings = (userId: string) => {
  return useQuery({
    queryKey: ['bookings', userId],
    queryFn: async () => {
      try {
        return await apiClient.get<IBooking[]>(`/bookings?userId=${userId}`);
      } catch (error) {
        logger.error('Failed to fetch bookings', { userId, error });
        throw error; // React Query will handle error state
      }
    },
    retry: 2, // Retry failed requests
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Usage in component
function BookingsList() {
  const { data: bookings, isLoading, error } = useBookings(user.id);

  if (error) {
    return <ErrorMessage message="Failed to load bookings" />;
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return <BookingCards bookings={bookings} />;
}
```

---

### 15.6 Form Validation Error Handling

**React Hook Form + Zod:**

```typescript
// src/features/bookings/BookingForm.tsx

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const bookingFormSchema = z.object({
  meetingGoal: z.string().min(10, 'Meeting goal must be at least 10 characters'),
  materialsUrls: z.array(z.string().url('Invalid URL')).optional(),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

export function BookingForm({ slotId, onSubmit }: IBookingFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
  });

  const onSubmitForm = async (data: BookingFormData) => {
    try {
      await onSubmit({ ...data, slotId });
      toast.success('Booking confirmed!');
    } catch (error) {
      // API client handles error display via toast
      logger.error('Booking submission failed', { error });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)}>
      <div>
        <label htmlFor="meetingGoal">Meeting Goal</label>
        <textarea
          id="meetingGoal"
          {...register('meetingGoal')}
          aria-invalid={errors.meetingGoal ? 'true' : 'false'}
        />
        {errors.meetingGoal && (
          <p className="error-message">{errors.meetingGoal.message}</p>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Confirming...' : 'Confirm Booking'}
      </button>
    </form>
  );
}
```

---

### 15.7 External Service Error Handling

**Calendar Provider Errors:**

```typescript
// src/providers/google-calendar-provider.ts

export class GoogleCalendarProvider implements ICalendarProvider {
  async createEvent(input: ICreateEventInput): Promise<ICalendarEvent> {
    try {
      const response = await this.googleClient.calendar.events.insert({
        calendarId: 'primary',
        resource: this.formatEvent(input),
      });

      return this.parseEvent(response.data);
    } catch (error) {
      logger.error('Google Calendar API error', {
        error: error.message,
        status: error.response?.status,
        eventSummary: input.summary,
      });

      // Handle specific Google API errors
      if (error.response?.status === 401) {
        throw new AppError(
          401,
          'Calendar connection expired. Please reconnect.',
          'CALENDAR_TOKEN_EXPIRED'
        );
      }

      if (error.response?.status === 409) {
        throw new ConflictError(
          'Calendar event conflicts with existing event',
          'CALENDAR_CONFLICT'
        );
      }

      // Generic calendar error
      throw new AppError(
        500,
        'Failed to create calendar event',
        'CALENDAR_PROVIDER_ERROR'
      );
    }
  }
}
```

**Airtable Webhook Error Handling:**

```typescript
// src/routes/webhooks/airtable.ts

export const airtableWebhookHandler = async (c: Context) => {
  const payload = await c.req.json();

  // Log raw payload
  await logWebhookPayload(payload);

  try {
    // Fetch full table
    const users = await airtableClient.fetchUsersTable();

    // Process records
    const result = await syncUsersToDatabase(users);
    
    // Update last successful sync timestamp
    await updateLastSyncTimestamp(Date.now());

    return c.json({
      success: true,
      recordsProcessed: result.count,
      lastSync: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Airtable sync failed', {
      error: error.message,
      payload,
      lastSuccessfulSync: await getLastSyncTimestamp(),
    });

    // Don't throw - webhook should always return 200
    // (Airtable will retry on non-200 responses)
    return c.json({
      success: false,
      error: 'Sync failed',
    }, 200);
  }
};
```

**Airtable Fallback Strategy (Graceful Degradation):**

When Airtable webhooks fail or Airtable API is unavailable, the platform uses **cached user data** from the Supabase database to continue operations without interruption. This implements the graceful degradation requirement from NFR9.

```typescript
// apps/api/src/services/airtable.service.ts

export class AirtableService extends BaseService {
  private static readonly MAX_SYNC_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
  
  /**
   * Get users from cache (Supabase) if Airtable is unavailable
   * or if last sync is recent enough.
   */
  async getUsersWithFallback(): Promise<User[]> {
    const lastSync = await this.getLastSyncTimestamp();
    const syncAge = Date.now() - lastSync;
    
    // If last sync is recent, use cached data
    if (syncAge < AirtableService.MAX_SYNC_AGE_MS) {
      logger.info('Using cached user data from Supabase', {
        lastSync: new Date(lastSync).toISOString(),
        ageMinutes: Math.floor(syncAge / 1000 / 60),
      });
      
      return await this.userRepo.findAllActive();
    }
    
    // Try to sync from Airtable
    try {
      const users = await this.syncFromAirtable();
      await this.updateLastSyncTimestamp(Date.now());
      return users;
    } catch (error) {
      logger.warn('Airtable unavailable, falling back to cached data', {
        error: error.message,
        lastSync: new Date(lastSync).toISOString(),
        staleness: `${Math.floor(syncAge / 1000 / 60 / 60)} hours`,
      });
      
      // Fallback to cached data even if stale
      return await this.userRepo.findAllActive();
    }
  }
  
  /**
   * Check if we should alert about stale data.
   */
  async checkSyncHealth(): Promise<SyncHealthStatus> {
    const lastSync = await this.getLastSyncTimestamp();
    const syncAge = Date.now() - lastSync;
    const hoursStale = Math.floor(syncAge / 1000 / 60 / 60);
    
    if (hoursStale > 48) {
      return {
        status: 'critical',
        message: `Airtable sync stale for ${hoursStale} hours`,
        lastSync: new Date(lastSync).toISOString(),
        action: 'alert_coordinator',
      };
    } else if (hoursStale > 24) {
      return {
        status: 'warning',
        message: `Airtable sync stale for ${hoursStale} hours`,
        lastSync: new Date(lastSync).toISOString(),
        action: 'log_warning',
      };
    }
    
    return {
      status: 'healthy',
      message: 'Airtable sync up to date',
      lastSync: new Date(lastSync).toISOString(),
    };
  }
}
```

**Fallback Behavior by Feature:**

| Feature | Fallback Strategy | User Impact |
|---------|------------------|-------------|
| **User Login** | Use cached user data from `users` table | ✅ No impact - auth still works |
| **Profile Viewing** | Show cached profile from `user_profiles` table | ✅ No impact - may show slightly stale data |
| **Tag Search** | Use cached tags from `user_tags` and `taxonomy` tables | ✅ No impact - existing tags still searchable |
| **New User Onboarding** | Cannot sync new users from Airtable | ⚠️ New CF members must wait for Airtable to recover |
| **Tag Taxonomy Updates** | Cannot sync new taxonomy entries | ⚠️ New industries/technologies not available until recovery |
| **User Data Updates** | Cannot sync profile changes from Airtable | ⚠️ Changes in Airtable won't appear until recovery |

**Monitoring & Alerting:**

```typescript
// apps/api/src/jobs/airtable-health-check.ts

/**
 * Scheduled job to monitor Airtable sync health.
 * Runs every 6 hours via Cloudflare Cron Trigger.
 */
export async function checkAirtableSyncHealth(env: Env) {
  const airtableService = new AirtableService(env);
  const health = await airtableService.checkSyncHealth();
  
  if (health.status === 'critical') {
    // Alert coordinator via email
    await env.emailService.sendAlert({
      to: env.COORDINATOR_EMAIL,
      subject: 'URGENT: Airtable Sync Stale',
      body: `
        Airtable sync has not run successfully for ${health.message}.
        
        Last successful sync: ${health.lastSync}
        
        Action required:
        1. Check Airtable webhook configuration
        2. Verify Airtable API key is valid
        3. Review error logs in Cloudflare Workers dashboard
        4. Consider manual sync if issue persists
        
        The platform is currently operating on cached data from ${health.lastSync}.
      `,
    });
    
    logger.error('Airtable sync health critical', health);
  } else if (health.status === 'warning') {
    logger.warn('Airtable sync health degraded', health);
  }
}
```

**Manual Re-sync Procedure:**

Coordinators can manually trigger a full Airtable re-sync via the admin dashboard:

```typescript
// apps/api/src/routes/coordinator/airtable.ts

/**
 * POST /api/coordinator/airtable/sync
 * Manually trigger full Airtable sync (coordinator-only)
 */
coordinatorRouter.post('/airtable/sync', 
  requireAuth,
  requireRole('coordinator'),
  async (c) => {
    const airtableService = new AirtableService(c.env);
    
    try {
      const result = await airtableService.performFullSync();
      
      return c.json({
        success: true,
        message: 'Airtable sync completed',
        recordsProcessed: result.count,
        lastSync: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Manual Airtable sync failed', { error: error.message });
      
      return c.json({
        success: false,
        error: error.message,
      }, 500);
    }
  }
);
```

**Key Principles:**
- ✅ **Platform remains operational** during Airtable outages using cached data
- ✅ **Transparent degradation** - logs clearly indicate when using cached data
- ✅ **Proactive monitoring** - coordinators alerted if sync stale > 48 hours
- ✅ **Manual recovery** - coordinators can force re-sync via admin dashboard
- ✅ **Automatic recovery** - resumes normal operation when Airtable recovers
- ⚠️ **Acceptable staleness** - up to 24 hours cached data is acceptable per requirements
- ⚠️ **No critical data loss** - booking/availability data lives exclusively in Supabase (unaffected)

---

### 15.8 Error Recovery Patterns

**Retry Logic:**

```typescript
/**
 * Retries an async function with exponential backoff.
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      logger.warn(`Retry attempt ${attempt + 1} failed`, {
        error: lastError.message,
        attempt,
      });

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
};

// Usage
const fetchData = async () => {
  return retryWithBackoff(
    () => apiClient.get('/data'),
    3, // Max 3 retries
    1000 // 1 second base delay
  );
};
```

**Graceful Degradation:**

```typescript
// src/features/bookings/BookingsList.tsx

export function BookingsList() {
  const { data: bookings, isLoading, error } = useBookings(user.id);

  // Show cached data if available, even with error
  if (error && !bookings) {
    return (
      <div>
        <ErrorMessage message="Failed to load latest bookings" />
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  if (error && bookings) {
    // Graceful degradation: show cached data with warning
    return (
      <>
        <Banner variant="warning">
          Showing cached data. Unable to fetch latest bookings.
        </Banner>
        <BookingCards bookings={bookings} />
      </>
    );
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return <BookingCards bookings={bookings} />;
}
```

---

**Section 15 Complete.** This error handling strategy provides:
- ✅ Frontend error boundaries (global + booking flow)
- ✅ Centralized API client with consistent error handling
- ✅ Error message dictionary for user-friendly messages
- ✅ Custom error classes for backend
- ✅ Error handler middleware for Hono
- ✅ Logging strategy (dev only, toggable in production)
- ✅ Async error handling patterns
- ✅ Form validation error handling
- ✅ External service error handling
- ✅ Error recovery patterns (retry, graceful degradation)


## 16. Monitoring and Observability

This section defines the monitoring and observability strategy for the CF Office Hours platform. The MVP uses minimal built-in tools with stubbed telemetry interfaces for future expansion.

### 16.1 Observability Philosophy

**Core Principles:**
- **MVP-First** - Use free, built-in tools for initial monitoring
- **Interface-Driven** - Define telemetry interfaces now, implement later
- **Strategic Instrumentation** - Document where metrics should be collected
- **Expand Later** - Full observability platform deferred to future SOW

**Three Pillars of Observability:**
1. **Metrics** - Quantitative measurements (request count, error rate, latency)
2. **Logs** - Discrete events (errors, important actions, state changes)
3. **Traces** - Request lifecycle tracking (distributed tracing)

**MVP Scope:**
- ✅ Basic health checks
- ✅ Built-in dashboard metrics (Cloudflare, Supabase)
- ✅ Console logging (development/staging)
- ✅ Telemetry interface definitions (stubs)
- ❌ Third-party APM (Sentry, New Relic) - Post-MVP
- ❌ Custom metrics dashboards (Grafana) - Post-MVP
- ❌ Distributed tracing (Jaeger, Zipkin) - Post-MVP

---

### 16.2 Health Checks

#### 16.2.1 API Health Endpoint

```typescript
// src/routes/health.ts

// External dependencies
import { Hono } from 'hono';

// Internal modules
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

const healthRouter = new Hono();

/**
 * Basic health check endpoint.
 * Returns 200 OK if service is healthy.
 */
healthRouter.get('/', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'cf-office-hours-api',
  });
});

/**
 * Detailed health check with dependency status.
 * Checks database connectivity.
 */
healthRouter.get('/detailed', async (c) => {
  const checks = {
    api: 'ok',
    database: 'unknown',
    timestamp: new Date().toISOString(),
  };

  try {
    // Check database connectivity
    await db.from('users').select('id').limit(1);
    checks.database = 'ok';
  } catch (error) {
    logger.error('Database health check failed', { error });
    checks.database = 'error';
  }

  const isHealthy = checks.database === 'ok';
  const statusCode = isHealthy ? 200 : 503;

  return c.json(checks, statusCode);
});

export { healthRouter };
```

**Frontend Health Check (Optional):**

```typescript
// src/lib/health-check.ts

/**
 * Checks if the API is reachable.
 */
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/health`, {
      method: 'GET',
      cache: 'no-cache',
    });
    return response.ok;
  } catch (error) {
    logger.error('API health check failed', { error });
    return false;
  }
};
```

---

### 16.3 Built-In Monitoring Tools

#### 16.3.1 Cloudflare Workers Dashboard (Free)

**Available Metrics:**
- Request count (per endpoint)
- Request duration (p50, p95, p99)
- Error rate (HTTP 5xx responses)
- CPU time per invocation
- Egress bandwidth

**Access:**
- Dashboard: `https://dash.cloudflare.com`
- Navigate to: Workers & Pages → cf-oh-api → Metrics

**What to Monitor:**
- API response times (target: <2s for core endpoints)
- Error rate (target: <1%)
- Request volume trends
- CPU time usage (stay within limits)

#### 16.3.2 Cloudflare Pages Dashboard (Free)

**Available Metrics:**
- Build success/failure rate
- Deployment duration
- Page views (if Cloudflare Analytics enabled)
- Bandwidth usage

**Access:**
- Dashboard: `https://dash.cloudflare.com`
- Navigate to: Workers & Pages → cf-office-hours → Deployments

#### 16.3.3 Supabase Dashboard (Free)

**Available Metrics:**
- Database query performance (slow queries)
- Connection pool usage
- Storage usage (pitch decks, avatars)
- Auth activity (logins, signups)
- Realtime connections

**Access:**
- Dashboard: `https://supabase.com/dashboard/project/{project-id}`
- Navigate to: Database → Query Performance, Storage → Usage

**What to Monitor:**
- Slow queries (target: <500ms)
- Storage growth rate
- Auth success/failure rates
- Realtime connection count

---

### 16.4 Telemetry Interfaces (Stubs)

#### 16.4.1 ITelemetryProvider Interface

```typescript
// src/lib/telemetry/telemetry-provider.interface.ts

/**
 * Telemetry provider interface for metrics, events, and traces.
 * Implementations: NoOpTelemetryProvider (MVP), OpenTelemetryProvider (future).
 */
export interface ITelemetryProvider {
  /**
   * Tracks a custom event.
   *
   * @param name - Event name (e.g., 'booking_created', 'tier_override_approved')
   * @param properties - Additional event properties
   */
  trackEvent(name: string, properties?: Record<string, unknown>): void;

  /**
   * Tracks a custom metric (counter, gauge, histogram).
   *
   * @param name - Metric name (e.g., 'booking_count', 'api_response_time')
   * @param value - Metric value
   * @param tags - Metric tags for filtering/grouping
   */
  trackMetric(name: string, value: number, tags?: Record<string, string>): void;

  /**
   * Tracks an exception/error.
   *
   * @param error - The error object
   * @param properties - Additional error context
   */
  trackException(error: Error, properties?: Record<string, unknown>): void;

  /**
   * Starts a distributed trace span.
   *
   * @param name - Span name (e.g., 'bookingService.createBooking')
   * @param attributes - Span attributes
   * @returns Span handle for ending the span
   */
  startSpan(name: string, attributes?: Record<string, unknown>): ITelemetrySpan;

  /**
   * Flushes any pending telemetry data.
   */
  flush(): Promise<void>;
}

/**
 * Telemetry span for distributed tracing.
 */
export interface ITelemetrySpan {
  /**
   * Ends the span and records its duration.
   */
  end(): void;

  /**
   * Sets an attribute on the span.
   */
  setAttribute(key: string, value: unknown): void;

  /**
   * Records an exception within the span.
   */
  recordException(error: Error): void;
}
```

---

#### 16.4.2 No-Op Implementation (MVP)

```typescript
// src/lib/telemetry/noop-telemetry-provider.ts

import type { ITelemetryProvider, ITelemetrySpan } from './telemetry-provider.interface';

/**
 * No-op telemetry provider for MVP.
 * Methods do nothing but satisfy the interface.
 */
class NoOpTelemetryProvider implements ITelemetryProvider {
  trackEvent(name: string, properties?: Record<string, unknown>): void {
    // No-op
  }

  trackMetric(name: string, value: number, tags?: Record<string, string>): void {
    // No-op
  }

  trackException(error: Error, properties?: Record<string, unknown>): void {
    // No-op
  }

  startSpan(name: string, attributes?: Record<string, unknown>): ITelemetrySpan {
    return new NoOpSpan();
  }

  async flush(): Promise<void> {
    // No-op
  }
}

/**
 * No-op telemetry span.
 */
class NoOpSpan implements ITelemetrySpan {
  end(): void {
    // No-op
  }

  setAttribute(key: string, value: unknown): void {
    // No-op
  }

  recordException(error: Error): void {
    // No-op
  }
}

export const telemetry = new NoOpTelemetryProvider();
```

---

#### 16.4.3 OpenTelemetry Stub (Future Implementation)

```typescript
// src/lib/telemetry/opentelemetry-provider.ts
// NOTE: This is a stub for future implementation. Not used in MVP.

import { trace, metrics, context } from '@opentelemetry/api';
import type { ITelemetryProvider, ITelemetrySpan } from './telemetry-provider.interface';

/**
 * OpenTelemetry-based telemetry provider.
 * STUB: To be implemented in future SOW.
 *
 * Setup would include:
 * - OTLP exporter configuration
 * - Resource detection (service name, version, environment)
 * - Tracer provider setup
 * - Meter provider setup
 */
class OpenTelemetryProvider implements ITelemetryProvider {
  private tracer = trace.getTracer('cf-office-hours');
  private meter = metrics.getMeter('cf-office-hours');

  trackEvent(name: string, properties?: Record<string, unknown>): void {
    // TODO: Implement event tracking
    // - Convert event to span or log
    // - Add properties as attributes
  }

  trackMetric(name: string, value: number, tags?: Record<string, string>): void {
    // TODO: Implement metric tracking
    // - Create counter/gauge/histogram based on metric name
    // - Add tags as metric attributes
  }

  trackException(error: Error, properties?: Record<string, unknown>): void {
    // TODO: Implement exception tracking
    // - Record exception on current span
    // - Add properties as attributes
  }

  startSpan(name: string, attributes?: Record<string, unknown>): ITelemetrySpan {
    // TODO: Implement span creation
    // - Start new span with tracer
    // - Add attributes
    // - Return wrapped span
    return new NoOpSpan(); // Placeholder
  }

  async flush(): Promise<void> {
    // TODO: Implement flush
    // - Flush tracer provider
    // - Flush meter provider
  }
}

/**
 * Example OpenTelemetry configuration (commented out for MVP).
 */
/*
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    }),
  }),
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'cf-office-hours-api',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION,
  }),
});

sdk.start();
*/
```

---

### 16.5 Instrumentation Points (Documented)

This section documents where telemetry SHOULD be collected when a full observability platform is implemented. For MVP, these are **inline comments only**.

#### 16.5.1 Backend Instrumentation

**API Request Metrics:**

```typescript
// src/index.ts

import { Hono } from 'hono';
import { telemetry } from '@/lib/telemetry/noop-telemetry-provider';

const app = new Hono();

// Middleware: Request metrics
app.use('*', async (c, next) => {
  const start = Date.now();
  const path = c.req.path;
  const method = c.req.method;

  // TELEMETRY: Start span for request
  // const span = telemetry.startSpan('http.request', {
  //   'http.method': method,
  //   'http.route': path,
  // });

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  // TELEMETRY: Track request metrics
  // telemetry.trackMetric('http.request.duration', duration, {
  //   method,
  //   route: path,
  //   status: status.toString(),
  // });
  //
  // telemetry.trackMetric('http.request.count', 1, {
  //   method,
  //   route: path,
  //   status: status.toString(),
  // });
  //
  // span.setAttribute('http.status_code', status);
  // span.end();
});
```

**Business Event Tracking:**

```typescript
// src/services/booking-service.ts

export class BookingService {
  async createBooking(params: ICreateBookingParams): Promise<IBooking> {
    const span = telemetry.startSpan('bookingService.createBooking');

    try {
      // Business logic...
      const booking = await db.insert(/* ... */);

      // TELEMETRY: Track business event
      // telemetry.trackEvent('booking_created', {
      //   bookingId: booking.id,
      //   mentorId: booking.mentorId,
      //   menteeId: booking.menteeId,
      //   meetingType: booking.meetingType,
      // });

      span.end();
      return booking;
    } catch (error) {
      span.recordException(error);
      span.end();
      throw error;
    }
  }

  async cancelBooking(bookingId: string, canceledBy: string): Promise<void> {
    // TELEMETRY: Track cancellation event
    // telemetry.trackEvent('booking_canceled', {
    //   bookingId,
    //   canceledBy,
    //   cancellationTime: new Date().toISOString(),
    // });

    // Business logic...
  }
}
```

**Database Query Metrics:**

```typescript
// src/lib/db-helpers.ts

export const dbHelpers = {
  async executeQuery<T>(query: () => Promise<T>, queryName: string): Promise<T> {
    const start = Date.now();

    // TELEMETRY: Start span for query
    // const span = telemetry.startSpan('db.query', {
    //   'db.operation': queryName,
    // });

    try {
      const result = await query();
      const duration = Date.now() - start;

      // TELEMETRY: Track query duration
      // telemetry.trackMetric('db.query.duration', duration, {
      //   operation: queryName,
      //   status: 'success',
      // });

      // span.end();
      return result;
    } catch (error) {
      // TELEMETRY: Track query failure
      // telemetry.trackMetric('db.query.error', 1, {
      //   operation: queryName,
      // });
      // span.recordException(error);
      // span.end();

      throw error;
    }
  },
};
```

**External Service Calls:**

```typescript
// src/providers/google-calendar-provider.ts

export class GoogleCalendarProvider implements ICalendarProvider {
  async createEvent(input: ICreateEventInput): Promise<ICalendarEvent> {
    // TELEMETRY: Start span for external call
    // const span = telemetry.startSpan('calendarProvider.createEvent', {
    //   provider: 'google',
    //   eventType: input.conferenceType,
    // });

    try {
      const response = await this.googleClient.calendar.events.insert(/* ... */);

      // TELEMETRY: Track successful calendar event creation
      // telemetry.trackEvent('calendar_event_created', {
      //   provider: 'google',
      //   eventId: response.data.id,
      //   hasConference: !!input.conferenceType,
      // });

      // span.end();
      return this.parseEvent(response.data);
    } catch (error) {
      // TELEMETRY: Track calendar provider error
      // telemetry.trackException(error, {
      //   provider: 'google',
      //   operation: 'createEvent',
      // });
      // span.recordException(error);
      // span.end();

      throw error;
    }
  }
}
```

---

#### 16.5.2 Frontend Instrumentation

**Page Views:**

```typescript
// src/App.tsx

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { telemetry } from '@/lib/telemetry/noop-telemetry-provider';

export function App() {
  const location = useLocation();

  useEffect(() => {
    // TELEMETRY: Track page view
    // telemetry.trackEvent('page_view', {
    //   path: location.pathname,
    //   timestamp: new Date().toISOString(),
    // });
  }, [location.pathname]);

  return <RouterProvider />;
}
```

**User Interactions:**

```typescript
// src/features/bookings/BookingForm.tsx

export function BookingForm({ slotId, onSubmit }: IBookingFormProps) {
  const handleSubmit = async (data: BookingFormData) => {
    // TELEMETRY: Track booking form submission
    // telemetry.trackEvent('booking_form_submitted', {
    //   slotId,
    //   hasGoal: !!data.meetingGoal,
    //   hasMaterials: !!data.materialsUrls?.length,
    // });

    try {
      await onSubmit({ ...data, slotId });

      // TELEMETRY: Track successful booking
      // telemetry.trackEvent('booking_form_success', { slotId });

      toast.success('Booking confirmed!');
    } catch (error) {
      // TELEMETRY: Track booking error
      // telemetry.trackException(error, {
      //   context: 'booking_form_submission',
      //   slotId,
      // });

      logger.error('Booking submission failed', { error });
    }
  };

  return <form onSubmit={handleSubmit}>{/* ... */}</form>;
}
```

**Performance Metrics (Web Vitals):**

```typescript
// src/lib/performance.ts
// STUB: Web Vitals tracking for future implementation

import { onCLS, onFID, onLCP } from 'web-vitals';

/**
 * Initializes Web Vitals tracking.
 * Sends Core Web Vitals metrics to telemetry provider.
 *
 * STUB: Uncomment when telemetry provider is implemented.
 */
export const initPerformanceTracking = (): void => {
  // onCLS((metric) => {
  //   telemetry.trackMetric('web_vitals.cls', metric.value, {
  //     rating: metric.rating,
  //   });
  // });

  // onFID((metric) => {
  //   telemetry.trackMetric('web_vitals.fid', metric.value, {
  //     rating: metric.rating,
  //   });
  // });

  // onLCP((metric) => {
  //   telemetry.trackMetric('web_vitals.lcp', metric.value, {
  //     rating: metric.rating,
  //   });
  // });
};
```

---

### 16.6 Alerting Strategy (Future)

**Critical Alerts (Deferred to Post-MVP):**

When a full observability platform is implemented, configure alerts for:

**API Health:**
- Error rate >5% for 5 minutes → Alert coordinators
- API response time p95 >5s for 5 minutes → Alert developers
- Health check failures for 3 consecutive checks → Alert on-call

**Database:**
- Database connection pool >80% utilization → Alert developers
- Slow queries >2s consistently → Alert developers
- Storage >80% capacity → Alert administrators

**Bookings (Business Metrics):**
- Booking creation failure rate >10% → Alert coordinators
- Zero bookings created in 24 hours → Alert coordinators (potential system issue)
- Tier override requests pending >50 → Alert coordinators

**External Services:**
- Calendar API error rate >20% → Alert developers
- Airtable sync failures >3 consecutive attempts → Alert administrators

**Implementation Tools (Post-MVP):**
- PagerDuty, Opsgenie, or similar for on-call rotation
- Email/SMS notifications for critical alerts
- Slack integration for non-critical alerts

---

### 16.7 Dashboard Requirements (Future)

**MVP: Use Built-In Dashboards Only**

**Post-MVP: Custom Dashboard Tools**

When implementing custom dashboards (Grafana, Datadog, etc.), include:

**Operations Dashboard:**
- API request volume (requests/min)
- API error rate (%)
- API response time (p50, p95, p99)
- Database query performance
- Active user sessions

**Business Metrics Dashboard:**
- Bookings created (daily/weekly trends)
- Mentor utilization rate
- User growth (signups/day)
- Reputation tier distribution
- Top mentors/mentees by activity

**System Health Dashboard:**
- CPU/memory usage (Workers)
- Database connection pool usage
- Storage usage (pitch decks, avatars)
- Cache hit rate (if implemented)
- External API latency (Google Calendar, Microsoft Graph)

---

### 16.8 Logging Retention Policy

**MVP: No Automated Retention (Unlimited)**

Logs remain in browser console (dev) and Cloudflare dashboard (production) until manually cleared or rotated by platform.

**Post-MVP: Implement Retention Policy**

When a logging aggregation service is added (Better Stack, Axiom, Datadog):

| Log Level | Retention Period | Reason |
|-----------|------------------|--------|
| ERROR     | 90 days          | Debugging, incident response |
| WARN      | 30 days          | Issue investigation |
| INFO      | 7 days           | Operational visibility |
| DEBUG     | 1 day            | Development only |

**Archive Strategy:**
- Archive old logs to S3 or similar (cold storage)
- Compress archived logs
- Automated cleanup of archives >1 year old

---

### 16.9 Observability Roadmap

**Phase 1 (MVP - Current):**
- ✅ Health check endpoints
- ✅ Built-in Cloudflare/Supabase dashboards
- ✅ Console logging (dev/staging)
- ✅ Telemetry interface definitions (stubs)

**Phase 2 (Post-MVP - Future SOW):**
- Error tracking service (Sentry, Rollbar)
- Basic metrics collection (request count, error rate)
- Custom alerting for critical failures
- Log aggregation (Better Stack, Axiom)

**Phase 3 (Advanced - Future SOW):**
- Distributed tracing (OpenTelemetry + Jaeger/Tempo)
- Custom metrics dashboards (Grafana, Datadog)
- Business metrics tracking
- Performance monitoring (Web Vitals, RUM)

**Phase 4 (Mature - Future SOW):**
- Advanced analytics (user behavior, funnel analysis)
- Predictive alerting (anomaly detection)
- Cost optimization monitoring
- Compliance auditing (GDPR, SOC2)

---

### 16.10 Developer Debugging Tools

**Local Development:**

```typescript
// src/lib/debug.ts

/**
 * Debug utilities for local development.
 * Only active in development environment.
 */
export const debug = {
  /**
   * Logs performance timing for a function.
   */
  time: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    if (import.meta.env.MODE !== 'development') {
      return fn();
    }

    console.time(label);
    const result = await fn();
    console.timeEnd(label);
    return result;
  },

  /**
   * Logs detailed state for debugging.
   */
  log: (label: string, data: unknown): void => {
    if (import.meta.env.MODE !== 'development') return;

    console.group(`🐛 ${label}`);
    console.log(data);
    console.groupEnd();
  },

  /**
   * Breakpoint helper (pauses execution in dev only).
   */
  breakpoint: (): void => {
    if (import.meta.env.MODE !== 'development') return;
    debugger;
  },
};
```

**React DevTools:**
- Use React DevTools extension for component inspection
- Use Profiler tab for performance analysis
- Use Hooks tab for hook state inspection

**Backend Debugging:**
```bash
# Cloudflare Workers local development with live reload
wrangler dev --local --persist

# Inspect logs in real-time
wrangler tail --format pretty

# Test API endpoint locally
curl -X POST http://localhost:8787/api/bookings \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"mentorId":"123","timeSlotId":"456","meetingGoal":"Discuss funding strategy"}'
```

---

### 16.11 Monitoring Checklist

**Before Production Launch:**
- [ ] Health check endpoints responding correctly
- [ ] Cloudflare Workers dashboard accessible
- [ ] Supabase dashboard accessible and showing data
- [ ] Error logging configured (dev/staging confirmed working)
- [ ] Telemetry interfaces defined (stubs in place)
- [ ] All critical paths instrumented with inline comments
- [ ] Test error scenarios (500 errors, database failures) to confirm logging

**Post-Launch (First Week):**
- [ ] Monitor API error rate daily
- [ ] Check Supabase for slow queries
- [ ] Review booking creation success rate
- [ ] Monitor storage growth
- [ ] Check authentication success/failure rates

**Ongoing (Weekly):**
- [ ] Review Cloudflare request trends
- [ ] Check database performance metrics
- [ ] Monitor storage usage growth
- [ ] Review any logged errors in production

---

**Section 16 Complete.** This monitoring and observability strategy provides:
- ✅ MVP-first approach using built-in tools (Cloudflare, Supabase)
- ✅ Health check endpoints (basic and detailed)
- ✅ Telemetry interface definitions (`ITelemetryProvider`, `ITelemetrySpan`)
- ✅ No-op telemetry implementation for MVP
- ✅ OpenTelemetry stub for future implementation
- ✅ Documented instrumentation points (inline comments)
- ✅ Alerting strategy (deferred to post-MVP)
- ✅ Dashboard requirements (deferred to post-MVP)
- ✅ Logging retention policy
- ✅ Observability roadmap (phased approach)
- ✅ Developer debugging tools
- ✅ Monitoring checklist for launch and ongoing operations



---

## Document Complete

**Architecture Document Status:** All 16 sections complete. The CF Office Hours Platform architecture is fully documented and ready for implementation.

**Sections Overview:**
1. ✅ Executive Summary
2. ✅ System Overview
3. ✅ Data Architecture
4. ✅ API Architecture
5. ✅ Integration Patterns
6. ✅ Components
7. ✅ Frontend Architecture
8. ✅ Backend Architecture
9. ✅ Unified Project Structure
10. ✅ Development Workflow
11. ✅ Deployment Architecture
12. ✅ Security and Performance
13. ✅ Testing Strategy
14. ✅ Coding Standards
15. ✅ Error Handling Strategy
16. ✅ Monitoring and Observability

**Next Steps:**
1. Review architecture document with stakeholders
2. Begin Epic 0 (Walking Skeleton) implementation
3. Set up development environment per Section 10
4. Follow deployment procedures in Section 11
5. Implement coding standards from Section 14

**Estimated Implementation Timeline:** 20 weeks (10 sprints)
**Key Milestone:** End-to-end working product by Week 4 (Epic 0 complete)

---

**Document Metadata:**
- **Version:** 1.0
- **Last Updated:** 2025-10-02
- **Total Sections:** 16
- **Total Pages:** ~450 (estimated)
- **Status:** Complete - Ready for Implementation

