/**
 * Match Explanation Modal Component
 *
 * Displays detailed breakdown of how a match score was calculated.
 * Shows tag overlap, stage compatibility, reputation compatibility, and summary.
 */

// External dependencies
import { useEffect } from 'react';

// Internal modules
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useExplainMatch } from '@/hooks/useMatching';

interface MatchExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId1: string | null;
  userId2: string | null;
  algorithmVersion: string;
}

/**
 * Icon component for boolean indicators
 */
function BooleanIndicator({ value }: { value: boolean }) {
  return (
    <span className={value ? 'text-green-600' : 'text-red-600'}>
      {value ? '✓' : '✗'}
    </span>
  );
}

export function MatchExplanationModal({
  isOpen,
  onClose,
  userId1,
  userId2,
  algorithmVersion,
}: MatchExplanationModalProps) {
  const { mutate: explainMatch, data, isPending, reset } = useExplainMatch();

  // Fetch explanation when modal opens
  useEffect(() => {
    if (isOpen && userId1 && userId2) {
      explainMatch({ userId1, userId2, algorithmVersion });
    }
  }, [isOpen, userId1, userId2, algorithmVersion, explainMatch]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const explanation = data?.explanation;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Match Explanation</DialogTitle>
          <DialogDescription>
            Detailed breakdown of how this match score was calculated using{' '}
            <span className="font-mono">{algorithmVersion}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Loading State */}
        {isPending && (
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {/* Explanation Content */}
        {!isPending && explanation && (
          <div className="space-y-6">
            {/* Tag Overlap Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Tag Overlap</h3>
              {explanation.tagOverlap && explanation.tagOverlap.length > 0 ? (
                <div className="space-y-2">
                  {explanation.tagOverlap.map((tag, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs bg-green-50 border-green-300 text-green-700">
                        {tag.category}
                      </Badge>
                      <span className="text-sm font-medium text-green-700">{tag.tag}</span>
                    </div>
                  ))}
                  <p className="text-sm text-muted-foreground mt-2">
                    {explanation.tagOverlap.length} shared tag{explanation.tagOverlap.length !== 1 ? 's' : ''}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No shared tags</p>
              )}
            </div>

            {/* Stage Compatibility Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Stage Compatibility
                <Badge variant="secondary" className="ml-2 text-xs">Coming Later</Badge>
              </h3>
              <div className="flex items-center gap-2">
                <BooleanIndicator value={explanation.stageMatch} />
                <span className="text-sm">
                  {explanation.stageMatch
                    ? 'Users are at compatible stages'
                    : 'Users are at different stages'}
                </span>
              </div>
            </div>

            {/* Reputation Compatibility Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Reputation Compatibility
                <Badge variant="secondary" className="ml-2 text-xs">Coming Later</Badge>
              </h3>
              <div className="flex items-center gap-2">
                <BooleanIndicator value={explanation.reputationCompatible} />
                <span className="text-sm">
                  {explanation.reputationCompatible
                    ? 'Reputation tiers are compatible'
                    : 'Reputation tiers may not be compatible'}
                </span>
              </div>
            </div>

            {/* Summary Section */}
            {explanation.summary && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Summary</h3>
                <p className="text-sm text-muted-foreground">{explanation.summary}</p>
              </div>
            )}
          </div>
        )}

        {/* No Explanation Found */}
        {!isPending && !explanation && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Match explanation not available</p>
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end mt-6">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
