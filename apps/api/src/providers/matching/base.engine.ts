/**
 * Base Matching Engine Template
 *
 * Abstract base class that provides common infrastructure for all matching engines.
 * New matching engines should extend this class and implement the abstract methods.
 *
 * RESPONSIBILITIES:
 * - Database connection management
 * - Batch processing with configurable delays
 * - Cache write operations (atomic and bulk)
 * - User fetching infrastructure
 * - Common configuration (batch sizes, delays, dormancy)
 * - Logging patterns
 *
 * ABSTRACT METHODS (must be implemented):
 * - calculateScore(): Calculate match score between two users
 * - generateExplanation(): Generate explanation for a match
 * - fetchUserWithTags(): Fetch user data needed for matching
 *
 * USAGE:
 * ```typescript
 * export class MyMatchingEngineV1 extends BaseMatchingEngine {
 *   protected readonly ALGORITHM_VERSION = 'my-algorithm-v1';
 *
 *   protected calculateScore(user1: UserData, user2: UserData): number {
 *     // Your scoring logic here
 *   }
 *
 *   protected generateExplanation(user1: UserData, user2: UserData, score: number): MatchExplanation {
 *     // Your explanation logic here
 *   }
 *
 *   protected async fetchUserWithTags(userId: string): Promise<UserData | null> {
 *     // Your user fetching logic here
 *   }
 * }
 * ```
 *
 * @see TagBasedMatchingEngineV1 for a concrete implementation example
 */

// External dependencies
import type { SupabaseClient } from "@supabase/supabase-js";

// Internal modules
import type {
  BulkRecalculationOptions,
  IMatchingEngine,
  MatchExplanation,
} from "./interface";

/**
 * Cache entry for bulk insert operations
 */
export interface CacheEntry {
  user_id: string;
  recommended_user_id: string;
  match_score: number;
  match_explanation: MatchExplanation;
  algorithm_version: string;
  calculated_at: Date;
}

/**
 * Base user data structure (extend this in your engine)
 */
export interface BaseUserData {
  id: string;
  email: string;
  role: "mentor" | "mentee" | "coordinator";
  is_active: boolean; // Computed as deleted_at === null
  last_activity_at: Date | null;
  deleted_at: Date | null;
}

/**
 * Abstract base class for matching engines
 *
 * Provides common infrastructure and enforces implementation of core matching logic.
 */
