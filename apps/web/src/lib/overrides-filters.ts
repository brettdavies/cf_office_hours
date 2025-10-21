/**
 * Overrides Filtering Utility
 *
 * Pure function for filtering tier override requests based on filter criteria.
 * Extracted from useOverridesState for reusability and testability.
 */

// Internal modules
import { getTierDifference, getMatchScoreBucket } from '@/lib/tier-utils';

// Types
import type { TierOverrideRequest } from '@/services/api/bookings';
import type { Filters } from '@/components/coordinator/OverridesFilterPanel';

/**
 * Filter tier override requests based on filter criteria
 *
 * Applies all filter criteria:
 * - Mentor tier (must be in allowed list)
 * - Mentee tier (must be in allowed list)
 * - Tier difference (calculated mentor tier value - mentee tier value)
 * - Match score bucket (excellent, good, fair, poor, unknown)
 *
 * @param requests - Array of tier override requests to filter
 * @param filters - Filter criteria to apply
 * @returns Filtered array of requests
 *
 * @example
 * ```typescript
 * const filtered = filterOverrideRequests(requests, {
 *   mentorTiers: ['platinum'],
 *   menteeTiers: ['bronze', 'silver'],
 *   tierDifferences: [3, 4],
 *   matchScoreBuckets: ['excellent', 'good']
 * });
 * ```
 */
export function filterOverrideRequests(
  requests: TierOverrideRequest[],
  filters: Filters
): TierOverrideRequest[] {
  return requests.filter(request => {
    const mentorTier = request.mentor.reputation_tier;
    const menteeTier = request.mentee.reputation_tier;

    // Skip if either tier is missing
    if (!mentorTier || !menteeTier) return false;

    // Mentor tier filter
    if (!filters.mentorTiers.includes(mentorTier)) return false;

    // Mentee tier filter
    if (!filters.menteeTiers.includes(menteeTier)) return false;

    // Tier difference filter
    const diff = getTierDifference(mentorTier, menteeTier);
    if (!filters.tierDifferences.includes(diff)) return false;

    // Match score bucket filter
    const bucket = getMatchScoreBucket(request.match_score);
    if (!filters.matchScoreBuckets.includes(bucket)) return false;

    return true;
  });
}
