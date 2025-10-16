// External dependencies
import { useCurrentUser } from '@/hooks/useCurrentUser';

// Internal modules
import { BookingsList } from '@/components/features/bookings/BookingsList';
import { useMyBookings } from '@/hooks/useMyBookings';
import { useMyBookingsRealtime } from '@/hooks/useRealtime';
import { CoordinatorDashboardPage } from '@/pages/coordinator/CoordinatorDashboardPage';

/**
 * Dashboard page - main view after authentication.
 *
 * For mentees/mentors: displays all user bookings organized into
 * upcoming and past tabs with real-time updates.
 *
 * For coordinators: displays pending tier override requests.
 */
export default function DashboardPage() {
  const { data: user } = useCurrentUser();
  const { bookings, isLoading, error, refetch } = useMyBookings();

  // Enable real-time updates for bookings
  useMyBookingsRealtime(user?.id);

  // Show coordinator dashboard for coordinators
  if (user?.role === 'coordinator') {
    return <CoordinatorDashboardPage />;
  }

  // Show bookings dashboard for mentees/mentors
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
