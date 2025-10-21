/**
 * useOverridesKeyboardNav Hook
 *
 * Handles keyboard navigation and shortcuts for tier override requests page.
 * Supports arrow keys, space, enter, delete, escape, and shortcut keys.
 * Extracted from useOverridesState for maintainability and testability.
 */

// External dependencies
import { useEffect } from 'react';

// Types
import type { TierOverrideRequest } from '@/services/api/bookings';

interface UseOverridesKeyboardNavParams {
  /** Currently focused card index */
  focusedIndex: number;
  /** Setter for focused index */
  setFocusedIndex: (value: number | ((prev: number) => number)) => void;
  /** Sorted and filtered requests currently visible */
  sortedRequests: TierOverrideRequest[];
  /** IDs of cards currently fading out */
  fadingOutIds: Set<string>;
  /** IDs of currently selected cards */
  selectedIds: Set<string>;
  /** Setter for selected IDs */
  setSelectedIds: (value: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  /** Setter for shortcuts panel visibility */
  setShowShortcuts: (value: boolean | ((prev: boolean) => boolean)) => void;
  /** Handler to approve a single request */
  handleApprove: (id: string) => void;
  /** Handler to decline a single request */
  handleDecline: (id: string) => void;
  /** Handler to approve all selected requests */
  handleBulkApprove: () => void;
  /** Handler to decline all selected requests */
  handleBulkDecline: () => void;
  /** Handler to toggle selection of a single request */
  handleToggleSelect: (id: string) => void;
  /** Handler to toggle select all / deselect all */
  handleToggleSelectAll: () => void;
}

/**
 * Custom hook for keyboard navigation in tier override requests list
 *
 * Keyboard shortcuts:
 * - Arrow keys / Tab: Navigate cards
 * - Space: Toggle selection
 * - Ctrl/Cmd+A: Select/deselect all
 * - Enter / A: Approve (focused or selected)
 * - Delete / D: Decline (focused or selected)
 * - Escape: Clear selection and focus
 * - ? / /: Toggle shortcuts help
 *
 * @param params - Navigation parameters and handlers
 *
 * @example
 * ```typescript
 * useOverridesKeyboardNav({
 *   focusedIndex,
 *   setFocusedIndex,
 *   sortedRequests,
 *   fadingOutIds,
 *   selectedIds,
 *   setSelectedIds,
 *   setShowShortcuts,
 *   handleApprove,
 *   handleDecline,
 *   handleBulkApprove,
 *   handleBulkDecline,
 *   handleToggleSelect,
 *   handleToggleSelectAll,
 * });
 * ```
 */
export function useOverridesKeyboardNav({
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
}: UseOverridesKeyboardNavParams): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keyboard shortcuts if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const visibleRequests = sortedRequests.filter(r => !fadingOutIds.has(r.id));
      if (visibleRequests.length === 0) return;

      // Handle Ctrl+A / Cmd+A for Select All / Deselect All
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleToggleSelectAll();
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          setFocusedIndex(prev => (prev + 1) % visibleRequests.length);
          break;

        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          setFocusedIndex(prev => (prev - 1 + visibleRequests.length) % visibleRequests.length);
          break;

        case 'Tab':
          if (focusedIndex === -1) {
            e.preventDefault();
            setFocusedIndex(e.shiftKey ? visibleRequests.length - 1 : 0);
          }
          break;

        case ' ':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < visibleRequests.length) {
            const request = visibleRequests[focusedIndex];
            handleToggleSelect(request.id);
          }
          break;

        case 'Enter':
          e.preventDefault();
          // If cards are selected, approve all selected. Otherwise approve focused card.
          if (selectedIds.size > 0) {
            handleBulkApprove();
          } else if (focusedIndex >= 0 && focusedIndex < visibleRequests.length) {
            const request = visibleRequests[focusedIndex];
            handleApprove(request.id);
          }
          break;

        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          // If cards are selected, decline all selected. Otherwise decline focused card.
          if (selectedIds.size > 0) {
            handleBulkDecline();
          } else if (focusedIndex >= 0 && focusedIndex < visibleRequests.length) {
            const request = visibleRequests[focusedIndex];
            handleDecline(request.id);
          }
          break;

        case 'Escape':
          e.preventDefault();
          setFocusedIndex(-1);
          setSelectedIds(new Set());
          break;

        case 'a':
        case 'A':
          e.preventDefault();
          // If cards are selected, approve all selected. Otherwise approve focused card.
          if (selectedIds.size > 0) {
            handleBulkApprove();
          } else if (focusedIndex >= 0 && focusedIndex < visibleRequests.length) {
            const request = visibleRequests[focusedIndex];
            handleApprove(request.id);
          }
          break;

        case 'd':
        case 'D':
          e.preventDefault();
          // If cards are selected, decline all selected. Otherwise decline focused card.
          if (selectedIds.size > 0) {
            handleBulkDecline();
          } else if (focusedIndex >= 0 && focusedIndex < visibleRequests.length) {
            const request = visibleRequests[focusedIndex];
            handleDecline(request.id);
          }
          break;

        case '?':
        case '/':
          e.preventDefault();
          setShowShortcuts(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
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
  ]);
}
