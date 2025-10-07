/**
 * BrowseMentorsPage Component Tests
 */

// External dependencies
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';

// Internal modules
import BrowseMentorsPage from './BrowseMentorsPage';
import { createMockUserProfile } from '@/test/fixtures/user';
import { useMentors } from '@/hooks/useUsers';
import type { UserListResponse } from '@/services/api/users';

// Mock the useUsers hook module
vi.mock('@/hooks/useUsers');

// Helper function to create proper UseQueryResult mocks
function createMockUseQueryResult<T>(
  overrides: Partial<UseQueryResult<T, Error>>
): UseQueryResult<T, Error> {
  const base = {
    data: undefined,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    isError: false,
    isSuccess: false,
    status: 'pending' as const,
    isPending: true,
    isLoadingError: false,
    isRefetchError: false,
    isPlaceholderData: false,
    isStale: false,
    isFetching: false,
    isRefetching: false,
    fetchStatus: 'idle' as const,
    ...overrides,
  };

  // Ensure consistency between isLoading and isPending
  if (base.isLoading) {
    base.isPending = true;
  }

  return base as UseQueryResult<T, Error>;
}

// Create test wrapper with React Query and Router
function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    );
  };
}

describe('BrowseMentorsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner during fetch', () => {
    vi.mocked(useMentors).mockReturnValue(
      createMockUseQueryResult<UserListResponse>({
        data: undefined,
        isLoading: true,
        status: 'pending',
      })
    );

    render(<BrowseMentorsPage />, { wrapper: createTestWrapper() });

    expect(screen.getByText('Loading mentors...')).toBeInTheDocument();
  });

  it('renders MentorGrid with data on success', async () => {
    const mockMentors = [
      createMockUserProfile({ id: 'mentor-1', role: 'mentor' }),
      createMockUserProfile({ id: 'mentor-2', role: 'mentor' }),
    ];

    vi.mocked(useMentors).mockReturnValue(
      createMockUseQueryResult<UserListResponse>({
        data: mockMentors,
        isLoading: false,
        isSuccess: true,
        isPending: false,
        status: 'success',
      })
    );

    render(<BrowseMentorsPage />, { wrapper: createTestWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Browse Mentors')).toBeInTheDocument();
      expect(screen.getAllByTestId('mentor-card')).toHaveLength(2);
    });
  });

  it('shows error message on API failure', () => {
    const mockError = new Error('Network error');

    vi.mocked(useMentors).mockReturnValue(
      createMockUseQueryResult<UserListResponse>({
        data: undefined,
        isLoading: false,
        error: mockError,
        isError: true,
        isSuccess: false,
        isPending: false,
        status: 'error',
      })
    );

    render(<BrowseMentorsPage />, { wrapper: createTestWrapper() });

    expect(screen.getByText('Unable to load mentors')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows empty state if no mentors', () => {
    vi.mocked(useMentors).mockReturnValue(
      createMockUseQueryResult<UserListResponse>({
        data: [],
        isLoading: false,
        isSuccess: true,
        isPending: false,
        status: 'success',
      })
    );

    render(<BrowseMentorsPage />, { wrapper: createTestWrapper() });

    expect(screen.getByText('No mentors available')).toBeInTheDocument();
    expect(screen.getByText('Check back soon!')).toBeInTheDocument();
  });

  it('retry button calls refetch', () => {
    const mockRefetch = vi.fn();
    const mockError = new Error('Network error');

    vi.mocked(useMentors).mockReturnValue(
      createMockUseQueryResult<UserListResponse>({
        data: undefined,
        isLoading: false,
        error: mockError,
        refetch: mockRefetch,
        isError: true,
        isSuccess: false,
        isPending: false,
        status: 'error',
      })
    );

    render(<BrowseMentorsPage />, { wrapper: createTestWrapper() });

    const retryButton = screen.getByText('Retry');
    retryButton.click();

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
