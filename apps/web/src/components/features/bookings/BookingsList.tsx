/**
 * BookingsList Component
 *
 * Displays user's bookings organized into tabs:
 * - Upcoming: Future meetings (sorted by date ascending)
 * - Past: Completed/canceled meetings (sorted by date descending)
 */

// External dependencies
import { useState, lazy, Suspense } from 'react';
import { isBefore, parseISO } from 'date-fns';

// Internal modules
import { BookingCard } from './BookingCard';
import { BookingCardSkeleton } from './BookingCardSkeleton';
import { Button } from '@/components/ui/button';
import type { MyBooking } from '@/services/api/bookings';

// Component-specific dynamic imports for better code splitting
const CalendarIcon = lazy(() => import('lucide-react').then(mod => ({ default: mod.Calendar })));

// Types
interface BookingsListProps {
  bookings: MyBooking[];
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  currentUserId: string;
}

type Tab = 'upcoming' | 'past';

/**
 * Empty state component.
 */
function EmptyState({ tab, onFindMentors }: { tab: Tab; onFindMentors?: () => void }) {
  const messages = {
    upcoming: {
      title: 'No upcoming bookings',
      description: "You don't have any scheduled meetings yet. Find a mentor to get started!",
      showCTA: true,
    },
    past: {
      title: 'No past bookings',
      description: 'Your completed meetings will appear here.',
      showCTA: false,
    },
  };

  const message = messages[tab];

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Suspense fallback={<div className="w-16 h-16 bg-gray-200 animate-pulse rounded mb-4" />}>
        <CalendarIcon className="w-16 h-16 text-gray-300 mb-4" />
      </Suspense>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{message.title}</h3>
      <p className="text-sm text-gray-600 mb-6 max-w-md">{message.description}</p>
      {message.showCTA && onFindMentors && <Button onClick={onFindMentors}>Find Mentors</Button>}
    </div>
  );
}

/**
 * Error display component.
 */
function ErrorDisplay({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-red-500 mb-4">
        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load bookings</h3>
      <p className="text-sm text-gray-600 mb-6">{error.message}</p>
      <Button onClick={onRetry} variant="outline">
        Try Again
      </Button>
    </div>
  );
}

/**
 * Tab button component.
 */
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        active ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

/**
 * BookingsList displays bookings in tabs with filtering and sorting.
 *
 * - Upcoming tab: Shows future bookings sorted by date (earliest first)
 * - Past tab: Shows past bookings sorted by date (most recent first)
 * - Handles loading, error, and empty states
 * - Responsive grid layout
 */
export function BookingsList({
  bookings,
  isLoading,
  error,
  onRetry,
  currentUserId,
}: BookingsListProps) {
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');

  // Filter and sort bookings
  const now = new Date();
  const upcomingBookings = bookings
    .filter(booking => {
      const startTime = parseISO(booking.time_slot.start_time);
      return isBefore(now, startTime) && booking.status !== 'canceled';
    })
    .sort((a, b) => {
      // Sort ascending (earliest first)
      return (
        parseISO(a.time_slot.start_time).getTime() - parseISO(b.time_slot.start_time).getTime()
      );
    });

  const pastBookings = bookings
    .filter(booking => {
      const startTime = parseISO(booking.time_slot.start_time);
      return !isBefore(now, startTime) || booking.status === 'canceled';
    })
    .sort((a, b) => {
      // Sort descending (most recent first)
      return (
        parseISO(b.time_slot.start_time).getTime() - parseISO(a.time_slot.start_time).getTime()
      );
    });

  const displayedBookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-2">
          <TabButton active={activeTab === 'upcoming'} onClick={() => setActiveTab('upcoming')}>
            Upcoming
          </TabButton>
          <TabButton active={activeTab === 'past'} onClick={() => setActiveTab('past')}>
            Past
          </TabButton>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <BookingCardSkeleton />
          <BookingCardSkeleton />
          <BookingCardSkeleton />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return <ErrorDisplay error={error} onRetry={onRetry} />;
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2">
        <TabButton active={activeTab === 'upcoming'} onClick={() => setActiveTab('upcoming')}>
          Upcoming ({upcomingBookings.length})
        </TabButton>
        <TabButton active={activeTab === 'past'} onClick={() => setActiveTab('past')}>
          Past ({pastBookings.length})
        </TabButton>
      </div>

      {/* Bookings Grid */}
      {displayedBookings.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedBookings.map(booking => (
            <BookingCard
              key={booking.id}
              booking={booking}
              currentUserId={currentUserId}
              onClick={bookingId => {
                // TODO: Navigate to booking detail page (future story)
                console.log('Navigate to booking:', bookingId);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
