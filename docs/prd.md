# CF Office Hours Platform - Technical PRD

**Version:** 2.0
**Date:** 2025-10-02
**Status:** Complete - Ready for Implementation (Walking Skeleton Approach)
**Project Type:** Greenfield Development

---

## Table of Contents

1. [Project Analysis and Context](#1-project-analysis-and-context)
2. [Requirements](#2-requirements)
3. [UI Enhancement Goals](#3-ui-enhancement-goals)
4. [Technical Constraints and Integration](#4-technical-constraints-and-integration)
5. [Epic and Story Structure](#5-epic-and-story-structure)

---

## 1. Project Analysis and Context

### 1.1 Analysis Source

- **Source**: User-provided initial PRD + technical discussion
- **Status**: Greenfield development (no existing code)
- **Base Document**: "CF Office Hours PRD - Gauntlet Assignment.md"

### 1.2 Current Project State

This is a **new platform** to replace the existing Union.vc solution. The goal is to create an intelligent mentor-mentee matching and scheduling platform for Capital Factory's startup accelerator program.

### 1.3 Goals

#### Primary Goals

- Replace Union.vc with improved matching quality and UX
- AI-powered mentor-mentee matching using LinkedIn, Pitch.vc, Airtable, company data
- Reputation-based access control system
- Automated Google Meet link generation for all sessions

#### MVP Scope Adjustments

- ❌ **Descoped**: AI profile auto-generation (parking lot for post-MVP)
- ❌ **Descoped**: Predictive utilization scheduling
- ✅ **In Scope**: Manual profile creation with optional external links
- ✅ **In Scope**: Desktop/laptop experience (mobile future consideration)

### 1.4 Background Context

Capital Factory currently uses Union.vc for connecting startup founders with mentors for office hours sessions. The platform has limitations in match quality, user experience, and scheduling friction. This new platform will provide intelligent matching based on tags/categories, implement a reputation system to ensure quality engagement, and streamline scheduling through deep calendar integration. The system must integrate with CF's existing Airtable data infrastructure, which serves as the source of truth for user management via one-way sync.

### 1.5 Success Metrics

- **Utilization**: >75% mentor utilization of office hour slots offered
- **Activity**: More total weekly office hour time slots filled after 90 days than with Union.vc
- **Distribution**: Average number of office hours booked in the first 30 days is better after 90 days than with Union.vc

### 1.6 Tech Stack

#### Frontend
- React + Vite
- Shadcn/ui + Tailwind CSS
- Desktop/laptop optimized (responsive design for future mobile)

#### Backend & Infrastructure
- **Database**: Supabase Postgres
- **Auth**: Supabase Auth (passwordless magic links + Google/Microsoft OAuth)
- **Storage**: Supabase Storage (pitch decks, documents)
- **Hosting**: Cloudflare Pages
- **API/Serverless**: Cloudflare Workers with Hono framework
- **Validation**: Zod schemas
- **API Documentation**: `@hono/zod-openapi` for OpenAPI 3.0 generation
- **External Integrations**: Airtable (webhooks), Google Calendar API, Google Meet API, Microsoft Graph API

#### Budget Constraint
Free tiers only for MVP (not a blocking concern given limited scale)

### 1.7 Architecture Overview

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

#### Sync Strategy Details
- **Trigger**: Airtable webhook fires on any user record CRUD operation
- **Approach**: Fetch entire users table from Airtable (small size: <500 rows)
- **Storage**: Store complete webhook payload in raw data table
- **Processing**: Map specific fields to operational user tables (idempotent upsert)
- **Frequency**: Event-driven (days without changes possible, bursts of changes handled gracefully)
- **Direction**: One-way only (Airtable → Supabase, no writeback)

### 1.8 Required System Abstractions

**Modular Design Principle:** All integrations and core business logic must use interface-based architecture to enable future extensibility without touching business logic.

#### Required Abstraction Modules

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

### 1.9 Reputation System Approach

#### Formula
```
Raw Score = (Average Rating × Completion Rate × Responsiveness Factor) + Tenure Bonus

Probationary Clamp (per FR48):
- If ratingsCount < 3 AND Raw Score < 3.5, then Final Score = 3.5
- Otherwise, Final Score = Raw Score

Where:
- Average Rating: Mean of all received ratings (1-5 stars)
- Completion Rate: % of booked sessions attended (vs. canceled/no-show)
- Responsiveness Factor:
  - 1.2× if responds to requests within 24hrs
  - 1.0× if 24-48hrs
  - 0.8× if >48hrs or frequent cancellations
- Tenure Bonus: +0.1 per month active (max +1.0 after 10 months)
```

#### Reputation Tiers
- 🥉 **Bronze** (0-3.0): Limited access (2 bookings/week max)
- 🥈 **Silver** (3.0-4.0): Standard access (5 bookings/week max)
- 🥇 **Gold** (4.0-4.5): Priority matching (10 bookings/week max)
- 💎 **Platinum** (4.5+): Unlimited access, featured visibility

#### Key Features
- ✅ **Cold-start solution**: New users start at 3.5 (Silver tier) to prevent engagement blockers
- ✅ **Probationary period**: Minimum 3 ratings required before dropping below starting tier
- ✅ **Admin override**: Admins can manually adjust reputation scores with audit log
- ✅ **Tier restrictions**: Mentees cannot book mentors more than one tier above them
- ✅ **Exception requests**: Users can request coordinator approval for tier overrides
- ✅ **Transparency**: Users see score breakdown (rating, completion %, responsiveness)

**Modular Design:** Reputation calculation logic isolated via interface for easy replacement/tuning.

---

## 2. Requirements

### 2.1 Functional Requirements

#### User Management & Authentication

- **FR1**: System shall authenticate users via Supabase Auth using passwordless magic links (email-based)
- **FR2**: System shall support OAuth authentication via Google and Microsoft accounts. OAuth signup flow shall request both authentication AND calendar permissions in single combined flow (scopes: calendar.readonly, calendar.events for Google; Calendars.ReadWrite for Microsoft)
- **FR3**: System shall restrict authentication to email addresses present in synced Airtable users table
- **FR4**: System shall display "Contact admin for access" message for email addresses not found in users table
- **FR5**: System shall sync user profile data from Airtable to Supabase via webhook-triggered Cloudflare Worker
- **FR6**: System shall support three user roles: Mentee, Mentor, and Mentor Coordinator (admin)

#### User Profiles

- **FR7**: All users shall edit profiles including: name, title, company, email (required), phone (optional), LinkedIn, website, additional links
- **FR8**: Mentees shall upload pitch decks and documents to Supabase Storage
- **FR9**: Mentees shall link Pitch.vc profiles in their profile
- **FR10**: Mentors shall define default description of expertise areas and ideal mentee profiles
- **FR11**: System shall support manual tag selection from CF's taxonomy (industries, technologies, stages) synced from Airtable. Tags may be populated from Airtable sync (`source=airtable`) or manual user selection (`source=user`). AI-based auto-generation deferred to post-MVP
- **FR12**: System shall differentiate between "confirmed" tags (by user or from Airtable) and "user-submitted" tags pending coordinator approval

#### Matching & Discovery

- **FR13**: System shall implement `IMatchingEngine` interface for pluggable matching algorithms
- **FR14**: MVP matching engine shall use tag overlap, company stage, and reputation scores as primary factors
- **FR15**: Mentees shall view searchable/filterable directory of all mentors with personalized recommendations
- **FR16**: Mentors shall view searchable/filterable directory of all mentees with personalized recommendations
- **FR17**: System shall display match explanations (e.g., "3 shared industry tags, similar stage")
- **FR18**: System shall provide manual search/filter capabilities alongside AI recommendations (hybrid approach)
- **FR19**: Mentors shall send meeting interest notifications to mentees (via email and toast if online) with link to mentor's booking page. System shall automatically check tier restrictions and create override request if mentee cannot book mentor due to tier mismatch

#### Calendar Integration & Availability

- **FR20**: System shall implement `ICalendarProvider` interface supporting multiple calendar providers
- **FR21**: MVP shall support Google Calendar and Microsoft Outlook integration. OAuth signup flow requests calendar permissions (calendar.readonly, calendar.events) during initial authentication. Magic link users connect calendar post-login via separate OAuth flow
- **FR22**: Mentors shall create recurring availability blocks (one-time, weekly, monthly, quarterly)
- **FR23**: Mentors shall specify time slot durations: 15, 20, 30, or 60 minutes
- **FR24**: Mentors shall set buffer time between sessions
- **FR25**: Mentors shall specify meeting type: in-person (predefined location), in-person (custom location), or online (Google Meet)
- **FR26**: System shall handle timezone conversion automatically (store UTC, display local)
- **FR27**: System shall prevent double-booking across calendar providers using database constraints
- **FR28**: System shall generate unique Google Meet links for online meetings when at least one attendee has connected a Google Calendar. If both attendees use Microsoft Outlook, meeting description shall instruct attendees to create their own meeting link

#### Booking & Scheduling

- **FR29**: Mentees shall book available mentor time slots from calendar view (requires connected calendar per FR105)
- **FR30**: Mentees shall provide meeting goal description and materials for mentor review when booking
- **FR31**: [INTENTIONALLY LEFT BLANK]
- **FR32**: System shall send automated confirmation emails to both parties via `INotificationProvider`
- **FR33**: System shall send reminder emails based on user preference: 1 hour before / 24 hours before / Both (default: 1 hour)
- **FR34**: Either party shall cancel meetings with automated email notification to other party
- **FR35**: Canceled meetings do not auto-reschedule; mentee must rebook via standard flow
- **FR36**: System shall generate calendar event with meeting details, Google Meet link, and attendee info
- **FR37**: Users shall add individual events to Google Calendar or subscribe via .ical feed
- **FR38**: System shall enforce minimum 1-day advance booking requirement for all meetings
- **FR39**: Calendar invites (.ics) shall include absolute UTC time + TZID for timezone-safe display

#### Real-time & Notifications

- **FR40**: System shall use Supabase Realtime to broadcast slot availability changes to all connected clients
- **FR41**: When a time slot is booked, all users viewing that slot shall receive immediate UI update (slot disappears/grays out)
- **FR42**: If a user attempts to book a slot already taken by another concurrent user, system shall display toast notification: "This slot was just booked by another user" and return to slot selection view
- **FR43**: System shall use toast notifications (Shadcn toast component) for all transient on-screen notifications

#### Reputation & Ratings

- **FR44**: System shall implement `IReputationCalculator` interface for pluggable reputation logic
- **FR45**: System shall prompt both parties for optional 1-5 star rating after meeting completion
- **FR46**: System shall calculate reputation scores using: average rating, completion rate, responsiveness, and tenure
- **FR47**: New users shall start with reputation score of 3.5 (Silver tier) to prevent cold-start barriers
- **FR48**: System shall require minimum 3 ratings before user can drop below starting tier (3.5) - probationary period
- **FR49**: System shall assign reputation tiers: Bronze (<3.0), Silver (3.0-4.0), Gold (4.0-4.5), Platinum (>4.5)
- **FR50**: System shall enforce tier-based booking limits:
  - Bronze: Maximum 2 bookings/week
  - Silver: Maximum 5 bookings/week
  - Gold: Maximum 10 bookings/week
  - Platinum: Unlimited bookings
- **FR51**: System shall prevent mentees from booking mentors more than one reputation tier above their own (e.g., Bronze cannot book Gold/Platinum)
- **FR52**: Users shall view reputation score breakdown showing contributing factors
- **FR53**: Mentor Coordinators shall manually override user reputation scores with audit log
- **FR54**: Mentees shall request tier restriction exceptions via "Request Exception" button, providing required reason. Approved exceptions expire 7 days after approval (not request creation), allowing one booking with specified mentor within that window. Mentor-initiated exceptions are auto-approved upon creation with 7-day expiration from creation time
- **FR55**: System shall display override requests in Mentor Coordinator dashboard with approval workflow
- **FR56**: System shall send email notification to coordinators with approve link and dashboard anchor link to specific request
- **FR57**: Users with no scheduled meetings in either role (mentor or mentee) for 90+ days shall display "Dormant" badge in search results and sort to bottom. Dormant status is user-wide, not role-specific. users.last_activity_at timestamp tracks most recent booking in any role
- **FR58**: Dormant users cannot be booked directly; mentees must use Mentor Coordinator flow for override
- **FR59**: Deactivated users (`is_active = false`) shall not appear in search results and cannot be booked
- **FR60**: Cancellations within 2 hours of meeting start shall negatively impact reputation (responsiveness factor penalty)
- **FR61**: System shall prompt canceling user for optional reason (dropdown: emergency, reschedule, other)
- **FR62**: Google Meet links shall be automatically generated for virtual bookings when at least one attendee has connected a Google Calendar
- **FR63**: System shall use Airtable Record ID as stable unique identifier for user mapping (not email)

#### Admin & Coordinator Features

- **FR65**: Mentor Coordinators shall schedule meetings on behalf of mentors/mentees (white-glove service)
- **FR66**: Mentor Coordinators shall view, edit, and cancel any meeting
- **FR67**: Mentor Coordinators can override tier restrictions and manually book any mentor for any mentee
- **FR68**: Admins shall view dashboard with KPIs: utilization rate, weekly slots filled, user engagement metrics
- **FR69**: System shall calculate mentor utilization as: (booked slots / offered slots) × 100
- **FR70**: Admins shall export session data, feedback, and user analytics
- **FR71**: System shall log all admin actions (meeting edits, cancellations, reputation overrides, user management) using copy-on-change audit mechanism
- **FR72**: Audit log entries shall capture: action type, admin user, timestamp, before/after values, reason (optional)
- **FR73**: When user removed from Airtable sync, system shall soft-delete user and auto-cancel all future meetings with notification to other parties
- **FR74**: Coordinators shall create and manage preset meeting locations (name, address, notes)
- **FR75**: Coordinators shall approve user-submitted tags that add new entries to CF taxonomy

#### API & Testing

- **FR76**: System shall implement REST APIs using Hono framework with Zod schema validation
- **FR77**: System shall define all API contracts using OpenAPI 3.0 specification generated from Zod schemas using `@hono/zod-openapi`
- **FR78**: API documentation shall be auto-generated and accessible at `/api/docs`
- **FR79**: Before confirming booking, system shall check mentor's external calendar for conflicts via API
- **FR80**: System shall prevent hard deletion of availability blocks with confirmed bookings (require confirmation showing X booked slots will be affected)

#### Data Management

- **FR81**: System shall use soft deletes for all entities (users, meetings, availability, ratings)
- **FR82**: All database tables shall include timestamp columns: `created_at`, `updated_at`, `deleted_at`
- **FR83**: Queries shall exclude soft-deleted records by default unless explicitly requesting archived data
- **FR84**: Admin users shall have ability to view soft-deleted records
- **FR85**: GDPR deletion requests shall permanently delete (hard delete) user data and anonymize historical records, with action logged and non-PII retained
- **FR86**: Webhook handler shall store complete Airtable webhook payload in raw data table, then use field mapping to upsert specific fields into operational tables
- **FR87**: System shall store CF taxonomy (industries, technologies, stages) in database tables, synced from Airtable webhooks

#### Profile & Media Management

- **FR88**: Users shall upload avatar images via file upload or provide image URL, with max size 5MB (JPEG, PNG, WebP)
- **FR89**: System shall provide avatar cropping modal with circular crop area, supporting rotation, pan, and zoom
- **FR90**: Avatar images shall be displayed as circles throughout the application
- **FR91**: Users shall manually add custom tags to their profile from existing taxonomy
- **FR92**: User-submitted tags that don't exist in taxonomy shall require coordinator approval before addition to system taxonomy

#### Calendar Integration

- **FR93**: Users shall disconnect calendar integration via settings, removing OAuth tokens and stopping sync. System shall warn users if active bookings exist in next 7 days: "You have X upcoming meetings. Disconnecting will prevent calendar conflict checks, but existing calendar events will remain (you must delete them manually if needed)." System continues to send email notifications for existing bookings after disconnection. User must reconnect calendar to create new availability blocks or make new bookings (per FR105). Calendar events in external calendar (Google/Outlook) are not automatically deleted; users are responsible for manual cleanup if desired
- **FR94**: Users shall configure reminder notification preferences in profile settings (default: 1 hour before)
- **FR105**: Mentors and mentees must connect one calendar provider (Google or Microsoft) before performing booking/availability actions (viewing available slots, booking meetings, creating availability blocks). OAuth signup users (Google/Microsoft) have calendar connected automatically during signup per FR2. Magic link users and coordinators can connect calendar post-login via separate OAuth flow. System shall prompt calendar connection when user attempts booking/availability action without connected calendar
- **FR106**: System shall check for calendar conflicts before confirming bookings using connected calendar provider's availability data
- **FR107**: Coordinators shall receive notifications when new taxonomy tags are submitted for approval (delivery_channel='both'). Email notifications sent to all coordinators. In-app toast notifications delivered to online coordinators via Supabase Realtime subscription to taxonomy table changes (WHERE is_approved=false)

#### Centralized Error Handling

- **FR95**: Frontend shall implement centralized React Error Boundary to catch and display user-friendly errors
- **FR96**: Frontend shall implement centralized API client with consistent error handling and user feedback via toast notifications
- **FR97**: Backend shall implement centralized error handling middleware with standardized error responses
- **FR98**: Backend shall use custom AppError class for application-specific errors with status codes and error codes

#### Centralized Utilities

- **FR99**: System shall centralize date/time utilities for consistent timezone handling across application
- **FR100**: System shall centralize authentication middleware for consistent auth checks across API routes
- **FR101**: System shall centralize database query helpers for consistent data access patterns
- **FR102**: Frontend shall centralize toast notifications using single notification library (Sonner)

---

### 2.2 Non-Functional Requirements

#### Performance

- **NFR1**: System shall support 500 concurrent users without performance degradation
- **NFR2**: API response times shall be <2 seconds for core features (search, booking, profile load)
- **NFR3**: Calendar availability queries shall complete within 1 second
- **NFR4**: Airtable webhook processing shall complete within 5 seconds for full table sync
- **NFR5**: Real-time slot availability updates shall propagate to clients subscribed to the affected mentor's availability within 1 second via Supabase Realtime

#### Scalability

- **NFR6**: Database schema shall support growth to 5,000 users without refactoring
- **NFR7**: System shall handle bursts of 50 simultaneous booking requests without race conditions using database transactions and optimistic locking

#### Reliability & Availability

- **NFR8**: Target uptime of 99% for MVP phase
- **NFR9**: Webhook failures shall not block application functionality (use cached data gracefully)
- **NFR10**: External API failures (Google Calendar, Microsoft Graph) shall display user-friendly error messages. Calendar connection is required per FR105; temporary API failures shall prompt retry with clear messaging

#### Security & Privacy

- **NFR11**: All API endpoints shall enforce authentication via Supabase JWT tokens
- **NFR12**: Database access shall use Row Level Security (RLS) policies to enforce role-based permissions
- **NFR13**: User contact information (email, phone) shall be encrypted at rest
- **NFR14**: File uploads (pitch decks, avatars) shall be restricted to approved file types (PDF, PPTX for decks; JPG, PNG, WEBP for avatars). Virus scanning via Supabase Storage built-in features if available; MVP assumes good actors if scanning unavailable
- **NFR15**: OAuth tokens for calendar access shall be stored securely and refreshed automatically
- **NFR16**: Airtable webhook payloads shall be verified using signature validation

#### Data Integrity

- **NFR17**: All timestamps shall be stored in UTC with timezone metadata
- **NFR18**: Database constraints shall prevent duplicate bookings for same time slot
- **NFR19**: Deletion of users shall cascade appropriately (cancel future meetings, preserve historical data)
- **NFR20**: Rating submissions shall be idempotent (cannot submit duplicate rating for same meeting)

#### Maintainability & Extensibility

- **NFR21**: All external integrations (calendar, matching, reputation, notifications) shall use interface-based abstractions
- **NFR22**: Codebase shall follow modular architecture enabling parallel development of isolated features
- **NFR23**: Each provider implementation (Google Calendar, Outlook) shall be in separate modules with zero cross-dependencies
- **NFR24**: Configuration values (API keys, feature flags) shall be externalized using environment variables
- **NFR25**: Code shall include TypeScript types and JSDoc comments for all public interfaces
- **NFR26**: OpenAPI spec shall be generated from Zod validation schemas using `@hono/zod-openapi`
- **NFR27**: System shall log all notification attempts with delivery status
- **NFR28**: Realtime subscriptions shall be scoped to specific mentor/date ranges, not global availability. Clients subscribe to `time_slots` table filtered by `mentor_id` and `start_time >= NOW()`
- **NFR29**: Database views shall encapsulate soft-delete filtering for common queries
- **NFR30**: Database views and RLS policies shall work together to enforce access control and data filtering
- **NFR31**: Webhook synchronous response shall complete within Cloudflare Worker CPU time limit (10ms). Actual data synchronization work shall be handled asynchronously (see NFR4: 5 second target for full table sync)
- **NFR32**: Unrecognized Airtable columns shall be logged as warnings, not errors
- **NFR33**: CI pipeline shall validate API responses against OpenAPI spec using automated contract tests
- **NFR34**: Frontend TypeScript types for API requests/responses shall be auto-generated from OpenAPI spec using `openapi-typescript`. Backend types are derived from Zod schemas via `@hono/zod-openapi`

#### Usability

- **NFR35**: UI shall be optimized for desktop/laptop displays (1280px+ width)
- **NFR36**: UI shall use Shadcn/ui components consistently for visual cohesion
- **NFR37**: Error messages shall be user-friendly and actionable (avoid technical jargon)
- **NFR38**: Loading states shall display for any operation taking >500ms
- **NFR39**: Toast notifications shall be dismissible and auto-dismiss after 5 seconds for non-critical messages

#### Compliance & Standards

- **NFR40**: System shall comply with GDPR for user data handling (right to delete, data export)
- **NFR41**: Calendar integrations shall follow RFC 5545 (iCalendar) and RFC 7986 standards
- **NFR42**: OAuth implementations shall follow OAuth 2.0 and OIDC specifications

#### Monitoring & Observability

- **NFR43**: MVP shall use built-in Cloudflare and Supabase dashboards for monitoring (no third-party services)
- **NFR44**: System shall expose `/api/health` endpoint for basic health checks
- **NFR45**: All errors shall be logged to console (structured logging deferred to post-MVP)

---

### 2.3 Compatibility Requirements

- **CR1**: System shall maintain compatibility with Airtable API v0 for webhook and data fetch operations
- **CR2**: Calendar integrations shall remain compatible with Google Calendar API v3 and Microsoft Graph API
- **CR3**: Authentication flows shall remain compatible with Supabase Auth SDK for React
- **CR4**: UI components shall remain compatible with Shadcn/ui library updates within major version
- **CR5**: Data sync logic shall handle Airtable schema changes gracefully (new columns stored in raw table, recognized columns mapped)

---

### 2.4 Future Enhancements (Post-MVP)

**Deferred to Future Statements of Work:**

- **FE1**: Real-time connectivity status indicator with auto-refresh on reconnection
- **FE2**: User notification history view in profile settings
- **FE3**: Multiple reminder notifications per meeting (beyond 1hr/24hr/both)
- **FE4**: Manual permanent deletion tool for soft-deleted records older than 90 days
- **FE5**: Reputation formula adjustments based on engagement metrics (e.g., meeting length weighting)
- **FE6**: OAuth token expiration detection and re-authentication prompts
- **FE7**: Email notifications for expired calendar integrations
- **FE8**: Database-level race condition prevention using SELECT FOR UPDATE
- **FE9**: Per-user booking advance notice settings (default: 1 day)
- **FE10**: Timezone change detection and affected bookings review
- **FE11**: Coordinator review of late cancellations with reputation adjustment
- **FE12**: Meeting duration tracking via Google Meet API (fetch actual duration 1hr after meeting end). Short meeting flagging (<50% scheduled duration) for coordinator review. Adds bookings.actual_duration_minutes column
- **FE13**: Dead-letter queue and retry logic for failed webhook processing
- **FE14**: Schema migration handling for new Airtable columns
- **FE15**: User reactivation capability for accidentally removed users
- **FE16**: Email bounce monitoring and user notifications
- **FE17**: Daily digest email batching for users with 5+ meetings/day (high priority - immediately after MVP)
- **FE18**: Meeting reschedule count tracking with coordinator escalation (3+ reschedules)
- **FE19**: Automatic calendar sync to block mentor availability slots when external calendar events are detected (prevents double-booking from external meetings)
- **FE20**: Visual calendar view with drag-and-drop for mentor availability management (currently form-based in MVP)
- **FE21**: Sentry or error tracking service integration
- **FE22**: Custom metrics dashboard (Grafana, etc.)
- **FE23**: Advanced alerting (PagerDuty, etc.)
- **FE24**: Performance monitoring (Web Vitals tracking)
- **FE25**: Logging aggregation (Better Stack, Axiom)
- **FE26**: Avatar face classification using ML model to ensure uploaded images contain faces
- **FE27**: Notification log retention policy (30-90 day automatic cleanup)
- **FE28**: Tag auto-approval rules for certain users or scenarios
- **FE29**: Meeting duration tracking for Microsoft Teams meetings (MVP only supports Google Meet)
- **FE30**: Multiple calendar provider connections per user (MVP restricts to one provider)

---

## 3. UI Enhancement Goals

### 3.1 Design System Foundation

**Component Library:** Shadcn/ui + Tailwind CSS
- Shadcn provides unstyled, accessible components
- Full customization control with Tailwind utilities
- Consistent design tokens (colors, spacing, typography)

**Desktop-First Approach:**
- Optimized for 1280px+ displays
- Responsive down to 1024px (laptop minimum)
- Mobile-responsive structure in place for future (post-MVP)

**Key Design Principles:**
1. **Clarity over Complexity** - Clean, uncluttered interfaces
2. **Instant Feedback** - Real-time updates, toast notifications, loading states
3. **Progressive Disclosure** - Show relevant info when needed, hide complexity
4. **Accessibility** - WCAG 2.1 AA compliance via Shadcn components

---

### 3.2 Implementation Decisions

#### Calendar Component Strategy

**For Mentee Booking (Slot Selection):**
- **Custom SlotPicker component** - Week grid view showing available slots as clickable buttons
- Lightweight (~10-20KB custom code)
- Perfect fit for slot selection use case
- Easy to add availability matching visual indicators
- Real-time updates via Supabase Realtime

**For Mentor Availability Management:**
- **Form-based approach (MVP)** - Simple date/time range inputs with recurrence selector
- Fast to implement and ship
- Visual calendar with drag-and-drop deferred to FE20

**For Charts (Admin Dashboard):**
- **Recharts library** (~50KB) for simple, non-interactive visualizations
- Bar charts, line charts, gauge charts for KPIs
- Tooltip interactivity only

**Filter Persistence:**
- URL parameter encoding for mentor directory filters
- Enables bookmarking, sharing, and browser back/forward navigation
- Example: `/mentors?industries=ai,fintech&stage=seed&tier=gold`

---

### 3.3 Core Screens and Views

#### Authentication Flow

**Login/Signup Screen**
- Passwordless magic link input (email field + "Send magic link" button)
- OAuth options: "Continue with Google" / "Continue with Microsoft" buttons
  - **OAuth flow requests both auth + calendar permissions** (single consent screen per FR2)
  - Google scopes: `openid`, `email`, `profile`, `https://www.googleapis.com/auth/calendar.readonly`, `https://www.googleapis.com/auth/calendar.events`
  - Microsoft scopes: `openid`, `email`, `profile`, `Calendars.ReadWrite`
- Error state: "Email not found - Contact admin for access"
- Loading state during authentication

**Post-Login: Calendar Connection Prompt (Magic Link Users Only)**
- If user authenticated via magic link and has no connected calendar:
  - Show dismissible banner on dashboard: "Connect your calendar to book meetings and manage availability"
  - OAuth buttons: "Connect Google Calendar" / "Connect Outlook Calendar"
  - Dismiss button: "I'll do this later"
  - Banner reappears on subsequent logins until calendar connected
- After successful calendar connection: Remove banner, enable all features

**Calendar Required: Action-Level Blocking**
- When user without connected calendar attempts booking/availability action (per FR105):
  - Action blocked with modal: "Calendar connection required"
  - Message: "To [book meetings / view availability / create availability], please connect your calendar"
  - OAuth buttons: "Connect Google Calendar" / "Connect Outlook Calendar"
  - Cancel button returns to previous screen
- **Actions requiring calendar:**
  - Viewing available mentor/mentee time slots
  - Booking meetings
  - Creating availability blocks
- **Actions NOT requiring calendar:**
  - Viewing mentor/mentee directories
  - Viewing profiles
  - Coordinator dashboard access
  - Profile editing
  - Browsing without booking

**Components:** Input (email), Button (primary, secondary), Card (container), Alert (for errors), Banner (calendar prompt), Modal (calendar required blocker)

---

#### User Profile Screens

**Profile View/Edit (All Users)**
- Header: Avatar, name, title, company
- Sections:
  - Contact Info (email, phone, LinkedIn, website, additional links)
  - Tags/Categories (visual chips: confirmed vs. auto-generated styling)
  - Reputation Score (for mentees/mentors - visual breakdown)
- Edit mode: Inline editing with save/cancel

**Mentee-Specific Profile**
- Pitch.vc profile link field
- Document upload area (pitch decks) with drag-and-drop
- Uploaded files list with download/delete actions

**Mentor-Specific Profile**
- Expertise description (rich text area)
- Ideal mentee profile description
- Availability management shortcut button

**Components:** Avatar, Input, Textarea, Badge (tags), File upload component, Card sections, Progress indicator (reputation breakdown), Tabs (if combining view/edit modes)

---

#### Matching & Discovery

**Mentor Directory (Mentee View)**
- **Layout:** Grid or list view toggle
- **Filters sidebar:**
  - Industries (multi-select)
  - Technologies (multi-select)
  - Stage (single-select)
  - Reputation tier (checkboxes)
  - Availability (has slots this week/month)
  - **Filter persistence:** URL parameters enable bookmarking and sharing
- **Recommendation section (top):**
  - "Recommended for you" banner
  - 3-5 mentor cards with match scores
  - Match explanation badges ("3 shared tags", "Similar stage")
- **All mentors section (below):**
  - Searchable/filterable list
  - Pagination or infinite scroll

**Mentor Card:**
- Avatar, name, title, company
- Tags (top 3-5 most relevant)
- Reputation tier badge
- Match score (if in recommendations)
- "View Profile" button
- "Book Meeting" button (primary action)
- Inactive badge if applicable

**Mentee Directory (Mentor View)**
- Similar layout to mentor directory
- "Reach Out" button sends "I want to meet you" email
- Match explanations focused on how mentor can help

**Components:** Card (mentor/mentee cards), Badge (tags, reputation, match score), Button (actions), Select, Checkbox (filters), Input (search), Tooltip (match explanations)

---

#### Calendar & Availability Management

**Mentor Availability Dashboard**
- **View:** List/card view of availability blocks (not full calendar for MVP)
- **Upcoming bookings:** Shows booked slots with mentee info
- **Create availability** button opens form/modal

**Create/Edit Availability Form:**
- Recurrence selector (one-time, weekly, monthly, quarterly)
- Date range picker (start/end dates)
- Time range picker (e.g., 2:00 PM - 4:00 PM)
- Duration per slot dropdown (15/20/30/60 min)
- Buffer time input (minutes between sessions)
- Meeting type radio buttons:
  - In-person (preset location dropdown)
  - In-person (custom location text input)
  - Online (auto Google Meet)
- Description field (optional - what this block is for)
- Save/Cancel buttons

**Availability Blocks List:**
- Card-based display showing:
  - Recurrence pattern (e.g., "Every Tuesday")
  - Time range (e.g., "2:00 PM - 4:00 PM")
  - Duration per slot (e.g., "30-minute slots")
  - Meeting type
  - Number of bookings (e.g., "3 of 4 slots booked")
- Actions: Edit, Delete (blocked if slots are booked)

**Components:** Form inputs (Date/Time pickers, Select, Radio Group), Card (availability blocks), Button, Modal/Dialog, List items

**Note:** Visual calendar view with drag-and-drop is a future enhancement (FE20).

---

#### Booking Flow

**Booking Screen (Mentee selecting slot)**
- **Left side:** Mentor profile summary (avatar, name, expertise, reputation)
- **Right side:** Custom slot picker component

**Slot Picker Component (Week Grid View):**
```
┌─────────────────────────────────────────────────────┐
│  Week of Jan 8-14, 2025              < Prev  Next > │
│  [✓] Show only when I'm available                   │ ← Filter toggle (calendar required)
├─────────────────────────────────────────────────────┤
│  Mon 1/8   │ Tue 1/9   │ Wed 1/10  │ Thu 1/11      │
├────────────┼───────────┼───────────┼───────────────┤
│  10:00 AM  │ 10:00 AM  │ 3:00 PM ⭐│               │
│  10:30 AM  │ 2:00 PM   │           │               │
│  11:00 AM  │ 2:30 PM   │           │               │
└────────────┴───────────┴───────────┴───────────────┘
```
- Available slots as clickable buttons
- ⭐ = Mutual availability (both mentee and mentor free, based on connected calendars)
- Real-time updates: Slot disappears if booked by another user
- Minimum 1-day advance enforced (past dates grayed out)
- Calendar sync required before booking (enforced per FR105)

**Real-time Implementation (per NFR28):**
```typescript
// SlotPicker Realtime Subscription
useEffect(() => {
  const subscription = supabase
    .channel(`slots-${mentorId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'time_slots',
        filter: `mentor_id=eq.${mentorId},start_time=gte.${new Date().toISOString()}`,
      },
      (payload) => {
        // Update slot availability in real-time
        handleSlotUpdate(payload);
      }
    )
    .subscribe();

  return () => subscription.unsubscribe();
}, [mentorId]);

// Scoped subscription: Only subscribes to future slots for current mentor
// Prevents global time_slots table subscription (reduces load per NFR28)
```

**Booking Form (appears after slot selection):**
- Meeting goal description (textarea, required, min 10 chars)
- Materials to review (URL inputs, optional, multiple allowed)
- Confirmation: "This meeting is scheduled for [DATE/TIME] in your timezone ([TIMEZONE])"
- Actions: "Confirm Booking" (primary), "Cancel"

**Confirmation Toast:**
- Success message: "Meeting booked! Calendar invite sent."
- Show meeting details: date, time, Google Meet link
- Actions: "View my bookings"

**Availability Matching Feature:**
- Toggle: "Show only when I'm available"
- Uses mentee's connected calendar (Google or Microsoft, required per FR105)
- System fetches mentee's busy times and filters/highlights slots
- Privacy: Only fetches "busy/free" status, not event details
- Shows "Last synced: X minutes ago" indicator

**Components:** Split layout (profile + slot picker), Custom SlotPicker component (week grid), Textarea, Input, Button, Toast notification, Badge (mutual availability indicator)

---

#### Booking Management

**My Bookings Dashboard**
- **Tabs:** Upcoming / Past / Canceled
- **Upcoming meetings:**
  - Meeting cards: participant info, date/time, meeting link, description
  - Actions: Cancel meeting, Add to calendar, Copy meeting link
- **Past meetings:**
  - Meeting cards (same layout)
  - Rating prompt if not yet rated: "Rate this session" (1-5 stars)
- **Canceled meetings:**
  - Grayed out cards with cancellation reason/date

**Meeting Detail View:**
- Full info: participant profiles, meeting goal, materials, notes
- Calendar integration status
- Google Meet link (if online)
- Cancel button with confirmation

**Components:** Tabs, Card (meeting cards), Badge (status: upcoming, completed, canceled), Button (actions), Rating component (star selector), Dialog (confirmation)

---

#### Reputation & Ratings

**Reputation Score Display (in profile):**
- Large score number with tier badge
- Breakdown list:
  - Average rating: X/5 stars
  - Completion rate: X%
  - Responsiveness: X.Xx multiplier
  - Tenure bonus: +X.X
- Access tier info: "Silver tier - 5 bookings/week max"
- Simple bar chart or progress indicators for visual breakdown

**Post-Meeting Rating Modal:**
- Appears after meeting completion
- "How was your session with [NAME]?"
- 1-5 star selector (large, clickable stars)
- Optional text feedback (textarea)
- Submit button

**Tier Restriction Override Request:**
- "Request Exception" button on restricted mentor profile
- Modal: Reason field (textarea, required)
- Submit → Shows confirmation: "Request sent to coordinator"

**Components:** Progress indicators (reputation breakdown), Rating component (stars), Textarea, Modal/Dialog, Badge (tier), Simple bar chart (Recharts)

---

#### Admin/Coordinator Dashboard

**Overview Tab:**
- KPI cards:
  - Mentor utilization rate (simple percentage display)
  - Weekly slots filled (number + trend indicator)
  - Active users (number)
  - Upcoming meetings (number)
- Simple charts:
  - Booking trends (line chart)
  - Top mentors/mentees by activity (bar chart)
- **Chart Library:** Recharts (~50KB, lightweight, simple visualizations)
- **Interactivity:** Tooltips only, no drill-down or complex interactions

**Override Requests Tab:**
- Table/list of pending tier override requests
- Columns: Mentee name, Mentor name, Reason, Date requested
- Row actions: Approve (button), Deny (button), View details
- Approved/Denied requests in separate tabs or filter

**User Management Tab:**
- User search and filter
- User list with roles, reputation, status
- Actions: View profile, Edit reputation, Deactivate

**Meeting Management Tab:**
- All meetings list with filters (date range, user, status)
- Actions: View details, Cancel, Edit (white-glove scheduling)

**Audit Log Tab:**
- Filterable log table
- Columns: Action, Admin, Timestamp, Details, Reason
- Expandable rows for before/after values

**Components:** Dashboard grid layout, Card (KPI cards), Charts (line, bar - Recharts), Table with sortable columns, Button (actions), Tabs, Search, Filters

---

#### Tag Management (Coordinator)

**Tag Management Tab:**
- Dedicated section in coordinator dashboard
- **Pending Approvals** view:
  - Table/list of new tags awaiting approval (from taxonomy table where `is_active = false`)
  - Columns: Tag category (industry/technology/stage), Tag value, Requested by, Date requested, Source
  - Row actions: Approve (button), Reject (button), View usage
  - Toast notification if user is currently online when new tag is submitted
- **Active Tags** view:
  - Searchable/filterable list of all approved tags
  - Columns: Category, Value, Display name, Usage count, Date added
  - Actions: Edit display name, Deactivate
- **Rejected Tags** view (optional):
  - Archive of rejected tags with rejection reasons

**Pending Tag Approval Toast:**
- Appears for coordinators when new tag is submitted while they're online
- Message: "New tag pending approval: {category} - {value}"
- Actions: "Review now" (links to tag management tab), Dismiss

**Components:** Table with sortable columns, Toast notification, Button (actions), Tabs, Search filter (by category), Badge (pending/active status)

**Note:** Auto-approval rules for certain users/scenarios is out of scope for MVP (future enhancement)

---

### 3.4 UI Consistency Requirements

#### Component Usage Standards

**Buttons:**
- Primary actions: Blue, solid background (e.g., "Book Meeting", "Confirm")
- Secondary actions: Gray, outline (e.g., "Cancel", "View Profile")
- Destructive actions: Red, outline (e.g., "Delete", "Cancel Meeting")
- Icon buttons: Consistent sizing, hover states

**Forms:**
- Clear labels above inputs
- Required fields marked with asterisk (*)
- Validation errors inline, red text below input
- Help text gray, smaller font below input
- Consistent spacing between fields

**Loading States:**
- Skeleton screens for initial loads (card/list layouts)
- Spinners for button actions ("Loading..." with spinner)
- Disabled state during processing

**Empty States:**
- Friendly illustrations or icons
- Clear messaging: "No upcoming meetings"
- Call-to-action: "Browse mentors to schedule your first session"

**Toast Notifications:**
- Success: Green background, checkmark icon
- Error: Red background, X icon
- Info: Blue background, info icon
- Auto-dismiss after 5 seconds, dismissible via X button
- Positioned top-right corner

**Colors (Using Shadcn/Tailwind defaults):**
- Primary: Blue (actions, links)
- Success: Green (confirmations, positive states)
- Warning: Yellow (cautions, pending states)
- Error: Red (errors, destructive actions)
- Neutral: Gray scale (backgrounds, borders, text)

**Typography:**
- Headings: Bold, larger sizes (H1, H2, H3)
- Body: Regular weight, readable line-height
- Small text: Gray color for secondary info
- Monospace: For codes, IDs

**Spacing:**
- Consistent padding/margin using Tailwind's spacing scale
- Card padding: p-6 (24px)
- Section spacing: gap-4 or gap-6
- Component margins: mb-4, mt-6, etc.

---

### 3.5 User Experience Flows

#### Flow 1: Mentee Booking a Meeting

1. **Entry:** Mentee logs in (OAuth: calendar auto-connected; Magic link: sees dismissible banner)
2. **Discovery:** Dashboard shows "Recommended Mentors" → Clicks "View All Mentors" or selects recommended mentor
3. **Selection:** Reviews mentor profile → Clicks "Book Meeting"
4. **Calendar Check:** If mentee has no connected calendar, modal appears: "Calendar connection required. To book meetings, please connect your calendar" with OAuth buttons
5. **Calendar Connection (if needed):** Mentee selects Google/Microsoft → OAuth flow → Returns to booking
6. **Slot Selection:** Week grid shows available slots → Enables "Show only when I'm available" filter → Clicks desired slot
7. **Booking Form:** Fills meeting goal (required) and materials (optional)
8. **Confirmation:** Reviews details (date/time/timezone) → Clicks "Confirm Booking"
9. **API Check:** System checks both mentor's and mentee's external calendars for conflicts (per FR106)
10. **Success:** Toast notification + calendar invite email sent + event added to both calendars
11. **Follow-up:** Reminder email 1 hour before (or 24 hours based on preference)

**UX Considerations:**
- **OAuth users:** Calendar auto-connected during signup, no prompts needed
- **Magic link users:** Can browse app freely, prompted for calendar only when attempting booking/availability action
- Real-time slot updates via Supabase Realtime (slot disappears if booked by another user)
- Clear timezone display throughout
- Minimum 1-day advance enforced with message if violated
- External calendar conflict check for both parties before confirmation (shows error if conflict detected)
- Mutual availability indicator (⭐) highlights slots when both parties are free

---

#### Flow 2: Mentor Setting Availability

1. **Entry:** Mentor logs in (OAuth: calendar auto-connected; Magic link: sees dismissible banner) → Dashboard shows "Manage Availability"
2. **View:** List/cards display current availability blocks and upcoming bookings
3. **Create:** Clicks "Add Availability" → Form opens
4. **Calendar Check:** If mentor has no connected calendar, modal appears: "Calendar connection required. To create availability, please connect your calendar" with OAuth buttons
5. **Calendar Connection (if needed):** Mentor selects Google/Microsoft → OAuth flow → Returns to availability form
6. **Configure:** Selects recurrence, date range, time range, duration per slot, meeting type
7. **Preview:** System shows how many slots will be created (e.g., "This will create 4 slots per week")
8. **Save:** Clicks "Save" → Availability block appears in list
9. **Confirmation:** Toast notification: "Availability added"

**UX Considerations:**
- **OAuth users:** Calendar auto-connected during signup, no prompts needed
- **Magic link users:** Can browse app and view dashboard, prompted for calendar only when attempting to create availability
- Form validation prevents overlapping availability blocks
- Cannot delete availability blocks with confirmed bookings (shows error with booking count)
- Buffer time preview shows actual slot distribution (e.g., "30min slots + 10min buffer = 3 slots in 2 hours")

---

#### Flow 3: Tier Override Request

1. **Entry:** Bronze mentee browses mentors → Sees Gold mentor (restricted)
2. **Restriction:** "Book Meeting" button disabled, "Request Exception" button shown with explanation
3. **Request:** Clicks "Request Exception" → Modal opens with reason field (required)
4. **Submit:** Enters reason → Clicks "Submit"
5. **Confirmation:** Toast: "Request sent to coordinator"
6. **Notification:** Coordinator receives email with:
   - Approve link (direct action)
   - Dashboard link (anchored to specific request)
7. **Approval:** Coordinator clicks Approve (in email or dashboard) → System updates permissions
8. **Notification:** Mentee receives email: "Your exception request was approved"
9. **Booking:** Mentee can now book that mentor (restriction temporarily lifted for that mentor only)

**UX Considerations:**
- Clear messaging about why mentor is restricted ("Gold mentors require Silver tier or exception")
- Expected response time displayed ("Coordinators typically respond within 24 hours")
- Request status visible in mentee's dashboard

---

#### Flow 4: Post-Meeting Rating

1. **Trigger:** 1 hour after meeting end time → System checks if rating submitted
2. **Prompt:** Email sent: "How was your session with [NAME]?" with rate link
3. **Rating:** User clicks link → Rating modal opens (can also access from past meetings in dashboard)
4. **Selection:** Clicks 1-5 stars, optionally adds text feedback
5. **Submit:** Clicks "Submit Rating"
6. **Confirmation:** Toast: "Thank you for your feedback!"
7. **Update:** Reputation score recalculated (if both parties rated)

**UX Considerations:**
- Rating is optional (can skip or dismiss)
- Both parties rate independently (mutual rating requirement for score impact)
- Past meetings show "Rate this session" badge if not yet rated
- Ratings remain private between parties and coordinators

---

### 3.6 Responsive Considerations (Future Enhancement)

While MVP is desktop-optimized, structure is mobile-responsive:

**Layout Adaptations:**
- Grid → Single column on mobile
- Sidebar filters → Collapsible drawer
- Slot picker grid → Scrollable day/list view
- Tables → Card-based list view

**Touch Optimizations:**
- Larger touch targets (min 44x44px)
- Swipe gestures for navigation
- Bottom navigation bar for primary actions

**Performance:**
- Lazy loading for images and large lists
- Optimized bundle size (code splitting)

---

## 4. Technical Constraints and Integration

### 4.1 Database Schema Design

#### Core Tables

**users (core, stable schema)**
```sql
- id (uuid, pk)
- airtable_record_id (text, unique) -- Stable ID from Airtable
- email (text, unique, not null)
- role (enum: mentee, mentor, coordinator)
- reputation_score (numeric, default 3.5)
- reputation_tier (enum: bronze, silver, gold, platinum)
- is_active (boolean, default true)
- last_activity_at (timestamptz)
- created_at (timestamptz, not null)
- updated_at (timestamptz, not null)
- deleted_at (timestamptz, null)
```

**user_profiles (extended, changeable schema)**
```sql
- id (uuid, pk)
- user_id (uuid, fk -> users, unique)
- name (text)
- title (text)
- company (text)
- phone (text)
- linkedin_url (text)
- website_url (text)
- pitch_vc_url (text)
- expertise_description (text) -- mentor only
- ideal_mentee_description (text) -- mentor only
- bio (text)
- avatar_url (text) -- Uploaded or URL-provided avatar
- avatar_source_type (enum: upload, url, null)
- avatar_metadata (jsonb) -- Stores cropping settings: {zoom, pan_x, pan_y, rotation}
- reminder_preference (enum: one_hour, twenty_four_hours, both, default: one_hour)
- additional_links (jsonb) -- Flexible array for future links
- metadata (jsonb) -- Catch-all for experimentation
- created_at (timestamptz)
- updated_at (timestamptz)
```

**Rationale for Split:**
- Core user data (auth, reputation, role) rarely changes → minimal migrations
- Profile fields can be added/modified without touching core table
- JSONB columns (`additional_links`, `metadata`) provide escape hatch for rapid iteration
- Better separation of concerns: identity vs. profile information

---

**user_tags**
```sql
- id (uuid, pk)
- user_id (uuid, fk -> users)
- category (enum: industry, technology, stage)
- tag_value (text, not null)
- is_confirmed (boolean, default false)
- source (enum: airtable, user, auto_generated, admin)
- confirmed_at (timestamptz, null)
- confirmed_by (uuid, fk -> users, null) -- User who confirmed or system
- created_at (timestamptz)
- updated_at (timestamptz)
- deleted_at (timestamptz, null)
- UNIQUE(user_id, category, tag_value) WHERE deleted_at IS NULL
```

**Tag Confirmation Logic:**
- **Airtable source** (source=airtable): Auto-populated from Airtable user records, `is_confirmed=true`, `confirmed_at` set to creation time, `confirmed_by=null` (system)
- **Admin source** (source=admin): Coordinator adds tag to user profile, `is_confirmed=true` immediately, `confirmed_by` set to coordinator user_id
- **User source** (source=user): User manually adds tag from taxonomy, `is_confirmed=false` initially, becomes true when user confirms, `confirmed_by` set to self
- **Auto-generated source** (source=auto_generated): System suggests tags based on profile/activity, `is_confirmed=false` until user confirms, `confirmed_by` set to user when confirmed

**Tag Confirmation Workflow:**
- Auto-generated tags: `is_confirmed = false, confirmed_by = null`
- User confirms: `is_confirmed = true, confirmed_at = NOW(), confirmed_by = user_id`
- Airtable tags: `is_confirmed = true, source = airtable, confirmed_by = null` (system-confirmed)

---

**availability_blocks**
```sql
- id (uuid, pk)
- mentor_id (uuid, fk -> users)
- recurrence_pattern (enum: one_time, weekly, monthly, quarterly)
- start_date (date, not null)
- end_date (date, null) -- null for ongoing
- start_time (time, not null) -- e.g., 14:00:00
- end_time (time, not null) -- e.g., 16:00:00
- slot_duration_minutes (integer, not null) -- 15, 20, 30, 60
- buffer_minutes (integer, default 0)
- meeting_type (enum: in_person_preset, in_person_custom, online)
- location_preset_id (uuid, fk -> locations, null)
- location_custom (text, null)
- description (text)
- created_at (timestamptz)
- updated_at (timestamptz)
- deleted_at (timestamptz, null)
```

---

**time_slots** (Generated from availability_blocks)
```sql
- id (uuid, pk)
- availability_block_id (uuid, fk -> availability_blocks)
- mentor_id (uuid, fk -> users)
- start_time (timestamptz, not null) -- Full datetime in UTC
- end_time (timestamptz, not null)
- is_booked (boolean, default false)
- booking_id (uuid, fk -> bookings, null)
- created_at (timestamptz)
- deleted_at (timestamptz, null)
- UNIQUE(mentor_id, start_time) WHERE deleted_at IS NULL
```

---

**bookings**
```sql
- id (uuid, pk)
- time_slot_id (uuid, fk -> time_slots, unique)
- mentor_id (uuid, fk -> users)
- mentee_id (uuid, fk -> users)
- meeting_goal (text, not null)
- materials_urls (text[])
- meeting_type (enum: in_person_preset, in_person_custom, online)
- location (text)
- google_meet_link (text)
- status (enum: confirmed, completed, canceled)
- canceled_by (uuid, fk -> users, null)
- canceled_at (timestamptz, null)
- cancellation_reason (enum: emergency, reschedule, other, null)
- cancellation_notes (text, null)
- meeting_start_time (timestamptz, not null)
- meeting_end_time (timestamptz, not null)
- created_at (timestamptz)
- updated_at (timestamptz)
- deleted_at (timestamptz, null)
```

---

**ratings**
```sql
- id (uuid, pk)
- booking_id (uuid, fk -> bookings)
- rater_id (uuid, fk -> users) -- Who gave the rating
- rated_user_id (uuid, fk -> users) -- Who received the rating
- score (integer, not null) -- 1-5
- feedback_text (text)
- created_at (timestamptz)
- deleted_at (timestamptz, null)
- UNIQUE(booking_id, rater_id)
```

---

**reputation_history**
```sql
- id (uuid, pk)
- user_id (uuid, fk -> users)
- old_score (numeric)
- new_score (numeric, not null)
- old_tier (text)
- new_tier (text, not null)
- calculation_details (jsonb) -- Breakdown of score components
- trigger_event (enum: rating_received, meeting_completed, meeting_canceled, admin_override)
- created_at (timestamptz)
```

---

**tier_override_requests**
```sql
- id (uuid, pk)
- mentee_id (uuid, fk -> users)
- mentor_id (uuid, fk -> users)
- reason (text, not null)
- status (enum: pending, approved, denied)
- scope (enum: one_time, default: one_time, not null) -- Future: could support 'permanent' or 'tier_upgrade'
- expires_at (timestamptz, not null) -- Set to reviewed_at + 7 days when approved. Pending requests use created_at + 7 days (auto-reject if not reviewed within 7 days)
- used_at (timestamptz, null) -- When mentee successfully booked using this override (only for approved requests)
- reviewed_by (uuid, fk -> users, null)
- reviewed_at (timestamptz, null)
- review_notes (text, null)
- created_at (timestamptz)
- updated_at (timestamptz)
```

**Override Scope & Expiration (MVP: One-Time Only):**
- **one_time** (MVP default): Approved exception allows mentee to book this specific mentor once within 1 week of approval
- **Expiration Logic:**
  - On creation (mentee request): `status='pending'`, `expires_at = created_at + 7 days`
  - Pending requests expire after 7 days if not reviewed (system shows as expired in coordinator dashboard, can still be manually reviewed)
  - On approval: `status='approved'`, `expires_at = reviewed_at + 7 days` (7-day window starts from approval, not request creation)
  - On mentor-initiated requests: `status='approved'` immediately upon creation, `expires_at = created_at + 7 days`, `reviewed_by = mentor_id`
  - Approved requests are valid until `expires_at` OR `used_at` is populated (whichever comes first)
  - Booking system checks: `status = 'approved' AND used_at IS NULL AND expires_at > NOW()`
  - After expiration, mentee must submit new override request
  - Denied requests: Immediately unusable regardless of `expires_at` value
- Future enhancements could support:
  - `permanent`: Grants permanent access to specific mentor
  - `tier_upgrade`: Temporary tier bump for all mentors in target tier with custom expiration

---

**audit_log**
```sql
- id (uuid, pk)
- action_type (text, not null) -- e.g., 'reputation_override', 'meeting_canceled'
- admin_user_id (uuid, fk -> users)
- target_entity_type (text) -- e.g., 'booking', 'user'
- target_entity_id (uuid)
- before_value (jsonb)
- after_value (jsonb)
- reason (text)
- created_at (timestamptz)
```

---

**airtable_sync_log**
```sql
- id (uuid, pk)
- webhook_payload (jsonb, not null) -- Full raw payload
- processed_at (timestamptz)
- records_updated (integer)
- errors (jsonb)
- created_at (timestamptz)
```

---

**locations** (Preset meeting locations)
```sql
- id (uuid, pk)
- name (text, not null)
- address (text, not null)
- notes (text)
- is_active (boolean, default true)
- created_at (timestamptz)
```

---

**taxonomy** (CF Taxonomy - synced from Airtable)
```sql
- id (uuid, pk)
- airtable_record_id (text, unique, nullable - null for user-submitted tags)
- category (enum: industry, technology, stage)
- value (text, not null)
- display_name (text, not null)
- source (enum: airtable, admin, user_request, not null)
- is_approved (boolean, default false, not null)
- requested_by (uuid, fk -> users, nullable - only for source=user_request)
- approved_by (uuid, fk -> users, nullable)
- requested_at (timestamptz, nullable)
- approved_at (timestamptz, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)
- UNIQUE(category, value)
```

**Taxonomy Sources & Approval Workflow:**
- **Airtable** (source=airtable): Synced via webhooks, always approved (is_approved=true), airtable_record_id populated
- **Admin-Created** (source=admin): Created by coordinators via admin UI, always approved (is_approved=true)
- **User-Requested** (source=user_request): Submitted by mentors/mentees when selecting non-existent tag, requires coordinator approval (is_approved=false initially), requested_by/requested_at populated
- Used for tag auto-generation and validation
- Coordinators approve user-requested tags via admin UI, setting is_approved=true, approved_by, approved_at

---

**calendar_integrations**
```sql
- id (uuid, pk)
- user_id (uuid, fk -> users, not null)
- provider (enum: google, microsoft, not null)
- access_token (text, not null)
- refresh_token (text, not null)
- token_expires_at (timestamptz, not null)
- granted_scopes (text[], not null) -- OAuth scopes granted (e.g., ['calendar.readonly', 'calendar.events'] for Google, ['Calendars.ReadWrite'] for Microsoft)
- connection_method (enum: oauth_signup, post_login, not null) -- How calendar was connected: during OAuth signup (FR2) or post-login for magic link users
- is_connected (boolean, default true)
- available_calendars (jsonb) -- [{id, name, isPrimary, color}, ...]
- write_calendar_id (text) -- Which calendar to write bookings to
- read_calendar_ids (text[]) -- Which calendars to check for availability
- last_sync_at (timestamptz)
- created_at (timestamptz)
- updated_at (timestamptz)
- CONSTRAINT one_provider_per_user UNIQUE(user_id) WHERE is_connected = true
```

**Coordinator Calendar Exemption (FR105):**
- Coordinators are exempt from calendar connection requirement and can perform all functions without connected calendar
- Application-level enforcement: Booking and availability actions check both user role AND calendar connection status
- Database constraint allows coordinators to have null/no calendar integration records

**Connection Methods:**
- **oauth_signup** (FR2): User authenticated via Google/Microsoft OAuth, calendar permissions granted during signup flow
- **post_login**: User authenticated via magic link (or coordinator), connected calendar after login via separate OAuth flow

**Multi-Calendar Support:**
- MVP restricts to one provider per user (Google OR Microsoft) via unique constraint on user_id where is_connected=true
- Users can select which calendar(s) to:
  1. Write events to (single calendar)
  2. Read for availability checking (multiple calendars)
- `available_calendars` stores list from OAuth discovery for user selection

---

**notification_log**
```sql
- id (uuid, pk)
- notification_type (enum: booking_confirmed, booking_cancelled, booking_reminder, rating_request, tier_changed, mentor_reach_out, override_approved, override_rejected, tag_approval_pending, not null)
- recipient_id (uuid, fk -> users, not null)
- delivery_channel (enum: email, toast, both, not null)
- delivery_status (enum: sent, failed, not null)
- error_message (text) -- If delivery_status = 'failed'
- metadata (jsonb) -- Additional context (booking_id, mentor_id, etc.)
- sent_at (timestamptz)
- created_at (timestamptz)
```

**Retention Policy:**
- MVP: Unlimited retention
- Future: Add retention policy (30/90 days) to reduce storage costs

---

**ical_feed_tokens**
```sql
- id (uuid, pk)
- user_id (uuid, fk -> users, unique, not null)
- token (text, unique, not null) -- Secure random token (cryptographically secure UUID)
- is_active (boolean, default true)
- created_at (timestamptz)
- last_accessed_at (timestamptz)
```

**Token Security:**
- Token-based authentication for calendar subscriptions (industry standard)
- One active token per user
- Users can regenerate token to revoke access (invalidates old token immediately)
- Tokens transmitted via HTTPS only
- Rate limiting: Max 1 request per minute per token

---

**tier_override_tokens** (Magic link tokens for email approval)
```sql
- id (uuid, pk)
- tier_override_request_id (uuid, fk -> tier_override_requests, unique)
- token (text, unique, not null) -- JWT token
- expires_at (timestamptz, not null) -- 7 days from creation
- used_at (timestamptz, null)
- created_at (timestamptz)
```

**Token Generation:**
- JWT with payload: `{ requestId, action: 'approve', exp: 7days }`
- Signed with `JWT_SECRET`
- Single-use token (marked `used_at` on redemption)
- Embedded in email links: `/api/tier-overrides/approve/{token}`

---

#### Database Views (Soft Delete Filtering)

```sql
-- Active users with profiles
CREATE VIEW active_users_with_profiles AS
SELECT u.*, up.*
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.deleted_at IS NULL;

-- Active bookings
CREATE VIEW active_bookings AS
SELECT * FROM bookings WHERE deleted_at IS NULL;

-- Available slots (not booked, future, 1+ day advance)
CREATE VIEW available_slots AS
SELECT * FROM time_slots
WHERE deleted_at IS NULL
  AND is_booked = false
  AND start_time > NOW() + INTERVAL '1 day';
```

---

#### Row Level Security (RLS) Policies

**users table:**
- Authenticated users can read all active users
- Users can update only their own profile
- Coordinators can update any user

**user_profiles table:**
- All authenticated users can read all profiles
- Users can update only their own profile
- Coordinators can update any profile

**bookings table:**
- Users can read their own bookings (as mentor or mentee)
- Coordinators can read all bookings
- Users can create bookings where they are mentee
- Users can cancel their own bookings

**ratings table:**
- Users can read ratings they gave or received
- Users can create ratings for bookings they participated in
- Coordinators can read all ratings

**audit_log table:**
- Only coordinators can read audit logs

---

### 4.2 API Architecture

#### API Structure (Hono + Cloudflare Workers)

**Base Structure:**
```
/api
  /auth
    POST /login (magic link)
    POST /oauth/google (combined auth + calendar permissions per FR2)
    POST /oauth/microsoft (combined auth + calendar permissions per FR2)
    POST /logout
  /users
    GET  /me
    PUT  /me
    GET  /:id
    GET  /search (with filters)
  /profiles
    GET  /:userId
    PUT  /:userId
    POST /:userId/avatar (multipart/form-data upload)
  /mentors
    GET  / (directory)
    GET  /:id
    GET  /:id/availability
    GET  /:id/recommended (for specific mentee)
    POST /:mentorId/send-interest (mentor expresses interest in mentee)
  /mentees
    GET  / (directory)
    GET  /:id
  /availability
    POST   / (create block)
    PUT    /:id
    DELETE /:id
    GET    /my-blocks
  /bookings
    POST   / (create booking)
    PUT    /:id/cancel
    GET    /my-bookings
    GET    /:id
  /slots
    GET /available (query params: mentorId, startDate, endDate)
  /ratings
    POST / (submit rating)
    GET  /my-ratings
  /reputation
    GET /:userId
    GET /:userId/history
  /tier-overrides
    POST   / (request override)
    GET    /requests (for coordinators)
    PUT    /:id/approve
    PUT    /:id/deny
  /admin
    GET  /dashboard/stats
    GET  /users
    PUT  /users/:id/reputation
    GET  /bookings
    GET  /audit-log
  /calendar
    POST /connect (OAuth flow for magic link users, post-login calendar connection)
    POST /disconnect
    GET  /sync-status
    GET  /feed/:userId/:token (public iCal feed, token-authenticated)
    POST /feed/regenerate (authenticated user, regenerates iCal token)
  /taxonomy
    GET  / (all approved tags for tag selection UI, all users)
    GET  /pending (coordinator: pending approval tags)
    PUT  /:id/approve (coordinator: approve tag, update is_approved, approved_by, approved_at)
    PUT  /:id/reject (coordinator: soft-delete tag entry)
  /webhooks
    POST /airtable (receives Airtable webhooks)
  /health
    GET / (health check endpoint)
```

---

#### Zod Schema Examples

**Create Booking Schema:**
```typescript
const CreateBookingSchema = z.object({
  mentorId: z.string().uuid(),
  timeSlotId: z.string().uuid(),
  meetingGoal: z.string().min(10).max(1000),
  materialsUrls: z.array(z.string().url()).optional(),
});

type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
```

**Availability Block Schema:**
```typescript
const CreateAvailabilitySchema = z.object({
  recurrencePattern: z.enum(['one_time', 'weekly', 'monthly', 'quarterly']),
  startDate: z.string().date(),
  endDate: z.string().date().nullable(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotDurationMinutes: z.enum([15, 20, 30, 60]).transform(Number),
  bufferMinutes: z.number().min(0).max(60).default(0),
  meetingType: z.enum(['in_person_preset', 'in_person_custom', 'online']),
  locationPresetId: z.string().uuid().nullable(),
  locationCustom: z.string().max(500).nullable(),
  description: z.string().max(500).optional(),
});
```

---

#### OAuth Flow Details

**Combined Auth + Calendar OAuth (FR2) - Google/Microsoft Signup**

```typescript
// POST /auth/oauth/google
// Initiates OAuth flow with combined scopes

// Google OAuth Scopes (requested in single flow)
const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

// Microsoft OAuth Scopes (requested in single flow)
const MICROSOFT_SCOPES = [
  'openid',
  'email',
  'profile',
  'Calendars.ReadWrite',
];

// Flow:
1. User clicks "Continue with Google" or "Continue with Microsoft"
2. Backend generates OAuth URL with combined scopes
3. User redirects to provider consent screen (shows BOTH auth + calendar permissions)
4. User approves permissions
5. Provider redirects to callback with authorization code
6. Backend exchanges code for tokens (access_token, refresh_token)
7. Backend creates:
   - users record (if first login)
   - calendar_integrations record (connection_method='oauth_signup')
8. Return Supabase session JWT to frontend

// Result: User is authenticated AND calendar is connected in single flow
```

**Post-Login Calendar Connection (Magic Link Users)**

```typescript
// POST /calendar/connect
// Separate OAuth flow for magic link users

// Request
{
  provider: 'google' | 'microsoft'
}

// Flow:
1. User clicks "Connect Google Calendar" or "Connect Outlook Calendar" from banner/modal
2. Backend generates OAuth URL with calendar scopes only (user already authenticated)
3. User redirects to provider consent screen (shows calendar permissions only)
4. User approves permissions
5. Provider redirects to callback with authorization code
6. Backend exchanges code for tokens
7. Backend creates calendar_integrations record (connection_method='post_login')
8. Return success + redirect to original page

// Result: Calendar connected for existing authenticated user
```

---

#### New Endpoint Details

**Avatar Upload (`POST /profiles/:userId/avatar`)**

```typescript
// Request
Content-Type: multipart/form-data
Body: { file: File }

// Validation
- File type: jpg, png, webp only
- Max size: 5MB
- Image dimensions: Recommended 400x400px minimum

// Response
{
  avatar_url: string,
  avatar_source_type: 'uploaded'
}

// Implementation
- Upload to Supabase Storage bucket: 'avatars/{userId}/{filename}'
- Generate public URL
- Update user_profiles table
- Return URL and source type
```

**iCal Feed (`GET /calendar/feed/:userId/:token`)**

```typescript
// Public endpoint (no session auth required)
// Authentication via token in URL

// Response Headers
Content-Type: text/calendar; charset=utf-8
Cache-Control: no-cache, must-revalidate

// Response Body (RFC 5545 iCalendar format)
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CF Office Hours//EN
...
END:VCALENDAR

// Includes
- All confirmed future bookings for the user
- Event details: title, description, location, start/end times
- Google Meet links for virtual meetings
- Attendee information (mentor/mentee names)

// Security
- Rate limiting: Max 1 request per minute per token
- Token validation: Check ical_feed_tokens table
- Update last_accessed_at on each request
- HTTPS only (reject HTTP requests)

// Implementation Recommendation
- Use stable, well-tested library (e.g., ical-generator for Node.js)
- DO NOT implement RFC 5545 parsing/generation manually
- Leverage existing battle-tested packages for iCalendar format
```

**Regenerate iCal Token (`POST /calendar/feed/regenerate`)**

```typescript
// Requires authenticated user session

// Request
POST /calendar/feed/regenerate
Authorization: Bearer {jwt}

// Response
{
  feed_url: string, // Full URL with new token
  token: string     // New token value
}

// Implementation
- Invalidate old token: SET is_active = false WHERE user_id = current_user
- Generate new cryptographically secure token (crypto.randomUUID() or equivalent)
- Insert new ical_feed_tokens row
- Return full feed URL and token
```

**Mentor Send Interest (`POST /mentors/:mentorId/send-interest`)**

```typescript
// Mentor expresses interest in meeting a mentee (FR19)
// Requires authenticated mentor session

// Request
POST /mentors/:mentorId/send-interest
Authorization: Bearer {jwt}
{
  menteeId: string (uuid)
}

// Business Logic
1. Validate requesting user is the mentor (mentorId matches auth user OR user is coordinator)
2. Check if mentee can book mentor based on tier restriction (FR51)

   IF tier restriction allows booking:
     - Send email notification to mentee (FR19): "Mentor {name} wants to meet you"
     - Include link to mentor's booking page
     - Include "Book Meeting" CTA
     - Log notification in notification_log (type='mentor_reach_out')
     - Return: { status: 'sent', requiresApproval: false }

   IF tier restriction blocks booking:
     - Auto-create tier_override_request with:
       * status='approved' (auto-approved for mentor-initiated requests)
       * expires_at = created_at + 7 days
       * reviewed_by = mentor_id
       * reviewed_at = NOW()
       * reason = "Mentor-initiated interest" (auto-populated)
     - Send notification to mentee: "Mentor {name} wants to meet you. You can now book a meeting with them (expires in 7 days)"
     - Include link to mentor's booking page
     - Log tier override creation in audit_log
     - Return: { status: 'sent', requiresApproval: false, overrideCreated: true, expiresAt: timestamp }

// Response
{
  status: 'sent',
  requiresApproval: false,
  overrideCreated?: boolean,  // true if tier restriction was bypassed
  expiresAt?: string          // ISO timestamp when override expires (if applicable)
}

// Error Cases
- 404: Mentee not found
- 403: Requesting user is not the mentor (and not coordinator)
- 400: Mentor cannot send interest to themselves
- 409: Active tier override already exists for this mentor-mentee pair
```

---

### 4.3 Centralized Error Handling

#### Frontend Error Handling

**React Error Boundary:**
```typescript
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component<Props, State> {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error:', error, errorInfo);
    toast.error('Something went wrong. Please try again.');
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReset={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}
```

**Centralized API Client:**
```typescript
// src/lib/api-client.ts
class ApiClient {
  async request(endpoint: string, options?: RequestInit) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      return response.json();
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  private async handleErrorResponse(response: Response) {
    const body = await response.json().catch(() => ({}));

    switch (response.status) {
      case 401:
        window.location.href = '/login';
        return new Error('Session expired. Please log in again.');
      case 403:
        return new Error(body.message || 'You do not have permission.');
      case 404:
        return new Error('Resource not found.');
      case 409:
        return new Error(body.message || 'Conflict occurred.');
      case 500:
        return new Error('Server error. Please try again later.');
      default:
        return new Error(body.message || 'An error occurred.');
    }
  }

  private handleError(error: Error) {
    if (import.meta.env.DEV) {
      console.error('API Error:', error);
    }
    toast.error(error.message);
  }
}

export const apiClient = new ApiClient();
```

---

#### Backend Error Handling

**Custom Error Class:**
```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

**Centralized Error Handler Middleware:**
```typescript
// src/middleware/error-handler.ts
import { Context } from 'hono';
import { ZodError } from 'zod';

export const errorHandler = (err: Error, c: Context) => {
  console.error('API Error:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });

  if (err instanceof AppError) {
    return c.json({
      error: {
        message: err.message,
        code: err.code,
      },
    }, err.statusCode);
  }

  if (err instanceof ZodError) {
    return c.json({
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: err.errors,
      },
    }, 400);
  }

  // Unexpected errors
  return c.json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  }, 500);
};

// Apply to Hono app
app.onError(errorHandler);
```

**Usage in Routes:**
```typescript
app.post('/api/bookings', zValidator('json', CreateBookingSchema), async (c) => {
  const input = c.req.valid('json');

  const slot = await db.getSlot(input.timeSlotId);
  if (!slot || slot.is_booked) {
    throw new AppError(409, 'This slot is no longer available', 'SLOT_UNAVAILABLE');
  }

  // Create booking...
});
```

---

### 4.4 Centralized Utilities

#### Frontend Utilities

**Date/Time Utils:**
```typescript
// src/lib/date-utils.ts
import { formatInTimeZone } from 'date-fns-tz';

export const dateUtils = {
  formatForDisplay: (date: Date, timezone: string) => {
    return formatInTimeZone(date, timezone, 'MMM d, yyyy h:mm a');
  },

  toUTC: (date: Date) => date.toISOString(),

  getUserTimezone: () => Intl.DateTimeFormat().resolvedOptions().timeZone,
};
```

**Toast Notifications:**
```typescript
// src/lib/toast.ts
import { toast as sonnerToast } from 'sonner';

export const toast = {
  success: (message: string) => sonnerToast.success(message),
  error: (message: string) => sonnerToast.error(message),
  info: (message: string) => sonnerToast.info(message),
};
```

**Auth Context:**
```typescript
// src/contexts/AuthContext.tsx
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

---

#### Backend Utilities

**Authentication Middleware:**
```typescript
// src/middleware/auth.ts
export const requireAuth = async (c: Context, next: Next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new AppError(401, 'Authentication required', 'UNAUTHORIZED');
  }

  const user = await verifyToken(token);
  c.set('user', user);
  await next();
};

export const requireRole = (...roles: Role[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    if (!roles.includes(user.role)) {
      throw new AppError(403, 'Insufficient permissions', 'FORBIDDEN');
    }
    await next();
  };
};
```

**Database Helpers:**
```typescript
// src/lib/db-helpers.ts
import { createClient } from '@supabase/supabase-js';

export const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export const dbHelpers = {
  async getUserWithProfile(id: string) {
    const { data, error } = await db
      .from('users')
      .select('*, user_profiles(*)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return data;
  },

  async getAvailableSlots(mentorId: string, startDate: Date, endDate: Date) {
    const { data, error } = await db
      .from('time_slots')
      .select('*')
      .eq('mentor_id', mentorId)
      .eq('is_booked', false)
      .is('deleted_at', null)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data;
  },
};
```

---

### 4.5 Integration Patterns

#### ICalendarProvider Interface

```typescript
interface ICalendarProvider {
  // OAuth & Authentication
  getAuthUrl(userId: string, redirectUri: string): Promise<string>;
  handleCallback(code: string, userId: string): Promise<{ accessToken: string; refreshToken: string }>;
  revokeAccess(userId: string): Promise<void>;

  // Event Management
  createEvent(input: CreateEventInput): Promise<CalendarEvent>;
  updateEvent(eventId: string, updates: Partial<CreateEventInput>): Promise<CalendarEvent>;
  deleteEvent(eventId: string): Promise<void>;

  // Availability Queries
  getFreeBusy(userId: string, timeMin: Date, timeMax: Date): Promise<FreeBusySlot[]>;
  checkConflicts(userId: string, startTime: Date, endTime: Date): Promise<boolean>;

  // Sync
  syncEvents(userId: string, since?: Date): Promise<CalendarEvent[]>;
}

interface CreateEventInput {
  summary: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  location?: string;
  conferenceType?: 'google_meet' | 'teams'; // MVP: only google_meet supported
  reminders?: { method: 'email' | 'popup'; minutes: number }[];
}

interface CalendarEvent {
  id: string;
  summary: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  status: 'confirmed' | 'tentative' | 'cancelled';
}

interface FreeBusySlot {
  start: Date;
  end: Date;
}
```

**Implementations:**
- `GoogleCalendarProvider implements ICalendarProvider`
- `OutlookCalendarProvider implements ICalendarProvider`

**Google Meet Link Generation Logic (per FR28, FR62):**
```typescript
// Determine meeting link generation strategy
function determineMeetingLinkStrategy(mentor: User, mentee: User): 'google_meet' | 'manual' {
  const mentorHasGoogle = mentor.calendarProvider === 'google';
  const menteeHasGoogle = mentee.calendarProvider === 'google';

  if (menteeHasGoogle) {
    // Prefer mentee's Google account if available
    return 'google_meet';
  } else if (mentorHasGoogle) {
    // Fallback to mentor's Google account
    return 'google_meet';
  } else {
    // Both use Outlook - no Google Meet available
    return 'manual';
  }
}

// When creating booking
const strategy = determineMeetingLinkStrategy(mentor, mentee);

if (strategy === 'google_meet') {
  const calendarUser = mentee.calendarProvider === 'google' ? mentee : mentor;
  const calendarProvider = getCalendarProvider(calendarUser);

  await calendarProvider.createEvent({
    ...eventDetails,
    conferenceType: 'google_meet', // Auto-generates Meet link via Google Calendar API
  });
} else {
  // Both use Outlook
  description = `${baseDescription}\n\nNote: Please create a meeting link (Teams, Zoom, etc.) and share with attendees before the meeting.`;

  await calendarProvider.createEvent({
    ...eventDetails,
    description,
    // No conferenceType - manual link creation required
  });
}
```

**Usage Example:**
```typescript
// Before confirming booking
const calendarProvider = getCalendarProvider(mentor.calendarType);
const hasConflict = await calendarProvider.checkConflicts(
  mentor.id,
  booking.startTime,
  booking.endTime
);

if (hasConflict) {
  throw new AppError(409, 'Mentor has a conflicting event', 'CALENDAR_CONFLICT');
}
```

---

#### IMatchingEngine Interface

```typescript
interface IMatchingEngine {
  getRecommendedMentors(
    mentee: User,
    options: MatchingOptions
  ): Promise<MatchResult[]>;

  getRecommendedMentees(
    mentor: User,
    options: MatchingOptions
  ): Promise<MatchResult[]>;

  explainMatch(menteeId: string, mentorId: string): Promise<MatchExplanation>;
}

interface MatchingOptions {
  limit?: number;
  minScore?: number;
  includeExplanation?: boolean;
}

interface MatchResult {
  user: User;
  score: number; // 0-100
  explanation?: MatchExplanation;
}

interface MatchExplanation {
  tagOverlap: { category: string; tag: string }[];
  stageMatch: boolean;
  reputationCompatible: boolean;
  summary: string;
}
```

**MVP Implementation: TagBasedMatchingEngine**

Calculates score based on:
- Tag overlap (weight: 60%)
- Stage compatibility (weight: 20%)
- Reputation tier compatibility (weight: 20%)

---

#### IReputationCalculator Interface

```typescript
interface IReputationCalculator {
  calculateScore(userId: string): Promise<ReputationScore>;
  determineTier(score: number): ReputationTier;
  canBookMentor(menteeId: string, mentorId: string): Promise<boolean>;
  getBookingLimit(userId: string): Promise<number>;
}

interface ReputationScore {
  score: number;
  breakdown: {
    averageRating: number;
    completionRate: number;
    responsivenessFactor: number;
    tenureBonus: number;
    rawScore: number;
    isProbationary: boolean; // True if ratingsCount < 3 AND score was clamped to 3.5
  };
  tier: ReputationTier;
  ratingsCount: number;
}

type ReputationTier = 'bronze' | 'silver' | 'gold' | 'platinum';
```

**Formula:**
```
Score = (AvgRating × CompletionRate × ResponsivenessFactor) + TenureBonus
```

---

#### INotificationProvider Interface

```typescript
interface INotificationProvider {
  sendBookingConfirmation(booking: Booking): Promise<void>;
  sendReminder(booking: Booking, reminderTime: string): Promise<void>;
  sendCancellation(booking: Booking, canceledBy: User, reason?: string): Promise<void>;
  sendTierOverrideRequest(request: TierOverrideRequest): Promise<void>;
  sendTierOverrideApproval(request: TierOverrideRequest): Promise<void>;
  sendMentorInterest(mentor: User, mentee: User): Promise<void>;
  sendTagApprovalNotification(tag: TaxonomyEntry): Promise<void>;
}
```

**MVP Implementation: EmailNotificationProvider**

Uses Supabase built-in email service. All email attempts logged per NFR27.

---

#### Email Templates

**Implementation Note:** Email template content and styling are implementation details. Below are required template types and key data fields:

**Required Templates:**

1. **Booking Confirmation** (`sendBookingConfirmation`)
   - To: Both mentor and mentee
   - Data: Meeting date/time, timezone, location/Google Meet link, attendee info, meeting goal, materials
   - CTA: "Add to Calendar" (.ics attachment)

2. **Meeting Reminder** (`sendReminder`)
   - To: Both mentor and mentee
   - Data: Meeting date/time (relative: "1 hour from now"), location/link, attendee name
   - CTA: "Join Meeting" (if virtual), "View Details"

3. **Cancellation Notice** (`sendCancellation`)
   - To: Non-canceling party
   - Data: Meeting details, who canceled, reason (if provided), cancellation time
   - CTA: "Browse Mentors" (if mentee canceled on mentor)

4. **Tier Override Request** (`sendTierOverrideRequest`)
   - To: Coordinators
   - Data: Mentee name, mentor name, mentee tier, mentor tier, reason
   - CTAs: "Approve" (magic link with token), "View in Dashboard" (anchored link)

5. **Tier Override Approval** (`sendTierOverrideApproval`)
   - To: Requesting mentee
   - Data: Mentor name, approval date
   - CTA: "Book Meeting with {mentor_name}"

6. **Mentor Interest Notification** (`sendMentorInterest`)
   - To: Mentee
   - Data: Mentor name, expertise, profile link
   - CTA: "View Profile", "Book Meeting"

7. **Tag Approval Notification** (`sendTagApprovalNotification`)
   - To: Coordinators
   - Data: Tag category, value, requested by (user name), requested date
   - CTA: "Approve Tag", "View Pending Tags in Dashboard"

**Design Constraints:**
- Plain text fallback required for all HTML emails
- Mobile-responsive (readable on small screens)
- CF branding (defer logo/colors to implementation)

---

### 4.6 Deployment & Infrastructure

#### Cloudflare Pages (Frontend)

**Build Configuration:**
```yaml
build:
  command: npm run build
  publish: dist
  environment:
    NODE_VERSION: 18
```

**Environment Variables:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL`

---

#### Cloudflare Workers (API + Webhooks)

**Worker Configuration:**
```toml
# wrangler.toml
name = "cf-oh-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[env.production]
vars = { ENVIRONMENT = "production" }

[[env.production.routes]]
pattern = "api.cf-oh.com/*"
zone_name = "cf-oh.com"
```

**Environment Secrets (via Wrangler):**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_WEBHOOK_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `JWT_SECRET`

---

#### Supabase Configuration

**Database:**
- Supabase Postgres (managed, auto-updated)
- Connection pooling enabled
- Automated backups (daily)

**Auth:**
- Email (magic link)
- Google OAuth
- Microsoft OAuth
- JWT expiry: 1 hour (refresh token: 30 days)

**Storage Buckets:**
- `pitch-decks` (private, authenticated users only)
  - Max file size: 25MB
  - Allowed types: PDF, PPTX
- `avatars` (public read, authenticated write)
  - Max file size: 5MB
  - Allowed types: JPEG, PNG, WebP
  - Path pattern: `{userId}/{filename}`
  - Auto-generates public URL for user_profiles.avatar_url

**Realtime:**
- Enable on `time_slots` table for availability updates
- Enable on `bookings` table for coordinator dashboard

---

### 4.7 Testing Strategy

#### Unit Tests (Vitest)

**Focus Areas:**
- Reputation calculation logic
- Matching score algorithm
- Timezone conversion utilities
- Slot generation from availability blocks
- Error handling utilities

**Why Vitest:** Vite-native, fast, Jest-compatible API, built-in TypeScript support

---

#### Integration Tests (Vitest + Supabase Test DB)

**API Contract Testing:**
- Validate all endpoints against OpenAPI spec (NFR33)
- Use Dredd or Prism for automated validation

**Database Tests:**
- RLS policies enforcement
- Soft delete behavior
- Unique constraints (no double-booking)

---

#### E2E Tests (Playwright)

**Critical Flows:**
1. Mentee booking a slot
2. Mentor creating availability
3. Tier override request workflow
4. Real-time slot updates

---

### 4.8 Data Seeding & Initial Setup

**Purpose:** Provide baseline data for development, testing, and initial production deployment.

#### Seed Data Requirements

**Location Presets (`locations` table):**
- Seed script: `seeds/locations.sql` or `seeds/locations.ts`
- Initial CF office locations (if applicable)
- Common virtual meeting defaults:
  - "Google Meet (Auto-generated)"
  - "Custom Virtual Link"
- Example in-person locations:
  - "CF Office - [City Name]"
  - "Coffee Shop - TBD"

**Taxonomy (`taxonomy` table):**
- Synced from Airtable on first webhook trigger
- No manual seeding required (handled by Airtable sync)
- For development/testing: Optional mock taxonomy seed file

**Admin Users:**
- First coordinator user creation process:
  - Option 1: Manual Supabase SQL insert for initial coordinator
  - Option 2: Environment variable flag to auto-promote first authenticated user
  - Document in deployment README

**Test Data (Development/Staging Only):**
- Mock users with various roles and reputation tiers
- Sample availability blocks
- Sample bookings (past, upcoming, canceled)
- Sample ratings and reputation history

#### Seed Script Location

```
/seeds
  ├── locations.sql          # Location presets
  ├── dev-users.sql          # Development users (not for prod)
  ├── dev-bookings.sql       # Sample bookings (not for prod)
  └── README.md              # Seeding instructions
```

#### Execution

- Development: Auto-run on `npm run dev:setup` or similar
- Production: Manual execution of production-safe seeds only (locations)
- Document in deployment guide which seeds are safe for production

---

### 4.9 Monitoring & Observability (Minimal MVP)

#### Built-in Tools Only

**Cloudflare Dashboard (Free):**
- Request count, error rate, response times
- Worker invocation metrics
- No custom dashboards needed for MVP

**Supabase Dashboard (Free):**
- Database query performance
- Storage usage
- Auth activity

**Console Logging:**
- Frontend: `console.error()` visible in browser dev tools
- Backend: `console.log()` in Wrangler logs and Cloudflare dashboard

#### Health Check Endpoint

```typescript
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});
```

#### Deferred to Post-MVP

- FE21: Sentry or error tracking service integration
- FE22: Custom metrics dashboard (Grafana, etc.)
- FE23: Advanced alerting (PagerDuty, etc.)
- FE24: Performance monitoring (Web Vitals tracking)
- FE25: Logging aggregation (Better Stack, Axiom)

---

### 4.10 Airtable Integration Mapping

#### Overview

Airtable serves as the **source of truth** for user data and CF taxonomy. The webhook-driven sync ensures operational database (Supabase) remains current with Airtable changes.

---

#### Users Table Mapping

**Airtable → Supabase Field Mapping:**

| Airtable Column | Supabase Table | Supabase Field | Required | Data Type | Notes |
|-----------------|----------------|----------------|----------|-----------|-------|
| Record ID | `users` | `airtable_record_id` | Yes | text | Stable unique identifier (primary mapping key) |
| Email | `users` | `email` | Yes | text | User authentication identifier |
| Role | `users` | `role` | Yes | enum | Values: `mentee`, `mentor`, `coordinator` |
| Name | `user_profiles` | `name` | No | text | Display name |
| Title | `user_profiles` | `title` | No | text | Job title |
| Company | `user_profiles` | `company` | No | text | Company/organization name |
| Phone | `user_profiles` | `phone` | No | text | Contact phone number |
| LinkedIn URL | `user_profiles` | `linkedin_url` | No | text | LinkedIn profile URL |
| Tags (Industries) | `user_tags` | Multiple rows | No | multi-select | Creates one `user_tags` row per selected industry, `category='industry'`, `source='airtable'`, `is_confirmed=true` |
| Tags (Technologies) | `user_tags` | Multiple rows | No | multi-select | Creates one `user_tags` row per selected technology, `category='technology'`, `source='airtable'`, `is_confirmed=true` |
| Tags (Stage) | `user_tags` | Multiple rows | No | multi-select | Creates one `user_tags` row per selected stage, `category='stage'`, `source='airtable'`, `is_confirmed=true` |

**Unrecognized Columns:**
- Logged as warnings (per NFR32)
- Stored in raw `airtable_sync_log.webhook_payload` for future reference
- Do not block sync process

**Sync Behavior:**
- **Insert:** New Airtable records create new `users` + `user_profiles` rows
- **Update:** Changed fields trigger upsert (idempotent based on `airtable_record_id`)
- **Delete:** Removed Airtable records trigger soft-delete (`deleted_at` populated), auto-cancel future meetings per FR73

---

#### Taxonomy Tables Mapping

CF maintains taxonomy in three separate Airtable tables (or tabs): **Industries**, **Technologies**, **Stages**.

**Airtable → Supabase Taxonomy Mapping:**

| Airtable Table | Airtable Column | Supabase Field | Required | Notes |
|----------------|-----------------|----------------|----------|-------|
| Industries | Record ID | `taxonomy.airtable_record_id` | Yes | Stable ID |
| Industries | Industry Name | `taxonomy.value` | Yes | Normalized value (lowercase, no spaces) |
| Industries | Display Name | `taxonomy.display_name` | Yes | Human-readable label |
| Industries | - | `taxonomy.category` | Yes | Hardcoded: `'industry'` |
| Industries | - | `taxonomy.source` | Yes | Hardcoded: `'airtable'` |
| Industries | - | `taxonomy.is_approved` | Yes | Hardcoded: `true` |
| **Technologies** | Record ID | `taxonomy.airtable_record_id` | Yes | Stable ID |
| Technologies | Technology Name | `taxonomy.value` | Yes | Normalized value |
| Technologies | Display Name | `taxonomy.display_name` | Yes | Human-readable label |
| Technologies | - | `taxonomy.category` | Yes | Hardcoded: `'technology'` |
| Technologies | - | `taxonomy.source` | Yes | Hardcoded: `'airtable'` |
| Technologies | - | `taxonomy.is_approved` | Yes | Hardcoded: `true` |
| **Stages** | Record ID | `taxonomy.airtable_record_id` | Yes | Stable ID |
| Stages | Stage Name | `taxonomy.value` | Yes | Normalized value |
| Stages | Display Name | `taxonomy.display_name` | Yes | Human-readable label |
| Stages | - | `taxonomy.category` | Yes | Hardcoded: `'stage'` |
| Stages | - | `taxonomy.source` | Yes | Hardcoded: `'airtable'` |
| Stages | - | `taxonomy.is_approved` | Yes | Hardcoded: `true` |

**Example Taxonomy Rows (after Airtable sync):**

```sql
-- Industries
{ id: uuid, airtable_record_id: 'recABC123', category: 'industry', value: 'fintech', display_name: 'FinTech', source: 'airtable', is_approved: true }
{ id: uuid, airtable_record_id: 'recDEF456', category: 'industry', value: 'healthtech', display_name: 'HealthTech', source: 'airtable', is_approved: true }

-- Technologies
{ id: uuid, airtable_record_id: 'recGHI789', category: 'technology', value: 'react', display_name: 'React', source: 'airtable', is_approved: true }
{ id: uuid, airtable_record_id: 'recJKL012', category: 'technology', value: 'python', display_name: 'Python', source: 'airtable', is_approved: true }

-- Stages
{ id: uuid, airtable_record_id: 'recMNO345', category: 'stage', value: 'seed', display_name: 'Seed', source: 'airtable', is_approved: true }
{ id: uuid, airtable_record_id: 'recPQR678', category: 'stage', value: 'series_a', display_name: 'Series A', source: 'airtable', is_approved: true }
```

---

#### Webhook Processing Flow

**Trigger:** Airtable sends webhook on any CRUD operation in Users, Industries, Technologies, or Stages tables.

**Cloudflare Worker Processing:**

1. **Receive Webhook:**
   - Validate signature using `AIRTABLE_WEBHOOK_SECRET` (per NFR16)
   - Log raw payload to `airtable_sync_log` table

2. **Fetch Full Table:**
   - Use Airtable API to fetch entire affected table (small size: <500 rows for users, <100 rows for taxonomy)
   - Handles burst changes gracefully (per Section 1.7)

3. **Process Records:**
   - **Users:** Upsert into `users`, `user_profiles`, `user_tags` tables
   - **Taxonomy:** Upsert into `taxonomy` table
   - Use `airtable_record_id` as stable join key

4. **Handle Deletions:**
   - Detect records missing from current fetch vs. last sync
   - Soft-delete: Set `deleted_at = NOW()`
   - For users: Auto-cancel future meetings, send notifications per FR73

5. **Log Results:**
   - Update `airtable_sync_log.processed_at`, `records_updated`, `errors`

**Performance Target:** NFR4 (5 seconds for full table sync, asynchronous processing)

---

#### Field Normalization Rules

**Tag Values:**
- Convert to lowercase
- Replace spaces with underscores (e.g., "Series A" → "series_a")
- Store original in `display_name` for UI rendering

**Email:**
- Lowercase and trim whitespace
- Validate format before insert

**Role Enum Mapping:**
- Airtable values: "Mentee", "Mentor", "Coordinator" (case-insensitive)
- Supabase enum: `mentee`, `mentor`, `coordinator` (lowercase)

---

#### Error Handling

**Unrecognized Columns:**
- Log warning with column name
- Continue processing recognized fields
- Store full payload in `airtable_sync_log` for manual review

**Invalid Data:**
- Missing required fields (email, role): Log error, skip record, continue batch
- Invalid enum values: Log error, default to `mentee` role with warning flag
- Invalid email format: Log error, skip record

**Webhook Failures:**
- Graceful degradation per NFR9 (app continues with cached data)
- Retry logic deferred to FE13 (post-MVP)

---

#### Development & Testing

**Mock Airtable Data:**
- Seed script: `seeds/mock-airtable.json`
- Contains sample users with all field types
- Includes taxonomy samples for all three categories

**Local Testing:**
- Use Airtable webhook simulator or Postman to send test payloads
- Validate field mapping with unit tests
- Integration tests verify idempotent upsert behavior

---

## 5. Epic and Story Structure

### 5.1 Epic Overview

The CF Office Hours platform uses a **Walking Skeleton approach** organized into **9 epics** with **85 total stories**. Epic 0 delivers a minimal end-to-end working product by Sprint 2, then subsequent epics iteratively add depth and sophistication.

**Key Strategy:**
- ✅ **End-to-End by Week 4**: Epic 0 delivers complete booking flow (login → profile → availability → booking)
- ✅ **Mock Data First**: Epic 0 uses seeded mock data; Airtable sync added later (Epic 5)
- ✅ **Iterative Depth**: Each epic adds features to an already-working product
- ✅ **No Backwards Dependencies**: Stories only depend on earlier epics

**Epic Dependency Chain:**
```
Epic 0: Walking Skeleton (END-TO-END WORKING PRODUCT)
  ↓
Epic 1: Infrastructure Depth
  ↓
Epic 2: Authentication & Profile Depth
  ↓
Epic 3: Calendar Integration (replaces manual entry)
  ↓
Epic 4: Availability & Booking Depth
  ↓
Epic 5: Airtable Integration (replaces mock data)
  ↓
Epic 6: Matching & Discovery
  ↓
Epic 7: Reputation & Ratings
  ↓
Epic 8: Admin & Coordinator Tools
```

**Milestone Timeline:**
- **Sprint 2 (Week 4)**: First working end-to-end product (Epic 0)
- **Sprint 4 (Week 8)**: OAuth, rich profiles, tags
- **Sprint 5 (Week 10)**: Full calendar integration with conflict checking
- **Sprint 7 (Week 14)**: Airtable sync replaces mock data
- **Sprint 10 (Week 20)**: Full feature parity with all advanced features

---

### 5.2 Epic Breakdown

---

#### **Epic 0: Walking Skeleton (END-TO-END MVP)**
**Goal:** Deliver minimal but complete booking flow: authentication → profile → availability → booking
**Priority:** P0 (Blocking)
**Estimated Stories:** 18
**Dependencies:** None (foundation)
**Timeline:** Sprint 1-2 (Weeks 1-4)

**Deliverable:** By end of Sprint 2, users can:
1. ✅ Log in with email magic link
2. ✅ Create/edit basic profile (name, email, role, bio)
3. ✅ (Mentor) Create one-time availability slots with manual location entry
4. ✅ (Mentee) Browse and book available slots
5. ✅ View "My Bookings" dashboard
6. ✅ Receive email confirmations (basic)

**User Stories:**

1. **SKEL-DB-001: Minimal Database Schema**
   - As a **developer**, I want a minimal database schema for the core booking flow
   - **Acceptance Criteria:**
     - Tables created: `users`, `user_profiles`, `availability`, `time_slots`, `bookings`
     - Basic columns only (no soft deletes, no reputation fields, no calendar integrations yet)
     - Timestamp columns (`created_at`, `updated_at`) auto-populated
     - Foreign keys and basic indexes
     - Simple RLS: Users can only read/update own data
   - **Related:** FR82, NFR17
   - **Note:** Simplified schema - full features added in Epic 1

2. **SKEL-DB-002: Mock Data Seeding Script**
   - As a **developer**, I want mock user and taxonomy data for development/testing
   - **Acceptance Criteria:**
     - Seed script (`seed.sql` or TypeScript migration)
     - Creates 20 mock users (10 mentors, 8 mentees, 2 coordinators)
     - Mock taxonomy tags: 10 industries, 10 technologies, 5 stages
     - Mock user profiles with varied tags
     - Idempotent (can run multiple times safely)
     - Documented in README
   - **Related:** Section 4.8
   - **Note:** This data will be replaced by Airtable sync in Epic 5

3. **SKEL-API-001: Hono Framework Setup**
   - As a **developer**, I want a basic Hono API framework configured
   - **Acceptance Criteria:**
     - Hono app initialized with basic routing
     - Health check endpoint (`/api/health`) returns 200 OK
     - CORS middleware configured
     - Basic error handling (return JSON errors)
   - **Related:** FR76, NFR44
   - **Note:** Full error handling, OpenAPI, Zod schemas added in Epic 1

4. **SKEL-API-002: Auth Middleware (Basic)**
   - As a **developer**, I want basic auth middleware to protect endpoints
   - **Acceptance Criteria:**
     - `requireAuth` middleware verifies Supabase JWT tokens
     - User context injected into request: `c.set('user', user)`
     - 401 error for missing/invalid tokens
     - No role checking yet (added in Epic 1)
   - **Related:** FR100, NFR11

5. **SKEL-DEPLOY-001: Cloudflare Workers Deployment**
   - As a **developer**, I want the API deployed to Cloudflare Workers
   - **Acceptance Criteria:**
     - `wrangler.toml` configured with basic settings
     - Environment secrets configured: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
     - Production deployment accessible
     - Health check endpoint returns 200 OK
   - **Related:** Section 4.6, NFR44

6. **SKEL-DEPLOY-002: Cloudflare Pages Deployment**
   - As a **developer**, I want the frontend deployed to Cloudflare Pages
   - **Acceptance Criteria:**
     - Vite build configuration working
     - Environment variables configured: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`
     - Auto-deployment on main branch push
     - Production URL accessible
   - **Related:** Section 4.6

7. **SKEL-AUTH-001: Magic Link Authentication**
   - As a **user**, I want to log in via passwordless magic link
   - **Acceptance Criteria:**
     - Login page with email input field
     - "Send magic link" triggers Supabase Auth email
     - Magic link redirects to app with session token
     - No email whitelist validation yet (any email can register for testing)
     - Session stored in localStorage, auto-logout on expiry
   - **Related:** FR1, Section 3.3
   - **Note:** Email whitelist validation added in Epic 2

8. **SKEL-USER-001: User Profile API (Minimal)**
   - As a **developer**, I want minimal API endpoints for user profiles
   - **Acceptance Criteria:**
     - `GET /api/users/me` returns current user + profile
     - `PUT /api/users/me` updates profile (name, bio, role)
     - `GET /api/users/:id` returns public user profile
     - No search, no filtering yet
   - **Related:** FR7

9. **SKEL-USER-002: Profile View/Edit Screen (Minimal)**
   - As a **user**, I want to view and edit my basic profile
   - **Acceptance Criteria:**
     - Profile page shows: name, email, role, bio
     - Edit mode: Simple form with text inputs
     - Save button calls API, shows success toast
     - No avatar upload, no tags, no additional links yet
   - **Related:** FR7, Section 3.3
   - **Note:** Rich profile features added in Epic 2

10. **SKEL-AVAIL-001: Create Availability API (Simple)**
    - As a **developer**, I want a simple API to create one-time availability slots
    - **Acceptance Criteria:**
      - `POST /api/availability` accepts: date, start time, end time, slot duration, location (text field)
      - Creates single `availability` record
      - Generates `time_slots` rows for specified date/time range
      - Returns created availability with slot count
      - No recurrence patterns yet (one-time only)
    - **Related:** FR22, FR23, FR25
    - **Note:** Recurrence patterns added in Epic 4

11. **SKEL-AVAIL-002: Availability Management Screen (Simple)**
    - As a **mentor**, I want to create and view my availability
    - **Acceptance Criteria:**
      - "My Availability" page shows list of availability blocks
      - Each block shows: date, time range, location, slots booked/total
      - "Create Availability" button opens simple form
      - Form fields: date picker, start time, end time, slot duration dropdown, location text input
      - No recurrence UI yet (one-time only)
    - **Related:** FR22, Section 3.3
    - **Note:** Advanced availability features added in Epic 4

12. **SKEL-AVAIL-003: Slot Picker UI (Simple)**
    - As a **mentee**, I want to view available mentor slots in a simple list
    - **Acceptance Criteria:**
      - Mentor profile page shows "Available Slots" section
      - Simple list view: date + time slots as clickable buttons
      - Click slot opens booking form modal
      - No calendar grid yet, no filters, no mutual availability indicator
    - **Related:** FR15, FR38
    - **Note:** Advanced slot picker (calendar grid, filters) added in Epic 4

13. **SKEL-BOOK-001: Booking Creation API (Simple)**
    - As a **developer**, I want a simple API endpoint to create bookings
    - **Acceptance Criteria:**
      - `POST /api/bookings` accepts: slot_id, meeting_goal
      - Marks `time_slots.is_booked=true`
      - Creates `bookings` record with status='confirmed'
      - No conflict checking, no calendar integration yet
      - Returns created booking
    - **Related:** FR29, FR30
    - **Note:** Calendar conflict checking added in Epic 3

14. **SKEL-BOOK-002: Booking Form (Simple)**
    - As a **mentee**, I want to provide meeting context when booking
    - **Acceptance Criteria:**
      - Modal opens after slot selection
      - Form fields: Meeting goal (textarea, required)
      - Shows selected slot details: date, time, mentor name
      - "Confirm Booking" button calls API
      - Success toast: "Meeting booked!"
      - No materials URLs yet
    - **Related:** FR30, Section 3.3

15. **SKEL-BOOK-003: My Bookings Dashboard (Simple)**
    - As a **user**, I want to view my upcoming and past meetings
    - **Acceptance Criteria:**
      - "My Bookings" page with simple list of bookings
      - Shows: other participant name, date/time, location, meeting goal
      - Filters: Upcoming / Past (no "Canceled" tab yet)
      - No cancellation feature yet (added in Epic 4)
    - **Related:** Section 3.3

16. **SKEL-NOTIF-001: Basic Email Notifications**
    - As a **user**, I want to receive email confirmation when a booking is created
    - **Acceptance Criteria:**
      - On booking creation: Send email to both mentor and mentee
      - Email content: Meeting details (date, time, location, goal), other participant name
      - Uses Supabase built-in email (simple text template)
      - No reminders yet (added in Epic 4)
    - **Related:** FR32

17. **SKEL-NAV-001: Basic Navigation & Layout**
    - As a **user**, I want to navigate between key pages
    - **Acceptance Criteria:**
      - Top navigation bar with links: My Profile, My Bookings, Browse Mentors (or My Availability for mentors)
      - Logout button
      - Simple responsive layout (Shadcn/ui components)
      - No advanced features like notifications dropdown, search bar yet
    - **Related:** Section 3.3

18. **SKEL-MENTOR-001: Browse Mentors (Simple List)**
    - As a **mentee**, I want to browse available mentors
    - **Acceptance Criteria:**
      - "Browse Mentors" page shows list of users with role='mentor'
      - Mentor cards: name, bio, "View Profile" button
      - No search, no filters, no recommendations yet
      - Click "View Profile" navigates to mentor profile with slot picker
    - **Related:** FR15
    - **Note:** Advanced search, filters, recommendations added in Epic 6

---

#### **Epic 1: Infrastructure Depth**
**Goal:** Add production-grade infrastructure features to the working skeleton
**Priority:** P0 (Blocking)
**Estimated Stories:** 8
**Dependencies:** Epic 0
**Timeline:** Sprint 3 (Weeks 5-6)

**Deliverable:** Production-ready infrastructure with:
- Soft deletes, comprehensive RLS policies
- Full Zod schemas + OpenAPI documentation
- Centralized error handling
- Testing infrastructure
- Utility functions for common operations

**User Stories:**

19. **INFRA-DB-001: Full Database Schema Migration**
    - As a **developer**, I want to extend the minimal schema with all production fields
    - **Acceptance Criteria:**
      - Add soft delete columns (`deleted_at`) to all tables
      - Add reputation fields to `users` table (`reputation_score`, `reputation_tier`, `last_activity_at`)
      - Add calendar integration fields (`calendar_integrations` table)
      - Add taxonomy tables (`taxonomy`, `user_tags`)
      - Add audit tables (`audit_log`, `reputation_history`)
      - Migration script updates existing data safely
    - **Related:** FR82, NFR17, NFR18

20. **INFRA-DB-002: Database Views for Soft Deletes**
   - As a **developer**, I want database views that automatically filter soft-deleted records
   - **Acceptance Criteria:**
     - Views created: `active_users_with_profiles`, `active_bookings`, `available_slots`
     - Views exclude rows where `deleted_at IS NOT NULL`
     - Application queries updated to use views by default
   - **Related:** NFR29, NFR30

21. **INFRA-DB-003: Comprehensive Row Level Security**
   - As a **user**, I want my data protected with comprehensive RLS policies
   - **Acceptance Criteria:**
     - Full RLS policies implemented per Section 4.1
     - Coordinators can access all data
     - Bookings visible only to participants + coordinators
     - Taxonomy tables publicly readable
     - Test suite validates RLS policies
   - **Related:** NFR12, Section 4.1

22. **INFRA-API-001: Centralized Error Handling**
   - As a **developer**, I want consistent error responses across all API endpoints
   - **Acceptance Criteria:**
     - Custom `AppError` class created (Section 4.3)
     - Error handler middleware catches all errors
     - Zod validation errors formatted consistently
     - User-friendly error messages (avoid technical jargon per NFR37)
     - Error logging for debugging
   - **Related:** FR95, FR96, FR97, FR98, NFR37

23. **INFRA-API-002: Zod Schemas & OpenAPI Generation**
   - As a **developer**, I want API contracts defined with Zod schemas and OpenAPI spec auto-generated
   - **Acceptance Criteria:**
     - Zod schemas created for all request/response types (examples in Section 4.2)
     - `@hono/zod-openapi` generates OpenAPI 3.0 spec
     - Documentation accessible at `/api/docs`
     - Frontend types auto-generated via `openapi-typescript`
   - **Related:** FR77, FR78, NFR26, NFR34

24. **INFRA-UTIL-001: Date/Time Utilities**
   - As a **developer**, I want centralized timezone utilities for consistent date handling
   - **Acceptance Criteria:**
     - Utility functions: `formatForDisplay`, `toUTC`, `getUserTimezone` (Section 4.4)
     - All timestamps stored as UTC in database
     - Timezone conversion tested with multiple timezones
   - **Related:** FR26, FR99, NFR17

25. **INFRA-UTIL-002: Database Query Helpers**
   - As a **developer**, I want reusable database query functions
   - **Acceptance Criteria:**
     - Helper functions: `getUserWithProfile`, `getAvailableSlots` (Section 4.4)
     - Supabase client configured with service key for backend
     - Queries automatically use soft-delete views
   - **Related:** FR101

26. **INFRA-TEST-001: Testing Infrastructure**
   - As a **developer**, I want testing tools configured for unit and integration tests
   - **Acceptance Criteria:**
     - Vitest configured for unit tests
     - Supabase test database for integration tests
     - Playwright configured for E2E tests
     - CI pipeline runs tests on PR
     - Test coverage for critical paths (booking flow, auth)
   - **Related:** Section 4.7, NFR33

---

#### **Epic 2: Authentication & Profile Depth**
**Goal:** Add OAuth authentication, rich profile features, and user management
**Priority:** P0 (Blocking)
**Estimated Stories:** 11
**Dependencies:** Epic 1
**Timeline:** Sprint 4 (Weeks 7-8)

**Deliverable:** Enhanced authentication and profiles with:
- Google/Microsoft OAuth (combined with calendar connection)
- Email whitelist validation (Airtable-synced users only)
- Tag selection UI, avatar uploads, additional profile fields
- User search and directory
- Role-based access control

**User Stories:**

27. **AUTH-OAUTH-001: Google OAuth Authentication (Combined Auth + Calendar)**
    - As a **user**, I want to sign in with Google and connect my calendar in one flow
    - **Acceptance Criteria:**
      - "Continue with Google" button on login page
      - OAuth requests combined scopes: auth + calendar (openid, email, profile, calendar.readonly, calendar.events)
      - Single consent screen for both permissions
      - On success: user authenticated AND calendar connected automatically
      - `calendar_integrations` record created with `connection_method='oauth_signup'`
    - **Related:** FR2, FR21, FR105, Section 4.2

28. **AUTH-OAUTH-002: Microsoft OAuth Authentication (Combined Auth + Calendar)**
    - As a **user**, I want to sign in with Microsoft and connect my calendar in one flow
    - **Acceptance Criteria:**
      - "Continue with Microsoft" button on login page
      - OAuth requests combined scopes: auth + calendar (openid, email, profile, Calendars.ReadWrite)
      - Single consent screen for both permissions
      - On success: user authenticated AND calendar connected automatically
      - `calendar_integrations` record created with `connection_method='oauth_signup'`
    - **Related:** FR2, FR21, FR105, Section 4.2

29. **AUTH-WHITELIST-001: Email Whitelist Validation**
    - As a **developer**, I want to restrict authentication to users in the mock/synced database
    - **Acceptance Criteria:**
      - Authentication checks user email against `users` table
      - If email not found: Display "Contact admin for access" (FR4)
      - No account creation for unauthorized emails
      - Error logged for tracking
    - **Related:** FR3, FR4

30. **PROFILE-TAGS-001: Tag Selection UI**
    - As a **user**, I want to select tags from CF's taxonomy to describe my profile
    - **Acceptance Criteria:**
      - Multi-select dropdown for industries, technologies, stages
      - Tags sourced from `taxonomy` table (WHERE `is_approved = true`)
      - Visual distinction: confirmed tags (solid badge) vs. user-submitted (outlined badge)
      - "Add custom tag" option triggers new tag request workflow (saved as `is_approved=false`)
    - **Related:** FR11, FR12, FR91, FR92

31. **PROFILE-MENTEE-001: Mentee-Specific Profile Fields**
    - As a **mentee**, I want to add my Pitch.vc profile link and upload pitch decks
    - **Acceptance Criteria:**
      - Pitch.vc URL input field (optional)
      - File upload drag-and-drop area for pitch decks
      - Accepted formats: PDF, PPTX (max 25MB)
      - Uploaded files stored in Supabase Storage `pitch-decks` bucket
      - File list with download/delete actions
    - **Related:** FR8, FR9, NFR14, Section 4.6

32. **PROFILE-MENTOR-001: Mentor-Specific Profile Fields**
    - As a **mentor**, I want to describe my expertise and ideal mentee
    - **Acceptance Criteria:**
      - "Expertise description" rich text area (markdown support optional)
      - "Ideal mentee profile" rich text area
      - Character limits enforced (e.g., 1000 chars each)
      - Displayed on mentor profile view
    - **Related:** FR10

33. **PROFILE-AVATAR-001: Avatar Upload & Cropping**
    - As a **user**, I want to upload and crop a profile avatar image
    - **Acceptance Criteria:**
      - Upload button accepts image file or URL input
      - File upload: JPEG, PNG, WebP (max 5MB)
      - Cropping modal: circular crop area, zoom, pan, rotation
      - Image stored in Supabase Storage `avatars` bucket
      - `user_profiles.avatar_url` updated with public URL
      - Avatar displayed as circle throughout app
    - **Related:** FR88, FR89, FR90, Section 4.2, Section 4.6

34. **PROFILE-LINKS-001: Additional Links Management**
    - As a **user**, I want to add multiple custom links to my profile (website, portfolio, etc.)
    - **Acceptance Criteria:**
      - "Add link" button creates new URL input field
      - Stored in `user_profiles.additional_links` JSONB array
      - Links displayed on profile with clickable icons
      - Remove link button for each entry
    - **Related:** FR7

35. **PROFILE-PREFS-001: Reminder Preferences**
    - As a **user**, I want to configure when I receive meeting reminder emails
    - **Acceptance Criteria:**
      - Settings dropdown: "1 hour before", "24 hours before", "Both" (default: 1 hour)
      - Stored in `user_profiles.reminder_preference`
      - System sends reminders based on user preference
    - **Related:** FR33, FR94

36. **USER-SEARCH-001: User Search & Directory API**
    - As a **developer**, I want API endpoints for searching and filtering users
    - **Acceptance Criteria:**
      - `GET /api/users/search` supports filtering by role, tags, status
      - Pagination support (limit, offset)
      - Full-text search on name, company, bio
      - Returns user profiles with tags, avatar, reputation tier
    - **Related:** FR15, FR16, FR18

37. **USER-RBAC-001: Role-Based Access Control**
    - As a **developer**, I want users assigned roles with appropriate permissions
    - **Acceptance Criteria:**
      - User role stored in `users.role` (enum: mentee, mentor, coordinator)
      - API middleware validates role for protected endpoints (`requireRole` middleware)
      - Frontend routes restricted by role
      - Coordinators have elevated permissions (view all data, override restrictions)
    - **Related:** FR6, NFR12

---

#### **Epic 3: Calendar Integration**
**Goal:** Integrate Google Calendar and Microsoft Outlook, replace manual location entry with calendar-based scheduling
**Priority:** P0 (Blocking)
**Estimated Stories:** 10
**Dependencies:** Epic 2
**Timeline:** Sprint 5 (Weeks 9-10)

**Deliverable:** Full calendar integration with:
- Pluggable calendar provider interface
- Google Calendar and Outlook implementations
- Conflict checking before booking
- Automatic Google Meet link generation
- Calendar event creation/update/delete
- Post-login calendar connection for magic link users

**User Stories:**

38. **CAL-INTERFACE-001: ICalendarProvider Interface Definition**
    - As a **developer**, I want a pluggable calendar provider interface for extensibility
    - **Acceptance Criteria:**
      - `ICalendarProvider` interface defined per Section 4.5
      - Methods: `getAuthUrl`, `handleCallback`, `revokeAccess`, `createEvent`, `updateEvent`, `deleteEvent`, `getFreeBusy`, `checkConflicts`, `syncEvents`
      - TypeScript types defined for `CreateEventInput`, `CalendarEvent`, `FreeBusySlot`
    - **Related:** FR20, NFR21, NFR23, Section 4.5

39. **CAL-GOOGLE-001: Google Calendar Provider Implementation**
    - As a **developer**, I want Google Calendar integration implemented via ICalendarProvider
    - **Acceptance Criteria:**
      - `GoogleCalendarProvider implements ICalendarProvider`
      - OAuth flow requests scopes: `calendar.readonly`, `calendar.events`
      - Google Calendar API v3 integration
      - Token refresh logic for expired access tokens
      - Implements all interface methods from CAL-INTERFACE-001
    - **Related:** FR21, NFR15, CR2, Section 4.5

40. **CAL-OUTLOOK-001: Microsoft Outlook Provider Implementation**
    - As a **developer**, I want Microsoft Outlook integration implemented via ICalendarProvider
    - **Acceptance Criteria:**
      - `OutlookCalendarProvider implements ICalendarProvider`
      - OAuth flow requests scope: `Calendars.ReadWrite`
      - Microsoft Graph API integration
      - Token refresh logic for expired access tokens
      - Implements all interface methods from CAL-INTERFACE-001
    - **Related:** FR21, NFR15, CR2, Section 4.5

41. **CAL-CONNECT-001: Post-Login Calendar Connection (Magic Link Users)**
    - As a **magic link user**, I want to connect my calendar after logging in
    - **Acceptance Criteria:**
      - Dismissible banner on dashboard: "Connect your calendar to book meetings"
      - OAuth buttons: "Connect Google Calendar" / "Connect Outlook Calendar"
      - `POST /api/calendar/connect` initiates OAuth flow (calendar scopes only)
      - On success: `calendar_integrations` record created with `connection_method='post_login'`
      - Banner removed after successful connection
    - **Related:** FR21, FR105, Section 3.3, Section 4.2

42. **CAL-REQUIRE-001: Calendar Connection Requirement Enforcement**
    - As a **developer**, I want booking/availability actions blocked until user connects calendar
    - **Acceptance Criteria:**
      - Frontend checks: user has connected calendar before showing slot picker, availability form
      - Modal displayed if no calendar: "Calendar connection required. To [book meetings / create availability], please connect your calendar"
      - OAuth buttons in modal
      - Coordinators exempt from requirement (can use app without calendar)
    - **Related:** FR105, Section 3.3

43. **CAL-CONFLICT-001: Calendar Conflict Checking**
    - As a **user**, I want the system to prevent double-booking by checking my external calendar
    - **Acceptance Criteria:**
      - Before confirming booking: API calls `calendarProvider.checkConflicts()` for both mentor and mentee
      - If conflict detected: 409 error with message "Calendar conflict detected"
      - Frontend displays error toast and returns to slot selection
    - **Related:** FR27, FR79, FR106, NFR10

44. **CAL-EVENT-001: Calendar Event Creation**
    - As a **user**, I want meetings automatically added to my calendar with all details
    - **Acceptance Criteria:**
      - On booking confirmation: `calendarProvider.createEvent()` called
      - Event includes: title, description, start/end time (UTC with TZID), attendees, location/Google Meet link
      - Calendar invites (.ics) sent to both parties
      - Event stored in user's connected calendar (Google or Outlook)
    - **Related:** FR36, FR37, FR39

45. **CAL-MEET-001: Google Meet Link Generation**
    - As a **user**, I want virtual meetings to automatically include a Google Meet link
    - **Acceptance Criteria:**
      - For online meetings: System checks if either party has Google Calendar connected
      - If yes: Google Calendar API creates event with `conferenceType='google_meet'` → auto-generates Meet link
      - If both use Outlook: Event description instructs attendees to create manual link
      - Meet link stored in `bookings.google_meet_link`
    - **Related:** FR28, FR62, Section 4.5

46. **CAL-DISCONNECT-001: Calendar Disconnection**
    - As a **user**, I want to disconnect my calendar integration while preserving existing bookings
    - **Acceptance Criteria:**
      - Settings page: "Disconnect calendar" button
      - Warning modal if active bookings in next 7 days: "You have X upcoming meetings. Disconnecting will prevent conflict checks, but calendar events remain (delete manually if needed)."
      - On disconnect: `calendar_integrations.is_connected = false`, OAuth tokens cleared
      - Email notifications continue for existing bookings
      - User must reconnect to create new availability/bookings
    - **Related:** FR93

47. **CAL-ICAL-001: iCal Feed for Calendar Subscription**
    - As a **user**, I want to subscribe to my bookings via .ical feed in any calendar app
    - **Acceptance Criteria:**
      - `GET /api/calendar/feed/:userId/:token` generates RFC 5545 iCalendar feed
      - Feed includes all confirmed future bookings
      - Token-authenticated (from `ical_feed_tokens` table)
      - Rate limit: 1 request/minute per token
      - Settings page: "Copy iCal URL" button + "Regenerate token" action
    - **Related:** FR37, NFR41, Section 4.2

---

#### **Epic 4: Availability & Booking Depth**
**Goal:** Add advanced availability features (recurrence patterns, preset locations), booking management, and real-time updates
**Priority:** P0 (Blocking)
**Estimated Stories:** 10
**Dependencies:** Epic 3
**Timeline:** Sprint 6 (Weeks 11-12)

**Deliverable:** Advanced booking features with:
- Recurrence patterns (weekly, monthly, quarterly)
- Calendar grid slot picker with mutual availability
- Real-time slot updates (Supabase Realtime)
- Meeting cancellation with notifications
- Meeting reminders based on user preferences
- Preset location management

**User Stories:**

48. **AVAIL-RECUR-001: Recurrence Pattern Support**
    - As a **mentor**, I want to create recurring availability blocks
    - **Acceptance Criteria:**
      - Availability form supports: one-time, weekly, monthly, quarterly
      - Weekly: specify day of week, date range
      - Monthly: specify day of month, date range
      - Quarterly: specify first day of quarter
      - Preview shows: "This will create X slots per week/month"
    - **Related:** FR22, FR23, FR24

49. **AVAIL-RECUR-002: Time Slot Generation Logic**
    - As a **developer**, I want availability blocks to automatically generate bookable time slots
    - **Acceptance Criteria:**
      - On availability block creation: Generate `time_slots` rows based on recurrence
      - Weekly: Create slots for matching day of week within date range
      - Monthly: Create slots for matching day of month
      - One-time: Create slots for single date
      - Each slot: `start_time` (UTC), `end_time` (UTC + slot_duration + buffer), `is_booked=false`
    - **Related:** FR22, FR38

50. **AVAIL-GRID-001: Calendar Grid Slot Picker**
    - As a **mentee**, I want to view available mentor slots in a week grid calendar
    - **Acceptance Criteria:**
      - Custom week grid component (Section 3.3)
      - Shows 7 days with available slots as clickable buttons
      - Week navigation: Previous/Next buttons
      - Filter toggle: "Show only when I'm available" (requires calendar connection)
      - Mutual availability indicator (⭐) when both parties free
      - Minimum 1-day advance enforced (past dates grayed out)
    - **Related:** FR15, FR38, Section 3.3

51. **AVAIL-REALTIME-001: Real-Time Slot Availability Updates**
    - As a **mentee**, I want to see slots disappear immediately when booked by another user
    - **Acceptance Criteria:**
      - Frontend subscribes to Supabase Realtime on `time_slots` table
      - Subscription scoped to current mentor + future dates (per NFR28)
      - On slot booked: Slot disappears from UI within 1 second (NFR5)
      - Toast notification if user tries to book already-taken slot: "This slot was just booked by another user"
    - **Related:** FR40, FR41, FR42, FR43, NFR5, NFR28, Section 3.3

52. **BOOK-ENHANCE-001: Enhanced Booking Form**
    - As a **mentee**, I want to add materials URLs and see meeting type details
    - **Acceptance Criteria:**
      - Form fields: Meeting goal (textarea, required), Materials URLs (multiple inputs, optional)
      - Shows meeting type: in-person (location) or online (Google Meet link will be generated)
      - Confirmation message: "This meeting is scheduled for [DATE/TIME] in your timezone ([TIMEZONE])"
    - **Related:** FR30, Section 3.3

53. **BOOK-CANCEL-001: Meeting Cancellation**
    - As a **user**, I want to cancel a meeting with notification to the other party
    - **Acceptance Criteria:**
      - "Cancel Meeting" button on booking detail page
      - Confirmation modal: "Are you sure? This will notify [other party]."
      - Optional: Cancellation reason dropdown (emergency, reschedule, other)
      - On confirm: `bookings.status='canceled'`, `canceled_by`, `canceled_at`, `cancellation_reason` updated
      - Email notification sent to other party
      - Calendar events updated (marked as canceled)
    - **Related:** FR34, FR60, FR61

54. **BOOK-REMIND-001: Meeting Reminders**
    - As a **user**, I want reminder emails before my meetings based on my preferences
    - **Acceptance Criteria:**
      - Background job (Cloudflare Workers Cron): Check upcoming meetings and user reminder preferences
      - Send email reminder based on preference (1 hour / 24 hours / both)
      - Email includes: meeting details, participant info, Google Meet link, "Join Meeting" CTA
      - Reminder logged in `notification_log`
    - **Related:** FR33, FR94

55. **BOOK-LOCATION-001: Preset Location Management**
    - As a **coordinator**, I want to create and manage preset meeting locations
    - **Acceptance Criteria:**
      - Admin UI: List of locations with name, address, notes, active status
      - Actions: Create, Edit, Deactivate
      - Inactive locations hidden from mentor availability form dropdown
      - Seed script with initial CF office locations (Section 4.8)
    - **Related:** FR74, Section 4.8

56. **BOOK-MATERIALS-001: Materials URL Handling**
    - As a **user**, I want to see meeting materials shared by the mentee
    - **Acceptance Criteria:**
      - Booking detail page shows materials URLs as clickable links
      - Email notifications include materials URLs
      - Frontend validates URL format before saving
    - **Related:** FR30

57. **AVAIL-EDIT-001: Availability Block Editing**
    - As a **mentor**, I want to edit or delete my availability blocks
    - **Acceptance Criteria:**
      - "Edit" button on availability block card
      - Edit form pre-populated with current values
      - "Delete" button with confirmation modal
      - If slots booked: Warning modal "X slots already booked. Deleting will cancel those meetings. Are you sure?"
      - Deletions send cancellation emails to affected mentees
    - **Related:** FR80

---

#### **Epic 5: Airtable Integration**
**Goal:** Replace mock data with live Airtable sync for users and taxonomy
**Priority:** P1 (High)
**Estimated Stories:** 5
**Dependencies:** Epic 1 (schema must be ready)
**Timeline:** Sprint 7 (Weeks 13-14)

**Deliverable:** Live Airtable data sync:
- Webhook endpoint receives Airtable change notifications
- Full users table fetch and upsert
- User tags sync (industries, technologies, stages)
- Taxonomy sync (approved tags from Airtable)
- User deletion handling (cascading cancellations)

**User Stories:**

58. **AIRTABLE-WEBHOOK-001: Webhook Endpoint Setup**
    - As a **developer**, I want a webhook endpoint to receive Airtable change notifications
    - **Acceptance Criteria:**
      - `POST /api/webhooks/airtable` endpoint created
      - Webhook signature validation using `AIRTABLE_WEBHOOK_SECRET` (NFR16)
      - Raw payload logged to `airtable_sync_log` table
      - Endpoint responds within 10ms (synchronous ack per NFR31)
    - **Related:** FR5, FR86, NFR4, NFR16, NFR31, Section 4.10

59. **AIRTABLE-SYNC-001: Users Table Sync**
    - As a **developer**, I want user data synced from Airtable to Supabase on webhook trigger
    - **Acceptance Criteria:**
      - Webhook triggers full users table fetch from Airtable
      - Field mapping per Section 4.10 (Record ID → airtable_record_id, Email, Role, Name, etc.)
      - Upsert into `users`, `user_profiles` tables (idempotent)
      - Missing records trigger soft-delete (`deleted_at` populated)
      - Processing completes within 5 seconds (NFR4)
    - **Related:** FR5, FR85, FR86, NFR4, Section 4.10

60. **AIRTABLE-TAGS-001: User Tags Sync**
    - As a **developer**, I want user tags (industries, technologies, stages) synced from Airtable
    - **Acceptance Criteria:**
      - Multi-select tag columns in Airtable mapped to `user_tags` rows
      - Each selected tag creates one `user_tags` row with `source='airtable'`, `is_confirmed=true`
      - Old tags removed (soft-deleted) if no longer in Airtable
      - Tag values normalized (lowercase, underscores) per Section 4.10
    - **Related:** FR11, FR87, Section 4.10

61. **AIRTABLE-TAXONOMY-001: Taxonomy Sync**
    - As a **developer**, I want CF taxonomy (industries, technologies, stages) synced from Airtable
    - **Acceptance Criteria:**
      - Separate Airtable tables/tabs synced to `taxonomy` table
      - Field mapping per Section 4.10 (Record ID, value, display_name, category)
      - Synced tags have `source='airtable'`, `is_approved=true`
      - Upsert based on `airtable_record_id`
    - **Related:** FR87, Section 4.10

62. **AIRTABLE-DELETE-001: User Deletion Handling**
    - As a **developer**, I want user removals in Airtable to trigger cascading actions in the app
    - **Acceptance Criteria:**
      - User removed from Airtable: `users.deleted_at` populated (soft delete)
      - All future bookings auto-canceled
      - Notification sent to other party in canceled meetings
      - User no longer appears in search results
    - **Related:** FR73, FR81, NFR19

---

#### **Epic 6: Matching & Discovery**
**Goal:** Provide intelligent mentor-mentee recommendations and searchable directories
**Priority:** P1 (High)
**Estimated Stories:** 7
**Dependencies:** Epic 2 (tags must be available)
**Timeline:** Sprint 8 (Weeks 15-16)

**Deliverable:** Intelligent matching with:
- Pluggable matching engine interface
- Tag-based matching algorithm (MVP)
- Recommended mentors/mentees API
- Enhanced mentor/mentee directories with filters
- Match explanations
- Mentor "reach out" feature with tier override

**User Stories:**

63. **MATCH-INTERFACE-001: IMatchingEngine Interface Definition**
    - As a **developer**, I want a pluggable matching engine interface for algorithm flexibility
    - **Acceptance Criteria:**
      - `IMatchingEngine` interface defined per Section 4.5
      - Methods: `getRecommendedMentors`, `getRecommendedMentees`, `explainMatch`
      - TypeScript types: `MatchingOptions`, `MatchResult`, `MatchExplanation`
    - **Related:** FR13, NFR21, Section 4.5

64. **MATCH-TAG-001: Tag-Based Matching Algorithm (MVP)**
    - As a **developer**, I want a tag-based matching algorithm for mentor-mentee recommendations
    - **Acceptance Criteria:**
      - `TagBasedMatchingEngine implements IMatchingEngine`
      - Score calculation (0-100): Tag overlap (60%), stage compatibility (20%), reputation compatibility (20%)
      - Returns top 5 matches sorted by score
      - Includes match explanation: shared tags, stage match, reputation tier compatibility
    - **Related:** FR14, FR17, Section 4.5

65. **MATCH-API-001: Recommended Mentors API**
    - As a **mentee**, I want personalized mentor recommendations based on my profile
    - **Acceptance Criteria:**
      - `GET /api/mentors/recommended?menteeId={uuid}` endpoint
      - Calls `matchingEngine.getRecommendedMentors(mentee)`
      - Returns top 5 mentors with match scores and explanations
      - Filters out inactive/dormant mentors
    - **Related:** FR15, FR17

66. **MATCH-API-002: Recommended Mentees API**
    - As a **mentor**, I want personalized mentee recommendations based on my expertise
    - **Acceptance Criteria:**
      - `GET /api/mentees/recommended?mentorId={uuid}` endpoint
      - Calls `matchingEngine.getRecommendedMentees(mentor)`
      - Returns top 5 mentees with match scores and explanations
      - Filters out inactive/dormant mentees
    - **Related:** FR16, FR17

67. **MATCH-UI-001: Enhanced Mentor Directory**
    - As a **mentee**, I want to browse all mentors with filtering, search, and recommendations
    - **Acceptance Criteria:**
      - "Recommended for you" section at top (3-5 mentor cards with match scores)
      - Searchable/filterable mentor list below
      - Filters: Industries, technologies, stage, reputation tier, availability
      - Filter persistence via URL parameters (enables bookmarking per Section 3.2)
      - Grid or list view toggle
      - Mentor cards: avatar, name, title, company, tags, reputation badge, "View Profile" + "Book Meeting" buttons
    - **Related:** FR15, FR17, FR18, Section 3.3

68. **MATCH-UI-002: Enhanced Mentee Directory**
    - As a **mentor**, I want to browse all mentees with filtering, search, and recommendations
    - **Acceptance Criteria:**
      - Similar layout to mentor directory
      - "Reach Out" button (sends "I want to meet you" email per FR19)
      - Filters: Industries, technologies, stage
      - Match explanations focused on how mentor can help
    - **Related:** FR16, FR18, Section 3.3

69. **MATCH-REACH-001: Mentor Send Interest (Reach Out)**
    - As a **mentor**, I want to express interest in meeting a mentee
    - **Acceptance Criteria:**
      - "Reach Out" button on mentee profile/card
      - Calls `POST /api/mentors/:mentorId/send-interest` with menteeId
      - System checks tier restriction:
        - If mentee CAN book mentor: Send email notification with booking link
        - If tier restriction blocks: Auto-create approved tier override (expires in 7 days), send notification
      - Email to mentee: "Mentor {name} wants to meet you" + "Book Meeting" CTA
      - Toast notification if mentee is online
    - **Related:** FR19, FR54, Section 4.2

---

#### **Epic 7: Reputation & Ratings**
**Goal:** Implement reputation scoring, tier-based access control, and post-meeting ratings
**Priority:** P1 (High)
**Estimated Stories:** 10
**Dependencies:** Epic 4 (bookings must be functional)
**Timeline:** Sprint 9 (Weeks 17-18)

**Deliverable:** Reputation system with:
- Pluggable reputation calculator interface
- Reputation score formula (rating + completion + responsiveness + tenure)
- Reputation tier assignment (Bronze, Silver, Gold, Platinum)
- Tier-based booking limits
- Tier restrictions on mentor booking
- Post-meeting rating prompts
- Tier override request workflow
- Dormant user detection

**User Stories:**

70. **REP-INTERFACE-001: IReputationCalculator Interface Definition**
    - As a **developer**, I want a pluggable reputation calculator interface for formula flexibility
    - **Acceptance Criteria:**
      - `IReputationCalculator` interface defined per Section 4.5
      - Methods: `calculateScore`, `determineTier`, `canBookMentor`, `getBookingLimit`
      - TypeScript types: `ReputationScore`, `ReputationTier`
    - **Related:** FR44, NFR21, Section 4.5

71. **REP-CALC-001: Reputation Score Calculation Logic**
    - As a **developer**, I want reputation scores calculated using rating, completion, responsiveness, and tenure
    - **Acceptance Criteria:**
      - Formula: `(AvgRating × CompletionRate × ResponsivenessFactor) + TenureBonus`
      - Probationary clamp: If ratingsCount < 3 AND rawScore < 3.5, then finalScore = 3.5 (FR48)
      - Responsiveness factor: 1.2× (<24hr), 1.0× (24-48hr), 0.8× (>48hr or frequent cancellations)
      - Tenure bonus: +0.1 per month active (max +1.0 after 10 months)
      - Completion rate: % of booked sessions attended (vs. canceled/no-show)
    - **Related:** FR46, FR47, FR48, Section 1.9

72. **REP-TIER-001: Reputation Tier Assignment**
    - As a **developer**, I want users assigned reputation tiers based on their score
    - **Acceptance Criteria:**
      - Tiers: Bronze (0-3.0), Silver (3.0-4.0), Gold (4.0-4.5), Platinum (4.5+)
      - Tier updated whenever reputation score recalculated
      - `users.reputation_tier` updated, change logged in `reputation_history`
    - **Related:** FR49, Section 1.9

73. **REP-LIMIT-001: Tier-Based Booking Limits**
    - As a **developer**, I want booking limits enforced based on user reputation tier
    - **Acceptance Criteria:**
      - Limits: Bronze (2/week), Silver (5/week), Gold (10/week), Platinum (unlimited)
      - Before booking: API checks `getBookingLimit(menteeId)` and current week bookings count
      - If limit exceeded: 403 error with message "Weekly booking limit reached for your tier"
      - Frontend displays remaining bookings count
    - **Related:** FR50

74. **REP-RESTRICT-001: Tier Restriction on Mentor Booking**
    - As a **developer**, I want to prevent mentees from booking mentors more than one tier above them
    - **Acceptance Criteria:**
      - Before booking: API checks `canBookMentor(menteeId, mentorId)` (tier difference validation)
      - Bronze cannot book Gold/Platinum, Silver cannot book Platinum
      - If restricted: Frontend displays "Request Exception" button instead of "Book Meeting"
      - Exception request workflow in REP-OVERRIDE-001
    - **Related:** FR51, FR71

75. **REP-RATING-001: Post-Meeting Rating Prompt**
    - As a **user**, I want to rate meetings after they complete
    - **Acceptance Criteria:**
      - 1 hour after meeting end: Email sent "How was your session with [NAME]?" with rating link
      - Rating modal: 1-5 star selector, optional text feedback
      - Submit button creates `ratings` record
      - Rating is idempotent (cannot submit duplicate for same meeting)
      - Reputation score recalculated after rating submitted
      - Toast: "Thank you for your feedback!"
    - **Related:** FR45, FR60, NFR20

76. **REP-UI-001: Reputation Score Display**
    - As a **user**, I want to see my reputation score breakdown
    - **Acceptance Criteria:**
      - Profile page section: Large score number + tier badge
      - Breakdown list: Average rating (X/5 stars), Completion rate (X%), Responsiveness (X.Xx multiplier), Tenure bonus (+X.X)
      - Access tier info: "[Tier name] tier - X bookings/week max"
      - Simple bar chart or progress indicators for visual breakdown
    - **Related:** FR52, Section 3.3

77. **REP-OVERRIDE-001: Tier Override Request (Mentee-Initiated)**
    - As a **mentee**, I want to request an exception to book a higher-tier mentor
    - **Acceptance Criteria:**
      - "Request Exception" button on restricted mentor profile
      - Modal: Reason field (textarea, required)
      - `POST /api/tier-overrides` creates request with `status='pending'`, `expires_at = created_at + 7 days`
      - Toast: "Request sent to coordinator"
      - Email notification sent to coordinators (with approve magic link + dashboard link)
    - **Related:** FR54, FR55, FR56

78. **REP-DORMANT-001: Dormant User Detection**
    - As a **developer**, I want users with no meetings for 90+ days marked as dormant
    - **Acceptance Criteria:**
      - `users.last_activity_at` updated on every booking creation (as mentor or mentee)
      - Background job or query filter: users with `last_activity_at < NOW() - INTERVAL '90 days'`
      - Dormant badge displayed in search results
      - Dormant users sorted to bottom of search/directory
      - Dormant users cannot be booked directly (requires coordinator override)
    - **Related:** FR57, FR58

79. **REP-HISTORY-001: Reputation History Tracking**
    - As a **coordinator**, I want to view reputation score changes over time for a user
    - **Acceptance Criteria:**
      - `reputation_history` table logs all score changes
      - Each entry: old/new score, old/new tier, calculation details (JSON), trigger event
      - Admin UI: User profile shows reputation history timeline
      - Filterable by trigger event (rating received, meeting completed, admin override)
    - **Related:** Section 4.1

---

#### **Epic 8: Admin & Coordinator Tools**
**Goal:** Provide coordinators with oversight, analytics, and white-glove scheduling capabilities
**Priority:** P2 (Medium)
**Estimated Stories:** 7
**Dependencies:** Epic 7 (reputation system must be functional)
**Timeline:** Sprint 10 (Weeks 19-20)

**Deliverable:** Admin tools with:
- Dashboard KPI widgets (utilization, activity)
- Tier override request management
- Email approve links (magic links for coordinators)
- Manual reputation overrides with audit trail
- White-glove scheduling (bypass tier restrictions)
- Meeting management (view, edit, cancel any meeting)
- Tag approval workflow

**User Stories:**

80. **ADMIN-DASH-001: Dashboard KPI Widgets**
    - As a **coordinator**, I want to see key platform metrics at a glance
    - **Acceptance Criteria:**
      - KPI cards: Mentor utilization rate (%), Weekly slots filled (#), Active users (#), Upcoming meetings (#)
      - Utilization formula: (booked slots / offered slots) × 100
      - Simple charts (Recharts): Booking trends (line chart), Top mentors/mentees by activity (bar chart)
      - Tooltips on hover, no complex interactivity
    - **Related:** FR68, FR69, Section 3.3

81. **ADMIN-OVERRIDE-001: Tier Override Request Management**
    - As a **coordinator**, I want to review and approve/deny tier override requests
    - **Acceptance Criteria:**
      - "Override Requests" tab in coordinator dashboard
      - Table: Mentee name, Mentor name, Reason, Date requested, Status (Pending/Approved/Denied)
      - Row actions: "Approve" button, "Deny" button, "View details" link
      - Approve: `PUT /api/tier-overrides/:id/approve` sets `status='approved'`, `expires_at = reviewed_at + 7 days`, sends email to mentee
      - Deny: `PUT /api/tier-overrides/:id/deny` sets `status='denied'`, sends email to mentee
    - **Related:** FR54, FR55, FR56

82. **ADMIN-MAGIC-001: Email Approve Link (Magic Link)**
    - As a **coordinator**, I want to approve tier overrides directly from email without logging in
    - **Acceptance Criteria:**
      - Email notification includes "Approve" magic link: `/api/tier-overrides/approve/{token}`
      - Token is JWT (payload: requestId, action='approve', exp=7 days)
      - Clicking link: Verifies token, marks request approved, redirects to success page
      - Token single-use (marked `used_at` in `tier_override_tokens`)
    - **Related:** FR56, Section 4.1

83. **ADMIN-REP-001: Manual Reputation Override**
    - As a **coordinator**, I want to manually adjust user reputation scores with audit trail
    - **Acceptance Criteria:**
      - User profile (admin view): "Override Reputation" button
      - Modal: New score input, Reason (required)
      - On submit: Update `users.reputation_score`, log to `audit_log` and `reputation_history`
      - Audit log: before/after values, admin user, reason, timestamp
    - **Related:** FR53, FR71, FR72

84. **ADMIN-SCHEDULE-001: White-Glove Scheduling**
    - As a **coordinator**, I want to manually schedule meetings on behalf of mentors/mentees
    - **Acceptance Criteria:**
      - "Schedule Meeting" button on any user's profile (coordinator view)
      - Form: Select mentor, select mentee, select time slot, meeting goal, materials (optional)
      - Bypasses tier restrictions (coordinators can book any mentor for any mentee per FR67)
      - Confirmation email sent to both parties
      - Logged as admin action in `audit_log`
    - **Related:** FR65, FR67, FR71

85. **ADMIN-MEETINGS-001: Meeting Management**
    - As a **coordinator**, I want to view, edit, and cancel any meeting
    - **Acceptance Criteria:**
      - "Meetings" tab in coordinator dashboard
      - Filters: Date range, user, status (upcoming/past/canceled)
      - Actions: View details, Edit (change time, participants, goal), Cancel
      - All edits logged in `audit_log` with before/after values
    - **Related:** FR66, FR71, FR72

86. **ADMIN-TAGS-001: Tag Approval Workflow**
    - As a **coordinator**, I want to approve user-submitted tags before they're added to CF taxonomy
    - **Acceptance Criteria:**
      - "Tag Management" tab in coordinator dashboard
      - "Pending Approvals" view: Table of tags with `source='user_request'`, `is_approved=false`
      - Columns: Category, Value, Requested by, Date requested
      - Row actions: "Approve" (`PUT /api/taxonomy/:id/approve`), "Reject" (`PUT /api/taxonomy/:id/reject`)
      - Approve: Set `is_approved=true`, `approved_by`, `approved_at`
      - Reject: Soft-delete tag entry (`deleted_at`)
      - Toast notification when new tag submitted (if coordinator online)
    - **Related:** FR75, FR92, FR107, Section 3.3

---

### 5.3 Story Estimation & Prioritization

**Total Stories:** 86
**Critical Path (P0):** Epics 0-4 (57 stories)
**High Priority (P1):** Epics 5-7 (22 stories)
**Medium Priority (P2):** Epic 8 (7 stories)

**Recommended Sprint Breakdown (2-week sprints):**

- **Sprint 1-2:** Epic 0 (Walking Skeleton) - 18 stories → **END-TO-END WORKING PRODUCT**
- **Sprint 3:** Epic 1 (Infrastructure Depth) - 8 stories
- **Sprint 4:** Epic 2 (Authentication & Profile Depth) - 11 stories
- **Sprint 5:** Epic 3 (Calendar Integration) - 10 stories
- **Sprint 6:** Epic 4 (Availability & Booking Depth) - 10 stories
- **Sprint 7:** Epic 5 (Airtable Integration) - 5 stories
- **Sprint 8:** Epic 6 (Matching & Discovery) - 7 stories
- **Sprint 9:** Epic 7 (Reputation & Ratings) - 10 stories
- **Sprint 10:** Epic 8 (Admin & Coordinator Tools) - 7 stories

**Estimated Timeline:** 20 weeks (10 sprints)

**Key Milestones:**
- ✅ **Week 4**: End-to-end booking flow working (login, profile, availability, booking)
- ✅ **Week 8**: OAuth, rich profiles, tags, user search
- ✅ **Week 10**: Full calendar integration with conflict checking and Google Meet links
- ✅ **Week 12**: Advanced booking features (recurrence, real-time updates, reminders)
- ✅ **Week 14**: Airtable sync replaces mock data
- ✅ **Week 16**: Matching and discovery with recommendations
- ✅ **Week 18**: Reputation system with tier-based access control
- ✅ **Week 20**: Full admin tools and platform complete

---

### 5.4 Cross-Cutting Stories (Apply Across Epics)

**Error Handling & Validation:**
- All API endpoints implement centralized error handling (INFRA-API-001)
- All forms implement validation with user-friendly error messages
- All database operations use transactions where appropriate

**Testing:**
- Unit tests for business logic (matching, reputation, utilities)
- Integration tests for API contracts (validate against OpenAPI spec)
- E2E tests for critical flows (booking, cancellation, tier override)

**Accessibility:**
- All UI components use Shadcn/ui (WCAG 2.1 AA compliant)
- Keyboard navigation supported
- Screen reader labels on all interactive elements

**Performance:**
- API response times monitored (<2s for core features per NFR2)
- Frontend bundle size optimized (code splitting)
- Database queries indexed for common filters

---

### 5.5 Dependencies Between Epics

```
Epic 0 (Walking Skeleton) - NO DEPENDENCIES
  ↓
Epic 1 (Infrastructure Depth)
  ↓
Epic 2 (Authentication & Profile Depth)
  ↓
Epic 3 (Calendar Integration)
  ↓
Epic 4 (Availability & Booking Depth)
  ↓
Epic 5 (Airtable Integration) [can run parallel to Epic 6]
  ↓
Epic 6 (Matching & Discovery) [can run parallel to Epic 5]
  ↓
Epic 7 (Reputation & Ratings)
  ↓
Epic 8 (Admin & Coordinator Tools)
```

**Critical Dependencies:**
- Epic 0 must complete first (foundation for everything)
- Calendar Integration (Epic 3) must complete before Availability & Booking Depth (Epic 4)
- Availability & Booking (Epic 4) must complete before Reputation (Epic 7)
- Profile Depth (Epic 2) must complete before Matching (Epic 6)

**Parallelization Opportunities:**
- Airtable Integration (Epic 5) can run parallel to Matching & Discovery (Epic 6) after Epic 4 completes
- Both depend on different parts of the system (data sync vs. matching algorithm)

**Walking Skeleton Advantages:**
1. **Immediate Value**: Working product by Sprint 2 (Week 4) vs. Sprint 6 (Week 12)
2. **Early Feedback**: Stakeholders and users can test real flows early
3. **Risk Mitigation**: Integration issues discovered early with real data
4. **Flexible Prioritization**: Can adjust Epic 5+ based on user feedback from Epics 0-4
5. **Team Morale**: Tangible progress visible every 2 weeks
## Change Log

| Change | Date | Version | Description | Author |
|--------|------|---------|-------------|--------|
| Initial Draft | 2025-10-01 | 1.0 | Created technical PRD with project context, complete requirements, and architecture decisions | John (PM Agent) |
| Technical Refinements | 2025-10-01 | 1.1 | Added: users/user_profiles table split, user_tags audit fields, centralized error handling, centralized utilities, minimal monitoring approach, Vitest testing strategy | John (PM Agent) |
| Consistency Check & Fixes | 2025-10-01 | 1.2 | Renumbered FRs sequentially (FR1-FR102), added missing requirements (avatar management, taxonomy storage, preset locations, calendar disconnect, reminder preferences), clarified dormant vs deactivated users, updated schema (actual_duration_minutes, reminder_preference, avatar fields, taxonomy table, tier_override_tokens), added approve link token documentation | John (PM Agent) |
| Internal Consistency Audit | 2025-10-01 | 1.3 | Schema updates: taxonomy approval workflow (source, is_approved, requested_by, approved_by fields), user_tags admin source type, avatar_metadata JSONB, tier_override_requests scope/expiration, calendar_integrations one-per-user constraint, notification_type tag_approval_pending. Clarified: FR62/FR63 meeting duration (nullable for in-person), FR57 dormant users (no scheduled meetings), NFR31 webhook sync/async split, NFR34 openapi-typescript for frontend types. Added: INotificationProvider.sendTagApprovalNotification, email template specifications, avatars storage bucket, data seeding section | John (PM Agent) |
| Post-Review Updates | 2025-10-01 | 1.4 | **SCOPE CHANGE:** Calendar sync now mandatory for all users (FR105-FR107). Consolidated FR19/FR31 (mentor reach-out with auto-exception). Updated FR11 (manual tags only for MVP, defer AI to post-MVP). Clarified FR62/FR63 (meeting duration fetched 1hr after end, best-effort). Updated NFR5/NFR28 (scoped realtime subscriptions). Schema: tier_override_requests.expires_at now required (7-day expiration), bookings.actual_duration_minutes clarified. API: Added /taxonomy endpoints (GET /, GET /pending, PUT /:id/approve, PUT /:id/reject). Google Meet link logic: prefer mentee's Google account, fallback to mentor, manual link for Outlook-only meetings. Reputation: added probationary clamp logic (isProbationary flag). Section 4.10: Added complete Airtable field mapping documentation | John (PM Agent) |
| OAuth Flow Simplification | 2025-10-01 | 1.5 | **UX IMPROVEMENT:** OAuth signup (Google/Microsoft) now requests both auth + calendar permissions in single combined flow (FR2, FR108). Magic link users see dismissible banner, prompted for calendar only when attempting booking/availability actions (action-level blocking per FR105). Coordinators exempt from calendar requirement. Schema: calendar_integrations.connection_method added (oauth_signup vs post_login). UI: Updated authentication flow screens with OAuth scope details, calendar connection banner/modal, action-level blocking. UX flows updated to reflect OAuth auto-connection and just-in-time prompts for magic link users. API: Documented combined OAuth flow and post-login calendar connection. Section 3.3: Added calendar permission scopes, action-level blocking requirements | John (PM Agent) |
| Internal Consistency Resolution | 2025-10-01 | 1.6 | **CONSISTENCY FIXES:** Clarified coordinator calendar exemption in schema documentation (application-level enforcement). Expanded FR93 with calendar disconnection behavior (warning on active bookings, manual cleanup responsibility, email notifications continue). Updated tier override expiration logic: approved overrides expire 7 days after approval (not creation), mentor-initiated overrides auto-approved. Updated FR54 to reflect new expiration model. FR107 clarified: tag approval notifications use delivery_channel='both'. FR57 expanded: dormant status is user-wide (90+ days no meetings in any role), tracked via users.last_activity_at. **SCOPE REDUCTION:** Removed meeting duration tracking from MVP (FR62/FR63 simplified, bookings.actual_duration_minutes removed, moved to FE12). API: Added POST /mentors/:mentorId/send-interest with auto-approval logic for tier-restricted mentor-initiated requests. UI: Added SlotPicker realtime subscription implementation example (scoped per NFR28) | John (PM Agent) |
| Epic & Story Structure | 2025-10-02 | 1.7 | **SECTION COMPLETE:** Added comprehensive Section 5 (Epic and Story Structure) with 9 epics, 78 user stories, acceptance criteria, priority levels, dependencies, sprint breakdown, and 18-week estimated timeline. Status: PRD now 100% complete and ready for epic/story generation. All requirements mapped to implementable stories with clear dependencies and acceptance criteria | John (PM Agent) |
| Walking Skeleton Restructure | 2025-10-02 | 2.0 | **MAJOR RESTRUCTURE:** Reorganized all epics using Walking Skeleton approach for faster time-to-value. Added Epic 0 (18 stories) delivering end-to-end working product by Week 4. Mock data seeding replaces Airtable dependency for initial development. Resequenced Epics 1-8 to iteratively add depth (infrastructure, OAuth, calendar, advanced booking, Airtable sync, matching, reputation, admin). Total: 86 stories across 10 sprints (20 weeks). Key improvement: working product in 4 weeks vs. 12 weeks, enabling early user feedback and risk mitigation. All stories renumbered (SKEL-*, INFRA-*, AUTH-*, PROFILE-*, CAL-*, AVAIL-*, BOOK-*, AIRTABLE-*, MATCH-*, REP-*, ADMIN-*) | John (PM Agent) |
