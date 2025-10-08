import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Navigation } from './Navigation';
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

describe('Navigation', () => {
  beforeEach(() => {
    // Clear auth store before each test
    useAuthStore.getState().clearAuth();
  });

  it('should render all common navigation links', () => {
    useAuthStore.getState().setUser(createMockUser({ role: 'mentee' }));

    renderWithProviders(<Navigation />);

    expect(screen.getByText('My Profile')).toBeInTheDocument();
    expect(screen.getByText('My Bookings')).toBeInTheDocument();
  });

  it('should render "Browse Mentors" link for mentees', () => {
    useAuthStore.getState().setUser(createMockUser({ role: 'mentee' }));

    renderWithProviders(<Navigation />);

    expect(screen.getByText('Browse Mentors')).toBeInTheDocument();
    expect(screen.queryByText('My Availability')).not.toBeInTheDocument();
  });

  it('should render "My Availability" link for mentors', () => {
    useAuthStore.getState().setUser(
      createMockUser({
        id: 'mentor-123',
        email: 'mentor@example.com',
        role: 'mentor',
      })
    );

    renderWithProviders(<Navigation />);

    expect(screen.getByText('My Availability')).toBeInTheDocument();
    expect(screen.queryByText('Browse Mentors')).not.toBeInTheDocument();
  });

  it('should render "Browse Mentors" link for coordinators', () => {
    useAuthStore.getState().setUser(
      createMockUser({
        id: 'coordinator-123',
        email: 'coordinator@example.com',
        role: 'coordinator',
      })
    );

    renderWithProviders(<Navigation />);

    expect(screen.getByText('Browse Mentors')).toBeInTheDocument();
    expect(screen.queryByText('My Availability')).not.toBeInTheDocument();
  });

  it('should have correct href attributes', () => {
    useAuthStore.getState().setUser(createMockUser({ role: 'mentee' }));

    renderWithProviders(<Navigation />);

    const profileLink = screen.getByText('My Profile').closest('a');
    const bookingsLink = screen.getByText('My Bookings').closest('a');
    const mentorsLink = screen.getByText('Browse Mentors').closest('a');

    expect(profileLink).toHaveAttribute('href', '/profile');
    expect(bookingsLink).toHaveAttribute('href', '/dashboard');
    expect(mentorsLink).toHaveAttribute('href', '/mentors');
  });
});
