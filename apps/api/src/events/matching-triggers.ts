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
import type { SupabaseClient } from '@supabase/supabase-js';

// Internal modules
import { TagBasedMatchingEngineV1 } from '../providers/matching/tag-based.engine';

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
export const handleUserProfileUpdate = async (
  userId: string,
  db: SupabaseClient
): Promise<void> => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[MATCHING] handleUserProfileUpdate', { userId });
  }

  try {
    const engine = new TagBasedMatchingEngineV1(db);
    await engine.recalculateMatches(userId);

    if (process.env.NODE_ENV === 'development') {
      console.log('[MATCHING] Profile update triggered recalculation', { userId });
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[MATCHING] Profile update recalculation failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    // Do not throw - this is a non-blocking operation
  }
};

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
export const handleUserTagsChange = async (
  userId: string,
  db: SupabaseClient
): Promise<void> => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[MATCHING] handleUserTagsChange', { userId });
  }

  try {
    const engine = new TagBasedMatchingEngineV1(db);
    await engine.recalculateMatches(userId);

    if (process.env.NODE_ENV === 'development') {
      console.log('[MATCHING] Tag change triggered recalculation', { userId });
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[MATCHING] Tag change recalculation failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    // Do not throw - this is a non-blocking operation
  }
};

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
 * - [MATCHING] Mentee recalculation failed { userId, error }
 * - [MATCHING] Company tag change triggered recalculation { companyId, menteesProcessed, totalMentees }
 * - [MATCHING] Company tag change recalculation failed { companyId, error }
 */
export const handlePortfolioCompanyTagsChange = async (
  companyId: string,
  db: SupabaseClient
): Promise<void> => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[MATCHING] handlePortfolioCompanyTagsChange', { companyId });
  }

  try {
    // Fetch all mentees linked to this portfolio company
    const { data: mentees, error } = await db
      .from('user_profiles')
      .select('user_id')
      .eq('portfolio_company_id', companyId)
      .is('deleted_at', null);

    if (error) {
      throw new Error(`Failed to fetch linked mentees: ${error.message}`);
    }

    if (!mentees || mentees.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[MATCHING] No linked mentees found', { companyId });
      }
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[MATCHING] Found linked mentees', {
        companyId,
        menteeCount: mentees.length,
      });
    }

    // Recalculate matches for each mentee
    const engine = new TagBasedMatchingEngineV1(db);
    let processed = 0;

    for (const mentee of mentees) {
      try {
        await engine.recalculateMatches(mentee.user_id);
        processed++;
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[MATCHING] Mentee recalculation failed', {
            userId: mentee.user_id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
        // Continue processing remaining mentees
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[MATCHING] Company tag change triggered recalculation', {
        companyId,
        menteesProcessed: processed,
        totalMentees: mentees.length,
      });
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[MATCHING] Company tag change recalculation failed', {
        companyId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    // Do not throw - this is a non-blocking operation
  }
};

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
export const handleReputationTierChange = async (
  userId: string,
  db: SupabaseClient
): Promise<void> => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[MATCHING] handleReputationTierChange', { userId });
  }

  try {
    const engine = new TagBasedMatchingEngineV1(db);
    await engine.recalculateMatches(userId);

    if (process.env.NODE_ENV === 'development') {
      console.log('[MATCHING] Reputation change triggered recalculation', { userId });
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[MATCHING] Reputation change recalculation failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    // Do not throw - this is a non-blocking operation
  }
};
