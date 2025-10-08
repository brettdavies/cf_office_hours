/**
 * Match Results Grid Component
 *
 * Displays a responsive grid of match results.
 * Handles loading states, empty states, and error states.
 */

// Internal modules
import { MatchCard } from './MatchCard';
import { Skeleton } from '@/components/ui/skeleton';

// Types
import type { paths } from '@shared/types/api.generated';

type MatchResult =
  paths['/v1/matching/find-matches']['post']['responses']['200']['content']['application/json']['matches'][number];

interface MatchResultsGridProps {
  matches: MatchResult[];
  isLoading: boolean;
  onExplainMatch: (userId1: string, userId2: string) => void;
  selectedUserId: string | null;
  algorithmVersion: string;
}

/**
 * Loading skeleton for match cards
 */
function MatchCardSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-3" data-testid="skeleton-card">
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-24" />
      </div>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}

export function MatchResultsGrid({
  matches,
  isLoading,
  onExplainMatch,
  selectedUserId,
  algorithmVersion,
}: MatchResultsGridProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <MatchCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  // Empty state
  if (!selectedUserId) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Select a user to view match recommendations</p>
      </div>
    );
  }

  // No matches found
  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No matches found for this user with algorithm <span className="font-mono">{algorithmVersion}</span>
        </p>
      </div>
    );
  }

  // Matches grid
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {matches.map((match) => (
        <MatchCard
          key={match.user.id}
          match={match}
          onExplainClick={() => onExplainMatch(selectedUserId, match.user.id)}
        />
      ))}
    </div>
  );
}
