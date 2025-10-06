/**
 * BookingFormModal Component (Epic 0 Stub)
 *
 * Modal dialog that displays booking form when a slot is selected.
 * For Epic 0, this is a stub component that shows slot details and
 * placeholder form inputs. Actual booking submission functionality
 * is deferred to Story 0.11.
 */

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
import { formatFullDate, formatTimeRange } from '@/lib/date-utils';

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
}

/**
 * BookingFormModal displays a modal dialog with booking form for the selected slot.
 * For Epic 0, the form is a stub - "Confirm" button functionality is deferred to Story 0.11.
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 * const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
 *
 * <BookingFormModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   slot={selectedSlot}
 * />
 * ```
 */
export function BookingFormModal({ isOpen, onClose, slot }: BookingFormModalProps) {
  // Handle no slot selected
  if (!slot) {
    return null;
  }

  // Format slot date and time for display
  const slotDate = formatFullDate(slot.start_time);
  const slotTime = formatTimeRange(slot.start_time, slot.end_time);

  // Event handlers
  const handleConfirm = () => {
    // TODO: Story 0.11 - Implement booking submission
    console.log('Booking submission deferred to Story 0.11');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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

          {/* Meeting Goal Input (Epic 0 placeholder) */}
          <div className="space-y-2">
            <Label htmlFor="meeting_goal">Meeting Goal</Label>
            <Textarea
              id="meeting_goal"
              placeholder="What would you like to discuss? (Minimum 10 characters)"
              className="min-h-[100px]"
            />
            <p className="text-sm text-muted-foreground">
              Describe what you'd like to accomplish in this meeting
            </p>
          </div>

          {/* Materials URLs Input (Epic 0 placeholder) */}
          <div className="space-y-2">
            <Label htmlFor="materials_urls">Materials/Links (Optional)</Label>
            <Input
              id="materials_urls"
              type="text"
              placeholder="https://example.com/document (comma-separated)"
            />
            <p className="text-sm text-muted-foreground">
              Share any relevant documents, code repos, or links
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Confirm Booking</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
