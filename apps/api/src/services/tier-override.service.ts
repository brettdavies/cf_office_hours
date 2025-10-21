/**
 * Tier Override Service - Business logic layer for tier override request operations.
 *
 * Responsibilities:
 * - Business logic and orchestration
 * - Call repository methods
 * - Filter expired requests
 * - Validate coordinator permissions
 * - NO HTTP concerns (no access to request/response)
 */

// Internal modules
import { TierOverrideRepository } from '../repositories/tier-override.repository';
import { AppError } from '../lib/errors';
import type { TierOverrideRequestWithUsers } from '../repositories/tier-override.repository';

// Types
import type { Env } from '../types/bindings';

export class TierOverrideService {
  private tierOverrideRepo: TierOverrideRepository;

  constructor(env: Env) {
    this.tierOverrideRepo = new TierOverrideRepository(env);
  }

  /**
   * Gets all pending tier override requests for coordinator dashboard.
   *
   * Filters out expired requests (expires_at < NOW()).
   * Includes enriched user profiles and match scores.
   *
   * @returns Array of active pending override requests
   * @throws {AppError} When fetching requests fails
   */
  async getPendingRequests(): Promise<TierOverrideRequestWithUsers[]> {
    console.log('[TIER_OVERRIDE_SERVICE] Fetching pending override requests');

    try {
      const requests = await this.tierOverrideRepo.getPendingWithUsers();

      // Filter out expired requests
      const now = new Date();
      const active = requests.filter((request) => {
        const expiresAt = new Date(request.expires_at);
        return expiresAt > now;
      });

      console.log(
        `[TIER_OVERRIDE_SERVICE] Found ${active.length} active requests (${requests.length - active.length} expired)`,
      );

      return active;
    } catch (error) {
      console.error('[TIER_OVERRIDE_SERVICE] Failed to fetch pending requests:', error);

      // Wrap in AppError for consistent error handling
      throw new AppError(
        500,
        'Failed to fetch tier override requests',
        'TIER_OVERRIDE_FETCH_FAILED',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }
}
