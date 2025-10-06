/**
 * MentorProfilePage Component
 *
 * Displays a mentor's profile information along with their available time slots.
 * Mentees can view mentor details and select available slots to book.
 *
 * Epic 0: Basic profile view with simple slot list (no advanced features)
 */

// External dependencies
import { useState } from 'react';
import { useParams } from 'react-router-dom';

// Internal modules
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SlotPickerList } from '@/components/features/bookings/SlotPickerList';
import { BookingFormModal } from '@/components/features/bookings/BookingFormModal';

// Types
import type { TimeSlot } from '@/test/fixtures/slots';

/**
 * MentorProfilePage displays a mentor's profile with their available slots.
 * For Epic 0, this is a simplified version showing basic profile info and slot list.
 * Advanced features (tags, ratings, availability calendar) are deferred to later epics.
 */
export default function MentorProfilePage() {
  const { mentorId } = useParams<{ mentorId: string }>();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handle slot selection
  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    // Keep selectedSlot to preserve modal data until next selection
  };

  // Guard: mentor ID must be present
  if (!mentorId) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Mentor not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Mentor Profile Card - Epic 0: Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Mentor Profile</CardTitle>
            <CardDescription>View mentor details and book available time slots</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* TODO: Epic 1+ - Replace with actual mentor profile API call */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Mentor ID: {mentorId}</p>
              <p className="text-sm text-muted-foreground">
                (Full mentor profile details will be implemented in future stories)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Available Slots Section */}
        <Card>
          <CardHeader>
            <CardTitle>Available Slots</CardTitle>
            <CardDescription>Select a time slot to book a meeting with this mentor</CardDescription>
          </CardHeader>
          <CardContent>
            <SlotPickerList mentorId={mentorId} onSlotSelect={handleSlotSelect} />
          </CardContent>
        </Card>
      </div>

      {/* Booking Form Modal */}
      <BookingFormModal isOpen={isModalOpen} onClose={handleModalClose} slot={selectedSlot} />
    </div>
  );
}
