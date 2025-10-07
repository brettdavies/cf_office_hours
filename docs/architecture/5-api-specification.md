# 5. API Specification

---
> **⚠️ Type System Migration (Story 0.6.1)**
> This document has been updated to reflect the new automated type generation system.
> Manual TypeScript interfaces for data models (`IUser`, `IBooking`, etc.) are deprecated.
> - **Backend**: Use `z.infer<typeof Schema>` from Zod schemas
> - **Frontend**: Use types from `packages/shared/src/types/api.generated.ts`
>
> See [Story 0.6.1](../stories/0.6.1.story.md) for complete migration details.
---

Based on the chosen API style (REST with OpenAPI 3.1), the API contract is defined using **Hono + Zod + @hono/zod-openapi**. This approach generates TypeScript types and OpenAPI documentation from a single source of truth.

## 5.1 API Design Philosophy

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

## 5.2 API Base Structure

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

## 5.3 Core API Schemas (Zod)

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
  status: z.enum(['pending', 'confirmed', 'completed', 'canceled', 'expired']),
  confirmed_by: z.string().uuid().nullable(),
  confirmed_at: z.string().datetime().nullable(),
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

## 5.4 REST API Endpoints (Grouped by Resource)

### **1. Authentication & User Management**

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

### **2. Calendar Integration**

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

### **3. Availability Management**

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

### **4. Bookings**

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

### **5. Ratings & Reputation**

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

### **6. Mentor-Specific Exception Requests**

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

### **7. Tags & Taxonomy**

```yaml
GET /taxonomy
  Headers: Authorization Bearer <token>
  Query: { category?: TagCategory, is_approved?: boolean }
  Response: Taxonomy[]
  Description: Get taxonomy entries (industries, technologies, stages)

POST /taxonomy/request
  Headers: Authorization Bearer <token>
  Body: { category: TagCategory, name: string }
  Response: 201 Taxonomy
  Description: User requests new tag (normalized to lowercase_snake_case, requires coordinator approval per FR75)

PUT /taxonomy/:id/approve
  Headers: Authorization Bearer <token>
  Response: Taxonomy
  Description: Coordinator approves user-requested tag

GET /users/me/tags
  Headers: Authorization Bearer <token>
  Response: EntityWithTags
  Description: Get tags assigned to current user

POST /users/me/tags
  Headers: Authorization Bearer <token>
  Body: { taxonomy_id: string }
  Response: 201 EntityTag
  Description: Assign tag from taxonomy to user profile

DELETE /users/me/tags/:id
  Headers: Authorization Bearer <token>
  Response: { message: "Tag removed" }
  Description: Remove tag from user profile (soft delete)

GET /portfolio-companies
  Headers: Authorization Bearer <token>
  Query: { search?: string, limit?: number, offset?: number }
  Response: { companies: PortfolioCompany[], total: number }
  Description: Search portfolio companies

GET /portfolio-companies/:id
  Headers: Authorization Bearer <token>
  Response: PortfolioCompany with tags and URLs
  Description: Get portfolio company details
```

### **8. Matching & Recommendations**

```yaml
POST /matching/find-matches
  Headers: Authorization Bearer <token>
  Body: { userId: string, targetRole: 'mentor' | 'mentee', options?: { algorithmVersion?: string, limit?: number, minScore?: number } }
  Response: { matches: Array<{ user: UserWithProfile, score: number, explanation: MatchExplanation }> }
  Description: Get cached match recommendations from user_match_cache table (coordinator only)

POST /matching/explain
  Headers: Authorization Bearer <token>
  Body: { userId1: string, userId2: string }
  Response: { explanation: MatchExplanation }
  Description: Get cached match explanation for a specific mentor-mentee pair (coordinator only)

GET /mentors/recommended
  Headers: Authorization Bearer <token>
  Response: { recommendations: Array<{ mentor: UserWithProfile, match_score: number, explanation: string[] }> }
  Description: Personalized mentor recommendations (reads from user_match_cache)

GET /mentees/recommended
  Headers: Authorization Bearer <token>
  Response: Similar to /mentors/recommended
  Description: Personalized mentee recommendations for mentors (reads from user_match_cache)

POST /mentors/:mentor_id/send-interest
  Headers: Authorization Bearer <token>
  Body: { message?: string }
  Response: { message: "Interest notification sent" }
  Description: Mentor expresses interest in mentee (FR19, auto-creates exception if tier mismatch)
```

### **9. Admin/Coordinator**

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

### **10. Webhooks (Airtable Integration)**

```yaml
POST /webhooks/airtable
  Headers: X-Airtable-Signature: <signature>
  Body: AirtableWebhookPayload
  Response: 200 { message: "Processing started" }
  Description: Receive Airtable webhooks, store payload, trigger async sync (FR5, NFR31)
```

## 5.5 Error Response Format

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

## 5.6 OpenAPI Type Generation

**IMPORTANT (Story 0.6.1)**: This is the **mandatory pattern** for all frontend API type usage.
Do NOT create manual interfaces - always use types generated from OpenAPI spec.

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

