/**
 * Zod validation schemas for matching-related API requests and responses.
 *
 * These schemas serve three purposes:
 * 1. Runtime validation of API requests/responses
 * 2. TypeScript type generation
 * 3. OpenAPI specification generation
 */

// External dependencies
import { z } from 'zod';

// Internal modules
import { UserResponseSchema } from './user';

/**
 * Schema for match explanation JSONB field.
 *
 * Stores detailed breakdown of why two users were matched:
 * - tagOverlap: Shared tags between users (category + tag)
 * - stageMatch: Whether users are at compatible startup stages
 * - reputationCompatible: Whether reputation tiers are compatible
 * - summary: Human-readable explanation string
 */
export const MatchExplanationSchema = z.object({
  tagOverlap: z.array(
    z.object({
      category: z.string(),
      tag: z.string(),
    })
  ),
  stageMatch: z.boolean(),
  reputationCompatible: z.boolean(),
  summary: z.string(),
});

/**
 * Schema for a single match result.
 *
 * Combines:
 * - user: Full user profile (recommended user)
 * - score: Match score (0-100)
 * - explanation: Detailed match breakdown
 */
export const MatchResultSchema = z.object({
  user: UserResponseSchema,
  score: z.number().min(0).max(100),
  explanation: MatchExplanationSchema,
});

/**
 * Schema for find-matches request options.
 *
 * Optional parameters to customize match retrieval:
 * - algorithmVersion: Which algorithm's cache to read (default: 'tag-based-v1')
 * - limit: Maximum matches to return (default: 5, max: 20)
 * - minScore: Filter matches below this score (optional)
 */
export const FindMatchesOptionsSchema = z.object({
  algorithmVersion: z.string().default('tag-based-v1'),
  limit: z.number().int().min(1).max(20).default(5),
  minScore: z.number().min(0).max(100).optional(),
});

/**
 * Schema for POST /v1/matching/find-matches request.
 *
 * Validation rules:
 * - userId: Must be valid UUID
 * - targetRole: Either 'mentor' or 'mentee'
 * - options: Optional filtering/pagination parameters
 */
export const FindMatchesRequestSchema = z.object({
  userId: z.string().uuid(),
  targetRole: z.enum(['mentor', 'mentee']),
  options: FindMatchesOptionsSchema.optional(),
});

/**
 * Schema for POST /v1/matching/find-matches response.
 *
 * Returns array of matches sorted by score DESC.
 */
export const FindMatchesResponseSchema = z.object({
  matches: z.array(MatchResultSchema),
});

/**
 * Schema for POST /v1/matching/explain request.
 *
 * Validation rules:
 * - userId1: Must be valid UUID
 * - userId2: Must be valid UUID
 * - algorithmVersion: Optional algorithm filter (default: 'tag-based-v1')
 */
export const ExplainMatchRequestSchema = z.object({
  userId1: z.string().uuid(),
  userId2: z.string().uuid(),
  algorithmVersion: z.string().default('tag-based-v1'),
});

/**
 * Schema for POST /v1/matching/explain response.
 *
 * Returns match explanation or null if no cached match found.
 */
export const ExplainMatchResponseSchema = z.object({
  explanation: MatchExplanationSchema.nullable(),
});

/**
 * TypeScript types inferred from Zod schemas.
 *
 * These provide compile-time type safety while the schemas
 * provide runtime validation.
 */
export type MatchExplanation = z.infer<typeof MatchExplanationSchema>;
export type MatchResult = z.infer<typeof MatchResultSchema>;
export type FindMatchesOptions = z.infer<typeof FindMatchesOptionsSchema>;
export type FindMatchesRequest = z.infer<typeof FindMatchesRequestSchema>;
export type FindMatchesResponse = z.infer<typeof FindMatchesResponseSchema>;
export type ExplainMatchRequest = z.infer<typeof ExplainMatchRequestSchema>;
export type ExplainMatchResponse = z.infer<typeof ExplainMatchResponseSchema>;
