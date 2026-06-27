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
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

// Internal modules
import { requireAuth, requireRole } from '../middleware/auth';
import { MatchingService } from '../services/matching.service';
import { getDb } from '../lib/db';
import {
  ExplainMatchRequestSchema,
  ExplainMatchResponseSchema,
  FindMatchesRequestSchema,
  FindMatchesResponseSchema,
  GetAlgorithmsResponseSchema,
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

// Import AlgorithmInfo type from shared schemas
import type { AlgorithmInfo } from '@cf-office-hours/shared';

// Query parameter schemas
const GetUsersWithScoresQuerySchema = z.object({
  algorithmVersion: z.string().optional().default('tag-based-v1'),
  role: z.enum(['mentor', 'mentee']).optional(),
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .default(100)
    .transform(val => {
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? 100 : parsed;
      }
      return val;
    })
    .pipe(z.number().int().min(1).max(1000)),
});

/**
 * GET /algorithms - Get available matching algorithms
 */
const getAlgorithmsRoute = createRoute({
  method: 'get',
  path: '/algorithms',
  tags: ['Matching'],
  summary: 'Get available matching algorithms',
  description:
    'Returns list of available matching algorithms with their descriptions and capabilities. ' +
    'This endpoint queries distinct algorithm versions from the match cache for performance.',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      description: 'List of available algorithms',
      content: {
        'application/json': {
          schema: GetAlgorithmsResponseSchema,
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
  },
});

matchingRoutes.openapi(getAlgorithmsRoute, async c => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('[MATCHING] GET /algorithms');
    }

    const db = getDb(c.env);

    // Query distinct algorithm versions from the match cache, sorted alphabetically
    const { results: algorithms } = await db
      .prepare(
        'SELECT DISTINCT algorithm_version FROM algorithm_versions ORDER BY algorithm_version ASC'
      )
      .all<{ algorithm_version: string }>();

    // Extract algorithm versions
    const uniqueVersions = (algorithms ?? []).map(a => a.algorithm_version);

    // Map to algorithm info with descriptions
    const algorithmInfo: AlgorithmInfo[] = uniqueVersions.map((version): AlgorithmInfo => {
      switch (version) {
        case 'tag-based-v1':
          return {
            version,
            label: 'Tag-Based V1',
            description:
              'Weighted tag overlap using rarity scoring. 0-60 points based on shared industries, technologies, and stages.',
            scoreRange: '0-60',
            available: true,
          };
        case 'ai-based-v1':
          return {
            version,
            label: 'AI-Based V1',
            description:
              'OpenAI-powered matching using mentor bios and mentee company descriptions. 0-100 points based on conversation quality potential.',
            scoreRange: '0-100',
            available: true,
          };
        default:
          return {
            version,
            label: `${version}`,
            description: 'Unknown algorithm version',
            scoreRange: '0-100',
            available: true,
          };
      }
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('[MATCHING] GET /algorithms complete', {
        algorithmCount: algorithmInfo.length,
      });
    }

    return c.json({ algorithms: algorithmInfo }, 200);
  } catch (error) {
    console.error('[MATCHING] Error in get-algorithms:', error);

    const message = error instanceof Error ? error.message : 'Failed to fetch algorithms';

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
 * GET /users-with-scores - Get users who have match scores for a specific algorithm
 */
const getUsersWithScoresRoute = createRoute({
  method: 'get',
  path: '/users-with-scores',
  tags: ['Matching'],
  summary: 'Get users with match scores for specific algorithm',
  description:
    'Returns users who have match scores cached for the specified algorithm. ' +
    'Useful for filtering user lists to only show users with available match data.',
  security: [{ Bearer: [] }],
  request: {
    query: GetUsersWithScoresQuerySchema,
  },
  responses: {
    200: {
      description: 'List of users with match scores for the algorithm',
      content: {
        'application/json': {
          schema: z.object({
            users: z.array(
              z.object({
                id: z.string().uuid(),
                email: z.string().email(),
                role: z.enum(['mentor', 'mentee', 'coordinator']),
                profile: z
                  .object({
                    name: z.string().nullable(),
                  })
                  .nullable(),
              })
            ),
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
  },
});

matchingRoutes.openapi(getUsersWithScoresRoute, async c => {
  try {
    const { algorithmVersion, role, limit } = c.req.valid('query');

    if (process.env.NODE_ENV === 'development') {
      console.log('[MATCHING] GET /users-with-scores', {
        algorithmVersion,
        role,
        limit,
      });
    }

    const db = getDb(c.env);

    const chunkIds = (ids: string[], size: number): string[][] => {
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += size) {
        chunks.push(ids.slice(i, i + size));
      }
      return chunks;
    };

    // Distinct user IDs that have scores in the given cache column for this algorithm.
    const fetchDistinctIds = async (
      columnSource: 'user_id' | 'recommended_user_id'
    ): Promise<string[]> => {
      const { results } = await db
        .prepare(
          'SELECT id FROM distinct_users_with_scores WHERE algorithm_version = ? AND column_source = ?'
        )
        .bind(algorithmVersion, columnSource)
        .all<{ id: string }>();
      return (results ?? []).map(row => row.id);
    };

    // Strategy: get distinct user IDs from the appropriate column based on role.
    // - mentees: user_id column · mentors: recommended_user_id column
    // - no role filter: both columns, then keep each user only in their role's column
    let userIds: string[] = [];

    if (role === 'mentee') {
      userIds = await fetchDistinctIds('user_id');
    } else if (role === 'mentor') {
      userIds = await fetchDistinctIds('recommended_user_id');
    } else {
      const menteeIds = await fetchDistinctIds('user_id');
      const mentorIds = await fetchDistinctIds('recommended_user_id');
      const allIds = [...new Set([...menteeIds, ...mentorIds])];

      // Fetch roles (chunked to bound bound-parameter count)
      const usersWithRoles: Array<{ id: string; role: string }> = [];
      for (const chunk of chunkIds(allIds, 100)) {
        const placeholders = chunk.map(() => '?').join(', ');
        const { results } = await db
          .prepare(`SELECT id, role FROM users WHERE id IN (${placeholders})`)
          .bind(...chunk)
          .all<{ id: string; role: string }>();
        usersWithRoles.push(...(results ?? []));
      }

      const menteeIdSet = new Set(menteeIds);
      const mentorIdSet = new Set(mentorIds);

      userIds = usersWithRoles
        .filter(user => {
          if (user.role === 'mentee') return menteeIdSet.has(user.id);
          if (user.role === 'mentor') return mentorIdSet.has(user.id);
          return false;
        })
        .map(user => user.id);
    }

    if (userIds.length === 0) {
      return c.json({ users: [] }, 200);
    }

    // Limit the number of users we fetch for performance
    const MAX_USERS = Math.min(limit, 1000);
    const userChunks = chunkIds(userIds.slice(0, MAX_USERS), 100);

    // Query users in chunks and combine results
    type UserRow = {
      id: string;
      email: string;
      role: 'mentee' | 'mentor' | 'coordinator';
    };
    const usersData: UserRow[] = [];
    for (const chunk of userChunks) {
      const placeholders = chunk.map(() => '?').join(', ');
      const { results } = await db
        .prepare(`SELECT id, email, role FROM users WHERE id IN (${placeholders})`)
        .bind(...chunk)
        .all<UserRow>();
      usersData.push(...(results ?? []));
    }

    // Fetch all profiles separately
    const profilesData: Array<{ user_id: string; name: string | null }> = [];
    for (const chunk of userChunks) {
      const placeholders = chunk.map(() => '?').join(', ');
      const { results } = await db
        .prepare(`SELECT user_id, name FROM user_profiles WHERE user_id IN (${placeholders})`)
        .bind(...chunk)
        .all<{ user_id: string; name: string | null }>();
      profilesData.push(...(results ?? []));
    }

    // Create a map of user_id to profile
    const profileMap = new Map(profilesData.map(p => [p.user_id, { name: p.name }]));

    // Transform the data to match expected format
    const users = usersData.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      profile: profileMap.get(user.id) || null,
    }));

    // Sort alphabetically by name (or email if no name)
    users.sort((a, b) => {
      const nameA = (a.profile?.name || a.email).toLowerCase();
      const nameB = (b.profile?.name || b.email).toLowerCase();
      return nameA.localeCompare(nameB);
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('[MATCHING] GET /users-with-scores complete', {
        algorithmVersion,
        userCount: users.length,
      });
    }

    return c.json({ users }, 200);
  } catch (error) {
    console.error('[MATCHING] Error in get-users-with-scores:', error);

    const message = error instanceof Error ? error.message : 'Failed to fetch users with scores';

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
      console.log('[MATCHING] POST /find-matches', {
        userId,
        targetRole,
        options,
      });
    }

    const db = getDb(c.env);
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
      console.log('[MATCHING] POST /explain', {
        userId1,
        userId2,
        algorithmVersion,
      });
    }

    const db = getDb(c.env);
    const matchingService = new MatchingService(db);

    const explanation = await matchingService.explainMatch(userId1, userId2, algorithmVersion);

    if (explanation === null) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[MATCHING] POST /explain - no match found', {
          userId1,
          userId2,
        });
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