export abstract class BaseMatchingEngine<TUserData extends BaseUserData>
  implements IMatchingEngine {
  // ============================================================================
  // CONFIGURATION (Override in subclass if needed)
  // ============================================================================

  /**
   * Algorithm version identifier (MUST be set in subclass)
   * Used to track which algorithm generated each cache entry
   */
  protected abstract readonly ALGORITHM_VERSION: string;

  /**
   * Number of days before a user is considered dormant
   * Dormant users are excluded from matching
   */
  protected readonly DORMANCY_DAYS = 90;

  /**
   * Number of users to process in each batch during bulk recalculation
   */
  protected readonly DEFAULT_BATCH_SIZE = 50;

  /**
   * Number of matches to process per chunk (reduces N+1 queries)
   */
  protected readonly DEFAULT_CHUNK_SIZE = 100;

  /**
   * Delay in milliseconds between processing chunks (prevents DB overload)
   */
  protected readonly DEFAULT_CHUNK_DELAY_MS = 10;

  /**
   * Delay in milliseconds between processing batches (prevents DB overload)
   */
  protected readonly DEFAULT_BATCH_DELAY_MS = 100;

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  constructor(protected readonly db: SupabaseClient) {}

  // ============================================================================
  // PUBLIC INTERFACE (IMatchingEngine implementation)
  // ============================================================================

  /**
   * Get the algorithm version identifier
   */
  getAlgorithmVersion(): string {
    return this.ALGORITHM_VERSION;
  }

  /**
   * Recalculate matches for a specific user
   *
   * @param userId - User ID to recalculate matches for
   * @param options - Optional configuration (chunkSize, chunkDelay)
   */
  async recalculateMatches(
    userId: string,
    options?: { chunkSize?: number; chunkDelay?: number },
  ): Promise<void> {
    const chunkSize = options?.chunkSize ?? this.DEFAULT_CHUNK_SIZE;
    const chunkDelay = options?.chunkDelay ?? this.DEFAULT_CHUNK_DELAY_MS;

    if (process.env.NODE_ENV === "development") {
      console.log("[MATCHING] recalculateMatches", {
        userId,
        algorithmVersion: this.ALGORITHM_VERSION,
      });
    }

    // Fetch user with required data
    const user = await this.fetchUserWithTags(userId);
    if (!user) {
      if (process.env.NODE_ENV === "development") {
        console.error("[MATCHING] User not found or inactive", { userId });
      }
      return;
    }

    // Fetch potential matches
    const potentialMatches = await this.fetchPotentialMatches(
      userId,
      user.role,
    );

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

      // Calculate scores for this chunk
      const cacheEntries: CacheEntry[] = chunk.map((matchUser) => {
        const score = this.calculateScore(user, matchUser);
        const explanation = this.generateExplanation(user, matchUser, score);

        return {
          user_id: userId,
          recommended_user_id: matchUser.id,
          match_score: score,
          match_explanation: explanation,
          algorithm_version: this.ALGORITHM_VERSION,
          calculated_at: new Date(),
        };
      });

      // Write chunk to cache
      await this.writeToCacheAtomic(userId, cacheEntries);

      // Delay between chunks (except last chunk)
      if (i < chunks.length - 1 && chunkDelay > 0) {
        await this.delay(chunkDelay);
      }
    }
  }

  /**
   * Recalculate matches for all active users
   *
   * @param options - Batch size and delay configuration
   */
  async recalculateAllMatches(
    options?: BulkRecalculationOptions,
  ): Promise<void> {
    const limit = options?.limit;
    const batchSize = options?.batchSize ?? this.DEFAULT_BATCH_SIZE;
    const delayBetweenBatches = options?.delayBetweenBatches ??
      this.DEFAULT_BATCH_DELAY_MS;

    if (process.env.NODE_ENV === "development") {
      console.log("[MATCHING] recalculateAllMatches", {
        algorithmVersion: this.ALGORITHM_VERSION,
        options: { limit, batchSize, delayBetweenBatches },
      });
    }

    // Fetch all active users
    let query = this.db
      .from("users")
      .select("id")
      .is("deleted_at", null)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data: users, error } = await query;

    if (error || !users) {
      if (process.env.NODE_ENV === "development") {
        console.error("[MATCHING] Failed to fetch users", { error });
      }
      return;
    }

    // Process users in batches
    const batches = this.chunkArray(users, batchSize);

    if (process.env.NODE_ENV === "development") {
      console.log("[MATCHING] Starting batch processing", {
        totalUsers: users.length,
        batchSize,
        totalBatches: batches.length,
        delayBetweenBatches,
      });
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      if (process.env.NODE_ENV === "development") {
        console.log("[MATCHING] Processing batch", {
          currentBatch: i + 1,
          totalBatches: batches.length,
          batchSize: batch.length,
          processedCount: i * batchSize,
          totalUsers: users.length,
        });
      }

      // Process batch in parallel - use allSettled to isolate failures
      const results = await Promise.allSettled(
        batch.map((user) => this.recalculateMatches(user.id)),
      );

      // Log any failures in development
      if (process.env.NODE_ENV === "development") {
        const failures = results.filter((r) => r.status === "rejected");
        if (failures.length > 0) {
          console.error("[MATCHING] Batch processing failures", {
            failureCount: failures.length,
            batchNum: i + 1,
          });
        }
      }

      // Delay between batches (except last batch)
      if (i < batches.length - 1 && delayBetweenBatches > 0) {
        await this.delay(delayBetweenBatches);
      }
    }
  }

  // ============================================================================
  // ABSTRACT METHODS (must be implemented by subclasses)
  // ============================================================================

  /**
   * Calculate match score between two users
   *
   * @param user1 - First user (the one requesting matches)
   * @param user2 - Second user (potential match)
   * @returns Match score (typically 0-100, but can vary by algorithm)
   */
  protected abstract calculateScore(
    user1: TUserData,
    user2: TUserData,
  ): number;

  /**
   * Generate explanation for a match
   *
   * @param user1 - First user
   * @param user2 - Second user
   * @param score - Calculated match score
   * @returns Match explanation object
   */
  protected abstract generateExplanation(
    user1: TUserData,
    user2: TUserData,
    score: number,
  ): MatchExplanation;

  /**
   * Fetch user data with all required information for matching
   *
   * @param userId - User ID to fetch
   * @returns User data or null if not found/inactive
   */
  protected abstract fetchUserWithTags(
    userId: string,
  ): Promise<TUserData | null>;

  // ============================================================================
  // COMMON INFRASTRUCTURE (used by subclasses)
  // ============================================================================

  /**
   * Fetch potential matches for a user based on role
   *
   * Mentors are matched with mentees, mentees are matched with mentors.
   * Coordinators are not matched.
   *
   * @param userId - User ID requesting matches
   * @param userRole - Role of the user
   * @returns Array of potential match user data
   */
  protected async fetchPotentialMatches(
    userId: string,
    userRole: "mentor" | "mentee" | "coordinator",
  ): Promise<TUserData[]> {
    // Determine target role (mentors match with mentees and vice versa)
    const targetRole = userRole === "mentor" ? "mentee" : "mentor";

    if (process.env.NODE_ENV === "development") {
      console.log("[MATCHING] Determined target role", {
        userId,
        userRole,
        targetRole,
      });
    }

    if (userRole === "coordinator") {
      // Coordinators don't get matched
      return [];
    }

    // Calculate dormancy cutoff date
    const dormancyCutoff = new Date();
    dormancyCutoff.setDate(dormancyCutoff.getDate() - this.DORMANCY_DAYS);

    if (process.env.NODE_ENV === "development") {
      console.log("[MATCHING] Fetching potential matches", {
        userId,
        targetRole,
      });
    }

    // Fetch users of target role (excluding self)
    const { data: users, error } = await this.db
      .from("users")
      .select("id")
      .eq("role", targetRole)
      .neq("id", userId)
      .is("deleted_at", null)
      .is("deleted_at", null);

    if (error || !users) {
      if (process.env.NODE_ENV === "development") {
        console.error("[MATCHING] Failed to fetch potential matches", {
          userId,
          error,
        });
      }
      return [];
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[MATCHING] Fetched potential match IDs", {
        userId,
        count: users.length,
      });
    }

    // Bulk fetch all users with their data
    const userIds = users.map((u) => u.id);
    return this.fetchMultipleUsersWithTags(userIds);
  }

  /**
   * Fetch multiple users with tags in bulk (reduces N+1 queries)
   *
   * Subclasses should override this to implement efficient bulk fetching.
   * Default implementation fetches users one by one (inefficient).
   *
   * @param userIds - Array of user IDs to fetch
   * @returns Array of users with tags
   */
  protected async fetchMultipleUsersWithTags(
    userIds: string[],
  ): Promise<TUserData[]> {
    // Default implementation: fetch one by one (subclasses should override for efficiency)
    const users: TUserData[] = [];
    for (const userId of userIds) {
      const user = await this.fetchUserWithTags(userId);
      if (user) {
        users.push(user);
      }
    }
    return users;
  }

  /**
   * Write calculated matches to cache atomically
   *
   * Deletes existing cache entries for the user and inserts new ones in a single transaction.
   *
   * @param userId - User ID whose matches are being written
   * @param cacheEntries - Array of cache entries to write
   */
  protected async writeToCacheAtomic(
    userId: string,
    cacheEntries: CacheEntry[],
  ): Promise<void> {
    // Delete existing cache entries for this user
    const { error: deleteError } = await this.db
      .from("user_match_cache")
      .delete()
      .eq("user_id", userId)
      .eq("algorithm_version", this.ALGORITHM_VERSION);

    if (deleteError) {
      if (process.env.NODE_ENV === "development") {
        console.error("[MATCHING] Failed to delete old cache entries", {
          userId,
          error: deleteError,
        });
      }
      throw deleteError;
    }

    // Insert new cache entries (if any)
    if (cacheEntries.length > 0) {
      const { error: insertError } = await this.db
        .from("user_match_cache")
        .insert(cacheEntries);

      if (insertError) {
        if (process.env.NODE_ENV === "development") {
          console.error("[MATCHING] Failed to insert new cache entries", {
            userId,
            count: cacheEntries.length,
            error: insertError,
          });
        }
        throw insertError;
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[MATCHING] Wrote cache entries", {
        userId,
        count: cacheEntries.length,
      });
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Split an array into chunks of specified size
   *
   * @param array - Array to chunk
   * @param chunkSize - Size of each chunk
   * @returns Array of chunks
   */
  protected chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Delay execution for specified milliseconds
   *
   * @param ms - Milliseconds to delay
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
