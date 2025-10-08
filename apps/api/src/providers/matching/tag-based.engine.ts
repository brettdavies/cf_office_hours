/**
 * Tag-Based Matching Engine V1
 *
 * Calculates match scores based on:
 * - Tag overlap only (0-60 points): Shared industries, technologies, stages
 *
 * ARCHITECTURE:
 * - Extends BaseMatchingEngine for common infrastructure
 * - Writes pre-calculated scores to user_match_cache table
 * - Runs in background (event-driven or scheduled)
 * - Algorithm version: 'tag-based-v1'
 *
 * TAG INHERITANCE:
 * - Mentors only use personal tags
 * - Mentees inherit tags from their portfolio company
 *
 * FUTURE ENHANCEMENTS:
 * - Mentors have stage tags
 * - Reputation scoring not yet implemented
 *
 * @see docs/architecture/matching-cache-architecture.md
 * @see docs/architecture/8-backend-architecture.md Lines 1948-2105
 */

// External dependencies
import type { SupabaseClient } from "@supabase/supabase-js";

// Internal modules
import type { MatchExplanation } from "./interface";
import { BaseMatchingEngine, type BaseUserData } from "./base.engine";

/**
 * Tag with category from database
 */
interface TagWithCategory {
  value: string;
  category: "industry" | "technology" | "stage";
}

/**
 * User with tags and profile (enriched for matching calculations)
 */
interface UserWithTags extends BaseUserData {
  user_profiles: {
    portfolio_company_id: string | null;
    stage: string | null;
  };
  tags: TagWithCategory[]; // Effective tags with categories from database
}

/**
 * Tag-based matching engine implementation (Version 1)
 *
 * Calculates match scores using tag overlap only (0-60 points).
 * Stages are now treated as tags in the entity_tags table.
 * Reputation scoring not yet implemented.
 *
 * @example
 * const engine = new TagBasedMatchingEngineV1(supabaseClient);
 * await engine.recalculateMatches('user-123'); // Recalculate for one user
 * await engine.recalculateAllMatches({ batchSize: 50 }); // Recalculate for all users
 */
export class TagBasedMatchingEngineV1 extends BaseMatchingEngine<UserWithTags> {
  protected readonly ALGORITHM_VERSION = "tag-based-v1";

  // Tag rarity cache: tag value -> usage count
  private tagRarityCache: Map<string, number> = new Map();

