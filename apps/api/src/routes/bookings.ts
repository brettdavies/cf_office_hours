/**
 * Bookings API Routes
 *
 * Endpoints:
 * - POST / - Create a booking (Epic 0: Simple, no confirmation flow)
 */

// External dependencies
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';

// Internal modules
import { requireAuth } from '../middleware/auth';
import { BookingService } from '../services/booking.service';
import { CreateBookingSchema, BookingResponseSchema } from '@cf-office-hours/shared';

// Types
import type { Env } from '../types/bindings';
import type { Variables } from '../types/context';

// Create OpenAPI-enabled Hono router
export const bookingRoutes = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();

// Apply auth middleware to all routes
bookingRoutes.use('*', requireAuth);

/**
 * Shared error response schema for OpenAPI documentation.
 */
const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    timestamp: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});

/**
 * POST / - Create a booking
 */
const createBookingRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Bookings'],
  summary: 'Create a new booking',
  description:
    'Book a mentor time slot (Epic 0: Simple booking - no calendar integration, no confirmation flow, status always pending)',
  security: [{ Bearer: [] }],
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
      description: 'Invalid request - Validation errors (meeting_goal too short, invalid UUID)',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized - Missing or invalid JWT token',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Time slot not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    409: {
      description: 'Slot already booked - Concurrent booking detected',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error - Failed to create booking',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

bookingRoutes.openapi(createBookingRoute, async c => {
  const user = c.get('user');

  // Validate request body against schema
  const body = c.req.valid('json');

  const bookingService = new BookingService(c.env);

  try {
    const booking = await bookingService.createBooking(user.id, body);

    return c.json(booking, 201);
  } catch (error) {
    // Handle AppError instances
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const appError = error as {
        statusCode: number;
        code: string;
        message: string;
        details?: Record<string, unknown>;
      };

      return c.json(
        {
          error: {
            code: appError.code,
            message: appError.message,
            timestamp: new Date().toISOString(),
            details: appError.details,
          },
        },
        appError.statusCode as 400 | 401 | 404 | 409 | 500
      );
    }

    // Unknown error
    console.error('Unexpected error creating booking:', error);
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});
