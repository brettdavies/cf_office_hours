/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { useCurrentUser } from './useCurrentUser';
import { apiClient } from '@/lib/api-client';
import { AuthProvider } from '@/contexts/AuthContext';
import { createTestQueryClient } from '@/test/test-utils';
import { createMockUserProfile } from '@/test/fixtures/user';
import type { UserWithProfile } from '@/types/user';

// Mock API client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    getCurrentUser: vi.fn(),
  },
}));

// Mock AuthContext
const mockUseAuthContext = vi.fn();

vi.mock('@/contexts/AuthContext', async () => {
  const actual = await vi.importActual('@/contexts/AuthContext');
  return {
    ...actual,
    useAuthContext: () => mockUseAuthContext(),
  };
});

// Test wrapper that provides AuthProvider context
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    <AuthProvider>
      {children}
    </AuthProvider>
  </QueryClientProvider>
);


describe('useCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthContext.mockReturnValue({
      session: null,
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  });

  it('should not fetch user data when no session exists', () => {
    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: TestWrapper,
    });

    // Should not call API when no session
    expect(apiClient.getCurrentUser).not.toHaveBeenCalled();

    // Should return query state with disabled query
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('should fetch user data when session exists', async () => {
    // Use centralized mock factory
    const mockUser = createMockUserProfile({
      id: 'user-123',
      email: 'test@example.com',
      role: 'mentee',
    });

    // Mock useAuthContext to return session
    mockUseAuthContext.mockReturnValue({
      session: { access_token: 'test-token' } as any,
      user: null,
      isLoading: false,
      isAuthenticated: true,
    });

    // Mock successful API response
    vi.mocked(apiClient.getCurrentUser).mockResolvedValue(mockUser);

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: TestWrapper,
    });

    // Should call API when session exists
    expect(apiClient.getCurrentUser).toHaveBeenCalled();

    // Wait for query to complete
    await waitFor(() => {
      expect(result.current.data).toEqual(mockUser);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  it('should handle API errors gracefully', async () => {
    // Mock useAuthContext to return session
    mockUseAuthContext.mockReturnValue({
      session: { access_token: 'test-token' } as any,
      user: null,
      isLoading: false,
      isAuthenticated: true,
    });

    // Mock API error
    const errorMessage = 'Failed to fetch user';
    vi.mocked(apiClient.getCurrentUser).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: TestWrapper,
    });

    // Wait for query to fail (with retry=2, it will try 3 times)
    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBeDefined();
        expect(result.current.data).toBeUndefined();
      },
      { timeout: 5000 }
    );
  });

  it('should handle loading states correctly', async () => {
    // Mock useAuthContext to return session
    mockUseAuthContext.mockReturnValue({
      session: { access_token: 'test-token' } as any,
      user: null,
      isLoading: false,
      isAuthenticated: true,
    });

    // Use centralized mock factory for partial user
    const mockUser = createMockUserProfile({
      id: 'user-123',
      email: 'test@example.com',
      role: 'mentee',
    });

    let resolvePromise: (value: UserWithProfile) => void;
    const promise = new Promise<UserWithProfile>(resolve => {
      resolvePromise = resolve;
    });

    vi.mocked(apiClient.getCurrentUser).mockReturnValue(promise);

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: TestWrapper,
    });

    // Should be loading initially
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    // Resolve the promise
    resolvePromise!(mockUser);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual(mockUser);
    });
  });
});
