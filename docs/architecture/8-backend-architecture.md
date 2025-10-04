# 8. Backend Architecture

This section defines the backend architecture for the Cloudflare Workers API, including application structure, Hono framework patterns, service layer design, repository pattern for data access, middleware implementation, and backend-specific concerns. The backend is built with **Hono 4.x**, **TypeScript 5.7.x**, and runs on **Cloudflare Workers** with edge deployment.

## 8.1 Backend Application Structure

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

## 8.2 Entry Point & App Initialization

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

## 8.3 Routing Layer (Hono Routes)

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

## 8.4 Middleware Layer

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

## 8.5 Service Layer (Business Logic)

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
      // Priority: mentee > mentor (mentee's account creates the Meet room)
      const menteeCalendar = await this.calendarRepo.findByUserId(menteeId);
      const mentorCalendar = await this.calendarRepo.findByUserId(mentor.id);

      let meetCreatorId = null;
      if (menteeCalendar?.provider === 'google' && menteeCalendar?.is_connected) {
        meetCreatorId = menteeId; // Mentee has Google Calendar (priority)
      } else if (mentorCalendar?.provider === 'google' && mentorCalendar?.is_connected) {
        meetCreatorId = mentor.id; // Fallback to mentor's Google Calendar
      }

      if (meetCreatorId) {
        googleMeetLink = await this.calendarService.generateMeetLink(
          meetCreatorId,
          timeSlot.start_time,
          timeSlot.end_time,
          `Meeting with ${mentee.profile.name}`
        );
      }
      // If neither has Google Calendar, googleMeetLink remains null
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

## 8.6 Repository Layer (Data Access)

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

## 8.7 Reputation Calculator Service

The Reputation Calculator Service implements the reputation scoring algorithm using modular utility functions for maintainability and testability. This refactored approach breaks down the complex calculation into smaller, focused functions.

### 8.7.1 Reputation Utility Functions

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

### 8.7.2 Reputation Service Implementation

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

## 8.8 Provider Interfaces (External Integrations)

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
    // IMPORTANT: userId should be determined using this priority:
    // 1. Mentee's Google account (if connected)
    // 2. Mentor's Google account (if connected)
    // 3. null if neither has Google Calendar
    // Caller is responsible for determining which user to pass

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

## 8.8 Background Jobs (Durable Objects)

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

