# 4. Technical Constraints and Integration

## 4.1 Database Schema Design

### Core Tables

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

### Database Views (Soft Delete Filtering)

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

### Row Level Security (RLS) Policies

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

## 4.2 API Architecture

### API Structure (Hono + Cloudflare Workers)

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

### Zod Schema Examples

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

### OAuth Flow Details

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

### New Endpoint Details

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

## 4.3 Centralized Error Handling

### Frontend Error Handling

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

### Backend Error Handling

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

## 4.4 Centralized Utilities

### Frontend Utilities

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

### Backend Utilities

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

## 4.5 Integration Patterns

### ICalendarProvider Interface

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

### IMatchingEngine Interface

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

### IReputationCalculator Interface

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

### INotificationProvider Interface

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

### Email Templates

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

## 4.6 Deployment & Infrastructure

### Cloudflare Pages (Frontend)

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

### Cloudflare Workers (API + Webhooks)

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

### Supabase Configuration

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

## 4.7 Testing Strategy

### Unit Tests (Vitest)

**Focus Areas:**
- Reputation calculation logic
- Matching score algorithm
- Timezone conversion utilities
- Slot generation from availability blocks
- Error handling utilities

**Why Vitest:** Vite-native, fast, Jest-compatible API, built-in TypeScript support

---

### Integration Tests (Vitest + Supabase Test DB)

**API Contract Testing:**
- Validate all endpoints against OpenAPI spec (NFR33)
- Use Dredd or Prism for automated validation

**Database Tests:**
- RLS policies enforcement
- Soft delete behavior
- Unique constraints (no double-booking)

---

### E2E Tests (Playwright)

**Critical Flows:**
1. Mentee booking a slot
2. Mentor creating availability
3. Tier override request workflow
4. Real-time slot updates

---

## 4.8 Data Seeding & Initial Setup

**Purpose:** Provide baseline data for development, testing, and initial production deployment.

### Seed Data Requirements

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

### Seed Script Location

```
/seeds
  ├── locations.sql          # Location presets
  ├── dev-users.sql          # Development users (not for prod)
  ├── dev-bookings.sql       # Sample bookings (not for prod)
  └── README.md              # Seeding instructions
```

### Execution

- Development: Auto-run on `npm run dev:setup` or similar
- Production: Manual execution of production-safe seeds only (locations)
- Document in deployment guide which seeds are safe for production

---

## 4.9 Monitoring & Observability (Minimal MVP)

### Built-in Tools Only

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

### Health Check Endpoint

```typescript
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});
```

### Deferred to Post-MVP

- FE21: Sentry or error tracking service integration
- FE22: Custom metrics dashboard (Grafana, etc.)
- FE23: Advanced alerting (PagerDuty, etc.)
- FE24: Performance monitoring (Web Vitals tracking)
- FE25: Logging aggregation (Better Stack, Axiom)

---

## 4.10 Airtable Integration Mapping

### Overview

Airtable serves as the **source of truth** for user data and CF taxonomy. The webhook-driven sync ensures operational database (Supabase) remains current with Airtable changes.

---

### Users Table Mapping

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

### Taxonomy Tables Mapping

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

### Webhook Processing Flow

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

### Field Normalization Rules

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

### Error Handling

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

### Development & Testing

**Mock Airtable Data:**
- Seed script: `seeds/mock-airtable.json`
- Contains sample users with all field types
- Includes taxonomy samples for all three categories

**Local Testing:**
- Use Airtable webhook simulator or Postman to send test payloads
- Validate field mapping with unit tests
- Integration tests verify idempotent upsert behavior

---
