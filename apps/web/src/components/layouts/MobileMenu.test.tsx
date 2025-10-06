import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileMenu } from './MobileMenu';
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

describe('MobileMenu', () => {
  beforeEach(() => {
    // Clear auth store before each test
    useAuthStore.getState().clearAuth();
  });

  it('should render hamburger menu button', () => {
    useAuthStore.getState().setUser(createMockUser({
      id: 'user-123',
      email: 'test@example.com',
      role: 'mentee',
    }));

    renderWithProviders(<MobileMenu />);

    const menuButton = screen.getByRole('button', { name: /open menu/i });
    expect(menuButton).toBeInTheDocument();
  });

  it('should show navigation links when opened', async () => {
    const user = userEvent.setup();
    useAuthStore.getState().setUser(createMockUser({
      id: 'user-123',
      email: 'test@example.com',
      role: 'mentee',
    }));

    renderWithProviders(<MobileMenu />);

    // Click hamburger menu
    const menuButton = screen.getByRole('button', { name: /open menu/i });
    await user.click(menuButton);

    // Navigation links should be visible
    await waitFor(() => {
      expect(screen.getByText('My Profile')).toBeInTheDocument();
      expect(screen.getByText('My Bookings')).toBeInTheDocument();
      expect(screen.getByText('Browse Mentors')).toBeInTheDocument();
    });
  });

  it('should show "My Availability" for mentors', async () => {
    const user = userEvent.setup();
    useAuthStore.getState().setUser(createMockUser({
      id: 'mentor-123',
      email: 'mentor@example.com',
      role: 'mentor',
    }));

    renderWithProviders(<MobileMenu />);

    // Click hamburger menu
    const menuButton = screen.getByRole('button', { name: /open menu/i });
    await user.click(menuButton);

    // Should show My Availability instead of Browse Mentors
    await waitFor(() => {
      expect(screen.getByText('My Availability')).toBeInTheDocument();
      expect(screen.queryByText('Browse Mentors')).not.toBeInTheDocument();
    });
  });
});
