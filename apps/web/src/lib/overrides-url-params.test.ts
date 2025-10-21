/**
 * Overrides URL Parameters Utility Tests
 *
 * Tests URL parsing and building for tier override request filters and sorting.
 */

import { describe, it, expect } from 'vitest';
import {
  parseOverridesFiltersFromURL,
  parseOverridesSortFromURL,
  buildOverridesURLParams,
} from './overrides-url-params';
import { DEFAULT_FILTERS } from '@/components/coordinator/OverridesFilterPanel';

describe('overrides-url-params', () => {
  describe('parseOverridesFiltersFromURL', () => {
    it('should return default filters when no params provided', () => {
      const params = new URLSearchParams();
      const result = parseOverridesFiltersFromURL(params);

      expect(result).toEqual(DEFAULT_FILTERS);
    });

    it('should parse mentor tiers from URL', () => {
      const params = new URLSearchParams('?mentorTiers=platinum,gold');
      const result = parseOverridesFiltersFromURL(params);

      expect(result.mentorTiers).toEqual(['platinum', 'gold']);
    });

    it('should parse mentee tiers from URL', () => {
      const params = new URLSearchParams('?menteeTiers=bronze,silver');
      const result = parseOverridesFiltersFromURL(params);

      expect(result.menteeTiers).toEqual(['bronze', 'silver']);
    });

    it('should parse tier differences from URL', () => {
      const params = new URLSearchParams('?tierDiffs=2,3');
      const result = parseOverridesFiltersFromURL(params);

      expect(result.tierDifferences).toEqual([2, 3]);
    });

    it('should parse match score buckets from URL', () => {
      const params = new URLSearchParams('?matchScores=excellent,good');
      const result = parseOverridesFiltersFromURL(params);

      expect(result.matchScoreBuckets).toEqual(['excellent', 'good']);
    });

    it('should parse all filters combined', () => {
      const params = new URLSearchParams(
        '?mentorTiers=platinum&menteeTiers=bronze&tierDiffs=3&matchScores=excellent'
      );
      const result = parseOverridesFiltersFromURL(params);

      expect(result).toEqual({
        mentorTiers: ['platinum'],
        menteeTiers: ['bronze'],
        tierDifferences: [3],
        matchScoreBuckets: ['excellent'],
      });
    });

    it('should filter out invalid tier differences', () => {
      const params = new URLSearchParams('?tierDiffs=2,invalid,3');
      const result = parseOverridesFiltersFromURL(params);

      expect(result.tierDifferences).toEqual([2, 3]);
    });

    it('should use defaults for empty filter values', () => {
      const params = new URLSearchParams('?mentorTiers=&menteeTiers=');
      const result = parseOverridesFiltersFromURL(params);

      expect(result.mentorTiers).toEqual(DEFAULT_FILTERS.mentorTiers);
      expect(result.menteeTiers).toEqual(DEFAULT_FILTERS.menteeTiers);
    });
  });

  describe('parseOverridesSortFromURL', () => {
    it('should return default sort when no param provided', () => {
      const params = new URLSearchParams();
      const result = parseOverridesSortFromURL(params);

      expect(result).toBe('time_pending_asc');
    });

    it('should parse valid sort option', () => {
      const params = new URLSearchParams('?sort=match_score_desc');
      const result = parseOverridesSortFromURL(params);

      expect(result).toBe('match_score_desc');
    });

    it('should return default for invalid sort option', () => {
      const params = new URLSearchParams('?sort=invalid_sort');
      const result = parseOverridesSortFromURL(params);

      expect(result).toBe('time_pending_asc');
    });

    it('should parse all valid sort options', () => {
      const validSorts = [
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

      validSorts.forEach(sort => {
        const params = new URLSearchParams(`?sort=${sort}`);
        const result = parseOverridesSortFromURL(params);
        expect(result).toBe(sort);
      });
    });
  });

  describe('buildOverridesURLParams', () => {
    it('should build empty params for default values', () => {
      const params = buildOverridesURLParams('time_pending_asc', DEFAULT_FILTERS);

      expect(params.toString()).toBe('');
    });

    it('should include sort param if not default', () => {
      const params = buildOverridesURLParams('match_score_desc', DEFAULT_FILTERS);

      expect(params.get('sort')).toBe('match_score_desc');
    });

    it('should include mentor tiers if not default', () => {
      const filters = {
        ...DEFAULT_FILTERS,
        mentorTiers: ['platinum'] as const,
      };
      const params = buildOverridesURLParams('time_pending_asc', filters);

      expect(params.get('mentorTiers')).toBe('platinum');
    });

    it('should include mentee tiers if not default', () => {
      const filters = {
        ...DEFAULT_FILTERS,
        menteeTiers: ['bronze', 'silver'] as const,
      };
      const params = buildOverridesURLParams('time_pending_asc', filters);

      expect(params.get('menteeTiers')).toBe('bronze,silver');
    });

    it('should include tier differences if not default', () => {
      const filters = {
        ...DEFAULT_FILTERS,
        tierDifferences: [4],
      };
      const params = buildOverridesURLParams('time_pending_asc', filters);

      expect(params.get('tierDiffs')).toBe('4');
    });

    it('should include match score buckets if not default', () => {
      const filters = {
        ...DEFAULT_FILTERS,
        matchScoreBuckets: ['excellent', 'good'] as const,
      };
      const params = buildOverridesURLParams('time_pending_asc', filters);

      expect(params.get('matchScores')).toBe('excellent,good');
    });

    it('should build complete params for all non-default values', () => {
      const filters = {
        mentorTiers: ['platinum'] as const,
        menteeTiers: ['bronze'] as const,
        tierDifferences: [3],
        matchScoreBuckets: ['excellent'] as const,
      };
      const params = buildOverridesURLParams('match_score_desc', filters);

      expect(params.get('sort')).toBe('match_score_desc');
      expect(params.get('mentorTiers')).toBe('platinum');
      expect(params.get('menteeTiers')).toBe('bronze');
      expect(params.get('tierDiffs')).toBe('3');
      expect(params.get('matchScores')).toBe('excellent');
    });
  });

  describe('round-trip consistency', () => {
    it('should parse and build back to equivalent params', () => {
      const original = new URLSearchParams(
        '?sort=match_score_desc&mentorTiers=platinum&menteeTiers=bronze&tierDiffs=3&matchScores=excellent'
      );

      const filters = parseOverridesFiltersFromURL(original);
      const sort = parseOverridesSortFromURL(original);
      const rebuilt = buildOverridesURLParams(sort, filters);

      expect(rebuilt.get('sort')).toBe(original.get('sort'));
      expect(rebuilt.get('mentorTiers')).toBe(original.get('mentorTiers'));
      expect(rebuilt.get('menteeTiers')).toBe(original.get('menteeTiers'));
      expect(rebuilt.get('tierDiffs')).toBe(original.get('tierDiffs'));
      expect(rebuilt.get('matchScores')).toBe(original.get('matchScores'));
    });
  });
});
