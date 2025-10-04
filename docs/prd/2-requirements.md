# 2. Requirements

## 2.1 Functional Requirements

### User Management & Authentication

- **FR1**: System shall authenticate users via Supabase Auth using passwordless magic links (email-based)
- **FR2**: System shall support OAuth authentication via Google and Microsoft accounts. OAuth signup flow shall request both authentication AND calendar permissions in single combined flow (scopes: calendar.readonly, calendar.events for Google; Calendars.ReadWrite for Microsoft)
- **FR3**: System shall restrict authentication to email addresses present in synced Airtable users table
- **FR4**: System shall display "Contact admin for access" message for email addresses not found in users table
- **FR5**: System shall sync user profile data from Airtable to Supabase via webhook-triggered Cloudflare Worker
- **FR6**: System shall support three user roles: Mentee, Mentor, and Mentor Coordinator (admin)

### User Profiles

- **FR7**: All users shall edit profiles including: name, title, company, email (required), phone (optional), LinkedIn, website, additional links
- **FR8**: Mentees shall upload pitch decks and documents to Supabase Storage
- **FR9**: Mentees shall link Pitch.vc profiles in their profile
- **FR10**: Mentors shall define default description of expertise areas and ideal mentee profiles
- **FR11**: System shall support manual tag selection from CF's taxonomy (industries, technologies, stages) synced from Airtable. Tags may be populated from Airtable sync (`source=airtable`) or manual user selection (`source=user`). AI-based auto-generation deferred to post-MVP
- **FR12**: System shall differentiate between "approved" tags (from Airtable or approved by coordinators) and "user-submitted" tags pending coordinator approval

### Matching & Discovery

- **FR13**: System shall implement `IMatchingEngine` interface for pluggable matching algorithms
- **FR14**: MVP matching engine shall use tag overlap, company stage, and reputation scores as primary factors
- **FR15**: Mentees shall view searchable/filterable directory of all mentors with personalized recommendations
- **FR16**: Mentors shall view searchable/filterable directory of all mentees with personalized recommendations
- **FR17**: System shall display match explanations (e.g., "3 shared industry tags, similar stage")
- **FR18**: System shall provide manual search/filter capabilities alongside AI recommendations (hybrid approach)
- **FR19**: Mentors shall send meeting interest notifications to mentees (via email and toast if online) with link to mentor's booking page. System shall automatically check tier restrictions and create override request if mentee cannot book mentor due to tier mismatch

### Calendar Integration & Availability

- **FR20**: System shall implement `ICalendarProvider` interface supporting multiple calendar providers
- **FR21**: MVP shall support Google Calendar and Microsoft Outlook integration. OAuth signup flow requests calendar permissions (calendar.readonly, calendar.events) during initial authentication. Magic link users connect calendar post-login via separate OAuth flow
- **FR22**: Mentors shall create recurring availability blocks (one-time, weekly, monthly, quarterly)
- **FR23**: Mentors shall specify time slot durations: 15, 20, 30, or 60 minutes
- **FR24**: Mentors shall set buffer time between sessions
- **FR25**: Mentors shall specify meeting type: in-person (predefined location), in-person (custom location), or online (Google Meet)
- **FR26**: System shall handle timezone conversion automatically (store UTC, display local)
- **FR27**: System shall prevent double-booking across calendar providers using database constraints
- **FR28**: System shall generate unique Google Meet links for online meetings when at least one attendee has connected a Google Calendar. If both attendees use Microsoft Outlook, meeting description shall instruct attendees to create their own meeting link

### Booking & Scheduling

- **FR29**: Mentees shall create booking requests for available mentor time slots (requires connected calendar per FR105). Booking requests immediately reserve the slot (`time_slots.is_booked=true`, `status='pending'`) to prevent concurrent bookings. Bookings require mentor or coordinator confirmation within 7 days, after which they expire and the slot is automatically freed for rebooking
- **FR30**: Mentees shall provide meeting goal description and materials for mentor review when booking
- **FR31**: [INTENTIONALLY LEFT BLANK]
- **FR32**: System shall send notification emails at three booking lifecycle stages via `INotificationProvider`: (1) Booking request creation: mentor receives "New booking request, please confirm" email, mentee receives "Request submitted, awaiting confirmation" receipt; (2) Mentor/coordinator confirmation: both parties receive "Meeting confirmed" email; (3) Expiration without confirmation (7 days): mentee receives "Booking request expired, please rebook if still interested" email
- **FR33**: System shall send reminder emails based on user preference: 1 hour before / 24 hours before / Both (default: 1 hour)
- **FR34**: Either party shall cancel meetings with automated email notification to other party
- **FR35**: Canceled meetings do not auto-reschedule; mentee must rebook via standard flow
- **FR36**: System shall generate a single calendar event with both mentor and mentee as attendees only after booking confirmation (`status='confirmed'`). Event shall include meeting details, Google Meet link (if applicable), and attendee information. Both parties receive calendar notifications via their connected calendar provider. Calendar events shall be updated or deleted when bookings are modified or canceled
- **FR37**: Users shall add individual events to Google Calendar or subscribe via .ical feed
- **FR38**: System shall enforce minimum 1-day advance booking requirement for all meetings
- **FR39**: Calendar events shall include absolute UTC time + TZID for timezone-safe display

