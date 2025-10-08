/**
 * Tag-Based Matching Engine V1
 *
 * Calculates match scores based on:
 * - Tag overlap (60%): Shared industries, technologies, stages
 * - Stage compatibility (20%): Similar startup stage
 * - Reputation compatibility (20%): Tier difference ≤ 1
 *
 * ARCHITECTURE:
 * - Implements IMatchingEngine interface
 * - Writes pre-calculated scores to user_match_cache table
 * - Runs in background (event-driven or scheduled)
 * - Algorithm version: 'tag-based-v1'
 *
 * TAG INHERITANCE:
 * - Mentees inherit tags from their portfolio company
 * - Mentors only use personal tags
 *
 * @see docs/architecture/matching-cache-architecture.md
 * @see docs/architecture/8-backend-architecture.md Lines 1948-2105
 */

// External dependencies
import type { SupabaseClient } from '@supabase/supabase-js';

// Internal modules
import type { IMatchingEngine, BulkRecalculationOptions, MatchExplanation } from './interface';

/**
 * Tag with category from database
 */
interface TagWithCategory {
  slug: string;
  category: 'industry' | 'technology' | 'stage';
}

/**
 * User with tags and profile (enriched for matching calculations)
 */
interface UserWithTags {
  id: string;
  email: string;
  role: 'mentor' | 'mentee' | 'coordinator';
  reputation_tier: 'bronze' | 'silver' | 'gold' | 'platinum' | null;
  is_active: boolean;
  last_activity_at: Date | null;
  deleted_at: Date | null;
  user_profiles: {
    portfolio_company_id: string | null;
    stage: string | null;
  };
  tags: TagWithCategory[]; // Effective tags with categories from database
}

/**
 * Cache entry for bulk insert
 */
interface CacheEntry {
  user_id: string;
  recommended_user_id: string;
  match_score: number;
  match_explanation: MatchExplanation;
  algorithm_version: string;
  calculated_at: Date;
}

/**
 * Tag-based matching engine implementation (Version 1)
 *
 * Calculates match scores using weighted formula:
 * score = (tagOverlap × 0.6) + (stageMatch × 0.2) + (reputationMatch × 0.2)
 *
 * @example
 * const engine = new TagBasedMatchingEngineV1(supabaseClient);
 * await engine.recalculateMatches('user-123'); // Recalculate for one user
 * await engine.recalculateAllMatches({ batchSize: 50 }); // Recalculate for all users
 */
