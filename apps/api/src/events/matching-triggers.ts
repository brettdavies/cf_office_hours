/**
 * Matching Event Triggers
 *
 * Event-driven handlers that trigger match recalculation when underlying data changes.
 * These handlers implement the fire-and-forget pattern to keep the match cache fresh
 * without blocking API responses.
 *
 * Architecture:
 * - Handlers are triggered by API endpoints (profile updates, tag changes, etc.)
 * - Errors are logged but do not throw (non-blocking operations)
 * - All operations use TagBasedMatchingEngineV1 for recalculation
 * - Logging is dev-only (NODE_ENV === 'development')
 */

// External dependencies
import type { SupabaseClient } from "@supabase/supabase-js";

// Internal modules
import { TagBasedMatchingEngineV1 } from "../providers/matching/tag-based.engine";

/**
 * Reusable logging utilities for matching operations
 */
const createLogger = (module: string) => ({
  info: (operation: string, context: Record<string, any>) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[${module}] ${operation}`, context);
    }
  },
  error: (operation: string, context: Record<string, any>) => {
    if (process.env.NODE_ENV === "development") {
      console.error(`[${module}] ${operation}`, context);
    }
  },
});

/**
 * Reusable error handling wrapper for non-blocking operations
 */
const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  operation: string,
  contextExtractor: (...args: T) => Record<string, any>,
  logger: ReturnType<typeof createLogger>,
) => {
  return async (...args: T): Promise<R | void> => {
    try {
      return await fn(...args);
    } catch (error) {
      logger.error(`${operation} failed`, {
        ...contextExtractor(...args),
        error: error instanceof Error ? error.message : String(error),
      });
      // Non-blocking - don't throw
    }
  };
};

/**
 * Engine factory for consistent engine creation and usage
 */
const createMatchEngine = (db: SupabaseClient) =>
  new TagBasedMatchingEngineV1(db);

/**
 * Recalculate matches for a single user
 */
const recalculateUserMatches = async (
  userId: string,
  db: SupabaseClient,
): Promise<void> => {
  const engine = createMatchEngine(db);
  await engine.recalculateMatches(userId);
};

/**
 * Recalculate matches for multiple users
 */
const recalculateMultipleUserMatches = async (
  userIds: string[],
  db: SupabaseClient,
): Promise<number> => {
  const engine = createMatchEngine(db);
  let processed = 0;

  for (const userId of userIds) {
    try {
      await engine.recalculateMatches(userId);
      processed++;
    } catch (error) {
      // Log individual failures but continue processing
      if (process.env.NODE_ENV === "development") {
        console.error("[MATCHING] Mentee recalculation failed", {
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return processed;
};

/**
 * Handle user profile update event
 *
 * Triggers match recalculation when user profile changes (name, bio, title, company).
 * This is a fire-and-forget operation - errors are logged but not thrown.
 *
 * @param userId - User ID whose profile was updated
 * @param db - Supabase client instance
 *
 * @logging
 * - [MATCHING] handleUserProfileUpdate { userId }
 * - [MATCHING] Profile update triggered recalculation { userId }
 * - [MATCHING] Profile update recalculation failed { userId, error }
 */
export const handleUserProfileUpdate = withErrorHandling(
  async (userId: string, db: SupabaseClient) => {
    const logger = createLogger("MATCHING");
    logger.info("handleUserProfileUpdate", { userId });

    await recalculateUserMatches(userId, db);

    logger.info("Profile update triggered recalculation", { userId });
  },
  "Profile update recalculation",
  (userId) => ({ userId }),
  createLogger("MATCHING"),
);

/**
 * Handle user tags change event
 *
 * Triggers match recalculation when user tags are added/removed.
 * This is a fire-and-forget operation - errors are logged but not thrown.
 *
 * @param userId - User ID whose tags were changed
 * @param db - Supabase client instance
 *
 * @logging
 * - [MATCHING] handleUserTagsChange { userId }
 * - [MATCHING] Tag change triggered recalculation { userId }
 * - [MATCHING] Tag change recalculation failed { userId, error }
 */
export const handleUserTagsChange = withErrorHandling(
  async (userId: string, db: SupabaseClient) => {
    const logger = createLogger("MATCHING");
    logger.info("handleUserTagsChange", { userId });

    await recalculateUserMatches(userId, db);

    logger.info("Tag change triggered recalculation", { userId });
  },
  "Tag change recalculation",
  (userId) => ({ userId }),
  createLogger("MATCHING"),
);

/**
 * Handle portfolio company tags change event
 *
 * Triggers match recalculation for all mentees linked to the portfolio company.
 * Mentees inherit company tags, so company tag changes affect their match scores.
 * This is a fire-and-forget operation - errors are logged but not thrown.
 *
 * @param companyId - Portfolio company ID whose tags were changed
 * @param db - Supabase client instance
 *
 * @logging
 * - [MATCHING] handlePortfolioCompanyTagsChange { companyId }
 * - [MATCHING] Found linked mentees { companyId, menteeCount }
 * - [MATCHING] No linked mentees found { companyId }
 * - [MATCHING] Company tag change triggered recalculation { companyId, menteesProcessed, totalMentees }
 * - [MATCHING] Company tag change recalculation failed { companyId, error }
 */
export const handlePortfolioCompanyTagsChange = withErrorHandling(
  async (companyId: string, db: SupabaseClient) => {
    const logger = createLogger("MATCHING");
    logger.info("handlePortfolioCompanyTagsChange", { companyId });

    // Fetch all mentees linked to this portfolio company
    const { data: mentees, error } = await db
      .from("user_profiles")
      .select("user_id")
      .eq("portfolio_company_id", companyId)
      .is("deleted_at", null);

    if (error) {
      throw new Error(`Failed to fetch linked mentees: ${error.message}`);
    }

    if (!mentees || mentees.length === 0) {
      logger.info("No linked mentees found", { companyId });
      return;
    }

    logger.info("Found linked mentees", {
      companyId,
      menteeCount: mentees.length,
    });

    // Recalculate matches for each mentee
    const processed = await recalculateMultipleUserMatches(
      mentees.map((m) => m.user_id),
      db,
    );

    logger.info("Company tag change triggered recalculation", {
      companyId,
      menteesProcessed: processed,
      totalMentees: mentees.length,
    });
  },
  "Company tag change recalculation",
  (companyId) => ({ companyId }),
  createLogger("MATCHING"),
);

/**
 * Handle user reputation tier change event
 *
 * Triggers match recalculation when user reputation tier changes.
 * This is a fire-and-forget operation - errors are logged but not thrown.
 *
 * @param userId - User ID whose reputation tier was changed
 * @param db - Supabase client instance
 *
 * @logging
 * - [MATCHING] handleReputationTierChange { userId }
 * - [MATCHING] Reputation change triggered recalculation { userId }
 * - [MATCHING] Reputation change recalculation failed { userId, error }
 */
export const handleReputationTierChange = withErrorHandling(
  async (userId: string, db: SupabaseClient) => {
    const logger = createLogger("MATCHING");
    logger.info("handleReputationTierChange", { userId });

    await recalculateUserMatches(userId, db);

    logger.info("Reputation change triggered recalculation", { userId });
  },
  "Reputation change recalculation",
  (userId) => ({ userId }),
  createLogger("MATCHING"),
);
