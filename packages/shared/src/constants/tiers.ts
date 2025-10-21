/**
 * Shared Tier Constants
 *
 * Single source of truth for reputation tier definitions, values, and labels.
 * Used across both backend and frontend to ensure consistency.
 */

export type ReputationTier = 'bronze' | 'silver' | 'gold' | 'platinum';

/**
 * Numeric values for tier comparison and calculations
 */
export const TIER_VALUES: Record<ReputationTier, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 4,
};

/**
 * Human-readable labels for tiers
 */
export const TIER_LABELS: Record<ReputationTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

/**
 * All available tiers in ascending order
 */
export const ALL_TIERS: ReputationTier[] = ['bronze', 'silver', 'gold', 'platinum'];

/**
 * Calculates the numeric difference between two tiers
 *
 * @param mentorTier - The mentor's reputation tier
 * @param menteeTier - The mentee's reputation tier
 * @returns Number of tiers difference (e.g., platinum - bronze = 3)
 *
 * @example
 * ```typescript
 * getTierDifference('platinum', 'bronze') // returns 3
 * getTierDifference('gold', 'silver') // returns 1
 * ```
 */
export function getTierDifference(mentorTier: ReputationTier, menteeTier: ReputationTier): number {
  return TIER_VALUES[mentorTier] - TIER_VALUES[menteeTier];
}
