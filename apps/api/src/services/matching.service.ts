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
 *
 * See: docs/architecture/matching-cache-architecture.md
 */

// External dependencies
import type { SupabaseClient } from '@supabase/supabase-js';

// Types
import type { MatchExplanation } from '../providers/matching/interface';
import type { UserResponse } from '@cf-office-hours/shared';

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

/**
 * Service for retrieving pre-calculated match recommendations
 *
 * NOTE: This is a plain class (NO interface) because retrieval is NOT polymorphic.
 * Algorithm version is data (column filter), not behavior.
 *
 * @logging All methods log in development mode with format: [MATCHING] {operation} { contextData }
 */
export class MatchingService {
  constructor(private db: SupabaseClient) {}

  /**
   * Internal helper: Fetches matches from cache with common query logic
   *
   * @param userId - User ID to fetch matches for
   * @param options - Optional filters
   * @param operationName - Name of the operation for logging (e.g., 'getRecommendedMentors')
   * @returns Array of matches sorted by score DESC
   * @throws {Error} If database query fails
   * @private
   */
  private async fetchMatches(
    userId: string,
    options: GetRecommendedOptions | undefined,
    operationName: string
  ): Promise<MatchResult[]> {
    const algorithmVersion = options?.algorithmVersion ?? 'tag-based-v1';
    const limit = Math.min(options?.limit ?? 5, 20);
    const minScore = options?.minScore;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[MATCHING] ${operationName}`, {
        userId,
        algorithmVersion,
        limit,
        minScore,
      });
    }

    // Single database query with JOIN to users table (no N+1)
    let query = this.db
      .from('user_match_cache')
      .select(
        `
        match_score,
        match_explanation,
        recommended_user:users!user_match_cache_recommended_user_id_fkey(
          id,
          airtable_record_id,
          email,
          role,
          created_at,
          updated_at,
          profile:user_profiles(
            id,
            user_id,
            name,
            title,
            company,
            bio,
            created_at,
            updated_at
          )
        )
      `
      )
      .eq('user_id', userId)
      .eq('algorithm_version', algorithmVersion)
      .order('match_score', { ascending: false })
      .limit(limit);

    if (minScore !== undefined) {
      query = query.gte('match_score', minScore);
    }

    const { data: matches, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch matches: ${error.message}`);
    }

    const results: MatchResult[] = (matches || []).map((m: any) => ({
      user: {
        id: m.recommended_user.id,
        airtable_record_id: m.recommended_user.airtable_record_id,
        email: m.recommended_user.email,
        role: m.recommended_user.role,
        created_at: m.recommended_user.created_at,
        updated_at: m.recommended_user.updated_at,
        profile: Array.isArray(m.recommended_user.profile)
          ? m.recommended_user.profile[0]
          : m.recommended_user.profile,
      },
      score: m.match_score,
      explanation: m.match_explanation,
    }));

    if (process.env.NODE_ENV === 'development') {
      const avgScore = results.reduce((sum, r) => sum + r.score, 0) / (results.length || 1);
      console.log('[MATCHING] Found matches', {
        userId,
        matchCount: results.length,
        avgScore: avgScore.toFixed(2),
      });
    }

    return results;
  }

  /**
   * Get recommended mentors for a mentee
   *
   * Retrieves cached matches from user_match_cache table, sorted by score DESC.
   * Uses single query with JOIN to avoid N+1 queries.
   *
   * @param userId - Mentee user ID
   * @param options - Optional filters (algorithmVersion, limit, minScore)
   * @returns Array of mentor matches sorted by score DESC
   * @throws {Error} If database query fails
   *
   * @logging
   * - [MATCHING] getRecommendedMentors { userId, algorithmVersion, limit, minScore }
   * - [MATCHING] Found matches { userId, matchCount, avgScore }
   */
  async getRecommendedMentors(
    userId: string,
    options?: GetRecommendedOptions
  ): Promise<MatchResult[]> {
    return this.fetchMatches(userId, options, 'getRecommendedMentors');
  }

  /**
   * Get recommended mentees for a mentor
   *
   * Retrieves cached matches from user_match_cache table, sorted by score DESC.
   * Uses single query with JOIN to avoid N+1 queries.
   *
   * @param userId - Mentor user ID
   * @param options - Optional filters (algorithmVersion, limit, minScore)
   * @returns Array of mentee matches sorted by score DESC
   * @throws {Error} If database query fails
   *
   * @logging
   * - [MATCHING] getRecommendedMentees { userId, algorithmVersion, limit, minScore }
   * - [MATCHING] Found matches { userId, matchCount, avgScore }
   */
  async getRecommendedMentees(
    userId: string,
    options?: GetRecommendedOptions
  ): Promise<MatchResult[]> {
    return this.fetchMatches(userId, options, 'getRecommendedMentees');
  }

  /**
   * Get match explanation for a specific user pair
   *
   * Performs bidirectional lookup: checks both (user1→user2) and (user2→user1)
   * since matches can be stored in either direction.
   *
   * @param userId1 - First user ID
   * @param userId2 - Second user ID
   * @param algorithmVersion - Optional algorithm version filter (default: 'tag-based-v1')
   * @returns Match explanation or null if no cached match found
   * @throws {Error} If database query fails
   *
   * @logging
   * - [MATCHING] explainMatch { userId1, userId2, algorithmVersion }
   * - [MATCHING] Found explanation { userId1, userId2, score }
   * - [MATCHING] No cached match found { userId1, userId2 }
   */
  async explainMatch(
    userId1: string,
    userId2: string,
    algorithmVersion: string = 'tag-based-v1'
  ): Promise<MatchExplanation | null> {
    if (process.env.NODE_ENV === 'development') {
      console.log('[MATCHING] explainMatch', { userId1, userId2, algorithmVersion });
    }

    // Bidirectional lookup: check both (user1→user2) and (user2→user1)
    const { data: match, error } = await this.db
      .from('user_match_cache')
      .select('match_explanation, match_score')
      .or(
        `and(user_id.eq.${userId1},recommended_user_id.eq.${userId2}),and(user_id.eq.${userId2},recommended_user_id.eq.${userId1})`
      )
      .eq('algorithm_version', algorithmVersion)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch match explanation: ${error.message}`);
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

    return match.match_explanation;
  }
}
