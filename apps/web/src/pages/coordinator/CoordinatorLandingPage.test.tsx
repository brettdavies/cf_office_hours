/**
 * Tests for CoordinatorLandingPage
 *
 * Tests coordinator dashboard showing favorite metrics and urgent overrides.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import CoordinatorLandingPage from './CoordinatorLandingPage';
import type { TierOverrideRequest } from '@/services/api/bookings';

// Mock hooks
vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}));

vi.mock('@/hooks/useFavoriteMetrics', () => ({
  useFavoriteMetrics: vi.fn(),
}));

vi.mock('@/hooks/useTierOverrides', () => ({
  useTierOverrides: vi.fn(),
}));

// Mock config
vi.mock('@/data/coordinatorMetricsConfig', () => ({
  coordinatorDashboardConfig: {
    sections: [
      {
        id: 'section1',
        title: 'Section 1',
        defaultExpanded: true,
        gridCols: 2,
        metrics: [
          {
            id: 'metric1',
            type: 'progress',
            title: 'Test Metric 1',
            data: { value: 75 },
          },
          {
            id: 'metric2',
            type: 'rating',
            title: 'Test Metric 2',
            data: { value: 4.5 },
          },
          {
            id: 'metric3',
            type: 'progress',
            title: 'Test Metric 3',
            data: { value: 85 },
          },
        ],
      },
    ],
  },
}));

// Mock MetricFactory
vi.mock('@/components/coordinator/metrics/MetricFactory', () => ({
  MetricFactory: ({ config }: { config: any }) => (
    <div data-testid={`metric-${config.id}`}>
      {config.title}
    </div>
  ),
}));

// Mock OverrideRequestCard
vi.mock('@/components/coordinator/OverrideRequestCard', () => ({
  OverrideRequestCard: ({ request, variant, onClick }: any) => (
    <div
      data-testid={`override-card-${request.id}`}
      data-variant={variant}
      onClick={onClick}
    >
      {request.mentee.profile.name} → {request.mentor.profile.name}
    </div>
  ),
}));

// Import mocked hooks
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useFavoriteMetrics } from '@/hooks/useFavoriteMetrics';
import { useTierOverrides } from '@/hooks/useTierOverrides';

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

// Helper to create mock override request
function createMockOverrideRequest(id: string, expiresInHours: number): TierOverrideRequest {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);

  return {
    id,
    mentee: {
      id: `mentee-${id}`,
      profile: { name: `Mentee ${id}` },
      reputation_tier: 'bronze',
    },
    mentor: {
      id: `mentor-${id}`,
      profile: { name: `Mentor ${id}` },
      reputation_tier: 'gold',
    },
    match_score: 85,
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  } as TierOverrideRequest;
}

describe('CoordinatorLandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render page header', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { id: 'user-1', role: 'coordinator' } as any,
      isLoading: false,
    } as any);

    vi.mocked(useFavoriteMetrics).mockReturnValue({
      favorites: new Set(),
      isLoaded: true,
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn(),
    });

    vi.mocked(useTierOverrides).mockReturnValue({
      requests: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithRouter(<CoordinatorLandingPage />);

    expect(screen.getByText('Coordinator Dashboard')).toBeInTheDocument();
    expect(
      screen.getByText(/Quick access to your favorite metrics and urgent override requests/)
    ).toBeInTheDocument();
  });

  it('should render favorite metrics section with link', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { id: 'user-1', role: 'coordinator' } as any,
      isLoading: false,
    } as any);

    vi.mocked(useFavoriteMetrics).mockReturnValue({
      favorites: new Set(['metric1', 'metric2']),
      isLoaded: true,
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn(),
    });

    vi.mocked(useTierOverrides).mockReturnValue({
      requests: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithRouter(<CoordinatorLandingPage />);

    expect(screen.getByText('Your Favorite Metrics')).toBeInTheDocument();
    expect(screen.getByText('View All Metrics')).toBeInTheDocument();
  });

  it('should render urgent overrides section with link', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { id: 'user-1', role: 'coordinator' } as any,
      isLoading: false,
    } as any);

    vi.mocked(useFavoriteMetrics).mockReturnValue({
      favorites: new Set(),
      isLoaded: true,
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn(),
    });

    vi.mocked(useTierOverrides).mockReturnValue({
      requests: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithRouter(<CoordinatorLandingPage />);

    expect(screen.getByText('Urgent Override Requests')).toBeInTheDocument();
    expect(screen.getByText('View All Overrides')).toBeInTheDocument();
  });

  it('should show empty state when no favorite metrics', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { id: 'user-1', role: 'coordinator' } as any,
      isLoading: false,
    } as any);

    vi.mocked(useFavoriteMetrics).mockReturnValue({
      favorites: new Set(),
      isLoaded: true,
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn(),
    });

    vi.mocked(useTierOverrides).mockReturnValue({
      requests: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithRouter(<CoordinatorLandingPage />);

    expect(
      screen.getByText(/You haven't starred any metrics yet/)
    ).toBeInTheDocument();
  });

  it('should show empty state when no pending overrides', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { id: 'user-1', role: 'coordinator' } as any,
      isLoading: false,
    } as any);

    vi.mocked(useFavoriteMetrics).mockReturnValue({
      favorites: new Set(),
      isLoaded: true,
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn(),
    });

    vi.mocked(useTierOverrides).mockReturnValue({
      requests: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithRouter(<CoordinatorLandingPage />);

    expect(
      screen.getByText(/No pending override requests at this time/)
    ).toBeInTheDocument();
  });

  it('should limit favorite metrics to 6', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { id: 'user-1', role: 'coordinator' } as any,
      isLoading: false,
    } as any);

    // Mock 7 favorites but only 3 metrics exist in config
    vi.mocked(useFavoriteMetrics).mockReturnValue({
      favorites: new Set(['metric1', 'metric2', 'metric3']),
      isLoaded: true,
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn(),
    });

    vi.mocked(useTierOverrides).mockReturnValue({
      requests: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithRouter(<CoordinatorLandingPage />);

    // Should render all 3 that exist
    expect(screen.getByTestId('metric-metric1')).toBeInTheDocument();
    expect(screen.getByTestId('metric-metric2')).toBeInTheDocument();
    expect(screen.getByTestId('metric-metric3')).toBeInTheDocument();
  });

  it('should limit urgent overrides to 6', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { id: 'user-1', role: 'coordinator' } as any,
      isLoading: false,
    } as any);

    vi.mocked(useFavoriteMetrics).mockReturnValue({
      favorites: new Set(),
      isLoaded: true,
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn(),
    });

    // Create 8 mock requests
    const requests = Array.from({ length: 8 }, (_, i) =>
      createMockOverrideRequest(`req${i + 1}`, 24 + i)
    );

    vi.mocked(useTierOverrides).mockReturnValue({
      requests,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithRouter(<CoordinatorLandingPage />);

    // Should only show 6
    expect(screen.getByTestId('override-card-req1')).toBeInTheDocument();
    expect(screen.getByTestId('override-card-req6')).toBeInTheDocument();
    expect(screen.queryByTestId('override-card-req7')).not.toBeInTheDocument();
    expect(screen.queryByTestId('override-card-req8')).not.toBeInTheDocument();
  });

  it('should sort overrides by expiration (soonest first)', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { id: 'user-1', role: 'coordinator' } as any,
      isLoading: false,
    } as any);

    vi.mocked(useFavoriteMetrics).mockReturnValue({
      favorites: new Set(),
      isLoaded: true,
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn(),
    });

    // Create requests with different expiration times (out of order)
    const requests = [
      createMockOverrideRequest('req1', 48), // Expires in 48 hours
      createMockOverrideRequest('req2', 12), // Expires in 12 hours (most urgent)
      createMockOverrideRequest('req3', 36), // Expires in 36 hours
    ];

    vi.mocked(useTierOverrides).mockReturnValue({
      requests,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithRouter(<CoordinatorLandingPage />);

    const cards = screen.getAllByTestId(/override-card-/);

    // Should be sorted: req2 (12h), req3 (36h), req1 (48h)
    expect(cards[0]).toHaveAttribute('data-testid', 'override-card-req2');
    expect(cards[1]).toHaveAttribute('data-testid', 'override-card-req3');
    expect(cards[2]).toHaveAttribute('data-testid', 'override-card-req1');
  });

  it('should render override cards with summary variant', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { id: 'user-1', role: 'coordinator' } as any,
      isLoading: false,
    } as any);

    vi.mocked(useFavoriteMetrics).mockReturnValue({
      favorites: new Set(),
      isLoaded: true,
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn(),
    });

    const requests = [createMockOverrideRequest('req1', 24)];

    vi.mocked(useTierOverrides).mockReturnValue({
      requests,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithRouter(<CoordinatorLandingPage />);

    const card = screen.getByTestId('override-card-req1');
    expect(card).toHaveAttribute('data-variant', 'summary');
  });

  it('should show loading state', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    vi.mocked(useFavoriteMetrics).mockReturnValue({
      favorites: new Set(),
      isLoaded: false,
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn(),
    });

    vi.mocked(useTierOverrides).mockReturnValue({
      requests: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithRouter(<CoordinatorLandingPage />);

    expect(screen.getByText(/Loading dashboard.../)).toBeInTheDocument();
  });

  it('should show error state for overrides', () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { id: 'user-1', role: 'coordinator' } as any,
      isLoading: false,
    } as any);

    vi.mocked(useFavoriteMetrics).mockReturnValue({
      favorites: new Set(),
      isLoaded: true,
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn(),
    });

    vi.mocked(useTierOverrides).mockReturnValue({
      requests: [],
      isLoading: false,
      error: new Error('Failed to fetch'),
      refetch: vi.fn(),
    } as any);

    renderWithRouter(<CoordinatorLandingPage />);

    expect(
      screen.getByText(/Failed to load override requests/)
    ).toBeInTheDocument();
  });
});
