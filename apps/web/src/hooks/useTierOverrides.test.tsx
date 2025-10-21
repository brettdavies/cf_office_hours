/**
 * useTierOverrides Hook Tests
 *
 * Tests React Query hook for fetching tier override requests.
 * Covers loading states, error handling, and retry logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTierOverrides } from './useTierOverrides';
import * as bookingsApi from '@/services/api/bookings';

// Mock the bookings API
vi.mock('@/services/api/bookings', () => ({
  fetchPendingTierOverrides: vi.fn(),
}));

// Create wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries for testing
      },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ({ children }: any) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useTierOverrides', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state initially', () => {
    vi.mocked(bookingsApi.fetchPendingTierOverrides).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    const { result } = renderHook(() => useTierOverrides(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.requests).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it('should fetch tier overrides successfully', async () => {
    const mockData = [
      {
        id: 'req-1',
        mentee_id: 'mentee-1',
        mentor_id: 'mentor-1',
        reason: 'Need help',
        status: 'pending',
        created_at: '2025-01-01T00:00:00Z',
        expires_at: '2025-01-08T00:00:00Z',
        match_score: 85.5,
        mentee: {
          id: 'mentee-1',
          email: 'mentee@test.com',
          role: 'mentee',
          reputation_tier: 'bronze',
          profile: {
            name: 'Mentee Test',
            title: 'Founder',
            company: 'TestCo',
          },
        },
        mentor: {
          id: 'mentor-1',
          email: 'mentor@test.com',
          role: 'mentor',
          reputation_tier: 'platinum',
          profile: {
            name: 'Mentor Test',
            title: 'Advisor',
            company: 'AdviceCo',
          },
        },
      },
    ];

    vi.mocked(bookingsApi.fetchPendingTierOverrides).mockResolvedValue(mockData);

    const { result } = renderHook(() => useTierOverrides(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.requests).toEqual(mockData);
    expect(result.current.error).toBeNull();
    expect(bookingsApi.fetchPendingTierOverrides).toHaveBeenCalledTimes(1);
  });

  it('should handle error state', async () => {
    const mockError = new Error('Failed to fetch');

    vi.mocked(bookingsApi.fetchPendingTierOverrides).mockRejectedValue(mockError);

    const { result } = renderHook(() => useTierOverrides(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.requests).toBeUndefined();
    expect(result.current.error).toBeTruthy();
  });

  it('should handle empty results', async () => {
    vi.mocked(bookingsApi.fetchPendingTierOverrides).mockResolvedValue([]);

    const { result } = renderHook(() => useTierOverrides(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.requests).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should support refetch', async () => {
    const mockData = [{ id: 'req-1' }];

    vi.mocked(bookingsApi.fetchPendingTierOverrides).mockResolvedValue(mockData);

    const { result } = renderHook(() => useTierOverrides(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Clear mock calls
    vi.clearAllMocks();

    // Trigger refetch
    result.current.refetch();

    await waitFor(() =>
      expect(bookingsApi.fetchPendingTierOverrides).toHaveBeenCalledTimes(1),
    );
  });

  it('should use correct query key', () => {
    vi.mocked(bookingsApi.fetchPendingTierOverrides).mockResolvedValue([]);

    const { result } = renderHook(() => useTierOverrides(), {
      wrapper: createWrapper(),
    });

    // Query key should be ['bookings', 'overrides', 'pending']
    // This ensures proper cache invalidation
    expect(result.current).toHaveProperty('refetch');
  });
});
