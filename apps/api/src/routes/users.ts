/**
 * User API Routes
 *
 * Endpoints:
 * - GET /me - Get current user profile
 * - PUT /me - Update current user profile
 * - GET /:id - Get public user profile by ID
 */

// External dependencies
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';

// Internal modules
import { requireAuth } from '../middleware/auth';
import { UserService } from '../services/user.service';
import { UpdateProfileSchema, UserResponseSchema } from '@cf-office-hours/shared';
import { handleUserProfileUpdate } from '../events/matching-triggers';
import { createSupabaseClient } from '../lib/db';

// Types
import type { Env } from '../types/bindings';
import type { Variables } from '../types/context';

// Create OpenAPI-enabled Hono router
export const userRoutes = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();

// Apply auth middleware to all routes
userRoutes.use('*', requireAuth);

/**
 * GET /me - Get current user profile
 */
const getMeRoute = createRoute({
  method: 'get',
  path: '/me',
  tags: ['Users'],
  summary: 'Get current user profile',
  description: 'Returns the authenticated user with their profile information',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'Current user with profile',
      content: {
        'application/json': {
          schema: UserResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized - Missing or invalid token',
      content: {
        'application/json': {
          schema: z.object({
            error: z.object({
              code: z.string(),
              message: z.string(),
              timestamp: z.string(),
            }),
          }),
        },
      },
    },
    404: {
      description: 'User not found',
      content: {
        'application/json': {
          schema: z.object({
            error: z.object({
              code: z.string(),
              message: z.string(),
              timestamp: z.string(),
            }),
          }),
        },
      },
    },
  },
});

userRoutes.openapi(getMeRoute, async c => {
  const user = c.get('user');
  const userService = new UserService(c.env);
  const profile = await userService.getMe(user.id);
  return c.json(profile, 200);
});

/**
 * PUT /me - Update current user profile
 */
const updateMeRoute = createRoute({
  method: 'put',
  path: '/me',
  tags: ['Users'],
  summary: 'Update current user profile',
  description: "Updates the authenticated user's profile information",
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: UpdateProfileSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Updated user with profile',
      content: {
        'application/json': {
          schema: UserResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad Request - Validation error',
      content: {
        'application/json': {
          schema: z.object({
            error: z.object({
              code: z.string(),
              message: z.string(),
              timestamp: z.string(),
            }),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized - Missing or invalid token',
      content: {
        'application/json': {
          schema: z.object({
            error: z.object({
              code: z.string(),
              message: z.string(),
              timestamp: z.string(),
            }),
          }),
        },
      },
    },
  },
});

userRoutes.openapi(updateMeRoute, async c => {
  const user = c.get('user');
  const body = c.req.valid('json');
  const userService = new UserService(c.env);
  const updated = await userService.updateMe(user.id, body);

  // Trigger match recalculation asynchronously (fire-and-forget)
  // Only trigger if env is available (not in test environments)
  if (c.env?.SUPABASE_URL) {
    const db = createSupabaseClient(c.env);
    handleUserProfileUpdate(user.id, db).catch(err => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[MATCHING] Failed to trigger recalculation', {
          userId: user.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });
  }

  return c.json(updated, 200);
});

/**
 * GET / - List users with optional role filter
 */
const listUsersRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Users'],
  summary: 'List users',
  description: 'Returns a list of users, optionally filtered by role',
  security: [{ Bearer: [] }],
  request: {
    query: z.object({
      role: z.enum(['mentee', 'mentor', 'coordinator']).optional(),
    }),
  },
  responses: {
    200: {
      description: 'List of users',
      content: {
        'application/json': {
          schema: z.array(UserResponseSchema),
        },
      },
    },
    401: {
      description: 'Unauthorized - Missing or invalid token',
      content: {
        'application/json': {
          schema: z.object({
            error: z.object({
              code: z.string(),
              message: z.string(),
              timestamp: z.string(),
            }),
          }),
        },
      },
    },
  },
});

userRoutes.openapi(listUsersRoute, async c => {
  const { role } = c.req.valid('query');
  const userService = new UserService(c.env);
  const users = await userService.listUsers({ role });
  return c.json(users, 200);
});

/**
 * GET /:id - Get public user profile by ID
 */
const getPublicProfileRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Users'],
  summary: 'Get public user profile',
  description: "Returns a user's public profile information by user ID",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string().uuid('Invalid user ID format'),
    }),
  },
  responses: {
    200: {
      description: 'Public user profile',
      content: {
        'application/json': {
          schema: UserResponseSchema,
        },
      },
    },
    401: {
      description: 'Unauthorized - Missing or invalid token',
      content: {
        'application/json': {
          schema: z.object({
            error: z.object({
              code: z.string(),
              message: z.string(),
              timestamp: z.string(),
            }),
          }),
        },
      },
    },
    404: {
      description: 'User not found',
      content: {
        'application/json': {
          schema: z.object({
            error: z.object({
              code: z.string(),
              message: z.string(),
              timestamp: z.string(),
            }),
          }),
        },
      },
    },
  },
});

userRoutes.openapi(getPublicProfileRoute, async c => {
  const { id } = c.req.valid('param');
  const userService = new UserService(c.env);
  const profile = await userService.getPublicProfile(id);
  return c.json(profile, 200);
});