  constructor(db: SupabaseClient) {
    super(db);
    // Initialize rarity cache on construction
    this.loadTagRarityData();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Load tag usage statistics for rarity weighting
   * This runs once on initialization to cache tag frequencies
   */
  private async loadTagRarityData(): Promise<void> {
    try {
      const { data, error } = await this.db.rpc("get_tag_usage_counts");

      if (!error && data) {
        data.forEach((row: { tag_value: string; usage_count: number }) => {
          this.tagRarityCache.set(row.tag_value, row.usage_count);
        });

        if (process.env.NODE_ENV === "development") {
          console.log(`[MATCHING] Loaded tag rarity data`, {
            uniqueTags: this.tagRarityCache.size,
          });
        }
      }
    } catch (error) {
      // Fallback: if RPC doesn't exist, use heuristic-based rarity
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[MATCHING] Using heuristic-based rarity (RPC not available)`,
        );
      }
    }
  }

  // ============================================================================
  // ABSTRACT METHOD IMPLEMENTATIONS (required by BaseMatchingEngine)
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
  protected async fetchUserWithTags(
    userId: string,
  ): Promise<UserWithTags | null> {
    if (process.env.NODE_ENV === "development") {
      console.log(`[MATCHING] Fetching user with tags`, { userId });
    }

    // Fetch user with profile
    const { data: user, error: userError } = await this.db
      .from("users")
      .select("*, user_profiles(*)")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      if (process.env.NODE_ENV === "development") {
        console.error(`[MATCHING] Failed to fetch user`, {
          userId,
          error: userError,
        });
      }
      return null;
    }

    // Fetch personal tags with category from database
    const { data: personalTagRows, error: tagsError } = await this.db
      .from("entity_tags")
      .select("taxonomy_id(value, category)")
      .eq("entity_type", "user")
      .eq("entity_id", userId)
      .is("deleted_at", null);

    if (tagsError) {
      if (process.env.NODE_ENV === "development") {
        console.error(`[MATCHING] Failed to fetch tags`, {
          userId,
          error: tagsError,
        });
      }
      return null;
    }

    const personalTags: TagWithCategory[] = personalTagRows
      ?.map((row) => {
        const taxonomy = row.taxonomy_id as any;
        return taxonomy?.value && taxonomy?.category
          ? { value: taxonomy.value, category: taxonomy.category }
          : null;
      })
      .filter((tag): tag is TagWithCategory => tag !== null) || [];

    // If mentee with portfolio company: fetch company tags with category
    let companyTags: TagWithCategory[] = [];
    if (user.role === "mentee" && user.user_profiles?.portfolio_company_id) {
      const { data: companyTagRows, error: companyTagsError } = await this.db
        .from("entity_tags")
        .select("taxonomy_id(value, category)")
        .eq("entity_type", "portfolio_company")
        .eq("entity_id", user.user_profiles.portfolio_company_id)
        .is("deleted_at", null);

      if (!companyTagsError && companyTagRows) {
        companyTags = companyTagRows
          .map((row) => {
            const taxonomy = row.taxonomy_id as any;
            return taxonomy?.value && taxonomy?.category
              ? { value: taxonomy.value, category: taxonomy.category }
              : null;
          })
          .filter((tag): tag is TagWithCategory => tag !== null);
      }

      if (process.env.NODE_ENV === "development") {
        console.log(`[MATCHING] Fetched company tags for mentee`, {
          userId,
          companyId: user.user_profiles.portfolio_company_id,
          companyTagCount: companyTags.length,
        });
      }
    }

    // Combine personal + company tags (tag inheritance, deduplicate by value)
    const tagMap = new Map<string, TagWithCategory>();
    [...personalTags, ...companyTags].forEach((tag) => {
      if (!tagMap.has(tag.value)) {
        tagMap.set(tag.value, tag);
      }
    });
    const effectiveTags = Array.from(tagMap.values());

    if (process.env.NODE_ENV === "development") {
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
      is_active: user.deleted_at === null,
      last_activity_at: user.last_activity_at
        ? new Date(user.last_activity_at)
        : null,
      deleted_at: user.deleted_at ? new Date(user.deleted_at) : null,
      user_profiles: {
        portfolio_company_id: user.user_profiles?.portfolio_company_id || null,
        stage: user.user_profiles?.stage || null,
      },
      tags: effectiveTags,
    };
  }

  /**
   * Calculate total match score
   *
   * Formula: Tag overlap only (0-60 points)
   * Stages are now treated as tags in entity_tags table.
   *
   * @param user1 - First user
   * @param user2 - Second user
   * @returns Match score (0-60)
   */
  protected calculateScore(user1: UserWithTags, user2: UserWithTags): number {
    // Handle case where users have no tags (common in test data)
    const user1HasTags = user1.tags.length > 0;
    const user2HasTags = user2.tags.length > 0;

    if (!user1HasTags && !user2HasTags) {
      // Both users have no tags - return 0
      return 0;
    }

    const tagOverlap = this.calculateTagOverlap(user1.tags, user2.tags);
    return Math.round(tagOverlap);
  }

  /**
   * Generate match explanation for display
   *
   * Includes:
   * - Top 5 shared tags with categories from database
   * - Human-readable summary
   *
   * @param user1 - First user
   * @param user2 - Second user
   * @param score - Calculated match score
   * @returns Match explanation object
   */
  protected generateExplanation(
    user1: UserWithTags,
    user2: UserWithTags,
    score: number,
  ): MatchExplanation {
    // Handle case where users have no tags
    const user1HasTags = user1.tags.length > 0;
    const user2HasTags = user2.tags.length > 0;

    if (!user1HasTags && !user2HasTags) {
      return {
        tagOverlap: [],
        summary: "No tags available for matching",
      };
    }

    // Find shared tags (top 5) with categories from database
    const user2Values = user2.tags.map((t) => t.value);
    const sharedTags = user1.tags
      .filter((tag) => user2Values.includes(tag.value))
      .slice(0, 5)
      .map((tag) => ({
        category: tag.category,
        tag: tag.value,
      }));

    // Generate summary based on tag overlap only
    const strength = score >= 40 ? "Strong" : score >= 20 ? "Moderate" : "Weak";
    const tagSummary = sharedTags.length > 0
      ? `${sharedTags.length} shared tags (${
        sharedTags.map((t) => t.tag).join(", ")
      })`
      : "no shared tags";

    const summary = `${strength} match: ${tagSummary}`;

    return {
      tagOverlap: sharedTags,
      summary,
    };
  }

  // ============================================================================
  // OVERRIDE: Recalculate matches with zero-score filtering
  // ============================================================================

  /**
   * Recalculate matches for a single user (OVERRIDE to filter zero scores)
   *
   * Tag-based matching only stores matches with score > 0 to reduce storage.
   * Zero scores indicate no tag overlap and provide no value.
   *
   * @param userId - User ID to recalculate matches for
   * @param options - Optional configuration (chunkSize, chunkDelay)
   */
  async recalculateMatches(
    userId: string,
    options?: { chunkSize?: number; chunkDelay?: number },
  ): Promise<void> {
    const chunkSize = options?.chunkSize ?? 100;
    const chunkDelay = options?.chunkDelay ?? 0;
    if (process.env.NODE_ENV === "development") {
      console.log(`[MATCHING] recalculateMatches`, {
        userId,
        algorithmVersion: this.ALGORITHM_VERSION,
      });
    }

    // Fetch user with tags
    const user = await this.fetchUserWithTags(userId);
    if (!user) {
      if (process.env.NODE_ENV === "development") {
        console.error(`[MATCHING] User not found`, { userId });
      }
      return;
    }

    // Fetch potential matches for the user's role
    const potentialMatches = await this.fetchPotentialMatches(userId, user.role);

    if (process.env.NODE_ENV === "development") {
      console.log("[MATCHING] Fetched potential matches", {
        userId,
        potentialMatchCount: potentialMatches.length,
      });
    }

    // Process matches in chunks
    const chunks = this.chunkArray(potentialMatches, chunkSize);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      if (process.env.NODE_ENV === "development") {
        console.log("[MATCHING] Processing chunk", {
          userId,
          chunkNum: i + 1,
          totalChunks: chunks.length,
          chunkSize: chunk.length,
          totalMatches: potentialMatches.length,
        });
      }

      // Calculate scores for this chunk and filter out zero scores
      const cacheEntries = chunk
        .map((matchUser) => {
          const score = this.calculateScore(user, matchUser);
          const explanation = this.generateExplanation(user, matchUser, score);

          // Correctly assign roles based on user type
          // user_id should ALWAYS be the mentee (receiving recommendations)
          // recommended_user_id should ALWAYS be the mentor (being recommended)
          const menteeId = user.role === "mentee" ? userId : matchUser.id;
          const mentorId = user.role === "mentor" ? userId : matchUser.id;

          return {
            user_id: menteeId,
            recommended_user_id: mentorId,
            match_score: score,
            match_explanation: explanation,
            algorithm_version: this.ALGORITHM_VERSION,
            calculated_at: new Date(),
          };
        })
        .filter((entry) => entry.match_score > 0); // FILTER: Only store non-zero scores

      // Write chunk to cache (only non-zero scores)
      await this.writeToCacheAtomic(userId, cacheEntries);

      // Delay between chunks (except last chunk)
      if (i < chunks.length - 1 && chunkDelay > 0) {
        await this.delay(chunkDelay);
      }
    }
  }

  // ============================================================================
  // PERFORMANCE OPTIMIZATIONS (override base class methods)
  // ============================================================================

  /**
   * Fetch multiple users with tags in bulk (PERFORMANCE OPTIMIZED)
   *
   * Reduces N+1 query problem: 501 queries → 3-4 queries for 500 users
   * Uses batching to avoid "URI too long" errors with large ID arrays
   *
   * Strategy:
   * 1. Batch IDs into chunks of 100 to avoid URI length limits
   * 2. Single query per batch for users
   * 3. Single query per batch for personal tags
   * 4. Single query per batch for company tags (mentees only)
   * 5. Combine data in memory using O(1) lookups
   *
   * @param userIds - Array of user IDs to fetch
   * @returns Array of users with tags
   *
   * @logging
   * - [MATCHING] Bulk fetching users { userCount }
   * - [MATCHING] Bulk fetched users and tags { userCount, personalTagCount, companyTagCount }
   */
  protected async fetchMultipleUsersWithTags(
    userIds: string[],
  ): Promise<UserWithTags[]> {
    if (userIds.length === 0) {
      return [];
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[MATCHING] Bulk fetching users`, {
        userCount: userIds.length,
      });
    }

    // Batch into chunks of 100 to avoid URI length limits
    const BATCH_SIZE = 100;
    const allUsers: any[] = [];
    const allPersonalTagRows: any[] = [];
    const allCompanyIds: string[] = [];

    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);

