/**
 * Tier Utility Functions
 *
 * Frontend-specific utilities for working with reputation tiers,
 * including match score bucketing and UI-related calculations.
 */

import { getTierDifference } from '@shared/constants/tiers';

// Re-export shared function for convenience
export { getTierDifference };

export type MatchScoreBucket = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';

/**
 * Match score bucket labels for UI display
 */
export const MATCH_SCORE_BUCKET_LABELS: Record<MatchScoreBucket, string> = {
  excellent: 'Excellent (80-100)',
  good: 'Good (60-79)',
  fair: 'Fair (40-59)',
  poor: 'Poor (0-39)',
  unknown: 'Unknown',
};

/**
 * All available match score buckets
 */
export const ALL_MATCH_SCORE_BUCKETS: MatchScoreBucket[] = [
  'excellent',
  'good',
  'fair',
  'poor',
  'unknown',
];

/**
 * Determines the match score bucket for a given score
 *
 * @param score - Match score from 0-100, or null/undefined for unknown
 * @returns The match score bucket classification
 *
 * @example
 * ```typescript
 * getMatchScoreBucket(85) // returns 'excellent'
 * getMatchScoreBucket(45) // returns 'fair'
 * getMatchScoreBucket(null) // returns 'unknown'
 * ```
 */
export function getMatchScoreBucket(score: number | null | undefined): MatchScoreBucket {
  if (score === null || score === undefined) return 'unknown';
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}
