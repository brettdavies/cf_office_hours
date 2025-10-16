/**
 * Bookings API Routes
 *
 * Endpoints:
 * - POST / - Create a booking (Epic 0: Simple, no confirmation flow)
 */

// External dependencies
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

// Internal modules
import { requireAuth } from "../middleware/auth";
import { BookingService } from "../services/booking.service";
import { TierOverrideService } from "../services/tier-override.service";
import {
  BookingResponseSchema,
  CreateBookingSchema,
  ErrorResponseSchema,
} from "@cf-office-hours/shared";

// Types
import type { Env } from "../types/bindings";
import type { Variables } from "../types/context";

// Create OpenAPI-enabled Hono router
export const bookingRoutes = new OpenAPIHono<
  { Bindings: Env; Variables: Variables }
>();

// Apply auth middleware to all routes
bookingRoutes.use("*", requireAuth);

/**
 * Schema for expanded booking with relations (my-bookings response).
 */
const MyBookingSchema = z.object({
  id: z.string().uuid(),
  mentor_id: z.string().uuid(),
  mentee_id: z.string().uuid(),
  time_slot_id: z.string().uuid(),
  status: z.enum(["pending", "confirmed", "completed", "canceled", "expired"]),
  meeting_goal: z.string(),
  materials_urls: z.array(z.string()),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  time_slot: z.object({
    start_time: z.string().datetime(),
    end_time: z.string().datetime(),
    mentor_id: z.string().uuid(),
  }),
  mentor: z.object({
    id: z.string().uuid(),
    profile: z.object({
      name: z.string(),
      avatar_url: z.string().nullable(),
    }),
  }),
  mentee: z.object({
    id: z.string().uuid(),
    profile: z.object({
      name: z.string(),
      avatar_url: z.string().nullable(),
    }),
  }),
});

/**
 * Schema for my-bookings list response.
 */
const MyBookingsResponseSchema = z.object({
  bookings: z.array(MyBookingSchema),
});

/**
 * POST / - Create a booking
 */
const createBookingRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Bookings"],
  summary: "Create a new booking",
  description:
    "Book a mentor time slot (Epic 0: Simple booking - no calendar integration, no confirmation flow, status always pending)",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateBookingSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Booking created successfully",
      content: {
        "application/json": {
          schema: BookingResponseSchema,
        },
      },
    },
    400: {
      description:
        "Invalid request - Validation errors (meeting_goal too short, invalid UUID)",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized - Missing or invalid JWT token",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "Time slot not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    409: {
      description: "Slot already booked - Concurrent booking detected",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: "Internal Server Error - Failed to create booking",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

bookingRoutes.openapi(createBookingRoute, async (c) => {
  const user = c.get("user");

  // Validate request body against schema
  const body = c.req.valid("json");

  console.log("[BOOKING] Creating booking", {
    userId: user.id,
    slotId: body.time_slot_id,
    meetingGoalLength: body.meeting_goal.length,
    timestamp: new Date().toISOString(),
  });

  const bookingService = new BookingService(c.env);

  try {
    const booking = await bookingService.createBooking(user.id, body);

    console.log("[BOOKING] Booking created successfully", {
      bookingId: booking.id,
      userId: user.id,
      slotId: booking.time_slot_id,
      mentorId: booking.mentor_id,
      menteeId: booking.mentee_id,
      status: booking.status,
      timestamp: new Date().toISOString(),
    });

    return c.json(booking, 201);
  } catch (error) {
    // Handle AppError instances
    if (error && typeof error === "object" && "statusCode" in error) {
      const appError = error as {
        statusCode: number;
        code: string;
        message: string;
        details?: Record<string, unknown>;
      };

      console.error("[ERROR] Booking creation failed", {
        userId: user.id,
        error: appError.message,
        code: appError.code,
        statusCode: appError.statusCode,
        details: appError.details,
        timestamp: new Date().toISOString(),
      });

      return c.json(
        {
          error: {
            code: appError.code,
            message: appError.message,
            timestamp: new Date().toISOString(),
            details: appError.details,
          },
        },
        appError.statusCode as 400 | 401 | 404 | 409 | 500,
      );
    }

    // Unknown error
    console.error("[ERROR] Unexpected error creating booking", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
          timestamp: new Date().toISOString(),
        },
      },
      500,
    );
  }
});

/**
 * GET /my-bookings - Get all bookings for current user
 */
