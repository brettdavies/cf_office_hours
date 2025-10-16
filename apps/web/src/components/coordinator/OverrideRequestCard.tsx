/**
 * Override Request Card Component
 *
 * Displays a single tier override request with mentor/mentee info,
 * tier difference visualization, and approve/decline actions.
 */

// External dependencies
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ReputationBadge } from '@/components/common/ReputationBadge';
import { Check, X, Clock, ArrowRight, User } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

// Types
import type { TierOverrideRequest } from '@/services/api/bookings';

interface OverrideRequestCardProps {
  request: TierOverrideRequest;
  isSelected: boolean;
  isFadingOut: boolean;
  isFocused?: boolean;
  onToggleSelect: () => void;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
}

/**
 * Gets initials from a name for avatar fallback.
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Card component for displaying a tier override request.
 */
export function OverrideRequestCard({
  request,
  isSelected,
  isFadingOut,
  isFocused = false,
  onToggleSelect,
  onApprove,
  onDecline,
}: OverrideRequestCardProps) {
  const { id, mentee, mentor, match_score, created_at, expires_at } = request;

  // Handle nullable tiers (default to bronze if null)
  const mentorTier = mentor.reputation_tier || 'bronze';
  const menteeTier = mentee.reputation_tier || 'bronze';

  // Calculate time metrics
  const pendingFor = formatDistanceToNow(new Date(created_at), { addSuffix: true });

  // Calculate expiration with explicit millisecond precision
  const expiresAtDate = new Date(expires_at);
  const nowMs = Date.now();
  const expiresAtMs = expiresAtDate.getTime();
  const msUntilExpiration = expiresAtMs - nowMs;
  const hoursUntilExpiration = msUntilExpiration / (1000 * 60 * 60);

  // Determine urgency level based on hours until expiration
  // Red/urgent: ≤36 hours, Yellow/warning: 36-72 hours, Normal: >72 hours
  const getUrgencyLevel = () => {
    if (hoursUntilExpiration <= 0) return 'expired';
    if (hoursUntilExpiration <= 36) return 'urgent';
    if (hoursUntilExpiration <= 72) return 'warning';
    return 'normal';
  };

  const urgencyLevel = getUrgencyLevel();
  const showUrgencyBadge = urgencyLevel === 'urgent' || urgencyLevel === 'warning';

  // Format expiration time
  const expiresIn = hoursUntilExpiration <= 0
    ? 'Expired'
    : hoursUntilExpiration < 72
    ? `${Math.round(hoursUntilExpiration)} hours`
    : formatDistanceToNow(expiresAtDate, { addSuffix: false });

  return (
    <Card
      className={cn(
        'transition-all duration-300 hover:shadow-md',
        isSelected && 'ring-2 ring-primary',
        isFocused && 'ring-2 ring-blue-500 shadow-lg',
        isFadingOut && 'opacity-50 scale-95',
        urgencyLevel === 'urgent' && 'border-red-300',
        urgencyLevel === 'warning' && 'border-yellow-300'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`select-${id}`}
              checked={isSelected}
              onCheckedChange={onToggleSelect}
              aria-label="Select request"
            />
            <label htmlFor={`select-${id}`} className="text-xs text-muted-foreground cursor-pointer">
              Select
            </label>
          </div>
          {showUrgencyBadge && (
            <Badge
              variant={urgencyLevel === 'urgent' ? 'destructive' : 'default'}
              className={cn(
                'text-xs',
                urgencyLevel === 'warning' && 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
              )}
            >
              Expires in {expiresIn}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Mentee and Mentor Side by Side */}
        <div className="flex items-center gap-2">
          {/* Mentee Section */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Mentee</span>
            </div>
            <Link
              to={`/profile/${mentee.id}`}
              className="flex items-center gap-2 hover:bg-accent rounded-md p-1 -m-1 transition-all duration-150 group"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{getInitials(mentee.profile.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate group-hover:underline">{mentee.profile.name}</p>
                <ReputationBadge tier={menteeTier} showScore={false} />
              </div>
            </Link>
          </div>

          {/* Arrow Separator */}
          <div className="flex-shrink-0 pt-5">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Mentor Section */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Mentor</span>
            </div>
            <Link
              to={`/profile/${mentor.id}`}
              className="flex items-center gap-2 hover:bg-accent rounded-md p-1 -m-1 transition-all duration-150 group"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{getInitials(mentor.profile.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate group-hover:underline">{mentor.profile.name}</p>
                <ReputationBadge tier={mentorTier} showScore={false} />
              </div>
            </Link>
          </div>
        </div>

        {/* Match Score */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Match Score</span>
            <span className="font-semibold">{match_score ? match_score.toFixed(2) : 'N/A'}</span>
          </div>
        </div>

        {/* Time Info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative cursor-help group/tooltip inline-flex">
            <Clock className="h-3 w-3" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity duration-150 z-10">
              Requested on {format(new Date(created_at), 'PPp')}
            </span>
          </span>
          <span>Requested {pendingFor}</span>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 pt-3">
        <Button
          variant="default"
          size="sm"
          className="flex-1"
          onClick={() => onApprove(id)}
          disabled={isFadingOut}
        >
          <Check className="h-4 w-4 mr-1" />
          Approve
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onDecline(id)}
          disabled={isFadingOut}
        >
          <X className="h-4 w-4 mr-1" />
          Decline
        </Button>
      </CardFooter>
    </Card>
  );
}
