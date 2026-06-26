/**
 * Matching Service - Retrieval layer for pre-calculated match recommendations.
 *
 * ARCHITECTURE PRINCIPLE:
 * This is a plain class (NO interface) because retrieval is NOT polymorphic.
 * Algorithm version is data (column filter), not behavior.
 *
 * Responsibilities:
 * - Retrieve pre-calculated matches from user_match_cache table
 * - Apply filters (algorithmVersion, minScore, limit)
 * - Return matches sorted by score DESC
 * - NO calculation logic (that's in IMatchingEngine implementations)
 */

// Internal modules
import { parseJson } from '../lib/d1-utils';

// Types
import type { MatchExplanation, UserResponse } from '@cf-office-hours/shared';

/** Parse a stored match_explanation, filling fields the engines may omit. */
const toExplanation = (raw: string): MatchExplanation => {
  const parsed = parseJson<Partial<MatchExplanation>>(raw);
  return {
    tagOverlap: parsed?.tagOverlap ?? [],
    stageMatch: parsed?.stageMatch ?? false,
    reputationCompatible: parsed?.reputationCompatible ?? false,
    summary: parsed?.summary ?? '',
  };
};

/**
 * Options for customizing match retrieval
 */
export interface GetRecommendedOptions {
  /** Algorithm version to filter by (default: 'tag-based-v1') */
  algorithmVersion?: string;
  /** Maximum number of matches to return (default: 5, max: 20) */
  limit?: number;
  /** Minimum score threshold (optional, range: 0-100) */
  minScore?: number;
}

/**
 * Match result combining user profile, score, and explanation
 */
export interface MatchResult {
  user: UserResponse;
  score: number;
  explanation: MatchExplanation;
}

/** Joined cache + user + profile row. */
interface MatchRow {
  match_score: number;
  match_explanation: string;
  id: string;
  airtable_record_id: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
  p_id: string;
  p_user_id: string;
  p_name: string;
  p_title: string | null;
  p_company: string | null;
  p_bio: string | null;
  p_created_at: string;
  p_updated_at: string;
}

/** Column list shared by both directions of the recommendation join. */
const MATCH_USER_COLUMNS = `
  c.match_score, c.match_explanation,
  u.id, u.airtable_record_id, u.email, u.role, u.created_at, u.updated_at,
  p.id AS p_id, p.user_id AS p_user_id, p.name AS p_name, p.title AS p_title,
  p.company AS p_company, p.bio AS p_bio,
  p.created_at AS p_created_at, p.updated_at AS p_updated_at`;

const mapMatch = (row: MatchRow): MatchResult => ({
  user: {
    id: row.id,
    airtable_record_id: row.airtable_record_id,
    email: row.email,
    role: row.role,
    created_at: row.created_at,
    updated_at: row.updated_at,
    profile: {
      id: row.p_id,
      user_id: row.p_user_id,
      name: row.p_name,
      title: row.p_title,
      company: row.p_company,
      bio: row.p_bio,
      created_at: row.p_created_at,
      updated_at: row.p_updated_at,
    },
  } as UserResponse,
  score: row.match_score,
  explanation: toExplanation(row.match_explanation),
});

/**
 * Service for retrieving pre-calculated match recommendations.
 *
 * @logging All methods log in development mode with format: [MATCHING] {operation} { contextData }
 */
export class MatchingService {
  constructor(private db: D1Database) {}

