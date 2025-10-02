# 5. Epic and Story Structure

## 5.1 Epic Overview

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

## 5.2 Epic Breakdown

---

### **Epic 0: Walking Skeleton (END-TO-END MVP)**
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

### **Epic 1: Infrastructure Depth**
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

### **Epic 2: Authentication & Profile Depth**
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

### **Epic 3: Calendar Integration**
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

### **Epic 4: Availability & Booking Depth**
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

### **Epic 5: Airtable Integration**
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

### **Epic 6: Matching & Discovery**
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

### **Epic 7: Reputation & Ratings**
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

### **Epic 8: Admin & Coordinator Tools**
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

## 5.3 Story Estimation & Prioritization

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

## 5.4 Cross-Cutting Stories (Apply Across Epics)

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

## 5.5 Dependencies Between Epics

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