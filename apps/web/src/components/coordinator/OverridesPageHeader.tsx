/**
 * Overrides Page Header Component
 *
 * Displays page title, request count badge, and keyboard shortcuts toggle button.
 * Extracted from CoordinatorOverridesPage for reusability and maintainability.
 */

// Internal modules
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface OverridesPageHeaderProps {
  /** Total number of requests after filtering */
  count: number;
  /** Total number of displayed requests (before filtering) */
  totalDisplayed: number;
  /** Whether shortcuts help panel is visible */
  showShortcuts: boolean;
  /** Callback when shortcuts toggle button is clicked */
  onToggleShortcuts: () => void;
}

/**
 * Page header showing title, counts, and shortcuts button.
 * Shows filtered count indicator when filters are active.
 */
export function OverridesPageHeader({
  count,
  totalDisplayed,
  onToggleShortcuts,
}: OverridesPageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          Pending Override Requests
          <Badge variant="secondary">{count}</Badge>
        </h1>
        <p className="text-muted-foreground mt-1">
          Review and manage mentee requests to book higher-tier mentors
          {count < totalDisplayed && (
            <span className="ml-2 text-sm">
              • Showing {count} of {totalDisplayed} requests
            </span>
          )}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleShortcuts}
        className="flex items-center gap-2"
        title="Keyboard shortcuts (press ? or /)"
      >
        <span className="font-bold">?</span>
        Shortcuts
      </Button>
    </div>
  );
}
