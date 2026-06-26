/**
 * useTierOverrides Hook Tests
 *
 * Tests the React Query hook for fetching pending tier override requests.
 * Covers loading, success, error, empty, and refetch behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTierOverrides } from './useTierOverrides';
import * as bookingsApi from '@/services/api/bookings';

// Mock the bookings API (the hook calls getPendingTierOverrides)
vi.mock('@/services/api/bookings', () => ({
  getPendingTierOverrides: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
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

  it('returns the loading state initially', () => {
    vi.mocked(bookingsApi.getPendingTierOverrides).mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    const { result } = renderHook(() => useTierOverrides(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.requests).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('fetches tier overrides successfully', async () => {
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
      },
    ];

    vi.mocked(bookingsApi.getPendingTierOverrides).mockResolvedValue({
      requests: mockData,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { result } = renderHook(() => useTierOverrides(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.requests).toEqual(mockData);
    expect(result.current.error).toBeNull();
    expect(bookingsApi.getPendingTierOverrides).toHaveBeenCalledTimes(1);
  });

  it('handles the error state', async () => {
    vi.mocked(bookingsApi.getPendingTierOverrides).mockRejectedValue(new Error('Failed to fetch'));

    const { result } = renderHook(() => useTierOverrides(), {
      wrapper: createWrapper(),
    });

    // The hook retries twice (with backoff), so allow extra time to settle.
    await waitFor(() => expect(result.current.error).toBeTruthy(), {
      timeout: 8000,
    });
    expect(result.current.requests).toEqual([]);
  });

  it('handles empty results', async () => {
    vi.mocked(bookingsApi.getPendingTierOverrides).mockResolvedValue({
      requests: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { result } = renderHook(() => useTierOverrides(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.requests).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('supports refetch', async () => {
    vi.mocked(bookingsApi.getPendingTierOverrides).mockResolvedValue({
      requests: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { result } = renderHook(() => useTierOverrides(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    vi.clearAllMocks();

    await result.current.refetch();

    await waitFor(() => expect(bookingsApi.getPendingTierOverrides).toHaveBeenCalledTimes(1));
  });

  it('exposes a refetch function', () => {
    vi.mocked(bookingsApi.getPendingTierOverrides).mockResolvedValue({
      requests: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { result } = renderHook(() => useTierOverrides(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toHaveProperty('refetch');
  });
});