## 8.9 Webhook Handling (Airtable Sync)

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
      bio: fields.Bio,
    };

    // Upsert user
    const user = await this.userRepo.upsertByAirtableId(airtableRecordId, userData, profileData);

    // Sync LinkedIn URL to user_urls table
    if (fields.LinkedIn) {
      await this.urlRepo.upsertUserUrl({
        user_id: user.id,
        url: fields.LinkedIn,
        url_type: 'linkedin',
        label: null,
      });
    }

    // Sync tags (from Airtable multi-select fields)
    const industries = fields.Industries || [];
    const technologies = fields.Technologies || [];
    const stage = fields.Stage ? [fields.Stage] : [];

    await Promise.all([
      this.tagRepo.syncEntityTags(user.id, 'user', 'industry', industries, 'airtable'),
      this.tagRepo.syncEntityTags(user.id, 'user', 'technology', technologies, 'airtable'),
      this.tagRepo.syncEntityTags(user.id, 'user', 'stage', stage, 'airtable'),
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

## 8.10 Error Handling & Custom Errors

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

## 8.11 Utility Functions

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

## 8.12 Backend Testing Strategy

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

## 8.13 Performance Considerations

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

## 8.14 Security Best Practices

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

## 8.15 Deployment Configuration

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

## 8.7 Background Jobs & Cron Tasks

This section documents all automated background jobs that run on scheduled intervals to maintain data integrity, generate time slots, expire pending requests, and identify dormant users.

### 8.7.1 Overview

**Background Job Strategy:**
The application uses **Supabase `pg_cron` extension** to execute scheduled tasks directly in the database. This approach is optimal because:
- All jobs are database-heavy operations (minimal business logic)
- Reduces cross-service calls (no Worker → Supabase hop)
- Better transaction guarantees and atomicity
- Simpler architecture (no separate Worker cron handlers needed)
- Native Postgres stored procedures for complex operations

**Architecture Decision:**
While Cloudflare Workers support cron triggers, database-centric jobs belong in the database layer. Workers cron triggers are reserved for external API calls (e.g., batch email notifications via SendGrid if needed in future).

**Implementation Pattern:**
```sql
-- Enable pg_cron extension (Supabase Dashboard: Database → Extensions)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule jobs via SQL
SELECT cron.schedule(
  'generate-time-slots',      -- job name
  '0 */4 * * *',              -- cron schedule (every 4 hours)
  $$ SELECT generate_time_slots(); $$
);
```

**Job Management:**
All cron jobs are managed via SQL migrations in `apps/api/supabase/migrations/`. Each job consists of:
1. **Stored Procedure** (e.g., `generate_time_slots()`) - contains job logic
2. **Cron Schedule** - registered via `cron.schedule()`
3. **Logging** - jobs write to `cron_job_logs` table for monitoring

### 8.7.2 Job #1: Time Slot Generation

**Purpose:** Generate future time slots from availability blocks to maintain a rolling 30-day booking window (FR77-FR82)

**Schedule:** Every 4 hours (`0 */4 * * *`)

**Stored Procedure:**
```sql
-- Migration: 0010_create_time_slot_generation_job.sql

CREATE OR REPLACE FUNCTION generate_time_slots()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_block RECORD;
  v_slot_count INTEGER := 0;
  v_start_time TIMESTAMP := clock_timestamp();
  v_end_date TIMESTAMP := NOW() + INTERVAL '30 days';
BEGIN
  -- Loop through all active availability blocks
  FOR v_block IN
    SELECT * FROM availability_blocks
    WHERE deleted_at IS NULL
    AND is_active = TRUE
  LOOP
    -- Generate slots for next 30 days
    INSERT INTO time_slots (
      id, availability_block_id, mentor_id, start_time, end_time,
      is_booked, created_at, updated_at
    )
    SELECT
      gen_random_uuid(),
      v_block.id,
      v_block.mentor_id,
      slot_start,
      slot_start + (v_block.slot_duration_minutes || ' minutes')::INTERVAL,
      FALSE,
      NOW(),
      NOW()
    FROM generate_slot_instances(v_block.id, v_end_date) AS slot_start
    ON CONFLICT (availability_block_id, start_time) DO NOTHING;

    GET DIAGNOSTICS v_slot_count = v_slot_count + ROW_COUNT;
  END LOOP;

  -- Log job execution
  INSERT INTO cron_job_logs (job_name, status, message, duration_ms, created_at)
  VALUES (
    'generate_time_slots',
    'success',
    format('Generated %s slots', v_slot_count),
    EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000,
    NOW()
  );

  RETURN jsonb_build_object(
    'slots_generated', v_slot_count,
    'duration_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000
  );
END;
$$;

-- Schedule the job
SELECT cron.schedule(
  'generate-time-slots',
  '0 */4 * * *',  -- Every 4 hours
  $$ SELECT generate_time_slots(); $$
);
```

**Helper Function (Slot Instance Calculation):**
```sql
CREATE OR REPLACE FUNCTION generate_slot_instances(
  p_block_id UUID,
  p_end_date TIMESTAMP
)
RETURNS SETOF TIMESTAMP
LANGUAGE plpgsql
AS $$
DECLARE
  v_block availability_blocks;
  v_current_date DATE;
  v_slot_time TIMESTAMP;
BEGIN
  SELECT * INTO v_block FROM availability_blocks WHERE id = p_block_id;

  -- Handle different recurrence patterns
  CASE v_block.recurrence_pattern
    WHEN 'one_time' THEN
      -- Single date
      v_current_date := v_block.start_date::DATE;
      WHILE make_timestamp_from_date_and_time(v_current_date, v_block.start_time) < make_timestamp_from_date_and_time(v_current_date, v_block.end_time) LOOP
        RETURN NEXT make_timestamp_from_date_and_time(v_current_date, v_block.start_time);
        v_block.start_time := v_block.start_time + (v_block.slot_duration_minutes + v_block.buffer_minutes || ' minutes')::INTERVAL;
      END LOOP;

    WHEN 'weekly' THEN
      -- Weekly recurrence
      v_current_date := NOW()::DATE;
      WHILE v_current_date <= p_end_date::DATE LOOP
        IF EXTRACT(DOW FROM v_current_date) = v_block.recurrence_day_of_week THEN
          -- Generate all slots for this day
          v_slot_time := make_timestamp_from_date_and_time(v_current_date, v_block.start_time);
          WHILE v_slot_time < make_timestamp_from_date_and_time(v_current_date, v_block.end_time) LOOP
            RETURN NEXT v_slot_time;
            v_slot_time := v_slot_time + (v_block.slot_duration_minutes + v_block.buffer_minutes || ' minutes')::INTERVAL;
          END LOOP;
        END IF;
        v_current_date := v_current_date + 1;
      END LOOP;

    -- Similar logic for 'monthly' and 'quarterly'
  END CASE;
END;
$$;
```

### 8.7.3 Job #2: Pending Booking Expiration

**Purpose:** Auto-expire booking requests not confirmed within 7 days and free up time slots (FR38)

**Schedule:** Daily at midnight UTC (`0 0 * * *`)

**Stored Procedure:**
```sql
-- Migration: 0011_create_booking_expiration_job.sql

CREATE OR REPLACE FUNCTION expire_pending_bookings()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_expired_count INTEGER;
  v_start_time TIMESTAMP := clock_timestamp();
BEGIN
  -- Update pending bookings older than 7 days to expired
  WITH expired_bookings AS (
    UPDATE bookings
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '7 days'
    RETURNING id, time_slot_id, mentee_id, meeting_start_time
  ),
  freed_slots AS (
    UPDATE time_slots
    SET is_booked = FALSE,
        booking_id = NULL,
        updated_at = NOW()
    WHERE id IN (SELECT time_slot_id FROM expired_bookings)
    RETURNING id
  ),
  notifications AS (
    INSERT INTO notification_log (
      user_id, type, title, message, delivery_channel, metadata, created_at
    )
    SELECT
      mentee_id,
      'booking_expired',
      'Booking Request Expired',
      'Your booking request for ' || to_char(meeting_start_time, 'FMDay, Mon DD at HH:MI AM') ||
      ' has expired. The mentor did not confirm within 7 days.',
      'both',
      jsonb_build_object('booking_id', id),
      NOW()
    FROM expired_bookings
    RETURNING id
  )
  SELECT COUNT(*) INTO v_expired_count FROM expired_bookings;

  -- Log job execution
  INSERT INTO cron_job_logs (job_name, status, message, duration_ms, created_at)
  VALUES (
    'expire_pending_bookings',
    'success',
    format('Expired %s bookings', v_expired_count),
    EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000,
    NOW()
  );

  RETURN jsonb_build_object(
    'expired_count', v_expired_count,
    'duration_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000
  );
END;
$$;

-- Schedule the job
SELECT cron.schedule(
  'expire-pending-bookings',
  '0 0 * * *',  -- Daily at midnight UTC
  $$ SELECT expire_pending_bookings(); $$
);
```

### 8.7.4 Job #3: Tier Override Auto-Rejection

**Purpose:** Auto-reject tier override requests not reviewed within 7 days (FR54)

**Schedule:** Daily at midnight UTC (`0 0 * * *`)

**Stored Procedure:**
```sql
-- Migration: 0012_create_tier_override_rejection_job.sql

CREATE OR REPLACE FUNCTION reject_expired_tier_overrides()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_rejected_count INTEGER;
  v_start_time TIMESTAMP := clock_timestamp();
BEGIN
  -- Auto-reject pending override requests past expiration
  WITH rejected_requests AS (
    UPDATE tier_override_requests
    SET status = 'rejected',
        review_notes = 'Auto-rejected: request expired after 7 days',
        updated_at = NOW()
    WHERE status = 'pending'
    AND expires_at < NOW()
    RETURNING id, mentee_id, mentor_id
  ),
  notifications AS (
    INSERT INTO notification_log (
      user_id, type, title, message, delivery_channel, metadata, created_at
    )
    SELECT
      mentee_id,
      'tier_override_rejected',
      'Tier Override Request Expired',
      'Your request to book a higher-tier mentor has expired after 7 days without coordinator review. You may submit a new request if still needed.',
      'both',
      jsonb_build_object('tier_override_request_id', id, 'mentor_id', mentor_id),
      NOW()
    FROM rejected_requests
    RETURNING id
  )
  SELECT COUNT(*) INTO v_rejected_count FROM rejected_requests;

  -- Log job execution
  INSERT INTO cron_job_logs (job_name, status, message, duration_ms, created_at)
  VALUES (
    'reject_expired_tier_overrides',
    'success',
    format('Auto-rejected %s tier override requests', v_rejected_count),
    EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000,
    NOW()
  );

  RETURN jsonb_build_object(
    'rejected_count', v_rejected_count,
    'duration_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000
  );
END;
$$;

-- Schedule the job
SELECT cron.schedule(
  'reject-expired-tier-overrides',
  '0 0 * * *',  -- Daily at midnight UTC
  $$ SELECT reject_expired_tier_overrides(); $$
);
```

### 8.7.5 Job #4: Dormant User Detection

**Purpose:** Mark users as dormant if no activity in 90 days (affects matching/recommendations per FR57, FR33)

**Schedule:** Daily at midnight UTC (`0 0 * * *`)

**Stored Procedure:**
```sql
-- Migration: 0013_create_dormant_user_detection_job.sql

CREATE OR REPLACE FUNCTION mark_dormant_users()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_dormant_count INTEGER;
  v_start_time TIMESTAMP := clock_timestamp();
BEGIN
  -- Mark users with no activity in 90+ days as dormant
  WITH dormant_users AS (
    UPDATE users
    SET metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{is_dormant}',
          'true'::jsonb
        ),
        updated_at = NOW()
    WHERE last_activity_at < NOW() - INTERVAL '90 days'
    AND (metadata->>'is_dormant')::boolean IS DISTINCT FROM TRUE
    RETURNING id, email, role, last_activity_at
  )
  SELECT COUNT(*) INTO v_dormant_count FROM dormant_users;

  -- Log job execution
  INSERT INTO cron_job_logs (job_name, status, message, duration_ms, created_at)
  VALUES (
    'mark_dormant_users',
    'success',
    format('Marked %s users as dormant', v_dormant_count),
    EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000,
    NOW()
  );

  RETURN jsonb_build_object(
    'dormant_count', v_dormant_count,
    'duration_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000
  );
END;
$$;

-- Schedule the job
SELECT cron.schedule(
  'mark-dormant-users',
  '0 0 * * *',  -- Daily at midnight UTC
  $$ SELECT mark_dormant_users(); $$
);
```

### 8.7.6 Cron Job Logging Table

**Schema:**
```sql
-- Migration: 0009_create_cron_job_logs_table.sql

CREATE TABLE cron_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
  message TEXT,
  duration_ms NUMERIC,
  error_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cron_job_logs_job_name_created_at
  ON cron_job_logs (job_name, created_at DESC);
```

**Querying Job History:**
```sql
-- View recent job executions
SELECT job_name, status, message, duration_ms, created_at
FROM cron_job_logs
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Check for failures
SELECT job_name, COUNT(*) as failure_count, MAX(created_at) as last_failure
FROM cron_job_logs
WHERE status = 'failure'
AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY job_name;
```

### 8.7.7 Job Management & Monitoring

**Viewing Active Jobs:**
```sql
SELECT * FROM cron.job;
```

**Unscheduling a Job:**
```sql
SELECT cron.unschedule('generate-time-slots');
```

**Manual Execution (Testing):**
```sql
SELECT generate_time_slots();
SELECT expire_pending_bookings();
SELECT reject_expired_tier_overrides();
SELECT mark_dormant_users();
```

**Monitoring Dashboard Query:**
```sql
-- Coordinator dashboard: Recent cron job activity
SELECT
  job_name,
  COUNT(*) as executions,
  COUNT(*) FILTER (WHERE status = 'success') as successes,
  COUNT(*) FILTER (WHERE status = 'failure') as failures,
  AVG(duration_ms) as avg_duration_ms,
  MAX(created_at) as last_run
FROM cron_job_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY job_name
ORDER BY job_name;
```

### 8.7.8 Cron Job Summary Table

| Job Name | Schedule | Purpose | PRD Reference | Estimated Runtime |
|----------|----------|---------|---------------|-------------------|
| **generate_time_slots** | Every 4 hours (`0 */4 * * *`) | Generate future time slots (30-day rolling window) | FR77-FR82 | 2-5 seconds |
| **expire_pending_bookings** | Daily at midnight UTC (`0 0 * * *`) | Expire bookings not confirmed within 7 days | FR38 | <1 second |
| **reject_expired_tier_overrides** | Daily at midnight UTC (`0 0 * * *`) | Auto-reject override requests after 7 days | FR54 | <1 second |
| **mark_dormant_users** | Daily at midnight UTC (`0 0 * * *`) | Mark users with no activity in 90+ days | FR57, FR33 | <1 second |

**Total Daily Database Load:**
- Time slots: 6 runs/day × 2-5s = 12-30s query time
- Daily cleanups: 1 run/day × 3s = 3s query time
- **Total: ~35s query time per day** (negligible load on Supabase free tier)

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

