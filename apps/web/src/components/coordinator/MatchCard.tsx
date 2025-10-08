/**
 * Match Card Component
 *
 * Displays a single match result with user information and match score.
 * Used in the match results grid to show recommended matches.
 */

// Internal modules
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  getInitials,
  getReputationTierColor,
  getRoleColor,
  getScoreColorAndLabel,
} from '@/lib/user-utils';

// Types
import type { paths } from '@shared/types/api.generated';

type MatchResult =
  paths['/v1/matching/find-matches']['post']['responses']['200']['content']['application/json']['matches'][number];

interface MatchCardProps {
  match: MatchResult;
  onExplainClick: () => void;
}

export function MatchCard({ match, onExplainClick }: MatchCardProps) {
  const user = match.user;
  const score = match.score;
  const displayName = user.profile?.name || user.email || 'Unknown User';
  const avatarUrl = user.profile?.avatar_url || null;
  const role = user.role;
  const reputationTier = user.reputation_tier || 'bronze';

  // Get tags (max 5 visible with overflow)
  const tags = user.tags || [];
  const visibleTags = tags.slice(0, 5);
  const hasMoreTags = tags.length > 5;

  // Get score color and label
  const { color: scoreColor, label: scoreLabel } = getScoreColorAndLabel(score);

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-4 flex flex-col h-full">
        {/* User Info */}
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar */}
          <Avatar className="h-12 w-12">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
          </Avatar>

          {/* Name and Role */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{displayName}</h3>
            <div className="flex gap-2 mt-1">
              <Badge className={getRoleColor(role)}>{role}</Badge>
              <Badge className={getReputationTierColor(reputationTier)}>
                {reputationTier.charAt(0).toUpperCase() + reputationTier.slice(1)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Tags */}
        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
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

        {/* Match Score */}
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Match Score</span>
            <span className="text-xs text-muted-foreground">{scoreLabel}</span>
          </div>
          <div className={`text-3xl font-bold ${scoreColor}`}>{score}</div>
        </div>

        {/* Explain Match Button */}
        <Button onClick={onExplainClick} variant="outline" className="w-full mt-3" size="sm">
          Explain Match
        </Button>
      </CardContent>
    </Card>
  );
}
