// External dependencies
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

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
  const { user, signOut } = useAuth();
  const { bookings, isLoading, error, refetch } = useMyBookings();

  // Enable real-time updates for bookings
  useMyBookingsRealtime(user?.id);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div>
              <h1 className="text-xl font-bold">CF Office Hours</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/availability">
                <Button variant="ghost">Availability</Button>
              </Link>
              <Link to="/profile">
                <Button variant="ghost">Profile</Button>
              </Link>
              <span className="text-sm text-gray-700">{user?.email}</span>
              <Button variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      </main>
    </div>
  );
}
