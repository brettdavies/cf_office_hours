/**
 * Overrides URL Parameters Utility
 *
 * Utilities for parsing and building URL search parameters for tier override request filtering and sorting.
 * Extracted from useOverridesState for reusability and testability.
 */

// Types
import type { SortOption } from '@/components/coordinator/OverridesSortingControl';
import type { Filters } from '@/components/coordinator/OverridesFilterPanel';
import { DEFAULT_FILTERS } from '@/components/coordinator/OverridesFilterPanel';

/**
 * Valid sort options for tier override requests
 */
const VALID_SORT_OPTIONS: SortOption[] = [
  'time_pending_asc',
  'time_pending_desc',
  'expiration_asc',
  'expiration_desc',
  'mentee_name_asc',
  'mentee_name_desc',
  'mentor_name_asc',
  'mentor_name_desc',
  'match_score_asc',
  'match_score_desc',
];

/**
 * Parse filters from URL search params
 *
 * @param searchParams - URLSearchParams object to parse
 * @returns Filters object with defaults applied for missing/invalid values
 *
 * @example
 * ```typescript
 * const params = new URLSearchParams('?mentorTiers=platinum&tierDiffs=3');
 * const filters = parseOverridesFiltersFromURL(params);
 * // { mentorTiers: ['platinum'], menteeTiers: [...], tierDifferences: [3], ... }
 * ```
 */
export function parseOverridesFiltersFromURL(searchParams: URLSearchParams): Filters {
  const mentorTiersStr = searchParams.get('mentorTiers');
  const menteeTiersStr = searchParams.get('menteeTiers');
  const tierDiffsStr = searchParams.get('tierDiffs');
  const matchScoresStr = searchParams.get('matchScores');

  const mentorTiers = mentorTiersStr?.split(',').filter(Boolean);
  const menteeTiers = menteeTiersStr?.split(',').filter(Boolean);
  const tierDifferences = tierDiffsStr
    ?.split(',')
    .map(Number)
    .filter(n => !isNaN(n));
  const matchScoreBuckets = matchScoresStr?.split(',').filter(Boolean);

  return {
    mentorTiers:
      mentorTiers && mentorTiers.length > 0
        ? (mentorTiers as Filters['mentorTiers'])
        : DEFAULT_FILTERS.mentorTiers,
    menteeTiers:
      menteeTiers && menteeTiers.length > 0
        ? (menteeTiers as Filters['menteeTiers'])
        : DEFAULT_FILTERS.menteeTiers,
    tierDifferences:
      tierDifferences && tierDifferences.length > 0
        ? tierDifferences
        : DEFAULT_FILTERS.tierDifferences,
    matchScoreBuckets:
      matchScoreBuckets && matchScoreBuckets.length > 0
        ? (matchScoreBuckets as Filters['matchScoreBuckets'])
        : DEFAULT_FILTERS.matchScoreBuckets,
  };
}

/**
 * Parse sort option from URL search params
 *
 * @param searchParams - URLSearchParams object to parse
 * @returns Valid SortOption, defaults to 'time_pending_asc' if invalid/missing
 *
 * @example
 * ```typescript
 * const params = new URLSearchParams('?sort=match_score_desc');
 * const sort = parseOverridesSortFromURL(params);
 * // 'match_score_desc'
 * ```
 */
export function parseOverridesSortFromURL(searchParams: URLSearchParams): SortOption {
  const sort = searchParams.get('sort') as SortOption | null;
  return sort && VALID_SORT_OPTIONS.includes(sort) ? sort : 'time_pending_asc';
}

/**
 * Build URL search params from filters and sort option
 *
 * Only includes params that differ from defaults to keep URLs clean.
 *
 * @param sortBy - Current sort option
 * @param filters - Current filter values
 * @returns URLSearchParams object ready to set
 *
 * @example
 * ```typescript
 * const params = buildOverridesURLParams('match_score_desc', filters);
 * setSearchParams(params, { replace: true });
 * ```
 */
export function buildOverridesURLParams(sortBy: SortOption, filters: Filters): URLSearchParams {
  const params = new URLSearchParams();

  // Add sort param only if not default
  if (sortBy !== 'time_pending_asc') {
    params.set('sort', sortBy);
  }

  // Add filter params only if they differ from defaults
  if (
    filters.mentorTiers.length !== 4 ||
    filters.mentorTiers.some(t => !DEFAULT_FILTERS.mentorTiers.includes(t))
  ) {
    params.set('mentorTiers', filters.mentorTiers.join(','));
  }

  if (
    filters.menteeTiers.length !== 4 ||
    filters.menteeTiers.some(t => !DEFAULT_FILTERS.menteeTiers.includes(t))
  ) {
    params.set('menteeTiers', filters.menteeTiers.join(','));
  }

  if (
    filters.tierDifferences.length !== 3 ||
    filters.tierDifferences.some(d => !DEFAULT_FILTERS.tierDifferences.includes(d))
  ) {
    params.set('tierDiffs', filters.tierDifferences.join(','));
  }

  if (
    filters.matchScoreBuckets.length !== 5 ||
    filters.matchScoreBuckets.some(b => !DEFAULT_FILTERS.matchScoreBuckets.includes(b))
  ) {
    params.set('matchScores', filters.matchScoreBuckets.join(','));
  }

  return params;
}
