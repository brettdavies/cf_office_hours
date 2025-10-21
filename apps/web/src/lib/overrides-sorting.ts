/**
 * Overrides Sorting Utility
 *
 * Pure function for sorting tier override requests based on sort option.
 * Extracted from useOverridesState for reusability and testability.
 */

// Types
import type { TierOverrideRequest } from '@/services/api/bookings';
import type { SortOption } from '@/components/coordinator/OverridesSortingControl';

/**
 * Sort tier override requests based on sort option
 *
 * Supports 10 sort options:
 * - Time pending (ascending/descending)
 * - Expiration time (ascending/descending)
 * - Mentee name (A-Z / Z-A)
 * - Mentor name (A-Z / Z-A)
 * - Match score (lowest/highest first, nulls to end)
 *
 * @param requests - Array of tier override requests to sort
 * @param sortBy - Sort option to apply
 * @returns Sorted array (new array, original not mutated)
 *
 * @example
 * ```typescript
 * const sorted = sortOverrideRequests(requests, 'match_score_desc');
 * // Returns requests sorted by match score, highest first
 * ```
 */
export function sortOverrideRequests(
  requests: TierOverrideRequest[],
  sortBy: SortOption
): TierOverrideRequest[] {
  const sorted = [...requests];

  const sortFns: Record<SortOption, (a: TierOverrideRequest, b: TierOverrideRequest) => number> =
    {
      time_pending_asc: (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      time_pending_desc: (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      expiration_asc: (a, b) =>
        new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime(),
      expiration_desc: (a, b) =>
        new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime(),
      mentee_name_asc: (a, b) => a.mentee.profile.name.localeCompare(b.mentee.profile.name),
      mentee_name_desc: (a, b) => b.mentee.profile.name.localeCompare(a.mentee.profile.name),
      mentor_name_asc: (a, b) => a.mentor.profile.name.localeCompare(b.mentor.profile.name),
      mentor_name_desc: (a, b) => b.mentor.profile.name.localeCompare(a.mentor.profile.name),
      match_score_asc: (a, b) => {
        // Nulls go to the end
        if (a.match_score === null || a.match_score === undefined) return 1;
        if (b.match_score === null || b.match_score === undefined) return -1;
        return a.match_score - b.match_score;
      },
      match_score_desc: (a, b) => {
        // Nulls go to the end
        if (a.match_score === null || a.match_score === undefined) return 1;
        if (b.match_score === null || b.match_score === undefined) return -1;
        return b.match_score - a.match_score;
      },
    };

  return sorted.sort(sortFns[sortBy]);
}