### Real-time & Notifications

- **FR40**: System shall use Supabase Realtime to broadcast slot availability changes to all connected clients
- **FR41**: When a time slot is reserved (booking request created with `status='pending'`), all users viewing that slot shall receive immediate UI update (slot disappears/grays out). When a pending booking expires without confirmation, the slot shall reappear in real-time for other users
- **FR42**: If a user attempts to book a slot already reserved by another concurrent user, system shall display toast notification: "This slot was just booked by another user" and return to slot selection view
- **FR43**: System shall use toast notifications (Shadcn toast component) for all transient on-screen notifications

### Reputation & Ratings

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

### Admin & Coordinator Features

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

### API & Testing

- **FR76**: System shall implement REST APIs using Hono framework with Zod schema validation
- **FR77**: System shall define all API contracts using OpenAPI 3.0 specification generated from Zod schemas using `@hono/zod-openapi`
- **FR78**: API documentation shall be auto-generated and accessible at `/api/docs`
- **FR79**: Before confirming booking, system shall check mentor's external calendar for conflicts via API
- **FR80**: System shall prevent hard deletion of availability blocks with confirmed bookings (require confirmation showing X booked slots will be affected)

### Data Management

- **FR81**: System shall use soft deletes for all entities (users, meetings, availability, ratings)
- **FR82**: All database tables shall include timestamp columns: `created_at`, `updated_at`, `deleted_at`
- **FR83**: Queries shall exclude soft-deleted records by default unless explicitly requesting archived data
- **FR84**: Admin users shall have ability to view soft-deleted records
- **FR85**: GDPR deletion requests shall permanently delete (hard delete) user data and anonymize historical records, with action logged and non-PII retained
- **FR86**: Webhook handler shall store complete Airtable webhook payload in raw data table, then use field mapping to upsert specific fields into operational tables
- **FR87**: System shall store CF taxonomy (industries, technologies, stages) in database tables, synced from Airtable webhooks

### Profile & Media Management

- **FR88**: Users shall upload avatar images via file upload or provide image URL, with max size 5MB (JPEG, PNG, WebP)
- **FR89**: System shall provide avatar cropping modal with circular crop area, supporting rotation, pan, and zoom
- **FR90**: Avatar images shall be displayed as circles throughout the application
- **FR91**: Users shall manually add custom tags to their profile from existing taxonomy
- **FR92**: [MOVED TO FE35 - Tag approval workflow deferred to post-MVP]

### Calendar Integration

- **FR93**: Users shall disconnect calendar integration via settings, removing OAuth tokens and stopping sync. System shall warn users if active bookings exist in next 7 days: "You have X upcoming meetings. Disconnecting will prevent calendar conflict checks, but existing calendar events will remain (you must delete them manually if needed)." System continues to send email notifications for existing bookings after disconnection. User must reconnect calendar to create new availability blocks or make new bookings (per FR105). Calendar events in external calendar (Google/Outlook) are not automatically deleted; users are responsible for manual cleanup if desired
- **FR94**: Users shall configure reminder notification preferences in profile settings (default: 1 hour before)
- **FR105**: Mentors and mentees must connect one calendar provider (Google or Microsoft) before performing booking/availability actions (viewing available slots, booking meetings, creating availability blocks). OAuth signup users (Google/Microsoft) have calendar connected automatically during signup per FR2. Magic link users can connect calendar post-login via separate OAuth flow. **Coordinators are exempt from calendar connection requirement and can perform all booking/availability functions for mentors and mentees without having a connected calendar themselves.** System shall prompt calendar connection when non-coordinator user attempts booking/availability action without connected calendar
- **FR106**: System shall check for calendar conflicts before confirming bookings using connected calendar provider's availability data
- **FR107**: [MOVED TO FE36 - Tag approval notifications deferred to post-MVP]

### Centralized Error Handling

- **FR95**: Frontend shall implement centralized React Error Boundary to catch and display user-friendly errors
- **FR96**: Frontend shall implement centralized API client with consistent error handling and user feedback via toast notifications
- **FR97**: Backend shall implement centralized error handling middleware with standardized error responses
- **FR98**: Backend shall use custom AppError class for application-specific errors with status codes and error codes

### Centralized Utilities

- **FR99**: System shall centralize date/time utilities for consistent timezone handling across application
- **FR100**: System shall centralize authentication middleware for consistent auth checks across API routes
- **FR101**: System shall centralize database query helpers for consistent data access patterns
- **FR102**: Frontend shall centralize toast notifications using single notification library (Sonner)

