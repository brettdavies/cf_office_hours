/**
 * Test utilities for rendering components with necessary providers.
 *
 * Provides helper functions to render components with React Router,
 * React Query, and other required context providers.
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { UserWithProfile, UserRole } from '@/types/user';

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
      <BrowserRouter>{children}</BrowserRouter>
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
    wrapper: ({ children }) => (
      <AllProviders queryClient={queryClient}>{children}</AllProviders>
    ),
    ...renderOptions,
  });
};

/**
 * Render with MemoryRouter for testing navigation
 */
export const renderWithRouter = (
  ui: ReactElement,
  { initialEntries = ['/'], ...options }: { initialEntries?: string[] } & Omit<RenderOptions, 'wrapper'> = {}
) => {
  const queryClient = createTestQueryClient();

  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </QueryClientProvider>
    ),
    ...options,
  });
};

/**
 * Type-safe mock user factory for tests
 */
export const createMockUser = (
  overrides: Partial<UserWithProfile> & { role?: UserRole } = {}
): UserWithProfile => ({
  id: overrides.id || 'test-user-id',
  airtable_record_id: overrides.airtable_record_id || null,
  email: overrides.email || 'test@example.com',
  role: overrides.role || 'mentee',
  created_at: overrides.created_at || new Date().toISOString(),
  updated_at: overrides.updated_at || new Date().toISOString(),
  profile: overrides.profile || {
    id: 'test-profile-id',
    user_id: overrides.id || 'test-user-id',
    name: 'Test User',
    title: null,
    company: null,
    bio: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
});