export class TagBasedMatchingEngineV1 implements IMatchingEngine {
  private readonly ALGORITHM_VERSION = 'tag-based-v1';
  private readonly STAGE_ORDER = ['pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'growth'];
  private readonly TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum'];
  private readonly DORMANCY_DAYS = 90;
  private readonly DEFAULT_BATCH_SIZE = 50; // Reduced from 100 for better memory management
  private readonly DEFAULT_CHUNK_SIZE = 100; // Matches per chunk to reduce N+1 queries
  private readonly DEFAULT_CHUNK_DELAY_MS = 10; // Delay between chunks to prevent DB overload
  private readonly DEFAULT_BATCH_DELAY_MS = 100; // Delay between user batches

  constructor(private readonly db: SupabaseClient) {}

  /**
   * Get the algorithm version identifier
   *
   * @returns Algorithm version string
   */
  getAlgorithmVersion(): string {
    return this.ALGORITHM_VERSION;
  }

  /**
   * Recalculate matches for a specific user with chunked processing
   * Writes results to user_match_cache table
   *
   * Uses chunked processing to prevent memory issues with large match sets.
   * Bulk fetches tags for each chunk to eliminate N+1 queries.
   *
   * @param userId - User ID to recalculate matches for
   * @param options - Optional chunking configuration
   *
   * @logging
   * - [MATCHING] recalculateMatches { userId, algorithmVersion }
   * - [MATCHING] Fetched potential matches { userId, potentialMatchCount }
   * - [MATCHING] Processing chunk { chunkNum, totalChunks, chunkSize }
   * - [MATCHING] Calculated scores { userId, matchCount, avgScore }
   * - [MATCHING] Wrote to cache { userId, cachedMatchCount }
   */
  async recalculateMatches(
    userId: string,
    options?: { chunkSize?: number; delayBetweenChunks?: number }
  ): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MATCHING] recalculateMatches`, {
        userId,
        algorithmVersion: this.ALGORITHM_VERSION,
      });
    }

    // Fetch user with tags
    const user = await this.fetchUserWithTags(userId);

    if (!user) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[MATCHING] User not found`, { userId });
      }
      throw new Error(`User not found: ${userId}`);
    }

    // Determine target role
    const targetRole = user.role === 'mentor' ? 'mentee' : 'mentor';

    if (process.env.NODE_ENV === 'development') {
      console.log(`[MATCHING] Determined target role`, {
        userId,
        userRole: user.role,
        targetRole,
      });
    }

    // Fetch potential matches (already uses bulk fetching internally)
    const potentialMatches = await this.fetchPotentialMatches(userId, targetRole);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[MATCHING] Fetched potential matches`, {
        userId,
        potentialMatchCount: potentialMatches.length,
      });
    }

    // Process matches in chunks for memory efficiency
    const chunkSize = options?.chunkSize || this.DEFAULT_CHUNK_SIZE;
    const delayMs = options?.delayBetweenChunks || this.DEFAULT_CHUNK_DELAY_MS;
    const totalChunks = Math.ceil(potentialMatches.length / chunkSize);

    const allCacheEntries: CacheEntry[] = [];
    let totalScore = 0;

    for (let i = 0; i < potentialMatches.length; i += chunkSize) {
      const chunkNum = Math.floor(i / chunkSize) + 1;
      const chunk = potentialMatches.slice(i, i + chunkSize);

      if (process.env.NODE_ENV === 'development') {
        console.log(`[MATCHING] Processing chunk`, {
          userId,
          chunkNum,
          totalChunks,
          chunkSize: chunk.length,
          totalMatches: potentialMatches.length,
        });
      }

      // Process chunk in parallel
      const chunkResults = await Promise.all(
        chunk.map(match => {
          const score = this.calculateScore(user, match);
          const explanation = this.generateExplanation(user, match, score);

          if (process.env.NODE_ENV === 'development') {
            console.log(`[MATCHING] Calculated score`, {
              userId,
              matchUserId: match.id,
              score,
              tagOverlap: this.calculateTagOverlap(user.tags, match.tags),
              stageMatch: this.calculateStageMatch(
                user.user_profiles.stage,
                match.user_profiles.stage
              ),
              reputationMatch: this.calculateReputationMatch(
                user.reputation_tier,
                match.reputation_tier
              ),
            });
          }

          return {
            user_id: userId,
            recommended_user_id: match.id,
            match_score: score,
            match_explanation: explanation,
            algorithm_version: this.ALGORITHM_VERSION,
            calculated_at: new Date(),
          };
        })
      );

      // Accumulate results
      allCacheEntries.push(...chunkResults);
      totalScore += chunkResults.reduce((sum, entry) => sum + entry.match_score, 0);

      // Optional delay between chunks to prevent DB overload
      if (i + chunkSize < potentialMatches.length && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    const avgScore = allCacheEntries.length > 0 ? totalScore / allCacheEntries.length : 0;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[MATCHING] Calculated scores`, {
        userId,
        matchCount: allCacheEntries.length,
        avgScore: avgScore.toFixed(2),
      });
    }

    // Write to cache (atomic delete + insert)
    await this.writeToCacheAtomic(userId, allCacheEntries);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[MATCHING] Wrote to cache`, {
        userId,
        cachedMatchCount: allCacheEntries.length,
      });
    }
  }

  /**
   * Recalculate matches for all users (batch operation with enhanced error handling)
   * Used for initial population or admin-triggered recalculation
   *
   * Features:
   * - Individual error isolation (one user failure doesn't block batch)
   * - Success/failure tracking per batch
   * - Configurable delays between batches
   * - Supports incremental updates (modifiedAfter filter)
   *
   * @param options - Bulk operation options
   *
   * @logging
   * - [MATCHING] recalculateAllMatches { algorithmVersion, options }
   * - [MATCHING] Processing batch { currentBatch, totalUsers }
   * - [MATCHING] Batch complete { successCount, failureCount }
   * - [MATCHING] All batches complete { totalSuccess, totalFailures }
   */
  async recalculateAllMatches(options?: BulkRecalculationOptions): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MATCHING] recalculateAllMatches`, {
        algorithmVersion: this.ALGORITHM_VERSION,
        options,
      });
    }

    // Fetch all active users
    let query = this.db.from('users').select('id').is('deleted_at', null);

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.modifiedAfter) {
      query = query.gt('updated_at', options.modifiedAfter.toISOString());
    }

    const { data: users, error } = await query;

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[MATCHING] Failed to fetch users`, { error });
      }
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    if (!users || users.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[MATCHING] No users to process`, { options });
      }
      return;
    }

    const totalUsers = users.length;
    const batchSize = options?.batchSize || this.DEFAULT_BATCH_SIZE;
    const delayBetweenBatches = options?.delayBetweenBatches || this.DEFAULT_BATCH_DELAY_MS;
    const totalBatches = Math.ceil(totalUsers / batchSize);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[MATCHING] Starting batch processing`, {
        totalUsers,
        batchSize,
        totalBatches,
        delayBetweenBatches,
      });
    }

    const startTime = Date.now();
    let totalSuccessCount = 0;
    let totalFailureCount = 0;

    // Process users in batches
    for (let i = 0; i < totalBatches; i++) {
      const batchStart = i * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, totalUsers);
      const batch = users.slice(batchStart, batchEnd);

      if (process.env.NODE_ENV === 'development') {
        console.log(`[MATCHING] Processing batch`, {
          currentBatch: i + 1,
          totalBatches,
          batchSize: batch.length,
          processedCount: batchStart,
          totalUsers,
        });
      }

      // Process batch in parallel with individual error isolation
      const batchPromises = batch.map(async user => {
        try {
          await this.recalculateMatches(user.id, {
            chunkSize: options?.chunkSize,
            delayBetweenChunks: options?.delayBetweenChunks,
          });
          return { userId: user.id, success: true };
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`[MATCHING] Failed to process user ${user.id}:`, error);
          }
          return { userId: user.id, success: false, error };
        }
      });

      const results = await Promise.all(batchPromises);

      // Count successes and failures
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      totalSuccessCount += successCount;
      totalFailureCount += failureCount;

      if (process.env.NODE_ENV === 'development') {
        const elapsed = Date.now() - startTime;
        const processed = batchEnd;
        const avgTimePerUser = elapsed / processed;

        console.log(`[MATCHING] Batch complete`, {
          batchNumber: i + 1,
          processedCount: processed,
          totalUsers,
          successCount,
          failureCount,
          avgTimePerUser: `${avgTimePerUser.toFixed(2)}ms`,
        });
      }

      // Add configurable delay between batches
      if (i < totalBatches - 1 && delayBetweenBatches > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    const totalTime = Date.now() - startTime;
    const avgTimePerUser = totalTime / totalUsers;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[MATCHING] All batches complete`, {
        totalUsers,
        totalSuccessCount,
        totalFailureCount,
        successRate: `${((totalSuccessCount / totalUsers) * 100).toFixed(1)}%`,
        totalTime: `${totalTime}ms`,
        avgTimePerUser: `${avgTimePerUser.toFixed(2)}ms`,
      });
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Fetch user with tags (includes tag inheritance for mentees)
   *
   * @param userId - User ID to fetch
   * @returns User with tags, or null if not found
   *
   * @logging
   * - [MATCHING] Fetching user with tags { userId }
   * - [MATCHING] Fetched user tags { userId, personalTagCount, companyTagCount }
   */
  private async fetchUserWithTags(userId: string): Promise<UserWithTags | null> {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MATCHING] Fetching user with tags`, { userId });
    }

    // Fetch user with profile
    const { data: user, error: userError } = await this.db
      .from('users')
      .select('*, user_profiles(*)')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[MATCHING] Failed to fetch user`, { userId, error: userError });
      }
      return null;
    }

    // Fetch personal tags with category from database
    const { data: personalTagRows, error: tagsError } = await this.db
      .from('entity_tags')
      .select('taxonomy(slug, category)')
      .eq('entity_type', 'user')
      .eq('entity_id', userId)
      .is('deleted_at', null);

    if (tagsError) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[MATCHING] Failed to fetch tags`, { userId, error: tagsError });
      }
      return null;
    }

    const personalTags: TagWithCategory[] =
      personalTagRows
        ?.map(row => {
          const taxonomy = row.taxonomy as any;
          return taxonomy?.slug && taxonomy?.category
            ? { slug: taxonomy.slug, category: taxonomy.category }
            : null;
        })
        .filter((tag): tag is TagWithCategory => tag !== null) || [];

    // If mentee with portfolio company: fetch company tags with category
    let companyTags: TagWithCategory[] = [];
    if (user.role === 'mentee' && user.user_profiles?.portfolio_company_id) {
      const { data: companyTagRows, error: companyTagsError } = await this.db
        .from('entity_tags')
        .select('taxonomy(slug, category)')
        .eq('entity_type', 'portfolio_company')
        .eq('entity_id', user.user_profiles.portfolio_company_id)
        .is('deleted_at', null);

      if (!companyTagsError && companyTagRows) {
        companyTags = companyTagRows
          .map(row => {
            const taxonomy = row.taxonomy as any;
            return taxonomy?.slug && taxonomy?.category
              ? { slug: taxonomy.slug, category: taxonomy.category }
              : null;
          })
          .filter((tag): tag is TagWithCategory => tag !== null);
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`[MATCHING] Fetched company tags for mentee`, {
          userId,
          companyId: user.user_profiles.portfolio_company_id,
          companyTagCount: companyTags.length,
        });
      }
    }

    // Combine personal + company tags (tag inheritance, deduplicate by slug)
    const tagMap = new Map<string, TagWithCategory>();
    [...personalTags, ...companyTags].forEach(tag => {
      if (!tagMap.has(tag.slug)) {
        tagMap.set(tag.slug, tag);
      }
    });
    const effectiveTags = Array.from(tagMap.values());

    if (process.env.NODE_ENV === 'development') {
      console.log(`[MATCHING] Fetched user tags`, {
        userId,
        role: user.role,
        personalTagCount: personalTags.length,
        companyTagCount: companyTags.length,
        effectiveTagCount: effectiveTags.length,
      });
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      reputation_tier: user.reputation_tier,
      is_active: user.is_active ?? true,
      last_activity_at: user.last_activity_at ? new Date(user.last_activity_at) : null,
      deleted_at: user.deleted_at ? new Date(user.deleted_at) : null,
      user_profiles: {
        portfolio_company_id: user.user_profiles?.portfolio_company_id || null,
        stage: user.user_profiles?.stage || null,
      },
      tags: effectiveTags,
    };
  }

  /**
   * Fetch multiple users with tags in bulk (PERFORMANCE OPTIMIZED)
   *
   * Reduces N+1 query problem: 501 queries → 3-4 queries for 500 users
   *
   * Strategy:
   * 1. Single query for all users
   * 2. Single query for all personal tags
   * 3. Single query for all company tags (mentees only)
   * 4. Combine data in memory using O(1) lookups
   *
   * @param userIds - Array of user IDs to fetch
   * @returns Array of users with tags
   *
   * @logging
   * - [MATCHING] Bulk fetching users { userCount }
   * - [MATCHING] Bulk fetched users and tags { userCount, personalTagCount, companyTagCount }
   */
  private async fetchMultipleUsersWithTags(userIds: string[]): Promise<UserWithTags[]> {
    if (userIds.length === 0) {
      return [];
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[MATCHING] Bulk fetching users`, {
        userCount: userIds.length,
      });
    }

    // Single query for all users
    const { data: users, error: usersError } = await this.db
      .from('users')
      .select('*, user_profiles(*)')
      .in('id', userIds);

    if (usersError || !users) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[MATCHING] Failed to bulk fetch users`, { error: usersError });
      }
      return [];
    }

    // Single query for all personal tags
    const { data: personalTagRows, error: tagsError } = await this.db
      .from('entity_tags')
      .select('entity_id, taxonomy(slug, category)')
      .eq('entity_type', 'user')
      .in('entity_id', userIds)
      .is('deleted_at', null);

    if (tagsError) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[MATCHING] Failed to bulk fetch tags`, { error: tagsError });
      }
      return [];
    }

    // Extract mentee users and their portfolio company IDs
    const menteeUsers = users.filter(u => u.role === 'mentee');
    const companyIds = menteeUsers
      .map(u => u.user_profiles?.portfolio_company_id)
      .filter((id): id is string => id !== null && id !== undefined);

    // Single query for company tags (if any mentees)
    let companyTagRows: any[] = [];
    if (companyIds.length > 0) {
      const { data, error: companyTagsError } = await this.db
        .from('entity_tags')
        .select('entity_id, taxonomy(slug, category)')
        .eq('entity_type', 'portfolio_company')
        .in('entity_id', companyIds)
        .is('deleted_at', null);

      if (!companyTagsError && data) {
        companyTagRows = data;
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[MATCHING] Bulk fetched users and tags`, {
        userCount: users.length,
        personalTagCount: personalTagRows?.length || 0,
        companyTagCount: companyTagRows.length,
      });
    }

    // Combine data in memory
    return this.combineUserDataWithTags(users, personalTagRows || [], companyTagRows);
  }

  /**
   * Combine user data with tags in memory (helper for bulk fetching)
   *
   * Uses Maps for O(1) lookup performance when combining data
   *
   * @param users - User records from database
   * @param personalTagRows - Personal tag rows with entity_id
   * @param companyTagRows - Company tag rows with entity_id
   * @returns Array of users with combined tags
   */
  private combineUserDataWithTags(
    users: any[],
    personalTagRows: any[],
    companyTagRows: any[]
  ): UserWithTags[] {
    // Map personal tags by entity_id (user_id)
    const personalTagsByUserId = new Map<string, TagWithCategory[]>();
    personalTagRows.forEach(row => {
      const taxonomy = row.taxonomy as any;
      if (taxonomy?.slug && taxonomy?.category) {
        const tag: TagWithCategory = {
          slug: taxonomy.slug,
          category: taxonomy.category,
        };
        const userId = row.entity_id;
        const tags = personalTagsByUserId.get(userId);
        if (tags) {
          tags.push(tag);
        } else {
          personalTagsByUserId.set(userId, [tag]);
        }
      }
    });

    // Map company tags by entity_id (portfolio_company_id)
    const companyTagsByCompanyId = new Map<string, TagWithCategory[]>();
    companyTagRows.forEach(row => {
      const taxonomy = row.taxonomy as any;
      if (taxonomy?.slug && taxonomy?.category) {
        const tag: TagWithCategory = {
          slug: taxonomy.slug,
          category: taxonomy.category,
        };
        const companyId = row.entity_id;
        const tags = companyTagsByCompanyId.get(companyId);
        if (tags) {
          tags.push(tag);
        } else {
          companyTagsByCompanyId.set(companyId, [tag]);
        }
      }
    });

    // Combine user data with tags
    return users.map(user => {
      const personalTags = personalTagsByUserId.get(user.id) || [];
      let companyTags: TagWithCategory[] = [];

      // Add company tags for mentees
      if (user.role === 'mentee' && user.user_profiles?.portfolio_company_id) {
        companyTags = companyTagsByCompanyId.get(user.user_profiles.portfolio_company_id) || [];
      }

      // Combine and deduplicate by slug
      const tagMap = new Map<string, TagWithCategory>();
      [...personalTags, ...companyTags].forEach(tag => {
        if (!tagMap.has(tag.slug)) {
          tagMap.set(tag.slug, tag);
        }
      });
      const effectiveTags = Array.from(tagMap.values());

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        reputation_tier: user.reputation_tier,
        is_active: user.is_active ?? true,
        last_activity_at: user.last_activity_at ? new Date(user.last_activity_at) : null,
        deleted_at: user.deleted_at ? new Date(user.deleted_at) : null,
        user_profiles: {
          portfolio_company_id: user.user_profiles?.portfolio_company_id || null,
          stage: user.user_profiles?.stage || null,
        },
        tags: effectiveTags,
      };
    });
  }

  /**
   * Fetch potential matches for a user
   *
   * Filters:
   * - Target role (mentor or mentee)
   * - Active users only
   * - Non-dormant (active within 90 days)
   * - Exclude self
   *
   * @param userId - User ID to exclude
   * @param targetRole - Role to match (mentor or mentee)
   * @returns Array of potential matches with tags
   *
   * @logging
   * - [MATCHING] Fetching potential matches { userId, targetRole }
   * - [MATCHING] Fetched potential matches { userId, count }
   */
  private async fetchPotentialMatches(
    userId: string,
    targetRole: 'mentor' | 'mentee'
  ): Promise<UserWithTags[]> {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MATCHING] Fetching potential matches`, {
        userId,
        targetRole,
      });
    }

    // Calculate dormancy threshold
    const dormancyThreshold = new Date();
    dormancyThreshold.setDate(dormancyThreshold.getDate() - this.DORMANCY_DAYS);

    // Fetch potential matches
    const { data: users, error } = await this.db
      .from('users')
      .select('id')
      .eq('role', targetRole)
      .eq('is_active', true)
      .is('deleted_at', null)
      .gte('last_activity_at', dormancyThreshold.toISOString())
      .neq('id', userId);

    if (error || !users) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[MATCHING] Failed to fetch potential matches`, {
          userId,
          error,
        });
      }
      return [];
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[MATCHING] Fetched potential match IDs`, {
        userId,
        count: users.length,
      });
    }

    // Bulk fetch all users with tags (eliminates N+1 queries)
    const userIds = users.map(u => u.id);
    const matches = await this.fetchMultipleUsersWithTags(userIds);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[MATCHING] Fetched potential matches with tags`, {
        userId,
        count: matches.length,
      });
    }

    return matches;
  }

  /**
   * Calculate total match score
   *
   * Formula: (tagOverlap × 0.6) + (stageMatch × 0.2) + (reputationMatch × 0.2)
   *
   * @param user1 - First user
   * @param user2 - Second user
   * @returns Match score (0-100)
   */
  private calculateScore(user1: UserWithTags, user2: UserWithTags): number {
    const tagOverlap = this.calculateTagOverlap(user1.tags, user2.tags);
    const stageMatch = this.calculateStageMatch(
      user1.user_profiles.stage,
      user2.user_profiles.stage
    );
    const reputationMatch = this.calculateReputationMatch(
      user1.reputation_tier,
      user2.reputation_tier
    );

    return Math.round(tagOverlap + stageMatch + reputationMatch);
  }

  /**
   * Calculate tag overlap score (0-60 points)
   *
   * Formula: (sharedTagCount / totalUniqueTags) × 60
   *
   * @param tags1 - First user's tags
   * @param tags2 - Second user's tags
   * @returns Tag overlap score (0-60)
   */
  private calculateTagOverlap(tags1: TagWithCategory[], tags2: TagWithCategory[]): number {
    const slugs1 = tags1.map(t => t.slug);
    const slugs2 = tags2.map(t => t.slug);

    const sharedTags = slugs1.filter(slug => slugs2.includes(slug));
    const uniqueTags = new Set([...slugs1, ...slugs2]);

    if (uniqueTags.size === 0) {
      return 0;
    }

    const overlapRatio = sharedTags.length / uniqueTags.size;
    return Math.round(overlapRatio * 60);
  }

  /**
   * Calculate stage compatibility score (0-20 points)
   *
   * Returns:
   * - 20 points if stages match
   * - 10 points if stages are adjacent
   * - 0 points if stages differ by >1 level
   *
   * @param stage1 - First user's stage
   * @param stage2 - Second user's stage
   * @returns Stage match score (0-20)
   */
  private calculateStageMatch(stage1: string | null, stage2: string | null): number {
    if (!stage1 || !stage2) {
      return 0;
    }

    const index1 = this.STAGE_ORDER.indexOf(stage1);
    const index2 = this.STAGE_ORDER.indexOf(stage2);

    if (index1 === -1 || index2 === -1) {
      return 0;
    }

    const difference = Math.abs(index1 - index2);

    if (difference === 0) {
      return 20; // Same stage
    }

    if (difference === 1) {
      return 10; // Adjacent stages
    }

    return 0; // Different stages
  }

  /**
   * Calculate reputation compatibility score (0-20 points)
   *
   * Returns:
   * - 20 points if tier difference ≤ 1
   * - 0 points if tier difference > 1
   * - 10 points if either tier is missing (neutral)
   *
   * @param tier1 - First user's reputation tier
   * @param tier2 - Second user's reputation tier
   * @returns Reputation match score (0-20)
   */
  private calculateReputationMatch(
    tier1: 'bronze' | 'silver' | 'gold' | 'platinum' | null,
    tier2: 'bronze' | 'silver' | 'gold' | 'platinum' | null
  ): number {
    if (!tier1 || !tier2) {
      return 10; // Neutral if missing
    }

    const index1 = this.TIER_ORDER.indexOf(tier1);
    const index2 = this.TIER_ORDER.indexOf(tier2);

    if (index1 === -1 || index2 === -1) {
      return 10;
    }

    const difference = Math.abs(index1 - index2);
    return difference <= 1 ? 20 : 0;
  }

  /**
   * Generate match explanation for display
   *
   * Includes:
   * - Top 5 shared tags with categories from database
   * - Stage match boolean
   * - Reputation compatible boolean
   * - Human-readable summary
   *
   * @param user1 - First user
   * @param user2 - Second user
   * @param score - Calculated match score
   * @returns Match explanation object
   */
  private generateExplanation(
    user1: UserWithTags,
    user2: UserWithTags,
    score: number
  ): MatchExplanation {
    // Find shared tags (top 5) with categories from database
    const user2Slugs = user2.tags.map(t => t.slug);
    const sharedTags = user1.tags
      .filter(tag => user2Slugs.includes(tag.slug))
      .slice(0, 5)
      .map(tag => ({
        category: tag.category,
        tag: tag.slug,
      }));

    // Determine stage and reputation match
    const stageScore = this.calculateStageMatch(
      user1.user_profiles.stage,
      user2.user_profiles.stage
    );
    const reputationScore = this.calculateReputationMatch(
      user1.reputation_tier,
      user2.reputation_tier
    );

    const stageMatch = stageScore === 20;
    const reputationCompatible = reputationScore === 20;

    // Generate summary
    const strength = score >= 60 ? 'Strong' : score >= 30 ? 'Moderate' : 'Weak';
    const tagSummary =
      sharedTags.length > 0
        ? `${sharedTags.length} shared tags (${sharedTags.map(t => t.tag).join(', ')})`
        : 'no shared tags';
    const stageSummary = stageMatch ? ', same startup stage' : '';
    const reputationSummary = reputationCompatible ? ', compatible reputation tiers' : '';

    const summary = `${strength} match: ${tagSummary}${stageSummary}${reputationSummary}`;

    return {
      tagOverlap: sharedTags,
      stageMatch,
      reputationCompatible,
      summary,
    };
  }

  /**
   * Write cache entries atomically (delete old + insert new)
   *
   * @param userId - User ID
   * @param entries - Cache entries to insert
   *
   * @logging
   * - [MATCHING] Deleting old cache entries { userId, algorithmVersion }
   * - [MATCHING] Deleted old entries { userId, deletedCount }
   * - [MATCHING] Inserting new cache entries { userId, count }
   * - [MATCHING] Inserted cache entries { userId, insertedCount }
   */
  private async writeToCacheAtomic(userId: string, entries: CacheEntry[]): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MATCHING] Deleting old cache entries`, {
        userId,
        algorithmVersion: this.ALGORITHM_VERSION,
      });
    }

    // Delete old cache entries
    const { error: deleteError, count: deletedCount } = await this.db
      .from('user_match_cache')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
      .eq('algorithm_version', this.ALGORITHM_VERSION);

    if (deleteError) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[MATCHING] Failed to delete old cache entries`, {
          userId,
          error: deleteError,
        });
      }
      throw new Error(`Failed to delete old cache entries: ${deleteError.message}`);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[MATCHING] Deleted old entries`, {
        userId,
        deletedCount: deletedCount || 0,
      });
    }

    // Insert new cache entries
    if (entries.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[MATCHING] No cache entries to insert`, { userId });
      }
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[MATCHING] Inserting new cache entries`, {
        userId,
        count: entries.length,
      });
    }

    const { error: insertError, count: insertedCount } = await this.db
      .from('user_match_cache')
      .insert(entries, { count: 'exact' });

    if (insertError) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[MATCHING] Failed to insert cache entries`, {
          userId,
          error: insertError,
        });
      }
      throw new Error(`Failed to insert cache entries: ${insertError.message}`);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[MATCHING] Inserted cache entries`, {
        userId,
        insertedCount: insertedCount || 0,
      });
    }
  }
}
