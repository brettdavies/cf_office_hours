/**
 * Browse Mentors Page
 *
 * Displays list of available mentors in a responsive grid.
 * Handles loading, error, and empty states.
 */

// External dependencies
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';

// Internal modules
import { MentorGrid } from '@/components/features/discovery/MentorGrid';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { useMentors } from '@/hooks/useUsers';

/**
 * BrowseMentorsPage allows mentees to discover available mentors.
 *
 * Shows:
 * - Loading state with spinner while fetching
 * - Error state with retry button if fetch fails
 * - Empty state if no mentors exist
 * - Grid of mentor cards on success
 *
 * Clicking "View Profile" navigates to /profile/{mentorId}
 */
export default function BrowseMentorsPage() {
  const navigate = useNavigate();
  const { data: mentors, isLoading, error, refetch } = useMentors();

  const handleViewProfile = (userId: string) => {
    navigate(`/mentors/${userId}`);
  };

  if (import.meta.env.DEV) {
    console.log('[MENTORS] Browse mentors page loaded', {
      mentorsCount: mentors?.length ?? 0,
      isLoading,
      hasError: !!error,
      timestamp: new Date().toISOString(),
    });
  }

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading mentors..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        title="Unable to load mentors"
        message={error.message}
        onRetry={() => refetch()}
        retryLabel="Retry"
      />
    );
  }

  if (!mentors || mentors.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No mentors available"
        description="Check back soon!"
      />
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Browse Mentors</h1>
      <MentorGrid mentors={mentors} onViewProfile={handleViewProfile} />
    </div>
  );
}
