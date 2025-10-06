/**
 * Availability API Routes
 *
 * Endpoints:
 * - POST / - Create availability block (one-time only, mentor-only)
 */

// External dependencies
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';

// Internal modules
import { requireAuth } from '../middleware/auth';
import { AvailabilityService } from '../services/availability.service';
import {
  CreateAvailabilityBlockSchema,
  AvailabilityBlockResponseSchema,
} from '@cf-office-hours/shared';

// Types
import type { Env } from '../types/bindings';
import type { Variables } from '../types/context';

// Create OpenAPI-enabled Hono router
export const availabilityRoutes = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();

// Apply auth middleware to all routes
availabilityRoutes.use('*', requireAuth);

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
 * POST / - Create availability block (one-time only)
 */
const createAvailabilityBlockRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Availability'],
  summary: 'Create availability block (one-time only)',
  description:
    'Creates a new one-time availability block for a mentor. Only mentors can create availability blocks. Recurrence patterns and in-person meeting types are not yet supported.',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateAvailabilityBlockSchema,
        },
      },
      description: 'Availability block data',
      required: true,
    },
  },
  responses: {
    201: {
      description: 'Availability block created successfully',
      content: {
        'application/json': {
          schema: AvailabilityBlockResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad Request - Validation error or invalid meeting type',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized - Missing or invalid token',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    403: {
      description: 'Forbidden - User is not a mentor',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error - Failed to create availability block',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

availabilityRoutes.openapi(createAvailabilityBlockRoute, async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  const availabilityService = new AvailabilityService(c.env);

  const block = await availabilityService.createAvailabilityBlock(user.id, user.role, body);

  return c.json(block, 201);
});
