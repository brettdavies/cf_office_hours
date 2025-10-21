/**
 * Coordinator Overrides Page
 *
 * Displays all pending tier override requests for coordinators to review and manage.
 * Features filtering, sorting, bulk actions, keyboard navigation, and local state management.
 *
 * REFACTORED: Extracted business logic to useOverridesState hook and UI to presentational components.
 * Target: <200 lines (per coding standards Section 14.3)
 */

// Internal modules
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';
import { OverrideRequestCard } from '@/components/coordinator/OverrideRequestCard';
import { OverridesPageHeader } from '@/components/coordinator/OverridesPageHeader';
import { OverridesKeyboardShortcuts } from '@/components/coordinator/OverridesKeyboardShortcuts';
import { OverridesSortingControl } from '@/components/coordinator/OverridesSortingControl';
import { OverridesFilterPanel, DEFAULT_FILTERS } from '@/components/coordinator/OverridesFilterPanel';
import { OverridesBulkActionsToolbar } from '@/components/coordinator/OverridesBulkActionsToolbar';
import { OverridesLoadingState } from '@/components/coordinator/OverridesLoadingState';
import { OverridesErrorState } from '@/components/coordinator/OverridesErrorState';
import { OverridesEmptyStates } from '@/components/coordinator/OverridesEmptyStates';
import { useTierOverrides } from '@/hooks/useTierOverrides';
import { useOverridesState } from '@/hooks/useOverridesState';

/**
 * Main coordinator overrides page component for managing tier override requests.
 * All business logic delegated to useOverridesState hook.
 * All UI delegated to presentational components.
 */
export function CoordinatorOverridesPage() {
  // Data fetching
  const { requests, isLoading, error, refetch } = useTierOverrides();

  // State management - ALL logic in custom hook
  const {
    displayedRequests,
    sortedRequests,
    selectedIds,
    focusedIndex,
    fadingOutIds,
    showShortcuts,
    showFilters,
    sortBy,
    filters,
    setShowShortcuts,
    setShowFilters,
    setSortBy,
    setFilters,
    handleApprove,
    handleDecline,
    handleBulkApprove,
    handleBulkDecline,
    handleToggleSelect,
    handleToggleSelectAll,
  } = useOverridesState(requests);

  // Loading state
  if (isLoading) {
    return <OverridesLoadingState />;
  }

  // Error state
  if (error) {
    return <OverridesErrorState onRetry={refetch} />;
  }

  // Empty state - no requests from API
  if (requests.length === 0) {
    return <OverridesEmptyStates variant="no-data" />;
  }

  // Calculate filter active status
  const hasActiveFilters =
    filters.mentorTiers.length < 4 ||
    filters.menteeTiers.length < 4 ||
    filters.tierDifferences.length < 3 ||
    filters.matchScoreBuckets.length < 5;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <OverridesPageHeader
        count={sortedRequests.length}
        totalDisplayed={displayedRequests.length}
        showShortcuts={showShortcuts}
        onToggleShortcuts={() => setShowShortcuts(!showShortcuts)}
      />

      {/* Keyboard Shortcuts Help */}
      <OverridesKeyboardShortcuts show={showShortcuts} />

      {/* Controls: Sort & Filter */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <OverridesSortingControl sortBy={sortBy} onSortChange={setSortBy} />

        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1">
              Active
            </Badge>
          )}
        </Button>

        <div className="ml-auto">
          <OverridesBulkActionsToolbar
            selectedCount={selectedIds.size}
            totalVisible={sortedRequests.length}
            allSelected={selectedIds.size === sortedRequests.length}
            onToggleSelectAll={handleToggleSelectAll}
            onApproveSelected={handleBulkApprove}
            onDeclineSelected={handleBulkDecline}
          />
        </div>
      </div>

      {/* Filter Panel */}
      <OverridesFilterPanel
        show={showFilters}
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={() => setFilters(DEFAULT_FILTERS)}
      />

      {/* Empty state - filtered out all results */}
      {sortedRequests.length === 0 && displayedRequests.length > 0 && (
        <OverridesEmptyStates
          variant="filtered"
          onClearFilters={() => setFilters(DEFAULT_FILTERS)}
        />
      )}

      {/* Empty state - all cards removed locally */}
      {sortedRequests.length === 0 && displayedRequests.length === 0 && requests.length > 0 && (
        <OverridesEmptyStates variant="all-processed" />
      )}

      {/* Request Cards Grid */}
      {sortedRequests.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedRequests.map((request, index) => (
            <OverrideRequestCard
              key={request.id}
              request={request}
              isSelected={selectedIds.has(request.id)}
              isFadingOut={fadingOutIds.has(request.id)}
              isFocused={focusedIndex === index}
              onToggleSelect={() => handleToggleSelect(request.id)}
              onApprove={handleApprove}
              onDecline={handleDecline}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default CoordinatorOverridesPage;
