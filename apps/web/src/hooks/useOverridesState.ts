/**
 * useOverridesState Hook
 *
 * Custom hook orchestrating tier override requests state management.
 * Composes utilities and hooks for filtering, sorting, URL sync, actions, and keyboard navigation.
 *
 * REFACTORED: Extracted logic into focused utilities and hooks (~515 lines → ~180 lines)
 */

// External dependencies
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

// Internal modules - Utilities
import {
  parseOverridesFiltersFromURL,
  parseOverridesSortFromURL,
  buildOverridesURLParams,
} from '@/lib/overrides-url-params';
import { filterOverrideRequests } from '@/lib/overrides-filters';
import { sortOverrideRequests } from '@/lib/overrides-sorting';

// Internal modules - Hooks
import { useOverridesActions } from '@/hooks/useOverridesActions';
import { useOverridesKeyboardNav } from '@/hooks/useOverridesKeyboardNav';

// Types
import type { TierOverrideRequest } from '@/services/api/bookings';
import type { SortOption } from '@/components/coordinator/OverridesSortingControl';
import type { Filters } from '@/components/coordinator/OverridesFilterPanel';

/**
 * Custom hook for tier override requests state management
 *
 * Provides complete state management for tier override requests page:
 * - Filtering and sorting
 * - URL synchronization
 * - Selection and focus management
 * - Approve/decline actions with animations
 * - Keyboard navigation
 *
 * @param requests - Array of tier override requests from API
 * @returns State and handlers for managing override requests
 *
 * @example
 * ```typescript
 * const {
 *   sortedRequests,
 *   filters,
 *   sortBy,
 *   handleApprove,
 *   // ... all state and handlers
 * } = useOverridesState(requests);
 * ```
 */
export function useOverridesState(requests: TierOverrideRequest[]) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Local state for displayed requests (modified by approve/decline actions)
  const [displayedRequests, setDisplayedRequests] = useState<TierOverrideRequest[]>(requests);
  const [fadingOutIds, setFadingOutIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Filtering and sorting state - initialized from URL
  const [sortBy, setSortBy] = useState<SortOption>(() => parseOverridesSortFromURL(searchParams));
  const [filters, setFilters] = useState<Filters>(() =>
    parseOverridesFiltersFromURL(searchParams)
  );
  const [showFilters, setShowFilters] = useState(false);

  // Update URL when sort or filters change
  useEffect(() => {
    const params = buildOverridesURLParams(sortBy, filters);
    setSearchParams(params, { replace: true });
  }, [sortBy, filters, setSearchParams]);

  // Update displayed requests when API data changes
  useEffect(() => {
    setDisplayedRequests(requests);
  }, [requests]);

  // Filter requests using extracted utility
  const filteredRequests = useMemo(() => {
    return filterOverrideRequests(displayedRequests, filters);
  }, [displayedRequests, filters]);

  // Sort requests using extracted utility
  const sortedRequests = useMemo(() => {
    return sortOverrideRequests(filteredRequests, sortBy);
  }, [filteredRequests, sortBy]);

  // Action handlers using extracted hook
  const { handleApprove, handleDecline, handleBulkApprove, handleBulkDecline, handleToggleSelect } =
    useOverridesActions({
      displayedRequests,
      setDisplayedRequests,
      setFadingOutIds,
      setSelectedIds,
      selectedIds,
    });

  // Toggle select all handler
  const handleToggleSelectAll = useCallback(() => {
    const visibleRequests = sortedRequests.filter(r => !fadingOutIds.has(r.id));
    if (selectedIds.size === visibleRequests.length) {
      // Deselect all
      setSelectedIds(new Set());
    } else {
      // Select all
      setSelectedIds(new Set(visibleRequests.map(r => r.id)));
    }
  }, [sortedRequests, fadingOutIds, selectedIds.size]);

  // Keyboard navigation using extracted hook
  useOverridesKeyboardNav({
    focusedIndex,
    setFocusedIndex,
    sortedRequests,
    fadingOutIds,
    selectedIds,
    setSelectedIds,
    setShowShortcuts,
    handleApprove,
    handleDecline,
    handleBulkApprove,
    handleBulkDecline,
    handleToggleSelect,
    handleToggleSelectAll,
  });

  return {
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
  };
}
