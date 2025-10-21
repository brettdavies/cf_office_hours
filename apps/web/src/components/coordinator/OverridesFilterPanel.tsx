/**
 * Overrides Filter Panel Component
 *
 * Comprehensive filtering UI for tier override requests.
 * Supports filtering by mentor tier, mentee tier, tier difference, and match score buckets.
 * Extracted from CoordinatorOverridesPage for reusability and maintainability.
 */

// Internal modules
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ALL_TIERS, type ReputationTier } from '@shared/constants/tiers';
import { ALL_MATCH_SCORE_BUCKETS, MATCH_SCORE_BUCKET_LABELS, type MatchScoreBucket } from '@/lib/tier-utils';

export interface Filters {
  mentorTiers: ReputationTier[];
  menteeTiers: ReputationTier[];
  tierDifferences: number[];
  matchScoreBuckets: MatchScoreBucket[];
}

export const DEFAULT_FILTERS: Filters = {
  mentorTiers: ALL_TIERS,
  menteeTiers: ALL_TIERS,
  tierDifferences: [2, 3, 4],
  matchScoreBuckets: ALL_MATCH_SCORE_BUCKETS,
};

interface OverridesFilterPanelProps {
  /** Current filter values */
  filters: Filters;
  /** Callback when filters change */
  onFiltersChange: (filters: Filters) => void;
  /** Callback when Clear All Filters is clicked */
  onClearFilters: () => void;
  /** Whether the panel is visible */
  show: boolean;
}

/**
 * Filter panel for tier override requests.
 * Provides multi-select filters for mentor tier, mentee tier, tier difference, and match score.
 */
export function OverridesFilterPanel({
  filters,
  onFiltersChange,
  onClearFilters,
  show,
}: OverridesFilterPanelProps) {
  if (!show) {
    return null;
  }

  const handleMentorTierChange = (tier: ReputationTier, checked: boolean) => {
    onFiltersChange({
      ...filters,
      mentorTiers: checked
        ? [...filters.mentorTiers, tier]
        : filters.mentorTiers.filter(t => t !== tier),
    });
  };

  const handleMenteeTierChange = (tier: ReputationTier, checked: boolean) => {
    onFiltersChange({
      ...filters,
      menteeTiers: checked
        ? [...filters.menteeTiers, tier]
        : filters.menteeTiers.filter(t => t !== tier),
    });
  };

  const handleTierDifferenceChange = (diff: number, checked: boolean) => {
    onFiltersChange({
      ...filters,
      tierDifferences: checked
        ? [...filters.tierDifferences, diff]
        : filters.tierDifferences.filter(d => d !== diff),
    });
  };

  const handleMatchScoreBucketChange = (bucket: MatchScoreBucket, checked: boolean) => {
    onFiltersChange({
      ...filters,
      matchScoreBuckets: checked
        ? [...filters.matchScoreBuckets, bucket]
        : filters.matchScoreBuckets.filter(b => b !== bucket),
    });
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mentor Tier Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Mentor Tier</label>
          <div className="flex flex-wrap gap-3">
            {ALL_TIERS.map(tier => (
              <label key={tier} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.mentorTiers.includes(tier)}
                  onChange={e => handleMentorTierChange(tier, e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm capitalize">{tier}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Mentee Tier Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Mentee Tier</label>
          <div className="flex flex-wrap gap-3">
            {ALL_TIERS.map(tier => (
              <label key={tier} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.menteeTiers.includes(tier)}
                  onChange={e => handleMenteeTierChange(tier, e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm capitalize">{tier}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Tier Difference Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Tier Difference</label>
          <div className="flex flex-wrap gap-3">
            {[2, 3, 4].map(diff => (
              <label key={diff} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.tierDifferences.includes(diff)}
                  onChange={e => handleTierDifferenceChange(diff, e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">{diff} tiers</span>
              </label>
            ))}
          </div>
        </div>

        {/* Match Score Bucket Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Match Score</label>
          <div className="flex flex-wrap gap-3">
            {ALL_MATCH_SCORE_BUCKETS.map(bucket => (
              <label key={bucket} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.matchScoreBuckets.includes(bucket)}
                  onChange={e => handleMatchScoreBucketChange(bucket, e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">{MATCH_SCORE_BUCKET_LABELS[bucket]}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Clear Filters Button */}
        <div className="pt-2">
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Clear All Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
