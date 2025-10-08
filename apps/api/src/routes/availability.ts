/**
 * Availability API Routes
 *
 * Endpoints:
 * - GET / - Get availability blocks for authenticated mentor
 * - POST / - Create availability block (one-time only, mentor-only)
 */

// External dependencies
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

// Internal modules
import { requireAuth } from "../middleware/auth";
import { AvailabilityService } from "../services/availability.service";
import {
  AvailabilityBlockResponseSchema,
  CreateAvailabilityBlockSchema,
  ErrorResponseSchema,
  GetAvailableSlotsQuerySchema,
  GetAvailableSlotsResponseSchema,
} from "@cf-office-hours/shared";

// Types
import type { Env } from "../types/bindings";
import type { Variables } from "../types/context";

// Create OpenAPI-enabled Hono router
export const availabilityRoutes = new OpenAPIHono<
  { Bindings: Env; Variables: Variables }
>();

// Apply auth middleware to all routes
availabilityRoutes.use("*", requireAuth);

/**
 * GET / - Get availability blocks for authenticated mentor
 */
const getAvailabilityBlocksRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Availability"],
  summary: "Get availability blocks for authenticated mentor",
  description:
    "Returns all availability blocks for the authenticated mentor. Only mentors can access this endpoint.",
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: "List of availability blocks",
      content: {
        "application/json": {
          schema: z.array(AvailabilityBlockResponseSchema),
        },
      },
    },
    401: {
      description: "Unauthorized - Missing or invalid token",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: "Forbidden - User is not a mentor",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description:
        "Internal Server Error - Failed to fetch availability blocks",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

availabilityRoutes.openapi(getAvailabilityBlocksRoute, async (c) => {
  const user = c.get("user");
  const availabilityService = new AvailabilityService(c.env);

  // Verify user is a mentor
  if (user.role !== "mentor") {
    return c.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Only mentors can access this endpoint",
          timestamp: new Date().toISOString(),
        },
      },
      403,
    );
  }

  const blocks = await availabilityService.getAvailabilityBlocksByMentor(
    user.id,
  );

  return c.json(blocks, 200);
});

/**
 * POST / - Create availability block (one-time only)
 */
const createAvailabilityBlockRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Availability"],
  summary: "Create availability block (one-time only)",
  description:
    "Creates a new one-time availability block for a mentor. Only mentors can create availability blocks. Recurrence patterns and in-person meeting types are not yet supported.",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateAvailabilityBlockSchema,
        },
      },
      description: "Availability block data",
      required: true,
    },
  },
  responses: {
    201: {
      description: "Availability block created successfully",
      content: {
        "application/json": {
          schema: AvailabilityBlockResponseSchema,
        },
      },
    },
    400: {
      description: "Bad Request - Validation error or invalid meeting type",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized - Missing or invalid token",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: "Forbidden - User is not a mentor",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description:
        "Internal Server Error - Failed to create availability block",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

availabilityRoutes.openapi(createAvailabilityBlockRoute, async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");

  console.log("[AVAILABILITY] Creating availability block", {
    userId: user.id,
    userRole: user.role,
    startTime: body.start_time,
    endTime: body.end_time,
    slotDuration: body.slot_duration_minutes,
    timestamp: new Date().toISOString(),
  });

  const availabilityService = new AvailabilityService(c.env);

  const block = await availabilityService.createAvailabilityBlock(
    user.id,
    user.role,
    body,
  );

  console.log("[AVAILABILITY] Availability block created successfully", {
    blockId: block.id,
    userId: user.id,
    startTime: block.start_time,
    endTime: block.end_time,
    timestamp: new Date().toISOString(),
  });

  return c.json(block, 201);
});

/**
 * GET /slots - Get available time slots
 */
const getAvailableSlotsRoute = createRoute({
  method: "get",
  path: "/slots",
  tags: ["Availability"],
  summary: "Get available time slots",
  description:
    "Returns available (non-booked) time slots with mentor information. Supports filtering by mentor, date range, and meeting type.",
  security: [{ Bearer: [] }],
  request: {
    query: GetAvailableSlotsQuerySchema,
  },
  responses: {
    200: {
      description: "List of available time slots",
      content: {
        "application/json": {
          schema: GetAvailableSlotsResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized - Missing or invalid token",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: "Internal Server Error - Failed to fetch available slots",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

availabilityRoutes.openapi(getAvailableSlotsRoute, async (c) => {
  const query = c.req.valid("query");
  const availabilityService = new AvailabilityService(c.env);

  const response = await availabilityService.getAvailableSlots(query);

  return c.json(response, 200);
});