**Backend Type Usage:**

```typescript
// apps/api/src/routes/bookings.ts
import { CreateBookingSchema, BookingResponseSchema } from '@shared/schemas/booking';

// Infer types from Zod schemas
type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
type BookingResponse = z.infer<typeof BookingResponseSchema>;

export const createBookingHandler = async (c: Context) => {
  const input = c.req.valid('json') as CreateBookingInput;

  // Business logic...
  const booking: BookingResponse = await bookingService.create(input);

  return c.json(booking, 201);
};
```

## 5.7 API Sample Payloads

This subsection provides complete request/response examples for the 10 most critical API endpoints, including success cases, error scenarios, and edge cases aligned with PRD requirements.

### Top 10 Critical Endpoints

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

### 1. POST /auth/magic-link - Magic Link Authentication

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

### 2. POST /auth/oauth/google - OAuth Authentication (Google)

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

### 3. POST /bookings - Create Booking

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
    "status": "pending",
    "confirmed_by": null,
    "confirmed_at": null,
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

### 4. GET /bookings - List Bookings

**Purpose:** Retrieve user's bookings with filtering options

**Request:**
```http
GET https://api.officehours.youcanjustdothings.io/v1/bookings?status=confirmed&role=mentee&start_date=2025-10-01&end_date=2025-10-31&limit=20&offset=0
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameters:**
- `status` (optional): Filter by status (pending, confirmed, completed, canceled, expired)
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

### 5. DELETE /bookings/:id - Cancel Booking

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

### 6. POST /availability - Create Availability

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

### 7. GET /availability/slots - Browse Available Slots

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
          { "taxonomy_id": "tax-001", "category": "industry", "name": "saas", "source": "airtable", "is_approved": true },
          { "taxonomy_id": "tax-002", "category": "industry", "name": "fintech", "source": "user", "is_approved": true },
          { "taxonomy_id": "tax-003", "category": "technology", "name": "cloud_native", "source": "airtable", "is_approved": true },
          { "taxonomy_id": "tax-004", "category": "stage", "name": "series_a", "source": "airtable", "is_approved": true }
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
          { "taxonomy_id": "tax-001", "category": "industry", "name": "saas", "source": "airtable", "is_approved": true },
          { "taxonomy_id": "tax-002", "category": "industry", "name": "fintech", "source": "user", "is_approved": true },
          { "taxonomy_id": "tax-003", "category": "technology", "name": "cloud_native", "source": "airtable", "is_approved": true },
          { "taxonomy_id": "tax-004", "category": "stage", "name": "series_a", "source": "airtable", "is_approved": true }
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

### 8. GET /users/:id/profile - Get User Profile

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
    "portfolio_company_id": null,
    "company": "TechCorp",
    "phone": "+1 (512) 555-0123",
    "expertise_description": "15+ years building SaaS products. Expert in go-to-market strategy, product-market fit, and scaling engineering teams. Passionate about helping early-stage founders avoid common pitfalls.",
    "ideal_mentee_description": "Series A-B SaaS founders looking to scale their product and engineering teams. Also enjoy working with first-time founders on product strategy.",
    "bio": "Former VP of Product at two successful exits. Angel investor in 12 companies. Love connecting founders with resources.",
    "avatar_url": "https://storage.supabase.co/avatars/sarah.jpg",
    "avatar_source_type": "upload",
    "reminder_preference": "both",
    "metadata": {},
    "created_at": "2024-03-15T10:00:00Z",
    "created_by": null,
    "updated_at": "2025-09-28T14:20:00Z",
    "updated_by": "550e8400-e29b-41d4-a716-446655440001"
  },
  "urls": {
    "linkedin": "https://www.linkedin.com/in/sarahmentor",
    "website": "https://www.sarahmentor.com",
    "other": "https://twitter.com/sarahmentor"
  },
  "tags": [
    {
      "entity_tag_id": "etag-001",
      "taxonomy_id": "tax-001",
      "category": "industry",
      "name": "saas",
      "source": "airtable",
      "is_approved": true
    },
    {
      "entity_tag_id": "etag-002",
      "taxonomy_id": "tax-002",
      "category": "industry",
      "name": "fintech",
      "source": "user",
      "is_approved": true
    },
    {
      "entity_tag_id": "etag-003",
      "taxonomy_id": "tax-003",
      "category": "technology",
      "name": "cloud_native",
      "source": "airtable",
      "is_approved": true
    },
    {
      "entity_tag_id": "etag-004",
      "taxonomy_id": "tax-004",
      "category": "stage",
      "name": "series_a",
      "source": "user",
      "is_approved": true
    },
    {
      "entity_tag_id": "etag-005",
      "taxonomy_id": "tax-005",
      "category": "stage",
      "name": "series_b",
      "source": "user",
      "is_approved": true
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

### 9. POST /matching/find-mentors - Find Matching Mentors

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

### 10. POST /tier-overrides - Request Tier Override

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
