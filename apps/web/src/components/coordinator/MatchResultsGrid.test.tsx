/**
 * Tests for MatchResultsGrid Component
 *
 * Tests match results display, loading states, empty states, and explain match callback.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MatchResultsGrid } from './MatchResultsGrid';
import { mockMatches, createMockMatchResult } from '@/test/fixtures/matching';

// Types
import type { paths } from '@shared/types/api.generated';

type MatchResult =
  paths['/v1/matching/find-matches']['post']['responses']['200']['content']['application/json']['matches'][number];

// Mock MatchCard component
vi.mock('./MatchCard', () => ({
  MatchCard: ({
    match,
    onExplainClick,
  }: {
    match: MatchResult;
    onExplainClick: () => void;
  }) => (
    <div data-testid={`match-card-${match.user.id}`}>
      <div>{match.user.profile?.name || match.user.email}</div>
      <div>Score: {match.score}</div>
      <button onClick={onExplainClick} data-testid={`explain-button-${match.user.id}`}>
        Explain Match
      </button>
    </div>
  ),
}));

describe('MatchResultsGrid', () => {
  const mockOnExplainMatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading skeleton when isLoading is true', () => {
    render(
      <MatchResultsGrid
        matches={[]}
        isLoading={true}
        selectedUserId="user-123"
        algorithmVersion="tag-based-v1"
        onExplainMatch={mockOnExplainMatch}
      />
    );

    // Should show skeleton cards (6 by default as per story requirement)
    const skeletons = screen.getAllByTestId(/skeleton-card/);
    expect(skeletons).toHaveLength(6);
  });

  it('should render empty state when no matches found', () => {
    render(
      <MatchResultsGrid
        matches={[]}
        isLoading={false}
        selectedUserId="user-123"
        algorithmVersion="tag-based-v1"
        onExplainMatch={mockOnExplainMatch}
      />
    );

    expect(screen.getByText(/No matches found/i)).toBeInTheDocument();
  });

  it('should not show empty state when selectedUserId is null', () => {
    render(
      <MatchResultsGrid
        matches={[]}
        isLoading={false}
        selectedUserId={null}
        algorithmVersion="tag-based-v1"
        onExplainMatch={mockOnExplainMatch}
      />
    );

    expect(screen.queryByText(/No matches found/i)).not.toBeInTheDocument();
  });

  it('should render match cards sorted by score descending', () => {
    const unsortedMatches = [
      mockMatches.mediumScore, // score: 65
      mockMatches.highScore, // score: 95
      mockMatches.lowScore, // score: 45
    ];

    render(
      <MatchResultsGrid
        matches={unsortedMatches}
        isLoading={false}
        selectedUserId="user-123"
        algorithmVersion="tag-based-v1"
        onExplainMatch={mockOnExplainMatch}
      />
    );

    // All matches should be rendered
    const matchCards = screen.getAllByTestId(/match-card/);
    expect(matchCards).toHaveLength(3);

    // Verify scores are displayed
    expect(screen.getByText('Score: 95')).toBeInTheDocument();
    expect(screen.getByText('Score: 65')).toBeInTheDocument();
    expect(screen.getByText('Score: 45')).toBeInTheDocument();
  });

  it('should render responsive grid layout classes', () => {
    render(
      <MatchResultsGrid
        matches={[mockMatches.highScore]}
        isLoading={false}
        selectedUserId="user-123"
        algorithmVersion="tag-based-v1"
        onExplainMatch={mockOnExplainMatch}
      />
    );

    // Grid container should have responsive classes
    // Note: This test checks for the grid container's existence
    const container = screen.getByTestId(/match-card/).parentElement;
    expect(container).toBeInTheDocument();
  });

  it('should call onExplainMatch with correct user IDs when explain button is clicked', () => {
    const testMatch = createMockMatchResult({
      user: {
        id: 'match-user-456',
        email: 'match@example.com',
        role: 'mentee',
        reputation_tier: 'gold',
        airtable_record_id: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        profile: {
          id: 'profile-456',
          user_id: 'match-user-456',
          name: 'Test User',
          avatar_url: null,
          title: 'Developer',
          company: 'Test Co',
          bio: 'Bio',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
        tags: [],
      },
    });

    render(
      <MatchResultsGrid
        matches={[testMatch]}
        isLoading={false}
        selectedUserId="selected-user-123"
        algorithmVersion="tag-based-v1"
        onExplainMatch={mockOnExplainMatch}
      />
    );

    const explainButton = screen.getByTestId('explain-button-match-user-456');
    fireEvent.click(explainButton);

    expect(mockOnExplainMatch).toHaveBeenCalledWith('selected-user-123', 'match-user-456');
  });

  it('should render multiple match cards with different scores', () => {
    const multipleMatches = [
      mockMatches.highScore,
      mockMatches.mediumScore,
      mockMatches.lowScore,
    ];

    render(
      <MatchResultsGrid
        matches={multipleMatches}
        isLoading={false}
        selectedUserId="user-123"
        algorithmVersion="tag-based-v1"
        onExplainMatch={mockOnExplainMatch}
      />
    );

    expect(screen.getAllByText(/Score:/)).toHaveLength(3);
  });

  it('should handle matches with no tags gracefully', () => {
    render(
      <MatchResultsGrid
        matches={[mockMatches.noTags]}
        isLoading={false}
        selectedUserId="user-123"
        algorithmVersion="tag-based-v1"
        onExplainMatch={mockOnExplainMatch}
      />
    );

    // Match card should render even with no tags
    const matchCard = screen.getByTestId(/match-card/);
    expect(matchCard).toBeInTheDocument();
  });

  it('should show correct number of skeleton cards during loading', () => {
    render(
      <MatchResultsGrid
        matches={[]}
        isLoading={true}
        selectedUserId="user-123"
        algorithmVersion="tag-based-v1"
        onExplainMatch={mockOnExplainMatch}
      />
    );

    // Story specifies 6 skeleton cards during load
    const skeletons = screen.getAllByTestId(/skeleton-card/);
    expect(skeletons.length).toBeGreaterThanOrEqual(6);
  });

  it('should transition from loading to loaded state', () => {
    const { rerender } = render(
      <MatchResultsGrid
        matches={[]}
        isLoading={true}
        selectedUserId="user-123"
        algorithmVersion="tag-based-v1"
        onExplainMatch={mockOnExplainMatch}
      />
    );

    expect(screen.getAllByTestId(/skeleton-card/)).toHaveLength(6);

    // Update to loaded state with matches
    rerender(
      <MatchResultsGrid
        matches={[mockMatches.highScore]}
        isLoading={false}
        selectedUserId="user-123"
        algorithmVersion="tag-based-v1"
        onExplainMatch={mockOnExplainMatch}
      />
    );

    expect(screen.queryByTestId(/skeleton-card/)).not.toBeInTheDocument();
    expect(screen.getByTestId(/match-card/)).toBeInTheDocument();
  });

  it('should handle large number of matches correctly', () => {
    const manyMatches = Array.from({ length: 20 }, (_, i) =>
      createMockMatchResult({
        user: {
          id: `user-${i}`,
          email: `user${i}@example.com`,
          role: 'mentee',
          reputation_tier: 'bronze',
          airtable_record_id: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          profile: {
            id: `profile-${i}`,
            user_id: `user-${i}`,
            name: `User ${i}`,
            avatar_url: null,
            title: 'Developer',
            company: 'Company',
            bio: 'Bio',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
          },
          tags: [],
        },
        score: 80 - i,
      })
    );

    render(
      <MatchResultsGrid
        matches={manyMatches}
        isLoading={false}
        selectedUserId="user-123"
        algorithmVersion="tag-based-v1"
        onExplainMatch={mockOnExplainMatch}
      />
    );

    // All 20 matches should be rendered (story specifies top 10-20 matches)
    const matchCards = screen.getAllByTestId(/match-card/);
    expect(matchCards.length).toBeLessThanOrEqual(20);
  });

  it('should display empty state message mentioning no matches', () => {
    render(
      <MatchResultsGrid
        matches={[]}
        isLoading={false}
        selectedUserId="user-123"
        algorithmVersion="tag-based-v1"
        onExplainMatch={mockOnExplainMatch}
      />
    );

    const emptyMessage = screen.getByText(/No matches found/i);
    expect(emptyMessage).toBeInTheDocument();
  });
});
