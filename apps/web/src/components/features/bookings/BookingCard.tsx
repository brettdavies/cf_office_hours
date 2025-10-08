/**
 * BookingCard Component
 *
 * Displays a single booking with participant info, meeting time,
 * status, and meeting goal.
 */

// External dependencies
import { format, parseISO } from 'date-fns';
import { Calendar, Clock } from 'lucide-react';

// Internal modules
import { Card } from '@/components/ui/card';
import type { MyBooking } from '@/services/api/bookings';

// Types
interface BookingCardProps {
  booking: MyBooking;
  currentUserId: string;
  onClick?: (bookingId: string) => void;
}

/**
 * Badge component for booking status.
 */
function StatusBadge({ status }: { status: MyBooking['status'] }) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    canceled: 'bg-red-100 text-red-800 border-red-200',
    expired: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const labels = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    completed: 'Completed',
    canceled: 'Canceled',
    expired: 'Expired',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

/**
 * Simple avatar component showing user initials.
 */
function UserAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className="w-12 h-12 rounded-full object-cover" />;
  }

  return (
    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
      {initials}
    </div>
  );
}

/**
 * BookingCard displays a single booking with:
 * - Other participant's name and avatar
 * - Meeting date and time
 * - Meeting status badge
 * - Meeting goal (truncated with tooltip)
 *
 * Clicking the card triggers navigation to booking details (future story).
 */
export function BookingCard({ booking, currentUserId, onClick }: BookingCardProps) {
  // Determine if current user is mentee or mentor
  const isMentee = booking.mentee_id === currentUserId;
  const otherParticipant = isMentee ? booking.mentor : booking.mentee;
  const role = isMentee ? 'Mentor' : 'Mentee';

  // Format date and time
  const startTime = parseISO(booking.time_slot.start_time);
  const dateStr = format(startTime, 'MMM d, yyyy');
  const timeStr = format(startTime, 'h:mm a');

  // Truncate meeting goal if too long
  const maxGoalLength = 100;
  const truncatedGoal =
    booking.meeting_goal.length > maxGoalLength
      ? `${booking.meeting_goal.slice(0, maxGoalLength)}...`
      : booking.meeting_goal;

  const handleClick = () => {
    if (onClick) {
      onClick(booking.id);
    }
  };

  return (
    <Card
      className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
      aria-label={`Booking with ${otherParticipant.profile.name} on ${dateStr} at ${timeStr}`}
    >
      <div className="flex items-start gap-4">
        {/* Participant Avatar */}
        <UserAvatar
          name={otherParticipant.profile.name}
          avatarUrl={otherParticipant.profile.avatar_url}
        />

        {/* Booking Details */}
        <div className="flex-1 min-w-0">
          {/* Header: Name and Status */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {otherParticipant.profile.name}
              </h3>
              <p className="text-sm text-gray-500">{role}</p>
            </div>
            <StatusBadge status={booking.status} />
          </div>

          {/* Date and Time */}
          <div className="space-y-1 mb-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{dateStr}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{timeStr}</span>
            </div>
          </div>

          {/* Meeting Goal */}
          <div className="text-sm text-gray-700">
            <p className="line-clamp-2" title={booking.meeting_goal}>
              {truncatedGoal}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
