/**
 * User Card Component
 *
 * Displays user profile information including avatar, name, role, tags, and reputation tier.
 * Used in the coordinator matching interface to show selected users and match results.
 */

// Internal modules
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getInitials, getReputationTierColor, getRoleColor } from '@/lib/user-utils';

// Types
import type { paths } from '@shared/types/api.generated';

type MatchUser =
  paths['/v1/matching/find-matches']['post']['responses']['200']['content']['application/json']['matches'][number]['user'];

interface UserCardProps {
  user: MatchUser;
  className?: string;
}

export function UserCard({ user, className }: UserCardProps) {
  const displayName = user.profile?.name || user.email || 'Unknown User';
  const avatarUrl = user.profile?.avatar_url || null;
  const role = user.role;
  const reputationTier = user.reputation_tier || 'bronze';

  // Get tags from user profile (Story specifies max 5 visible with overflow)
  const tags = user.tags || [];
  const visibleTags = tags.slice(0, 5);
  const hasMoreTags = tags.length > 5;

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-12 w-12">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
          </Avatar>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            {/* Name */}
            <h3 className="font-semibold text-lg truncate">{displayName}</h3>

            {/* Role and Reputation Tier Badges */}
            <div className="flex gap-2 mt-1 mb-2">
              <Badge className={getRoleColor(role)}>{role}</Badge>
              <Badge className={getReputationTierColor(reputationTier)}>
                {reputationTier.charAt(0).toUpperCase() + reputationTier.slice(1)}
              </Badge>
            </div>

            {/* Tags */}
            {visibleTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {visibleTags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag.display_name}
                  </Badge>
                ))}
                {hasMoreTags && (
                  <Badge variant="outline" className="text-xs">
                    +{tags.length - 5} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
