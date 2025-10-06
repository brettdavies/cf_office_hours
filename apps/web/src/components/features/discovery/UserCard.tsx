/**
 * User Card Component
 *
 * Displays a user card for mentor discovery.
 * Shows avatar, name, title, reputation badge, and tags.
 */

// External dependencies
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Internal modules
import { ReputationBadge } from '@/components/common/ReputationBadge';
import { TagsList } from '@/components/common/TagsList';

// Types
import type { UserWithProfile } from '@/types/user';

interface UserCardProps {
  user: UserWithProfile;
  onViewProfile: (userId: string) => void;
}

/**
 * Truncates text to max length with ellipsis.
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum character length
 * @returns Truncated text with ... if needed
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Get initials from user name.
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * UserCard displays a mentor's information in a card format.
 *
 * For Epic 0, uses placeholder reputation tier and empty tags array.
 * Epic 4 will add real reputation calculation.
 * Epic 6 will add real tags from user profiles.
 *
 * @param user - User object with profile
 * @param onViewProfile - Callback when "View Profile" button is clicked
 */
export function UserCard({ user, onViewProfile }: UserCardProps) {
  const { profile } = user;

  // Epic 0: Placeholder values until reputation system is implemented
  const tier = 'silver' as const;
  const reputationScore = 4.0;

  // Epic 0: Empty tags until tag system is implemented
  const tags: string[] = [];

  const displayName = truncate(profile.name, 30);
  const displayTitle = profile.title ? truncate(profile.title, 50) : 'No title';
  const initials = getInitials(profile.name);

  return (
    <Card
      className="min-h-[300px] flex flex-col hover:shadow-lg transition-shadow"
      data-testid="mentor-card"
    >
      <CardContent className="flex-1 pt-6">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Avatar */}
          <Avatar className="h-12 w-12">
            <AvatarImage src={undefined} alt={profile.name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>

          {/* Name */}
          <div>
            <h3 className="font-semibold text-lg">{displayName}</h3>
            <p className="text-sm text-gray-600">{displayTitle}</p>
          </div>

          {/* Reputation Badge */}
          <ReputationBadge tier={tier} score={reputationScore} showScore={true} />

          {/* Tags */}
          {tags.length > 0 && (
            <div className="w-full">
              <TagsList tags={tags} maxTags={5} />
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => onViewProfile(user.id)}
          data-testid="view-profile-button"
        >
          View Profile
        </Button>
      </CardFooter>
    </Card>
  );
}
