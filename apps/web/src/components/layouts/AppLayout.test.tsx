import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { renderWithProviders, createMockUser } from '@/test/test-utils';
import { useAuthStore } from '@/stores/authStore';

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => {
    const { user } = useAuthStore.getState();
    return {
      user,
      session: user ? { access_token: 'test-token', refresh_token: 'test-refresh' } : null,
      isLoading: false,
      isAuthenticated: !!user,
      signOut: vi.fn(),
    };
  },
}));

describe('AppLayout', () => {
  it('should render header with navigation', () => {
    useAuthStore.getState().setUser(createMockUser({
      id: 'user-123',
      email: 'test@example.com',
      role: 'mentee',
    }));

    renderWithProviders(
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<div>Test Content</div>} />
        </Route>
      </Routes>
    );

    // Header should be present
    expect(screen.getByText('CF Office Hours')).toBeInTheDocument();
    expect(screen.getByText('My Profile')).toBeInTheDocument();
  });

  it('should render child routes in main content area', () => {
    useAuthStore.getState().setUser(createMockUser({
      id: 'user-123',
      email: 'test@example.com',
      role: 'mentee',
    }));

    renderWithProviders(
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<div>Test Page Content</div>} />
        </Route>
      </Routes>
    );

    // Child route content should be visible
    expect(screen.getByText('Test Page Content')).toBeInTheDocument();
  });

  it('should have proper layout structure', () => {
    useAuthStore.getState().setUser(createMockUser({
      id: 'user-123',
      email: 'test@example.com',
      role: 'mentee',
    }));

    const { container } = renderWithProviders(
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<div>Test Content</div>} />
        </Route>
      </Routes>
    );

    // Should have header and main elements
    const header = container.querySelector('header');
    const main = container.querySelector('main');

    expect(header).toBeInTheDocument();
    expect(main).toBeInTheDocument();
  });
});
