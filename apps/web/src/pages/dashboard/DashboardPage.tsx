// External dependencies
import { useCurrentUser } from '@/hooks/useCurrentUser';

// Internal modules
import { BookingsList } from '@/components/features/bookings/BookingsList';
import { useMyBookings } from '@/hooks/useMyBookings';
import { useMyBookingsRealtime } from '@/hooks/useRealtime';

/**
 * Dashboard page - main view after authentication.
 *
 * Displays all user bookings (as mentor or mentee) organized into
 * upcoming and past tabs with real-time updates.
 */
export default function DashboardPage() {
  const { data: user } = useCurrentUser();
  const { bookings, isLoading, error, refetch } = useMyBookings();

  // Enable real-time updates for bookings
  useMyBookingsRealtime(user?.id);

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Bookings</h2>
        <p className="mt-1 text-sm text-gray-600">
          View and manage your upcoming and past meetings
        </p>
      </div>

      <BookingsList
        bookings={bookings}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        currentUserId={user?.id || ''}
      />
    </>
  );
}
