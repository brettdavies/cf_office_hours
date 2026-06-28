# 1. Project Analysis and Context

## 1.1 Analysis Source

- **Source**: User-provided initial PRD + technical discussion
- **Status**: Greenfield development (no existing code)
- **Base Document**: "CF Office Hours PRD - Gauntlet Assignment.md"

## 1.2 Current Project State

This is a **new platform** to replace the existing Union.vc solution. The goal is to create an intelligent mentor-mentee matching and scheduling platform for the startup accelerator program.

## 1.3 Goals

### Primary Goals

- Replace Union.vc with improved matching quality and UX
- AI-powered mentor-mentee matching using LinkedIn, Pitch.vc, Airtable, company data
- Reputation-based access control system
- Automated Google Meet link generation for all sessions

### MVP Scope Adjustments

- ❌ **Descoped**: AI profile auto-generation (parking lot for post-MVP)
- ❌ **Descoped**: Predictive utilization scheduling
- ✅ **In Scope**: Manual profile creation with optional external links
- ✅ **In Scope**: Desktop/laptop experience (mobile future consideration)

## 1.4 Background Context

The accelerator currently uses Union.vc for connecting startup founders with mentors for office hours sessions. The platform has limitations in match quality, user experience, and scheduling friction. This new platform will provide intelligent matching based on tags/categories, implement a reputation system to ensure quality engagement, and streamline scheduling through deep calendar integration. The system must integrate with CF's existing Airtable data infrastructure, which serves as the source of truth for user management via one-way sync.

## 1.5 Success Metrics

- **Utilization**: >75% mentor utilization of office hour slots offered
- **Activity**: More total weekly office hour time slots filled after 90 days than with Union.vc
- **Distribution**: Average number of office hours booked in the first 30 days is better after 90 days than with Union.vc

## 1.6 Tech Stack

### Frontend
- React + Vite
- Shadcn/ui + Tailwind CSS
- Desktop/laptop optimized (responsive design for future mobile)

### Backend & Infrastructure
- **Database**: Supabase Postgres
- **Auth**: Supabase Auth (passwordless magic links + Google/Microsoft OAuth)
- **Storage**: Supabase Storage (pitch decks, documents)
- **Hosting**: Cloudflare Pages
- **API/Serverless**: Cloudflare Workers with Hono framework
- **Validation**: Zod schemas
- **API Documentation**: `@hono/zod-openapi` for OpenAPI 3.0 generation
- **External Integrations**: Airtable (webhooks), Google Calendar API, Google Meet API, Microsoft Graph API

### Budget Constraint
Free tiers only for MVP (not a blocking concern given limited scale)

## 1.7 Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Airtable (Source of Truth - User Data)            │
│  - Users table (<500 rows, 3-10 text columns)      │
└────────────────┬────────────────────────────────────┘
                 │ Webhook on CRUD
                 ▼
┌─────────────────────────────────────────────────────┐
│  Cloudflare Worker (Webhook Handler)                │
│  - Receives webhook trigger                         │
│  - Fetches complete users table from Airtable       │
│  - Stores raw payload in Supabase                   │
│  - Maps specific fields to operational tables       │
└────────────────┬────────────────────────────────────┘
                 │ Sync to
                 ▼
┌─────────────────────────────────────────────────────┐
│  Supabase (Operational Database + Auth + Storage)   │
│  - Users/profiles (synced from Airtable)            │
│  - Sessions, bookings, availability (app-only)      │
│  - Ratings, reputation scores                       │
│  - Auth + Row Level Security                        │
│  - Realtime subscriptions for live updates          │
└────────────────┬────────────────────────────────────┘
                 │ REST API (Hono + Zod)
                 ▼
┌─────────────────────────────────────────────────────┐
│  React App (Cloudflare Pages)                       │
│  - Matching, scheduling, profiles UI                │
└─────────────────────────────────────────────────────┘
                 │ Integrates with
                 ▼
