/**
 * Matching API Routes
 *
 * Endpoints:
 * - POST /find-matches - Get cached match recommendations
 * - POST /explain - Get cached match explanation for a user pair
 *
 * Architecture:
 * These endpoints retrieve pre-calculated matches from user_match_cache.
 * Calculation happens in background via IMatchingEngine implementations.
 *
 * See: docs/architecture/matching-cache-architecture.md
 */

// External dependencies
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';

// Internal modules
import { requireAuth, requireRole } from '../middleware/auth';
import { MatchingService } from '../services/matching.service';
import { createSupabaseClient } from '../lib/db';
import {
  FindMatchesRequestSchema,
  FindMatchesResponseSchema,
  ExplainMatchRequestSchema,
  ExplainMatchResponseSchema,
} from '@cf-office-hours/shared';

// Types
import type { Env } from '../types/bindings';
import type { Variables } from '../types/context';

// Create OpenAPI-enabled Hono router
export const matchingRoutes = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();

// Apply auth middleware to all routes
matchingRoutes.use('*', requireAuth);
// Apply coordinator role requirement to all matching routes
matchingRoutes.use('*', requireRole('coordinator'));

/**
 * POST /find-matches - Get cached match recommendations
 */
const findMatchesRoute = createRoute({
  method: 'post',
  path: '/find-matches',
  tags: ['Matching'],
  summary: 'Get cached match recommendations',
  description:
    'Retrieves pre-calculated match recommendations from user_match_cache. ' +
    'Supports filtering by algorithm version, minimum score, and result limit. ' +
    'Reference: FR15 (Mentor-Mentee Matching), FR16 (Match Explanation)',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: FindMatchesRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Array of cached matches sorted by score DESC',
      content: {
        'application/json': {
          schema: FindMatchesResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request - Validation errors',
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
    403: {
      description: 'Forbidden - Non-coordinator role',
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
    500: {
      description: 'Internal server error',
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

matchingRoutes.openapi(findMatchesRoute, async c => {
  try {
    const { userId, targetRole, options } = c.req.valid('json');

    if (process.env.NODE_ENV === 'development') {
      console.log('[MATCHING] POST /find-matches', { userId, targetRole, options });
    }

    const db = createSupabaseClient(c.env);
    const matchingService = new MatchingService(db);

    const matches =
      targetRole === 'mentor'
        ? await matchingService.getRecommendedMentors(userId, options)
        : await matchingService.getRecommendedMentees(userId, options);

    if (process.env.NODE_ENV === 'development') {
      console.log('[MATCHING] POST /find-matches complete', {
        userId,
        matchCount: matches.length,
      });
    }

    return c.json({ matches }, 200);
  } catch (error) {
    console.error('[MATCHING] Error in find-matches:', error);

    const message = error instanceof Error ? error.message : 'Failed to fetch matches';

    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message,
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

/**
 * POST /explain - Get cached match explanation
 */
const explainMatchRoute = createRoute({
  method: 'post',
  path: '/explain',
  tags: ['Matching'],
  summary: 'Get cached match explanation',
  description:
    'Retrieves detailed explanation for a cached match between two users. ' +
    'Performs bidirectional lookup (user1↔user2). ' +
    'Reference: FR16 (Match Explanation)',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: ExplainMatchRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Match explanation or null if no cached match found',
      content: {
        'application/json': {
          schema: ExplainMatchResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request - Validation errors',
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
    403: {
      description: 'Forbidden - Non-coordinator role',
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
      description: 'No cached match found',
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
    500: {
      description: 'Internal server error',
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

matchingRoutes.openapi(explainMatchRoute, async c => {
  try {
    const { userId1, userId2, algorithmVersion } = c.req.valid('json');

    if (process.env.NODE_ENV === 'development') {
      console.log('[MATCHING] POST /explain', { userId1, userId2, algorithmVersion });
    }

    const db = createSupabaseClient(c.env);
    const matchingService = new MatchingService(db);

    const explanation = await matchingService.explainMatch(userId1, userId2, algorithmVersion);

    if (explanation === null) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[MATCHING] POST /explain - no match found', { userId1, userId2 });
      }

      return c.json(
        {
          error: {
            code: 'MATCH_NOT_FOUND',
            message: 'No cached match found for this user pair',
            timestamp: new Date().toISOString(),
          },
        },
        404
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[MATCHING] POST /explain complete', { userId1, userId2 });
    }

    return c.json({ explanation }, 200);
  } catch (error) {
    console.error('[MATCHING] Error in explain:', error);

    const message = error instanceof Error ? error.message : 'Failed to fetch explanation';

    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message,
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});