      // Batch query for users
      const { data: users, error: usersError } = await this.db
        .from("users")
        .select("*, user_profiles(*)")
        .in("id", batch);

      if (usersError || !users) {
        if (process.env.NODE_ENV === "development") {
          console.error(`[MATCHING] Failed to bulk fetch users batch`, {
            error: usersError,
          });
        }
        continue;
      }

      allUsers.push(...users);

      // Batch query for personal tags
      const { data: personalTagRows, error: tagsError } = await this.db
        .from("entity_tags")
        .select("entity_id, taxonomy_id(value, category)")
        .eq("entity_type", "user")
        .in("entity_id", batch)
        .is("deleted_at", null);

      if (!tagsError && personalTagRows) {
        allPersonalTagRows.push(...personalTagRows);
      }

      // Extract company IDs from this batch
      const menteeUsers = users.filter((u) => u.role === "mentee");
      const companyIds = menteeUsers
        .map((u) => u.user_profiles?.portfolio_company_id)
        .filter((id): id is string => id !== null && id !== undefined);
      allCompanyIds.push(...companyIds);
    }

    // Fetch company tags in batches
    const allCompanyTagRows: any[] = [];
    const uniqueCompanyIds = Array.from(new Set(allCompanyIds));

    for (let i = 0; i < uniqueCompanyIds.length; i += BATCH_SIZE) {
      const batch = uniqueCompanyIds.slice(i, i + BATCH_SIZE);

      const { data, error: companyTagsError } = await this.db
        .from("entity_tags")
        .select("entity_id, taxonomy_id(value, category)")
        .eq("entity_type", "portfolio_company")
        .in("entity_id", batch)
        .is("deleted_at", null);

      if (!companyTagsError && data) {
        allCompanyTagRows.push(...data);
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[MATCHING] Bulk fetched users and tags`, {
        userCount: allUsers.length,
        personalTagCount: allPersonalTagRows.length,
        companyTagCount: allCompanyTagRows.length,
      });
    }

    // Combine data in memory
    return this.combineUserDataWithTags(
      allUsers,
      allPersonalTagRows,
      allCompanyTagRows,
    );
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
    companyTagRows: any[],
  ): UserWithTags[] {
    // Map personal tags by entity_id (user_id)
    const personalTagsByUserId = new Map<string, TagWithCategory[]>();
    personalTagRows.forEach((row) => {
      const taxonomy = row.taxonomy_id as any;
      if (taxonomy?.value && taxonomy?.category) {
        const tag: TagWithCategory = {
          value: taxonomy.value,
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
    companyTagRows.forEach((row) => {
      const taxonomy = row.taxonomy_id as any;
      if (taxonomy?.value && taxonomy?.category) {
        const tag: TagWithCategory = {
          value: taxonomy.value,
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
    return users.map((user) => {
      const personalTags = personalTagsByUserId.get(user.id) || [];
      let companyTags: TagWithCategory[] = [];

      // Add company tags for mentees
      if (user.role === "mentee" && user.user_profiles?.portfolio_company_id) {
        companyTags =
          companyTagsByCompanyId.get(user.user_profiles.portfolio_company_id) ||
          [];
      }

      // Combine and deduplicate by value
      const tagMap = new Map<string, TagWithCategory>();
      [...personalTags, ...companyTags].forEach((tag) => {
        if (!tagMap.has(tag.value)) {
          tagMap.set(tag.value, tag);
        }
      });
      const effectiveTags = Array.from(tagMap.values());

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        is_active: user.deleted_at === null,
        last_activity_at: user.last_activity_at
          ? new Date(user.last_activity_at)
          : null,
        deleted_at: user.deleted_at ? new Date(user.deleted_at) : null,
        user_profiles: {
          portfolio_company_id: user.user_profiles?.portfolio_company_id ||
            null,
          stage: user.user_profiles?.stage || null,
        },
        tags: effectiveTags,
      };
    });
  }

  // ============================================================================
  // PRIVATE HELPER METHODS (tag-specific logic)
  // ============================================================================

  /**
   * Calculate tag overlap score (0-60 points)
   *
   * Formula: Weighted overlap considering rarity and tag count confidence
   *
   * 1. Rarity Weight (TF-IDF style):
   *    - Common tags (>100 users): weight 1.0
   *    - Uncommon tags (20-100 users): weight 1.5
   *    - Rare tags (<20 users): weight 2.0
   *
   * 2. Weighted Jaccard Similarity:
   *    - Sum of rarity weights for shared tags / Sum of rarity weights for all unique tags
   *
   * 3. Tag Count Confidence:
   *    - Penalizes matches with very few tags
   *    - min(sharedTagCount, 5) / 5 → max confidence at 5+ shared tags
   *
   * 4. Diversity Factor:
   *    - min(tag_count1, tag_count2) / max(tag_count1, tag_count2)
   *
   * Final Score = (WeightedJaccard × 0.5 + Confidence × 0.3 + Diversity × 0.2) × 60
   *
   * Examples:
   * - 1/1 common tag: Low score (weak signal, common tag)
   * - 1/1 rare tag: Medium score (weak signal, but rare)
   * - 5/10 rare tags: High score (strong signal, rare tags, good diversity)
   *
   * @param tags1 - First user's tags
   * @param tags2 - Second user's tags
   * @returns Tag overlap score (0-60)
   */
  private calculateTagOverlap(
    tags1: TagWithCategory[],
    tags2: TagWithCategory[],
  ): number {
    const values1 = tags1.map((t) => t.value);
    const values2 = tags2.map((t) => t.value);

    // No tags = no match
    if (values1.length === 0 || values2.length === 0) {
      return 0;
    }

    const sharedTags = values1.filter((value) => values2.includes(value));

    // No overlap = no score
    if (sharedTags.length === 0) {
      return 0;
    }

    // Calculate rarity weights for shared and all unique tags
    // Note: We approximate rarity here since we don't have real-time usage counts
    // In production, this would query actual usage statistics
    const allUniqueTags = new Set([...values1, ...values2]);

    // Get rarity weight based on actual usage statistics (or fallback to heuristic)
    const getRarityWeight = (tag: string): number => {
      const usageCount = this.tagRarityCache.get(tag);

      if (usageCount !== undefined) {
        // Use actual usage data to determine rarity
        // Rare (<20 users): weight 2.0
        // Uncommon (20-100 users): weight 1.5
        // Common (>100 users): weight 1.0
        if (usageCount < 20) {
          return 2.0; // Rare tag
        } else if (usageCount < 100) {
          return 1.5; // Uncommon tag
        } else {
          return 1.0; // Common tag
        }
      }

      // Fallback: heuristic-based rarity (when cache not loaded)
      const commonTags = [
        "cloud_software_infrastructure",
        "big_data_analytics",
        "artificial_intelligence",
        "healthcare",
        "software",
        "saas",
      ];

      if (commonTags.includes(tag)) {
        return 1.0; // Common tag
      }

      if (
        tag.includes("quantum") || tag.includes("crypto") ||
        tag.includes("cannabis")
      ) {
        return 2.0; // Rare tag
      }

      return 1.5; // Uncommon tag (default)
    };

    // Calculate weighted Jaccard similarity
    const sharedWeight = sharedTags.reduce(
      (sum, tag) => sum + getRarityWeight(tag),
      0,
    );
    const totalWeight = Array.from(allUniqueTags).reduce(
      (sum, tag) => sum + getRarityWeight(tag),
      0,
    );
    const weightedJaccard = sharedWeight / totalWeight;

    // Tag count confidence: penalize very few shared tags
    // Confidence maxes out at 5 shared tags
    const confidence = Math.min(sharedTags.length, 5) / 5;

    // Diversity factor: rewards having more tags overall
    const minTags = Math.min(values1.length, values2.length);
    const maxTags = Math.max(values1.length, values2.length);
    const diversityFactor = minTags / maxTags;

    // Combined score: 50% weighted overlap + 30% confidence + 20% diversity
    const combinedScore = (weightedJaccard * 0.5) + (confidence * 0.3) +
      (diversityFactor * 0.2);

    return Math.round(combinedScore * 60);
  }
}
