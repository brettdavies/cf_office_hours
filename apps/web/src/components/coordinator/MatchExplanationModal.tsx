/**
 * Match Explanation Modal Component
 *
 * Displays detailed breakdown of how a match score was calculated.
 * Shows tag overlap, AI insights, and a summary. Factors no algorithm
 * computes (stage, reputation) render as a neutral "not evaluated" state.
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
 * Neutral state for a factor this algorithm does not compute.
 */
function NotEvaluated() {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">—</span>
      <span className="text-sm text-muted-foreground">Not evaluated by this algorithm</span>
    </div>
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
  // Only the tag-based family evaluates tag overlap; an empty list means
  // "no shared tags" there but "not evaluated" for other algorithms.
  const tagsEvaluated = algorithmVersion.startsWith('tag-based');
  const aiInsights = explanation?.aiInsights;

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
            {/* AI Insights Section */}
            {aiInsights && (
              <div>
                <h3 className="text-lg font-semibold mb-3">AI Insights</h3>
                <div className="space-y-3">
                  {aiInsights.reasoning && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Reasoning
                      </p>
                      <p className="text-sm">{aiInsights.reasoning}</p>
                    </div>
                  )}
                  {aiInsights.confidence && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Confidence
                      </p>
                      <p className="text-sm">{aiInsights.confidence}</p>
                    </div>
                  )}
                  {aiInsights.mentorSummary && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Mentor
                      </p>
                      <p className="text-sm">{aiInsights.mentorSummary}</p>
                    </div>
                  )}
                  {aiInsights.companyDescription && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Company
                      </p>
                      <p className="text-sm">{aiInsights.companyDescription}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

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
              ) : tagsEvaluated ? (
                <p className="text-sm text-muted-foreground">No shared tags</p>
              ) : (
                <NotEvaluated />
              )}
            </div>

            {/* Stage Compatibility Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Stage Compatibility</h3>
              <NotEvaluated />
            </div>

            {/* Reputation Compatibility Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Reputation Compatibility</h3>
              <NotEvaluated />
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
