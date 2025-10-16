/**
 * Coordinator Dashboard Page
 *
 * Displays pending tier override requests for coordinators to review and manage.
 * Features filtering, sorting, bulk actions, and local state management for approve/decline.
 */

// External dependencies
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

// Internal modules
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNotificationStore } from '@/stores/notificationStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { OverrideRequestCard } from '@/components/coordinator/OverrideRequestCard';
import { useTierOverrides } from '@/hooks/useTierOverrides';
import { AlertCircle, Filter, CheckCircle } from 'lucide-react';

// Types
import type { TierOverrideRequest } from '@/services/api/bookings';

type ReputationTier = 'bronze' | 'silver' | 'gold' | 'platinum';

type SortOption =
  | 'time_pending_asc'
  | 'time_pending_desc'
  | 'expiration_asc'
  | 'expiration_desc'
  | 'mentee_name_asc'
  | 'mentee_name_desc'
  | 'mentor_name_asc'
  | 'mentor_name_desc'
  | 'match_score_asc'
  | 'match_score_desc';

type MatchScoreBucket = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';

interface Filters {
  mentorTiers: ReputationTier[];
  menteeTiers: ReputationTier[];
  tierDifferences: number[];
  matchScoreBuckets: MatchScoreBucket[];
}

const tierValues: Record<ReputationTier, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 4,
};

const sortLabels: Record<SortOption, string> = {
  time_pending_asc: 'Time Pending (Oldest First)',
  time_pending_desc: 'Time Pending (Newest First)',
  expiration_asc: 'Time Until Expiration (Soonest First)',
  expiration_desc: 'Time Until Expiration (Latest First)',
  mentee_name_asc: 'Mentee Name (A-Z)',
  mentee_name_desc: 'Mentee Name (Z-A)',
  mentor_name_asc: 'Mentor Name (A-Z)',
  mentor_name_desc: 'Mentor Name (Z-A)',
  match_score_asc: 'Match Score (Lowest First)',
  match_score_desc: 'Match Score (Highest First)',
};

const matchScoreBucketLabels: Record<MatchScoreBucket, string> = {
  excellent: 'Excellent (80-100)',
  good: 'Good (60-79)',
  fair: 'Fair (40-59)',
  poor: 'Poor (0-39)',
  unknown: 'Unknown',
};

/**
 * Calculates tier difference between mentor and mentee.
 */
function getTierDifference(mentorTier: ReputationTier, menteeTier: ReputationTier): number {
  return tierValues[mentorTier] - tierValues[menteeTier];
}

/**
 * Determines match score bucket for a given score.
 */
