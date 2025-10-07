/**
 * SlotPickerList Component
 *
 * Displays available time slots in a simple list grouped by date.
 * For Epic 0, this is a basic list view without calendar grid, filters,
 * or mutual availability indicators (deferred to Epic 4).
 */

// External dependencies
import { useState, useEffect } from 'react';

// Internal modules
import { apiClient, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { formatDateKey, formatFullDate, formatTime, formatShortDate } from '@/lib/date-utils';

// Types
import type { TimeSlot } from '@/test/fixtures/slots';

/**
 * Props for SlotPickerList component
 */
export interface SlotPickerListProps {
  /** Required: mentor whose slots to display */
  mentorId: string;
  /** Optional callback when slot is clicked */
  onSlotSelect?: (slot: TimeSlot) => void;
}

/**
 * Grouped slots by date for rendering
 */
interface GroupedSlots {
  dateKey: string;
  dateLabel: string;
  slots: TimeSlot[];
}

/**
 * SlotPickerList component displays available time slots in a simple list
 * grouped by date. Clicking a slot triggers the onSlotSelect callback.
 *
 * @example
 * ```tsx
 * <SlotPickerList
 *   mentorId="mentor-123"
 *   onSlotSelect={(slot) => setSelectedSlot(slot)}
 * />
 * ```
 */
export function SlotPickerList({ mentorId, onSlotSelect }: SlotPickerListProps) {
  // 1. Hooks (useState, useEffect, custom hooks)
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 2. Effects
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        setLoading(true);
        setError(null);

        if (import.meta.env.DEV) {
          console.log('[SLOTS] Fetching available slots', {
            mentorId,
            timestamp: new Date().toISOString(),
          });
        }

        const response = await apiClient.getAvailableSlots({ mentor_id: mentorId });

        if (import.meta.env.DEV) {
          console.log('[SLOTS] Available slots fetched', {
            mentorId,
            slotCount: response.slots.length,
            timestamp: new Date().toISOString(),
          });
        }

        setSlots(response.slots);
      } catch (err) {
        console.error('[SLOTS] Failed to fetch slots', {
          mentorId,
          error: err instanceof Error ? err.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });

        if (err instanceof ApiError) {
          if (err.statusCode === 404) {
            // No slots found is not an error - show empty state
            setSlots([]);
          } else if (err.statusCode === 403) {
            setError('You do not have permission to view these slots.');
          } else if (err.statusCode === 401) {
            setError('Please log in to view available slots.');
          } else {
            setError('Unable to load available slots. Please try again.');
          }
        } else {
          setError('Unable to load available slots. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [mentorId]);

  // 3. Event handlers
  const handleSlotClick = (slot: TimeSlot) => {
    if (!slot.is_booked && onSlotSelect) {
      onSlotSelect(slot);
    }
  };

  // 4. Render logic
  const groupedSlots: GroupedSlots[] = (() => {
    const groups: Record<string, GroupedSlots> = {};

    slots.forEach(slot => {
      const dateKey = formatDateKey(slot.start_time);

      if (!groups[dateKey]) {
        groups[dateKey] = {
          dateKey,
          dateLabel: formatFullDate(slot.start_time),
          slots: [],
        };
      }

      groups[dateKey].slots.push(slot);
    });

    // Sort by date key (chronological order)
    return Object.values(groups).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  })();

  // 5. Return JSX
  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="text-muted-foreground">Loading available slots...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="text-muted-foreground">
          No available slots at this time. Please check back later.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedSlots.map(group => (
        <div key={group.dateKey}>
          <h3 className="mb-3 text-lg font-semibold">{group.dateLabel}</h3>
          <div className="flex flex-wrap gap-2">
            {group.slots.map(slot => {
              const timeLabel = formatTime(slot.start_time);
              const ariaLabel = `Book slot at ${timeLabel} on ${formatShortDate(slot.start_time)}`;

              return (
                <Button
                  key={slot.id}
                  variant="outline"
                  disabled={slot.is_booked}
                  onClick={() => handleSlotClick(slot)}
                  aria-label={slot.is_booked ? `${ariaLabel} (already booked)` : ariaLabel}
                  className={slot.is_booked ? 'opacity-50' : ''}
                >
                  {timeLabel}
                  {slot.is_booked && <span className="ml-1">(Booked)</span>}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