---

## 2.2 Non-Functional Requirements

### Performance

- **NFR1**: System shall support 500 concurrent users without performance degradation
- **NFR2**: API response times shall be <2 seconds for core features (search, booking, profile load)
- **NFR3**: Calendar availability queries shall complete within 1 second
- **NFR4**: Airtable webhook processing shall complete within 5 seconds for full table sync
- **NFR5**: Real-time slot availability updates shall propagate to clients subscribed to the affected mentor's availability within 1 second via Supabase Realtime

### Scalability

- **NFR6**: Database schema shall support growth to 5,000 users without refactoring
- **NFR7**: System shall handle bursts of 50 simultaneous booking requests without race conditions using database transactions and optimistic locking

### Reliability & Availability

- **NFR8**: Target uptime of 99% for MVP phase
- **NFR9**: Webhook failures shall not block application functionality (use cached data gracefully)
- **NFR10**: External API failures (Google Calendar, Microsoft Graph) shall display user-friendly error messages. Calendar connection is required per FR105; temporary API failures shall prompt retry with clear messaging

### Security & Privacy

- **NFR11**: All API endpoints shall enforce authentication via Supabase JWT tokens
- **NFR12**: Database access shall use Row Level Security (RLS) policies to enforce role-based permissions
- **NFR13**: User contact information (email, phone) shall be encrypted at rest
- **NFR14**: File uploads (pitch decks, avatars) shall be restricted to approved file types (PDF, PPTX for decks; JPG, PNG, WEBP for avatars). Virus scanning via Supabase Storage built-in features if available; MVP assumes good actors if scanning unavailable
- **NFR15**: OAuth tokens for calendar access shall be stored securely and refreshed automatically
- **NFR16**: Airtable webhook payloads shall be verified using signature validation

### Data Integrity

- **NFR17**: All timestamps shall be stored in UTC with timezone metadata
- **NFR18**: Database constraints shall prevent duplicate bookings for same time slot
- **NFR19**: Deletion of users shall cascade appropriately (cancel future meetings, preserve historical data)
- **NFR20**: Rating submissions shall be idempotent (cannot submit duplicate rating for same meeting)

### Maintainability & Extensibility

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

### Usability

- **NFR35**: UI shall be optimized for desktop/laptop displays (1280px+ width)
- **NFR36**: UI shall use Shadcn/ui components consistently for visual cohesion
- **NFR37**: Error messages shall be user-friendly and actionable (avoid technical jargon)
- **NFR38**: Loading states shall display for any operation taking >500ms
- **NFR39**: Toast notifications shall be dismissible and auto-dismiss after 5 seconds for non-critical messages

### Compliance & Standards

- **NFR40**: System shall comply with GDPR for user data handling (right to delete, data export)
- **NFR41**: Calendar integrations shall follow RFC 5545 (iCalendar) and RFC 7986 standards
- **NFR42**: OAuth implementations shall follow OAuth 2.0 and OIDC specifications

### Monitoring & Observability

- **NFR43**: MVP shall use built-in Cloudflare and Supabase dashboards for monitoring (no third-party services)
- **NFR44**: System shall expose `/api/health` endpoint for basic health checks
- **NFR45**: All errors shall be logged to console (structured logging deferred to post-MVP)

---

## 2.3 Compatibility Requirements

- **CR1**: System shall maintain compatibility with Airtable API v0 for webhook and data fetch operations
- **CR2**: Calendar integrations shall remain compatible with Google Calendar API v3 and Microsoft Graph API
- **CR3**: Authentication flows shall remain compatible with Supabase Auth SDK for React
- **CR4**: UI components shall remain compatible with Shadcn/ui library updates within major version
- **CR5**: Data sync logic shall handle Airtable schema changes gracefully (new columns stored in raw table, recognized columns mapped)

---

## 2.4 Future Enhancements (Post-MVP)

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
- **FE31**: Interactive dashboard charts with drill-down (Recharts + historical data)
- **FE32**: Email magic link approval for tier overrides (one-click approval from email)
- **FE33**: Automated tag approval workflow with real-time toast notifications
- **FE34**: Calendar event modification API support (update meeting time/location without cancel+rebook)
- **FE35**: Tag approval workflow - User-submitted tags that don't exist in taxonomy shall require coordinator approval before addition to system taxonomy. Coordinator dashboard "Tag Management" tab shows pending tags with approve/reject actions. In MVP, coordinators manually approve tags via direct database updates
- **FE36**: Tag approval notifications - Coordinators shall receive notifications when new taxonomy tags are submitted for approval (delivery_channel='both'). Email notifications sent to all coordinators. In-app toast notifications delivered to online coordinators via Supabase Realtime subscription to taxonomy table changes (WHERE is_approved=false)

---