┌─────────────────────────────────────────────────────┐
│  External APIs                                      │
│  - Google Calendar (availability, bookings)         │
│  - Microsoft Outlook (availability, bookings)       │
│  - Google Meet (meeting links)                      │
└─────────────────────────────────────────────────────┘
```

### Sync Strategy Details
- **Trigger**: Airtable webhook fires on any user record CRUD operation
- **Approach**: Fetch entire users table from Airtable (small size: <500 rows)
- **Storage**: Store complete webhook payload in raw data table
- **Processing**: Map specific fields to operational user tables (idempotent upsert)
- **Frequency**: Event-driven (days without changes possible, bursts of changes handled gracefully)
- **Direction**: One-way only (Airtable → Supabase, no writeback)

## 1.8 Required System Abstractions

**Modular Design Principle:** All integrations and core business logic must use interface-based architecture to enable future extensibility without touching business logic.

### Required Abstraction Modules

**1. Calendar Provider Interface**
- **Responsibilities**: OAuth, event CRUD, availability queries, timezone handling
- **Initial Implementations**: Google Calendar, Microsoft Outlook
- **Future**: Apple Calendar, custom calendar sources

**2. Matching Engine Interface**
- **Responsibilities**: Generate mentor/mentee recommendations, explain matches
- **Initial Implementation**: Tag-based similarity matching
- **Future**: AI/ML embeddings, hybrid approaches

**3. Reputation Calculator Interface**
- **Responsibilities**: Calculate reputation scores, determine tiers, access control
- **Initial Implementation**: Rating + completion rate + responsiveness formula
- **Future**: More sophisticated models, ML-based prediction

**4. Notification Provider Interface**
- **Responsibilities**: Send confirmations, reminders, cancellations
- **Initial Implementation**: Email (Supabase built-in)
- **Future**: SMS, push notifications, in-app realtime

**Interface Definition Timing:** Conceptual requirements defined in PRD; actual TypeScript interfaces defined during "Technical Foundation" epic implementation.

## 1.9 Reputation System Approach

### Formula
```
Raw Score = (Average Rating × Completion Rate × Responsiveness Factor) + Tenure Bonus

Probationary Clamp (per FR48):
- If ratingsCount < 3 AND Raw Score < 3.5, then Final Score = 3.5
- Otherwise, Final Score = Raw Score

Where:
- Average Rating: Mean of all received ratings (1-5 stars)
- Completion Rate: % of booked sessions attended (vs. canceled/no-show)
- Responsiveness Factor (based on booking confirmation response time):
  - **Measurement**: Time from booking creation (`bookings.created_at`) until acceptance/confirmation (`bookings.confirmed_at`)
  - **Coordinator Exclusion**: Response time is `NULL` if `confirmed_by` is a coordinator (does not impact mentor reputation)
  - **Multipliers**:
    - 1.2× if average response time < 24 hours
    - 1.0× if average response time 24-48 hours
    - 0.8× if average response time > 48 hours OR frequent cancellations (>20% cancellation rate)
  - **Timeout Protection**: Bookings not confirmed within 7 days auto-expire (`status='expired'`), freeing the time slot
- Tenure Bonus: +0.1 per month active (max +1.0 after 10 months)
```

### Reputation Tiers
- 🥉 **Bronze** (0-3.0): Limited access (2 bookings/week max)
- 🥈 **Silver** (3.0-4.0): Standard access (5 bookings/week max)
- 🥇 **Gold** (4.0-4.5): Priority matching (10 bookings/week max)
- 💎 **Platinum** (4.5+): Unlimited access, featured visibility

### Key Features
- ✅ **Cold-start solution**: New users start at 3.5 (Silver tier) to prevent engagement blockers
- ✅ **Probationary period**: Minimum 3 ratings required before dropping below starting tier
- ✅ **Admin override**: Admins can manually adjust reputation scores with audit log
- ✅ **Tier restrictions**: Mentees cannot book mentors more than one tier above them
- ✅ **Exception requests**: Users can request coordinator approval for tier overrides
- ✅ **Transparency**: Users see score breakdown (rating, completion %, responsiveness)

**Modular Design:** Reputation calculation logic isolated via interface for easy replacement/tuning.

---