function getMatchScoreBucket(score: number | null | undefined): MatchScoreBucket {
  if (score === null || score === undefined) return 'unknown';
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

/**
 * Default filter values
 */
const DEFAULT_FILTERS: Filters = {
  mentorTiers: ['bronze', 'silver', 'gold', 'platinum'],
  menteeTiers: ['bronze', 'silver', 'gold', 'platinum'],
  tierDifferences: [2, 3, 4],
  matchScoreBuckets: ['excellent', 'good', 'fair', 'poor', 'unknown'],
};

/**
 * Parse filters from URL search params
 */
function parseFiltersFromURL(searchParams: URLSearchParams): Filters {
  const mentorTiers = searchParams.get('mentorTiers')?.split(',').filter(Boolean) as ReputationTier[] | undefined;
  const menteeTiers = searchParams.get('menteeTiers')?.split(',').filter(Boolean) as ReputationTier[] | undefined;
  const tierDifferences = searchParams.get('tierDiffs')?.split(',').map(Number).filter(n => !isNaN(n));
  const matchScoreBuckets = searchParams.get('matchScores')?.split(',').filter(Boolean) as MatchScoreBucket[] | undefined;

  return {
    mentorTiers: mentorTiers && mentorTiers.length > 0 ? mentorTiers : DEFAULT_FILTERS.mentorTiers,
    menteeTiers: menteeTiers && menteeTiers.length > 0 ? menteeTiers : DEFAULT_FILTERS.menteeTiers,
    tierDifferences: tierDifferences && tierDifferences.length > 0 ? tierDifferences : DEFAULT_FILTERS.tierDifferences,
    matchScoreBuckets: matchScoreBuckets && matchScoreBuckets.length > 0 ? matchScoreBuckets : DEFAULT_FILTERS.matchScoreBuckets,
  };
}

/**
 * Parse sort option from URL search params
 */
function parseSortFromURL(searchParams: URLSearchParams): SortOption {
  const sort = searchParams.get('sort') as SortOption | null;
  return sort && sort in sortLabels ? sort : 'time_pending_asc';
}

/**
 * Main coordinator dashboard component for managing tier override requests.
 */
export function CoordinatorDashboardPage() {
  const { requests, isLoading, error, refetch } = useTierOverrides();
  const { addToast } = useNotificationStore();
  const [searchParams, setSearchParams] = useSearchParams();

  // Local state for displayed requests (modified by approve/decline actions)
  const [displayedRequests, setDisplayedRequests] = useState<TierOverrideRequest[]>([]);
  const [fadingOutIds, setFadingOutIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Filtering and sorting state - initialized from URL
  const [sortBy, setSortBy] = useState<SortOption>(() => parseSortFromURL(searchParams));
  const [filters, setFilters] = useState<Filters>(() => parseFiltersFromURL(searchParams));
  const [showFilters, setShowFilters] = useState(false);

  // Update URL when sort or filters change
  useEffect(() => {
    const params = new URLSearchParams();

    // Add sort param
    if (sortBy !== 'time_pending_asc') {
      params.set('sort', sortBy);
    }

    // Add filter params only if they differ from defaults
    if (filters.mentorTiers.length !== 4 || filters.mentorTiers.some(t => !DEFAULT_FILTERS.mentorTiers.includes(t))) {
      params.set('mentorTiers', filters.mentorTiers.join(','));
    }
    if (filters.menteeTiers.length !== 4 || filters.menteeTiers.some(t => !DEFAULT_FILTERS.menteeTiers.includes(t))) {
      params.set('menteeTiers', filters.menteeTiers.join(','));
    }
    if (filters.tierDifferences.length !== 3 || filters.tierDifferences.some(d => !DEFAULT_FILTERS.tierDifferences.includes(d))) {
      params.set('tierDiffs', filters.tierDifferences.join(','));
    }
    if (filters.matchScoreBuckets.length !== 5 || filters.matchScoreBuckets.some(b => !DEFAULT_FILTERS.matchScoreBuckets.includes(b))) {
      params.set('matchScores', filters.matchScoreBuckets.join(','));
    }

    // Update URL without causing navigation
    setSearchParams(params, { replace: true });
  }, [sortBy, filters, setSearchParams]);

  // Approve handler (extracted for reuse)
  const handleApprove = (id: string) => {
    const request = displayedRequests.find(r => r.id === id);
    if (!request) return;

    // Mark as fading out
    setFadingOutIds(prev => new Set(prev).add(id));

    // Wait for fade animation, then remove from local state
    setTimeout(() => {
      setDisplayedRequests(prev => prev.filter(r => r.id !== id));
      setFadingOutIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      // Show success toast
      addToast({
        title: 'Request Approved',
        description: `Override request approved for ${request.mentee.profile.name} → ${request.mentor.profile.name}`,
        variant: 'success',
      });
    }, 300);
  };

  // Decline handler (extracted for reuse)
  const handleDecline = (id: string) => {
    const request = displayedRequests.find(r => r.id === id);
    if (!request) return;

    // Mark as fading out
    setFadingOutIds(prev => new Set(prev).add(id));

    // Wait for fade animation, then remove from local state
    setTimeout(() => {
      setDisplayedRequests(prev => prev.filter(r => r.id !== id));
      setFadingOutIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      // Show success toast
      addToast({
        title: 'Request Declined',
        description: `Override request declined for ${request.mentee.profile.name} → ${request.mentor.profile.name}`,
        variant: 'default',
      });
    }, 300);
  };

  // Bulk approve handler (extracted for reuse)
  const handleBulkApprove = () => {
    const idsArray = Array.from(selectedIds);

    // Mark all as fading out with 50ms stagger
    idsArray.forEach((id, index) => {
      setTimeout(() => {
        setFadingOutIds(prev => new Set(prev).add(id));
      }, index * 50);
    });

    // Remove from state and show toasts with 100ms stagger
    idsArray.forEach((id, index) => {
      setTimeout(() => {
        const request = displayedRequests.find(r => r.id === id);
        if (request) {
          addToast({
            title: 'Request Approved',
            description: `${request.mentee.profile.name} → ${request.mentor.profile.name}`,
            variant: 'success',
          });
        }
      }, index * 100);
    });

    // Remove all cards after animations complete
    setTimeout(() => {
      setDisplayedRequests(prev => prev.filter(r => !selectedIds.has(r.id)));
      setFadingOutIds(new Set());
      setSelectedIds(new Set());
    }, idsArray.length * 50 + 300);
  };

  // Bulk decline handler (extracted for reuse)
  const handleBulkDecline = () => {
    const idsArray = Array.from(selectedIds);

    // Mark all as fading out with 50ms stagger
    idsArray.forEach((id, index) => {
      setTimeout(() => {
        setFadingOutIds(prev => new Set(prev).add(id));
      }, index * 50);
    });

    // Remove from state and show toasts with 100ms stagger
    idsArray.forEach((id, index) => {
      setTimeout(() => {
        const request = displayedRequests.find(r => r.id === id);
        if (request) {
          addToast({
            title: 'Request Declined',
            description: `${request.mentee.profile.name} → ${request.mentor.profile.name}`,
            variant: 'default',
          });
        }
      }, index * 100);
    });

    // Remove all cards after animations complete
    setTimeout(() => {
      setDisplayedRequests(prev => prev.filter(r => !selectedIds.has(r.id)));
      setFadingOutIds(new Set());
      setSelectedIds(new Set());
    }, idsArray.length * 50 + 300);
  };

  // Update displayed requests when API data changes
  useMemo(() => {
    if (requests.length > 0) {
      setDisplayedRequests(requests);
    }
  }, [requests]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return displayedRequests.filter(request => {
      const mentorTier = request.mentor.reputation_tier;
      const menteeTier = request.mentee.reputation_tier;

      if (!mentorTier || !menteeTier) return false;

      // Mentor tier filter
      if (!filters.mentorTiers.includes(mentorTier)) return false;

      // Mentee tier filter
      if (!filters.menteeTiers.includes(menteeTier)) return false;

      // Tier difference filter
      const diff = getTierDifference(mentorTier, menteeTier);
      if (!filters.tierDifferences.includes(diff)) return false;

      // Match score bucket filter
      const bucket = getMatchScoreBucket(request.match_score);
      if (!filters.matchScoreBuckets.includes(bucket)) return false;

      return true;
    });
  }, [displayedRequests, filters]);

  // Sort requests
  const sortedRequests = useMemo(() => {
    const sorted = [...filteredRequests];

    const sortFns: Record<SortOption, (a: TierOverrideRequest, b: TierOverrideRequest) => number> =
      {
        time_pending_asc: (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        time_pending_desc: (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        expiration_asc: (a, b) =>
          new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime(),
        expiration_desc: (a, b) =>
          new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime(),
        mentee_name_asc: (a, b) => a.mentee.profile.name.localeCompare(b.mentee.profile.name),
        mentee_name_desc: (a, b) => b.mentee.profile.name.localeCompare(a.mentee.profile.name),
        mentor_name_asc: (a, b) => a.mentor.profile.name.localeCompare(b.mentor.profile.name),
        mentor_name_desc: (a, b) => b.mentor.profile.name.localeCompare(a.mentor.profile.name),
        match_score_asc: (a, b) => {
          // Nulls go to the end
          if (a.match_score === null || a.match_score === undefined) return 1;
          if (b.match_score === null || b.match_score === undefined) return -1;
          return a.match_score - b.match_score;
        },
        match_score_desc: (a, b) => {
          // Nulls go to the end
          if (a.match_score === null || a.match_score === undefined) return 1;
          if (b.match_score === null || b.match_score === undefined) return -1;
          return b.match_score - a.match_score;
        },
      };

    return sorted.sort(sortFns[sortBy]);
  }, [filteredRequests, sortBy]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keyboard shortcuts if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      const visibleRequests = sortedRequests.filter(r => !fadingOutIds.has(r.id));
      if (visibleRequests.length === 0) return;

      // Handle Ctrl+A / Cmd+A for Select All / Deselect All
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (selectedIds.size === visibleRequests.length) {
          // Deselect all
          setSelectedIds(new Set());
        } else {
          // Select all
          setSelectedIds(new Set(visibleRequests.map(r => r.id)));
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          setFocusedIndex(prev => (prev + 1) % visibleRequests.length);
          break;

        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          setFocusedIndex(prev => (prev - 1 + visibleRequests.length) % visibleRequests.length);
          break;

        case 'Tab':
          if (focusedIndex === -1) {
            e.preventDefault();
            setFocusedIndex(e.shiftKey ? visibleRequests.length - 1 : 0);
          }
          break;

        case ' ':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < visibleRequests.length) {
            const request = visibleRequests[focusedIndex];
            setSelectedIds(prev => {
              const next = new Set(prev);
              if (next.has(request.id)) {
                next.delete(request.id);
              } else {
                next.add(request.id);
              }
              return next;
            });
          }
          break;

        case 'Enter':
          e.preventDefault();
          // If cards are selected, approve all selected. Otherwise approve focused card.
          if (selectedIds.size > 0) {
            handleBulkApprove();
          } else if (focusedIndex >= 0 && focusedIndex < visibleRequests.length) {
            const request = visibleRequests[focusedIndex];
            handleApprove(request.id);
          }
          break;

        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          // If cards are selected, decline all selected. Otherwise decline focused card.
          if (selectedIds.size > 0) {
            handleBulkDecline();
          } else if (focusedIndex >= 0 && focusedIndex < visibleRequests.length) {
            const request = visibleRequests[focusedIndex];
            handleDecline(request.id);
          }
          break;

        case 'Escape':
          e.preventDefault();
          setFocusedIndex(-1);
          setSelectedIds(new Set());
          break;

        case 'a':
        case 'A':
          e.preventDefault();
          // If cards are selected, approve all selected. Otherwise approve focused card.
          if (selectedIds.size > 0) {
            handleBulkApprove();
          } else if (focusedIndex >= 0 && focusedIndex < visibleRequests.length) {
            const request = visibleRequests[focusedIndex];
            handleApprove(request.id);
          }
          break;

        case 'd':
        case 'D':
          e.preventDefault();
          // If cards are selected, decline all selected. Otherwise decline focused card.
          if (selectedIds.size > 0) {
            handleBulkDecline();
          } else if (focusedIndex >= 0 && focusedIndex < visibleRequests.length) {
            const request = visibleRequests[focusedIndex];
            handleDecline(request.id);
          }
          break;

        case '?':
        case '/':
          e.preventDefault();
          setShowShortcuts(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, sortedRequests, fadingOutIds, selectedIds, handleApprove, handleDecline, handleBulkApprove, handleBulkDecline, setSelectedIds, setShowShortcuts]);

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Skeleton className="h-10 w-96 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load override requests.{' '}
            <Button variant="link" onClick={() => refetch()} className="p-0 h-auto">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Empty state - no requests from API
  if (requests.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No pending override requests</h2>
          <p className="text-muted-foreground">There are no tier override requests at this time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Pending Override Requests
            <Badge variant="secondary">{sortedRequests.length}</Badge>
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and manage mentee requests to book higher-tier mentors
            {sortedRequests.length < displayedRequests.length && (
              <span className="ml-2 text-sm">
                • Showing {sortedRequests.length} of {displayedRequests.length} requests
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowShortcuts(!showShortcuts)}
          className="flex items-center gap-2"
          title="Keyboard shortcuts (press ? or /)"
        >
          <span className="font-bold">?</span>
          Shortcuts
        </Button>
      </div>

      {/* Collapsible Keyboard Shortcuts Help */}
      {showShortcuts && (
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <AlertDescription>
            <div className="flex items-start justify-between">
              <div>
                <strong className="font-semibold block mb-2">Keyboard Shortcuts</strong>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div>
                    <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">↑↓←→</kbd>
                    <span className="ml-2">Navigate cards</span>
                  </div>
                  <div>
                    <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">Space</kbd>
                    <span className="ml-2">Toggle selection</span>
                  </div>
                  <div>
                    <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">Ctrl/Cmd+A</kbd>
                    <span className="ml-2">Select/Deselect all</span>
                  </div>
                  <div>
                    <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">Enter</kbd> or{' '}
                    <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">A</kbd>
                    <span className="ml-2">Approve</span>
                  </div>
                  <div>
                    <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">Del</kbd> or{' '}
                    <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">D</kbd>
                    <span className="ml-2">Decline</span>
                  </div>
                  <div>
                    <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">Esc</kbd>
                    <span className="ml-2">Clear selection</span>
                  </div>
                  <div>
                    <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">?</kbd> or{' '}
                    <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">/</kbd>
                    <span className="ml-2">Toggle this help</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Tip: Enter/Del keys work on focused card or all selected cards
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Controls: Sort & Filter */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Sort by:</label>
          <Select value={sortBy} onValueChange={value => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(sortLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {(filters.mentorTiers.length < 4 ||
            filters.menteeTiers.length < 4 ||
            filters.tierDifferences.length < 3 ||
            filters.matchScoreBuckets.length < 5) && (
            <Badge variant="secondary" className="ml-1">
              Active
            </Badge>
          )}
        </Button>

        <div className="ml-auto flex items-center gap-2">
          {sortedRequests.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedIds.size === sortedRequests.length) {
                  // Deselect all
                  setSelectedIds(new Set());
                } else {
                  // Select all
                  setSelectedIds(new Set(sortedRequests.map(r => r.id)));
                }
              }}
            >
              {selectedIds.size === sortedRequests.length ? 'Deselect All' : 'Select All'}
            </Button>
          )}

          {selectedIds.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
              <Button
                variant="default"
                size="sm"
                onClick={handleBulkApprove}
              >
                Approve Selected ({selectedIds.size})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDecline}
              >
                Decline Selected ({selectedIds.size})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mentor Tier Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Mentor Tier</label>
              <div className="flex flex-wrap gap-3">
                {(['bronze', 'silver', 'gold', 'platinum'] as const).map(tier => (
                  <label key={tier} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.mentorTiers.includes(tier)}
                      onChange={e => {
                        setFilters(prev => ({
                          ...prev,
                          mentorTiers: e.target.checked
                            ? [...prev.mentorTiers, tier]
                            : prev.mentorTiers.filter(t => t !== tier),
                        }));
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm capitalize">{tier}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Mentee Tier Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Mentee Tier</label>
              <div className="flex flex-wrap gap-3">
                {(['bronze', 'silver', 'gold', 'platinum'] as const).map(tier => (
                  <label key={tier} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.menteeTiers.includes(tier)}
                      onChange={e => {
                        setFilters(prev => ({
                          ...prev,
                          menteeTiers: e.target.checked
                            ? [...prev.menteeTiers, tier]
                            : prev.menteeTiers.filter(t => t !== tier),
                        }));
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm capitalize">{tier}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tier Difference Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Tier Difference</label>
              <div className="flex flex-wrap gap-3">
                {[2, 3, 4].map(diff => (
                  <label key={diff} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.tierDifferences.includes(diff)}
                      onChange={e => {
                        setFilters(prev => ({
                          ...prev,
                          tierDifferences: e.target.checked
                            ? [...prev.tierDifferences, diff]
                            : prev.tierDifferences.filter(d => d !== diff),
                        }));
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{diff} tiers</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Match Score Bucket Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Match Score</label>
              <div className="flex flex-wrap gap-3">
                {(['excellent', 'good', 'fair', 'poor', 'unknown'] as const).map(bucket => (
                  <label key={bucket} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.matchScoreBuckets.includes(bucket)}
                      onChange={e => {
                        setFilters(prev => ({
                          ...prev,
                          matchScoreBuckets: e.target.checked
                            ? [...prev.matchScoreBuckets, bucket]
                            : prev.matchScoreBuckets.filter(b => b !== bucket),
                        }));
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{matchScoreBucketLabels[bucket]}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Clear Filters Button */}
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                }}
              >
                Clear All Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state - filtered out all results */}
      {sortedRequests.length === 0 && displayedRequests.length > 0 && (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <Filter className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No requests match your filters</h2>
          <p className="text-muted-foreground mb-4">Try adjusting your filter criteria.</p>
          <Button
            variant="outline"
            onClick={() => setFilters(DEFAULT_FILTERS)}
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Empty state - all cards removed locally */}
      {sortedRequests.length === 0 && displayedRequests.length === 0 && requests.length > 0 && (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No pending override requests</h2>
          <p className="text-muted-foreground">Great work! All requests have been processed.</p>
        </div>
      )}

      {/* Request Cards Grid */}
      {sortedRequests.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedRequests.map((request, index) => (
            <OverrideRequestCard
              key={request.id}
              request={request}
              isSelected={selectedIds.has(request.id)}
              isFadingOut={fadingOutIds.has(request.id)}
              isFocused={focusedIndex === index}
              onToggleSelect={() => {
                setSelectedIds(prev => {
                  const next = new Set(prev);
                  if (next.has(request.id)) {
                    next.delete(request.id);
                  } else {
                    next.add(request.id);
                  }
                  return next;
                });
              }}
              onApprove={handleApprove}
              onDecline={handleDecline}
            />
          ))}
        </div>
      )}
    </div>
  );
}
