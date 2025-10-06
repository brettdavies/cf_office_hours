/**
 * Reputation Badge Component
 *
 * Displays user's reputation tier with optional score.
 * Uses shadcn Badge component with custom tier colors.
 */

// External dependencies
import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Types
interface ReputationBadgeProps {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  score?: number;
  showScore?: boolean;
}

const tierColors = {
  bronze: 'bg-orange-100 text-orange-800 border-orange-200',
  silver: 'bg-gray-100 text-gray-800 border-gray-200',
  gold: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  platinum: 'bg-purple-100 text-purple-800 border-purple-200',
};

const tierLabels = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

/**
 * ReputationBadge displays user's reputation tier as a colored badge.
 *
 * @param tier - Reputation tier (bronze, silver, gold, platinum)
 * @param score - Numerical score to display (optional)
 * @param showScore - Whether to show the numerical score (default: true)
 */
export function ReputationBadge({
  tier,
  score,
  showScore = true,
}: ReputationBadgeProps) {
  return (
    <Badge className={cn('gap-1', tierColors[tier])}>
      <Star size={12} fill="currentColor" />
      {tierLabels[tier]}
      {showScore && score !== undefined && <span>({score.toFixed(1)})</span>}
    </Badge>
  );
}
