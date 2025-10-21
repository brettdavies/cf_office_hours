/**
 * useOverridesActions Hook
 *
 * Handles approve/decline actions with fade animations and toast notifications.
 * Supports both single and bulk operations.
 * Extracted from useOverridesState for maintainability and testability.
 */

// External dependencies
import { useCallback } from 'react';

// Internal modules
import { useNotificationStore } from '@/stores/notificationStore';

// Types
import type { TierOverrideRequest } from '@/services/api/bookings';

interface UseOverridesActionsParams {
  /** Currently displayed requests */
  displayedRequests: TierOverrideRequest[];
  /** Setter for displayed requests */
  setDisplayedRequests: (value: TierOverrideRequest[] | ((prev: TierOverrideRequest[]) => TierOverrideRequest[])) => void;
  /** Setter for fading out IDs */
  setFadingOutIds: (value: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  /** Setter for selected IDs */
  setSelectedIds: (value: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  /** Currently selected IDs */
  selectedIds: Set<string>;
}

interface UseOverridesActionsReturn {
  /** Approve a single request by ID */
  handleApprove: (id: string) => void;
  /** Decline a single request by ID */
  handleDecline: (id: string) => void;
  /** Approve all selected requests */
  handleBulkApprove: () => void;
  /** Decline all selected requests */
  handleBulkDecline: () => void;
  /** Toggle selection of a request */
  handleToggleSelect: (id: string) => void;
}

/**
 * Custom hook for tier override request actions
 *
 * Provides handlers for approve, decline, bulk approve, bulk decline, and toggle select.
 * All actions include fade animations and toast notifications.
 *
 * @param params - Action parameters and state setters
 * @returns Action handlers
 *
 * @example
 * ```typescript
 * const {
 *   handleApprove,
 *   handleDecline,
 *   handleBulkApprove,
 *   handleBulkDecline,
 *   handleToggleSelect,
 * } = useOverridesActions({
 *   displayedRequests,
 *   setDisplayedRequests,
 *   setFadingOutIds,
 *   setSelectedIds,
 *   selectedIds,
 * });
 * ```
 */
export function useOverridesActions({
  displayedRequests,
  setDisplayedRequests,
  setFadingOutIds,
  setSelectedIds,
  selectedIds,
}: UseOverridesActionsParams): UseOverridesActionsReturn {
  const { addToast } = useNotificationStore();

  // Approve handler
  const handleApprove = useCallback(
    (id: string) => {
      const request = displayedRequests.find(r => r.id === id);
      if (!request) return;

      // Mark as fading out
      setFadingOutIds(prev => new Set(prev).add(id));

      // Wait for fade animation, then remove from local state
      setTimeout(() => {
        setDisplayedRequests(prev => prev.filter(r => r.id !== id));
        setFadingOutIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });

        // Show success toast
        addToast({
          title: 'Request Approved',
          description: `Override request approved for ${request.mentee.profile.name} → ${request.mentor.profile.name}`,
          variant: 'success',
        });
      }, 300);
    },
    [displayedRequests, setDisplayedRequests, setFadingOutIds, setSelectedIds, addToast]
  );

  // Decline handler
  const handleDecline = useCallback(
    (id: string) => {
      const request = displayedRequests.find(r => r.id === id);
      if (!request) return;

      // Mark as fading out
      setFadingOutIds(prev => new Set(prev).add(id));

      // Wait for fade animation, then remove from local state
      setTimeout(() => {
        setDisplayedRequests(prev => prev.filter(r => r.id !== id));
        setFadingOutIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });

        // Show success toast
        addToast({
          title: 'Request Declined',
          description: `Override request declined for ${request.mentee.profile.name} → ${request.mentor.profile.name}`,
          variant: 'default',
        });
      }, 300);
    },
    [displayedRequests, setDisplayedRequests, setFadingOutIds, setSelectedIds, addToast]
  );

  // Bulk approve handler
  const handleBulkApprove = useCallback(() => {
    const idsArray = Array.from(selectedIds);

    // Mark all as fading out with 50ms stagger
    idsArray.forEach((id, index) => {
      setTimeout(() => {
        setFadingOutIds(prev => new Set(prev).add(id));
      }, index * 50);
    });

    // Remove from state and show toasts with 100ms stagger
    idsArray.forEach((id, index) => {
      setTimeout(() => {
        const request = displayedRequests.find(r => r.id === id);
        if (request) {
          addToast({
            title: 'Request Approved',
            description: `${request.mentee.profile.name} → ${request.mentor.profile.name}`,
            variant: 'success',
          });
        }
      }, index * 100);
    });

    // Remove all cards after animations complete
    setTimeout(() => {
      setDisplayedRequests(prev => prev.filter(r => !selectedIds.has(r.id)));
      setFadingOutIds(new Set());
      setSelectedIds(new Set());
    }, idsArray.length * 50 + 300);
  }, [selectedIds, displayedRequests, setDisplayedRequests, setFadingOutIds, setSelectedIds, addToast]);

  // Bulk decline handler
  const handleBulkDecline = useCallback(() => {
    const idsArray = Array.from(selectedIds);

    // Mark all as fading out with 50ms stagger
    idsArray.forEach((id, index) => {
      setTimeout(() => {
        setFadingOutIds(prev => new Set(prev).add(id));
      }, index * 50);
    });

    // Remove from state and show toasts with 100ms stagger
    idsArray.forEach((id, index) => {
      setTimeout(() => {
        const request = displayedRequests.find(r => r.id === id);
        if (request) {
          addToast({
            title: 'Request Declined',
            description: `${request.mentee.profile.name} → ${request.mentor.profile.name}`,
            variant: 'default',
          });
        }
      }, index * 100);
    });

    // Remove all cards after animations complete
    setTimeout(() => {
      setDisplayedRequests(prev => prev.filter(r => !selectedIds.has(r.id)));
      setFadingOutIds(new Set());
      setSelectedIds(new Set());
    }, idsArray.length * 50 + 300);
  }, [selectedIds, displayedRequests, setDisplayedRequests, setFadingOutIds, setSelectedIds, addToast]);

  // Toggle selection handler
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, [setSelectedIds]);

  return {
    handleApprove,
    handleDecline,
    handleBulkApprove,
    handleBulkDecline,
    handleToggleSelect,
  };
}
