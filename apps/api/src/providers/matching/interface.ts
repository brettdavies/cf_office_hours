/**
 * Matching engine interface for calculating and caching user matches
 *
 * ARCHITECTURE PRINCIPLE:
 * - Calculation is polymorphic (implementations of this interface)
 * - Retrieval is NOT polymorphic (simple SQL queries)
 * - Algorithm version is data (column filter), not behavior
 *
 * Implementations calculate match scores in the background and write
 * results to the user_match_cache table. This enables instant retrieval
 * for the UI without expensive calculations on every request.
 *
 * @example
 * const engine = new TagBasedMatchingEngineV1(db);
 * await engine.recalculateMatches(userId); // Background calculation
 */
export interface IMatchingEngine {
  /**
   * Recalculate matches for a specific user
   * Writes results to user_match_cache table
   *
   * @param userId - User ID to recalculate matches for
   *
   * @logging
   * - [MATCHING] recalculateMatches { userId, algorithmVersion }
   * - [MATCHING] Fetched potential matches { userId, potentialMatchCount }
   * - [MATCHING] Calculated scores { userId, matchCount, avgScore }
   * - [MATCHING] Wrote to cache { userId, cachedMatchCount }
   */
  recalculateMatches(userId: string): Promise<void>;

  /**
   * Recalculate matches for all users (batch operation)
   * Used for initial population or admin-triggered recalculation
   *
   * @param options - Bulk operation options
   *
   * @logging
   * - [MATCHING] recalculateAllMatches { algorithmVersion, options }
   * - [MATCHING] Processing batch { currentBatch, totalUsers }
   * - [MATCHING] Batch complete { processedCount, avgTimePerUser }
   */
  recalculateAllMatches(options?: BulkRecalculationOptions): Promise<void>;

  /**
   * Get the algorithm version identifier
   * Used to tag cache entries with algorithm version
   *
   * @returns Algorithm version string (e.g., 'tag-based-v1', 'ml-v2')
   */
  getAlgorithmVersion(): string;
}

/**
 * Options for bulk recalculation operations
 *
 * @example
 * // Incremental update pattern (only process recently modified users)
 * await engine.recalculateAllMatches({
 *   modifiedAfter: new Date('2025-10-01'),
 *   batchSize: 50,
 *   delayBetweenBatches: 200
 * });
 *
 * @example
 * // Full recalculation with custom chunk size
 * await engine.recalculateAllMatches({
 *   batchSize: 50,
 *   chunkSize: 200,
 *   delayBetweenChunks: 20
 * });
 */
export interface BulkRecalculationOptions {
  /** Limit number of users to process (for testing/gradual rollout) */
  limit?: number;

  /** Process only users modified after this date (for incremental updates) */
  modifiedAfter?: Date;

  /** Batch size for user processing (default: 50, reduced from 100 for better memory management) */
  batchSize?: number;

  /** Millisecond delay between user batches (default: 100ms, prevents DB overload) */
  delayBetweenBatches?: number;

  /** Matches per chunk when processing potential matches (default: 100, reduces N+1 queries) */
  chunkSize?: number;

  /** Millisecond delay between match chunks (default: 10ms, prevents DB overload) */
  delayBetweenChunks?: number;
}

/**
 * Match explanation stored in user_match_cache.match_explanation (JSONB)
 *
 * Note: Stages are now treated as tags (stored in entity_tags table).
 * Reputation scoring not yet implemented.
 */
export interface MatchExplanation {
  tagOverlap: Array<{ category: string; tag: string }>;
  summary: string;
}

/**
 * User match cache row (matches database schema)
 */
export interface UserMatchCache {
  id: string;
  user_id: string;
  recommended_user_id: string;
  match_score: number; // 0-60 (tag-based v1)
  match_explanation: MatchExplanation;
  algorithm_version: string;
  calculated_at: Date;
  created_at: Date;
  updated_at: Date;
}
