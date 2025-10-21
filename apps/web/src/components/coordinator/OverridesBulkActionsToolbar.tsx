/**
 * Overrides Bulk Actions Toolbar Component
 *
 * Displays bulk selection controls and action buttons for tier override requests.
 * Extracted from CoordinatorOverridesPage for reusability and maintainability.
 */

// Internal modules
import { Button } from '@/components/ui/button';

interface OverridesBulkActionsToolbarProps {
  /** Number of currently selected items */
  selectedCount: number;
  /** Total number of visible items (after filtering) */
  totalVisible: number;
  /** Whether all visible items are selected */
  allSelected: boolean;
  /** Callback when Select All / Deselect All is clicked */
  onToggleSelectAll: () => void;
  /** Callback when Approve Selected is clicked */
  onApproveSelected: () => void;
  /** Callback when Decline Selected is clicked */
  onDeclineSelected: () => void;
}

/**
 * Bulk actions toolbar for managing multiple tier override requests.
 * Shows selection count, select all toggle, and bulk approve/decline buttons.
 */
export function OverridesBulkActionsToolbar({
  selectedCount,
  totalVisible,
  allSelected,
  onToggleSelectAll,
  onApproveSelected,
  onDeclineSelected,
}: OverridesBulkActionsToolbarProps) {
  // Don't render anything if no items are visible
  if (totalVisible === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onToggleSelectAll}>
        {allSelected ? 'Deselect All' : 'Select All'}
      </Button>

      {selectedCount > 0 && (
        <>
          <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
          <Button variant="default" size="sm" onClick={onApproveSelected}>
            Approve Selected ({selectedCount})
          </Button>
          <Button variant="outline" size="sm" onClick={onDeclineSelected}>
            Decline Selected ({selectedCount})
          </Button>
        </>
      )}
    </div>
  );
}
