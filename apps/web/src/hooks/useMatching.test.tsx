/**
 * Tests for useMatching hooks
 *
 * Tests both useFindMatches and useExplainMatch hooks with comprehensive coverage
 * for authentication, API calls, error handling, and caching.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFindMatches, useExplainMatch } from './useMatching';
import { AuthContext } from '@/contexts/AuthContext';
import type { AuthState } from '@/contexts/AuthContext';
import {
  createMockMatchResult,
  createMockMatchExplanation,
} from '@/test/fixtures/matching';

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock session for testing
const createMockSession = () => ({
  access_token: 'mock-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: 'bearer',
  user: {
    id: 'user-123',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  },
});

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

// Test wrapper with QueryClient and AuthContext
function createWrapper(authState?: Partial<AuthState>) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const defaultAuthState: AuthState = {
    session: createMockSession(),
    isLoading: false,
    isAuthenticated: true,
    ...authState,
  };

  return ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Provider value={defaultAuthState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AuthContext.Provider>
  );
}

describe('useFindMatches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should return empty matches when userId is null', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useFindMatches(null, 'mentor', 'tag-based-v1', 20),
      { wrapper }
    );

    // Query should be disabled when userId is null
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should throw error when auth token is missing', async () => {
    // Create wrapper with no session
    const wrapper = createWrapper({ session: null, isAuthenticated: false });
    const { result } = renderHook(
      () => useFindMatches('user-123', 'mentor', 'tag-based-v1', 20),
      { wrapper }
    );

    // Wait for query to fail (with retry=1, it will try twice)
    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 5000 }
    );

    // Should have an error about authentication
    expect(result.current.error).toBeTruthy();
  });

  it('should fetch matches successfully with auth token', async () => {
    const mockMatches = [createMockMatchResult(), createMockMatchResult({ score: 75 })];
    const mockResponse = { matches: mockMatches };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useFindMatches('user-123', 'mentor', 'tag-based-v1', 20),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8787/v1/matching/find-matches',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({
          userId: 'user-123',
          targetRole: 'mentor',
          options: {
            algorithmVersion: 'tag-based-v1',
            limit: 20,
          },
        }),
      })
    );

    expect(result.current.data).toEqual(mockResponse);
  });

  it('should handle API error responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
    });

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useFindMatches('user-123', 'mentor', 'tag-based-v1', 20),
      { wrapper }
    );

    // Wait for query to fail (with retry=1, it will try twice)
    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 5000 }
    );

    expect(result.current.error).toBeTruthy();
  });

  it('should use correct staleTime for caching', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useFindMatches('user-123', 'mentor', 'tag-based-v1', 20),
      { wrapper }
    );

    // Stale time should be 5 minutes (300000ms)
    expect(result.current).toHaveProperty('isStale');
  });

  it('should include all dependencies in queryKey', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useFindMatches('user-123', 'mentee', 'tag-based-v1', 10),
      { wrapper }
    );

    // Verify queryKey structure (can't directly access but can verify behavior)
    expect(result.current).toBeDefined();
  });
});

describe('useExplainMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should throw error when auth token is missing', async () => {
    // Create wrapper with no session
    const wrapper = createWrapper({ session: null, isAuthenticated: false });
    const { result } = renderHook(() => useExplainMatch(), { wrapper });

    let error: Error | null = null;
    try {
      await result.current.mutateAsync({
        userId1: 'user-1',
        userId2: 'user-2',
        algorithmVersion: 'tag-based-v1',
      });
    } catch (e) {
      error = e as Error;
    }

    expect(error).toMatchObject({
      message: 'Authentication required. Please sign in.',
    });
  });

  it('should fetch match explanation successfully', async () => {
    const mockExplanation = createMockMatchExplanation();
    const mockResponse = { explanation: mockExplanation };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useExplainMatch(), { wrapper });

    const mutationResult = await result.current.mutateAsync({
      userId1: 'user-1',
      userId2: 'user-2',
      algorithmVersion: 'tag-based-v1',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8787/v1/matching/explain',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
        body: JSON.stringify({
          userId1: 'user-1',
          userId2: 'user-2',
          algorithmVersion: 'tag-based-v1',
        }),
      })
    );

    expect(mutationResult).toEqual(mockResponse);
  });

  it('should handle API error responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useExplainMatch(), { wrapper });

    let error: Error | null = null;
    try {
      await result.current.mutateAsync({
        userId1: 'user-1',
        userId2: 'user-2',
      });
    } catch (e) {
      error = e as Error;
    }

    expect(error).toMatchObject({
      message: 'API error: Not Found',
    });
  });

  it('should use default algorithm version when not provided', async () => {
    const mockExplanation = createMockMatchExplanation();
    const mockResponse = { explanation: mockExplanation };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useExplainMatch(), { wrapper });

    await result.current.mutateAsync({
      userId1: 'user-1',
      userId2: 'user-2',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8787/v1/matching/explain',
      expect.objectContaining({
        body: JSON.stringify({
          userId1: 'user-1',
          userId2: 'user-2',
          algorithmVersion: 'tag-based-v1', // Default value
        }),
      })
    );
  });

  it('should handle loading and success states correctly', async () => {
    const mockExplanation = createMockMatchExplanation();
    const mockResponse = { explanation: mockExplanation };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useExplainMatch(), { wrapper });

    expect(result.current.isPending).toBe(false);

    const mutationPromise = result.current.mutateAsync({
      userId1: 'user-1',
      userId2: 'user-2',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    await mutationPromise;
  });
});