  /**
   * Fetch matches for a user joining the recommended counterpart in a given direction.
   *
   * @param joinColumn - cache column joined to users (recommended_user_id or user_id)
   * @param filterColumn - cache column filtered by the supplied id (the other one)
   */
  private async fetchMatches(
    joinColumn: 'recommended_user_id' | 'user_id',
    filterColumn: 'user_id' | 'recommended_user_id',
    id: string,
    options: GetRecommendedOptions | undefined,
    operationName: string
  ): Promise<MatchResult[]> {
    const algorithmVersion = options?.algorithmVersion ?? 'tag-based-v1';
    const limit = Math.min(options?.limit ?? 5, 20);
    const minScore = options?.minScore;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[MATCHING] ${operationName}`, {
        id,
        algorithmVersion,
        limit,
        minScore,
      });
    }

    const params: Array<string | number> = [id, algorithmVersion];
    let scoreFilter = '';
    if (minScore !== undefined) {
      scoreFilter = 'AND c.match_score >= ?';
      params.push(minScore);
    }
    params.push(limit);

    const sql = `
      SELECT ${MATCH_USER_COLUMNS}
      FROM user_match_cache c
      JOIN users u ON u.id = c.${joinColumn}
      JOIN user_profiles p ON p.user_id = u.id
      WHERE c.${filterColumn} = ? AND c.algorithm_version = ? ${scoreFilter}
      ORDER BY c.match_score DESC
      LIMIT ?`;

    let rows: MatchRow[];
    try {
      const res = await this.db
        .prepare(sql)
        .bind(...params)
        .all<MatchRow>();
      rows = res.results ?? [];
    } catch (error) {
      throw new Error(
        `Failed to fetch matches: ${error instanceof Error ? error.message : 'unknown'}`
      );
    }

    const results = rows.map(mapMatch);

    if (process.env.NODE_ENV === 'development') {
      const avgScore = results.reduce((sum, r) => sum + r.score, 0) / (results.length || 1);
      console.log('[MATCHING] Found matches', {
        id,
        matchCount: results.length,
        avgScore: avgScore.toFixed(2),
      });
    }

    return results;
  }

  /**
   * Get recommended mentors for a mentee (mentee is user_id, mentor is recommended_user_id).
   *
   * @param userId - Mentee user ID
   * @param options - Optional filters (algorithmVersion, limit, minScore)
   * @returns Array of mentor matches sorted by score DESC
   */
  async getRecommendedMentors(
    userId: string,
    options?: GetRecommendedOptions
  ): Promise<MatchResult[]> {
    return this.fetchMatches(
      'recommended_user_id',
      'user_id',
      userId,
      options,
      'getRecommendedMentors'
    );
  }

  /**
   * Get recommended mentees for a mentor (reverse lookup: mentor is recommended_user_id).
   *
   * @param mentorId - Mentor user ID
   * @param options - Optional filters (algorithmVersion, limit, minScore)
   * @returns Array of mentee matches sorted by score DESC
   */
  async getRecommendedMentees(
    mentorId: string,
    options?: GetRecommendedOptions
  ): Promise<MatchResult[]> {
    return this.fetchMatches(
      'user_id',
      'recommended_user_id',
      mentorId,
      options,
      'getRecommendedMentees'
    );
  }

  /**
   * Get match explanation for a specific user pair (bidirectional lookup).
   *
   * @param userId1 - First user ID
   * @param userId2 - Second user ID
   * @param algorithmVersion - Optional algorithm version filter (default: 'tag-based-v1')
   * @returns Match explanation or null if no cached match found
   */
  async explainMatch(
    userId1: string,
    userId2: string,
    algorithmVersion: string = 'tag-based-v1'
  ): Promise<MatchExplanation | null> {
    if (process.env.NODE_ENV === 'development') {
      console.log('[MATCHING] explainMatch', { userId1, userId2, algorithmVersion });
    }

    let match: { match_explanation: string; match_score: number } | null;
    try {
      match = await this.db
        .prepare(
          `SELECT match_explanation, match_score
           FROM user_match_cache
           WHERE algorithm_version = ?
             AND ((user_id = ? AND recommended_user_id = ?)
               OR (user_id = ? AND recommended_user_id = ?))
           LIMIT 1`
        )
        .bind(algorithmVersion, userId1, userId2, userId2, userId1)
        .first<{ match_explanation: string; match_score: number }>();
    } catch (error) {
      throw new Error(
        `Failed to fetch match explanation: ${error instanceof Error ? error.message : 'unknown'}`
      );
    }

    if (!match) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[MATCHING] No cached match found', { userId1, userId2 });
      }
      return null;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[MATCHING] Found explanation', {
        userId1,
        userId2,
        score: match.match_score,
      });
    }

    return toExplanation(match.match_explanation);
  }
}
