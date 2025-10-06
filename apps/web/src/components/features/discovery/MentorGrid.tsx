/**
 * Mentor Grid Component
 *
 * Responsive grid layout for displaying mentor cards.
 * 3 columns on desktop, 2 on tablet, 1 on mobile.
 */

// Internal modules
import { UserCard } from './UserCard';

// Types
import type { UserWithProfile } from '@/types/user';

interface MentorGridProps {
  mentors: UserWithProfile[];
  onViewProfile: (userId: string) => void;
}

/**
 * MentorGrid displays mentors in a responsive grid layout.
 *
 * @param mentors - Array of users with profiles to display
 * @param onViewProfile - Callback when a mentor's "View Profile" is clicked
 */
export function MentorGrid({ mentors, onViewProfile }: MentorGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {mentors.map(mentor => (
        <UserCard key={mentor.id} user={mentor} onViewProfile={onViewProfile} />
      ))}
    </div>
  );
}