const getMyBookingsRoute = createRoute({
  method: "get",
  path: "/my-bookings",
  tags: ["Bookings"],
  summary: "Get all bookings for current user",
  description:
    "Returns all bookings where the authenticated user is either the mentor or mentee, with expanded relations for mentor, mentee, and time_slot data",
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: "List of user bookings with expanded relations",
      content: {
        "application/json": {
          schema: MyBookingsResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized - Missing or invalid JWT token",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: "Internal Server Error - Failed to fetch bookings",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

bookingRoutes.openapi(getMyBookingsRoute, async (c) => {
  const user = c.get("user");

  const bookingService = new BookingService(c.env);

  try {
    const bookings = await bookingService.getMyBookings(user.id);

    return c.json({ bookings }, 200);
  } catch (error) {
    // Handle AppError instances
    if (error && typeof error === "object" && "statusCode" in error) {
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
        appError.statusCode as 401 | 500,
      );
    }

    // Unknown error
    console.error("Unexpected error fetching bookings:", error);
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
          timestamp: new Date().toISOString(),
        },
      },
      500,
    );
  }
});

/**
 * Schema for tier override request with users.
 */
const TierOverrideRequestSchema = z.object({
  id: z.string().uuid(),
  mentee_id: z.string().uuid(),
  mentor_id: z.string().uuid(),
  reason: z.string(),
  status: z.enum(["pending", "approved", "denied", "rejected"]),
  scope: z.enum(["one_time"]),
  expires_at: z.string().datetime(),
  used_at: z.string().datetime().nullable(),
  reviewed_by: z.string().uuid().nullable(),
  reviewed_at: z.string().datetime().nullable(),
  review_notes: z.string().nullable(),
  created_at: z.string().datetime(),
  created_by: z.string().uuid().nullable(),
  updated_at: z.string().datetime(),
  updated_by: z.string().uuid().nullable(),
  mentee: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    role: z.string(),
    reputation_tier: z.enum(["bronze", "silver", "gold", "platinum"]).nullable(),
    profile: z.object({
      id: z.string().uuid(),
      user_id: z.string().uuid(),
      name: z.string(),
      title: z.string().nullable(),
      company: z.string().nullable(),
      bio: z.string().nullable(),
      created_at: z.string().datetime(),
      updated_at: z.string().datetime(),
    }),
  }),
  mentor: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    role: z.string(),
    reputation_tier: z.enum(["bronze", "silver", "gold", "platinum"]).nullable(),
    profile: z.object({
      id: z.string().uuid(),
      user_id: z.string().uuid(),
      name: z.string(),
      title: z.string().nullable(),
      company: z.string().nullable(),
      bio: z.string().nullable(),
      created_at: z.string().datetime(),
      updated_at: z.string().datetime(),
    }),
  }),
  match_score: z.number().min(0).max(100).nullable(),
});

/**
 * Schema for pending tier overrides response.
 */
const PendingOverridesResponseSchema = z.object({
  requests: z.array(TierOverrideRequestSchema),
});

/**
 * GET /overrides/pending - Get all pending tier override requests (Coordinator only)
 */
const getPendingOverridesRoute = createRoute({
  method: "get",
  path: "/overrides/pending",
  tags: ["Bookings"],
  summary: "Get pending tier override requests",
  description:
    "Returns all pending tier override requests with enriched user profiles and match scores. Coordinator access only.",
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: "List of pending tier override requests",
      content: {
        "application/json": {
          schema: PendingOverridesResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized - Missing or invalid JWT token",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: "Forbidden - Coordinator role required",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: "Internal Server Error - Failed to fetch requests",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

bookingRoutes.openapi(getPendingOverridesRoute, async (c) => {
  const user = c.get("user");

  // Check coordinator role
  if (user.role !== "coordinator") {
    return c.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Coordinator role required",
          timestamp: new Date().toISOString(),
        },
      },
      403,
    );
  }

  console.log("[TIER_OVERRIDES] Fetching pending requests", {
    userId: user.id,
    role: user.role,
    timestamp: new Date().toISOString(),
  });

  const tierOverrideService = new TierOverrideService(c.env);

  try {
    const requests = await tierOverrideService.getPendingRequests();

    console.log("[TIER_OVERRIDES] Requests fetched successfully", {
      count: requests.length,
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    return c.json({ requests }, 200);
  } catch (error) {
    // Handle AppError instances
    if (error && typeof error === "object" && "statusCode" in error) {
      const appError = error as {
        statusCode: number;
        code: string;
        message: string;
        details?: Record<string, unknown>;
      };

      console.error("[ERROR] Tier overrides fetch failed", {
        userId: user.id,
        error: appError.message,
        code: appError.code,
        timestamp: new Date().toISOString(),
      });

      return c.json(
        {
          error: {
            code: appError.code,
            message: appError.message,
            timestamp: new Date().toISOString(),
            details: appError.details,
          },
        },
        appError.statusCode as 401 | 403 | 500,
      );
    }

    // Unknown error
    console.error("[ERROR] Unexpected error fetching tier overrides", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });

    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
          timestamp: new Date().toISOString(),
        },
      },
      500,
    );
  }
});
