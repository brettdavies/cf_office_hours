/**
 * Overrides Empty States Component
 *
 * Consolidated empty state variations for the tier override requests page.
 * Handles no data, filtered results, and all requests processed scenarios.
 * Extracted from CoordinatorOverridesPage for reusability and maintainability.
 */

// Internal modules
import { Button } from '@/components/ui/button';
import { CheckCircle, Filter } from 'lucide-react';

interface OverridesEmptyStatesProps {
  /** Which empty state variant to display */
  variant: 'no-data' | 'filtered' | 'all-processed';
  /** Callback when Clear Filters button is clicked (only for 'filtered' variant) */
  onClearFilters?: () => void;
}

/**
 * Empty state component with 3 variants:
 * - no-data: No requests exist in the system
 * - filtered: Requests exist but none match current filters
 * - all-processed: All requests have been approved/declined locally
 */
export function OverridesEmptyStates({ variant, onClearFilters }: OverridesEmptyStatesProps) {
  if (variant === 'no-data') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No pending override requests</h2>
        <p className="text-muted-foreground">There are no tier override requests at this time.</p>
      </div>
    );
  }

  if (variant === 'filtered') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Filter className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No requests match your filters</h2>
        <p className="text-muted-foreground mb-4">Try adjusting your filter criteria.</p>
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            Clear Filters
          </Button>
        )}
      </div>
    );
  }

  if (variant === 'all-processed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No pending override requests</h2>
        <p className="text-muted-foreground">Great work! All requests have been processed.</p>
      </div>
    );
  }

  return null;
}
