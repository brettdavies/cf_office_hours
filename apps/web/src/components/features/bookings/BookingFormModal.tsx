/**
 * BookingFormModal Component (Story 0.11)
 *
 * Modal dialog that displays booking form when a slot is selected.
 * Allows user to create a booking by submitting meeting goal.
 *
 * Epic 0: Simple booking - no calendar integration, no confirmation flow.
 * Status always 'pending'.
 */

// External dependencies
import { useState } from 'react';

// Internal modules
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useNotificationStore } from '@/stores/notificationStore';
import { formatFullDate, formatTimeRange } from '@/lib/date-utils';
import { apiClient, ApiError } from '@/lib/api-client';

// Types
import type { TimeSlot } from '@/test/fixtures/slots';

/**
 * Props for BookingFormModal component
 */
export interface BookingFormModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Selected time slot data (null when no slot selected) */
  slot: TimeSlot | null;
  /** Callback to refresh slot list after booking created */
  onBookingCreated?: () => void;
}

/**
 * BookingFormModal displays a modal dialog with booking form for the selected slot.
 * Story 0.11: Creates booking via API, shows success/error toasts, refreshes slot list.
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 * const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
 * const handleRefresh = () => {
 *   // refetch slots
 * };
 *
 * <BookingFormModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   slot={selectedSlot}
 *   onBookingCreated={handleRefresh}
 * />
 * ```
 */
export function BookingFormModal({
  isOpen,
  onClose,
  slot,
  onBookingCreated,
}: BookingFormModalProps) {
  const addToast = useNotificationStore(state => state.addToast);
  const [meetingGoal, setMeetingGoal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle no slot selected
  if (!slot) {
    return null;
  }

  // Format slot date and time for display
  const slotDate = formatFullDate(slot.start_time);
  const slotTime = formatTimeRange(slot.start_time, slot.end_time);

  // Reset form when modal closes
  const handleClose = () => {
    setMeetingGoal('');
    setIsSubmitting(false);
    onClose();
  };

  // Event handlers
  const handleConfirm = async () => {
    // Validate meeting goal
    if (meetingGoal.trim().length < 10) {
      if (import.meta.env.DEV) {
        console.log('[BOOKING] Validation failed - meeting goal too short', {
          length: meetingGoal.trim().length,
          slotId: slot.id,
          timestamp: new Date().toISOString(),
        });
      }
      addToast({
        title: 'Validation Error',
        description: 'Please enter a longer meeting goal (at least 10 characters)',
        variant: 'error',
      });
      return;
    }

    if (import.meta.env.DEV) {
      console.log('[BOOKING] Booking form submission initiated', {
        slotId: slot.id,
        mentorId: slot.mentor_id,
        meetingGoalLength: meetingGoal.trim().length,
        timestamp: new Date().toISOString(),
      });
    }

    setIsSubmitting(true);

    try {
      const result = await apiClient.createBooking({
        time_slot_id: slot.id,
        meeting_goal: meetingGoal.trim(),
      });

      if (import.meta.env.DEV) {
        console.log('[BOOKING] Booking created successfully', {
          bookingId: result.id,
          slotId: slot.id,
          mentorId: result.mentor_id,
          menteeId: result.mentee_id,
          status: result.status,
          timestamp: new Date().toISOString(),
        });
      }

      addToast({
        title: 'Booking Created',
        description: 'Meeting booked successfully! The mentor will see your request.',
        variant: 'success',
      });

      // Close modal and trigger slot list refresh
      handleClose();
      onBookingCreated?.();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[ERROR] Booking creation failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          slotId: slot.id,
          statusCode: error instanceof ApiError ? error.statusCode : undefined,
          timestamp: new Date().toISOString(),
        });
      }

      if (error instanceof ApiError) {
        if (error.statusCode === 409) {
          addToast({
            title: 'Slot Unavailable',
            description:
              'This slot was just booked by another user. Please select a different time.',
            variant: 'error',
          });
        } else if (error.statusCode === 404) {
          addToast({
            title: 'Slot Not Found',
            description: 'This time slot is no longer available.',
            variant: 'error',
          });
        } else if (error.statusCode === 401 || error.statusCode === 403) {
          addToast({
            title: 'Authentication Error',
            description: 'Please log in again.',
            variant: 'error',
          });
        } else {
          addToast({
            title: 'Error',
            description: 'Unable to create booking. Please try again.',
            variant: 'error',
          });
        }
      } else {
        addToast({
          title: 'Error',
          description: 'Unable to create booking. Please try again.',
          variant: 'error',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Book Office Hours</DialogTitle>
          <DialogDescription>Schedule a meeting with {slot.mentor.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Slot Details */}
          <div className="space-y-2">
            <div>
              <span className="font-semibold">Date:</span> {slotDate}
            </div>
            <div>
              <span className="font-semibold">Time:</span> {slotTime}
            </div>
            <div>
              <span className="font-semibold">Mentor:</span> {slot.mentor.name}
            </div>
          </div>

          {/* Meeting Goal Input */}
          <div className="space-y-2">
            <Label htmlFor="meeting_goal">Meeting Goal</Label>
            <Textarea
              id="meeting_goal"
              value={meetingGoal}
              onChange={e => setMeetingGoal(e.target.value)}
              placeholder="What would you like to discuss? (Minimum 10 characters)"
              className="min-h-[100px]"
              disabled={isSubmitting}
            />
            <p className="text-sm text-muted-foreground">
              Describe what you'd like to accomplish in this meeting
            </p>
          </div>

          {/* Materials URLs Input (Epic 0 placeholder - not yet functional) */}
          <div className="space-y-2">
            <Label htmlFor="materials_urls">Materials/Links (Coming Soon)</Label>
            <Input
              id="materials_urls"
              type="text"
              placeholder="https://example.com/document (comma-separated)"
              disabled
            />
            <p className="text-sm text-muted-foreground">
              Epic 4: Share relevant documents, code repos, or links
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Confirm Booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
