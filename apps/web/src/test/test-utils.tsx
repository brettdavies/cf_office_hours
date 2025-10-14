/**
 * Test utilities for rendering components with necessary providers.
 *
 * Provides helper functions to render components with React Router,
 * React Query, and other required context providers.
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider, UseQueryResult } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import type { UserWithProfile } from '@/types/user';
import { vi } from 'vitest';

/**
 * Creates a new QueryClient for testing with appropriate defaults
 */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface AllProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

/**
 * Wrapper component that provides all necessary providers for testing
 */
function AllProviders({ children, queryClient }: AllProvidersProps) {
  const client = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

/**
 * Custom render function that wraps component with all providers
 */
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    queryClient?: QueryClient;
  }
) => {
  const { queryClient, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => <AllProviders queryClient={queryClient}>{children}</AllProviders>,
    ...renderOptions,
  });
};

/**
 * Render with MemoryRouter for testing navigation
 */
export const renderWithRouter = (
  ui: ReactElement,
  {
    initialEntries = ['/'],
    ...options
  }: { initialEntries?: string[] } & Omit<RenderOptions, 'wrapper'> = {}
) => {
  const queryClient = createTestQueryClient();

  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    ),
    ...options,
  });
};

/**
 * Creates a mock React Query result for useCurrentUser hook.
 * Provides sensible defaults for all required UseQueryResult fields.
 *
 * @param overrides - Partial overrides for the query result
 * @returns Complete UseQueryResult mock for useCurrentUser
 *
 * @example
 * // Mock loading state
 * vi.mocked(useCurrentUser).mockReturnValue(
 *   createMockUseCurrentUserResult({ isLoading: true })
 * );
 *
 * @example
 * // Mock with user data
 * vi.mocked(useCurrentUser).mockReturnValue(
 *   createMockUseCurrentUserResult({
 *     data: createMockUserProfile({ role: 'mentor' })
 *   })
 * );
 */
/**
 * Creates a mock React Query result for useCurrentUser hook.
 *
 * NOTE: This returns `UseQueryResult<UserWithProfile, Error>` (without undefined) to match
 * what vi.mocked() expects, even though the actual hook returns `UserWithProfile | undefined`.
 * This is a pragmatic workaround for TypeScript's strict checking of mock types.
 * The actual runtime behavior is correct since we always provide proper data or undefined.
 */
export const createMockUseCurrentUserResult = (
  overrides?: Partial<UseQueryResult<UserWithProfile | undefined, Error>>
): UseQueryResult<UserWithProfile, Error> => {
  const result = {
    data: undefined as unknown as UserWithProfile,
    error: null,
    isLoading: false,
    isError: false,
    isSuccess: true,
    status: 'success' as const,
    fetchStatus: 'idle' as const,
    refetch: vi.fn() as unknown as () => Promise<UseQueryResult<UserWithProfile, Error>>,
    dataUpdatedAt: Date.now(),
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isPaused: false,
    isPending: false,
    isPlaceholderData: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: false,
    isLoadingError: false,
    promise: Promise.resolve(undefined as unknown as UserWithProfile),
    ...overrides,
  };
  return result as UseQueryResult<UserWithProfile, Error>;
};

/**
 * IMPORTANT: Mock user factories have been moved to domain-specific fixture files
 * per coding standard 14.11.2:
 *
 * - For auth/profile tests: import { createMockUserProfile } from '@/test/fixtures/user'
 * - For matching tests: import { createMockUserWithProfile } from '@/test/fixtures/matching'
 *
 * Do NOT create inline mock objects - always use centralized factories.
 */
