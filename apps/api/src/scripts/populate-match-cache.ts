/**
 * Populate Match Cache Script
 *
 * This script runs the initial cache population using the tag-based matching algorithm.
 * It calculates matches for all users and stores them in the user_match_cache table.
 *
 * Usage:
 * - Full population: npm run populate-match-cache
 * - Limited population (testing): npm run populate-match-cache -- --limit=10
 *
 * The script requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.
 */

// External dependencies
import { createClient } from '@supabase/supabase-js';

// Internal modules
import { TagBasedMatchingEngineV1 } from '../providers/matching/tag-based.engine';

/**
 * Populate match cache for all users
 *
 * This script runs the initial cache population using the tag-based matching algorithm.
 * Run manually via CLI: `npm run populate-match-cache`
 * For testing: `npm run populate-match-cache -- --limit=10`
 *
 * @param options - Optional limit for testing
 *
 * @logging
 * - [MATCHING] Starting cache population { limit }
 * - [MATCHING] Cache population completed { duration }
 * - [MATCHING] Cache population failed { error }
 */
const populateMatchCache = async (options?: { limit?: number }): Promise<void> => {
  const startTime = Date.now();

  if (process.env.NODE_ENV === 'development') {
    console.log('[MATCHING] Starting cache population', {
      limit: options?.limit || 'all users',
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const db = createClient(supabaseUrl, supabaseKey);

    // Initialize matching engine
    const engine = new TagBasedMatchingEngineV1(db);

    // Recalculate all matches
    await engine.recalculateAllMatches(options);

    const duration = Date.now() - startTime;

    if (process.env.NODE_ENV === 'development') {
      console.log('[MATCHING] Cache population completed', {
        duration: `${duration}ms`,
      });
    }

    process.exit(0);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[MATCHING] Cache population failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    process.exit(1);
  }
};

// Parse command-line arguments
const args = process.argv.slice(2);
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

// Run script
populateMatchCache({ limit });
