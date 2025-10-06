import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Header } from './Header';
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

describe('Header', () => {
  beforeEach(() => {
    // Clear auth store before each test
    useAuthStore.getState().clearAuth();
  });

  it('should render application branding', () => {
    useAuthStore.getState().setUser(createMockUser());

    renderWithProviders(<Header />);

    expect(screen.getByText('CF Office Hours')).toBeInTheDocument();
  });

  it('should render navigation links', () => {
    useAuthStore.getState().setUser(createMockUser());

    renderWithProviders(<Header />);

    expect(screen.getByText('My Profile')).toBeInTheDocument();
    expect(screen.getByText('My Bookings')).toBeInTheDocument();
  });

  it('should render "Browse Mentors" for mentees', () => {
    useAuthStore.getState().setUser(createMockUser({ role: 'mentee' }));

    renderWithProviders(<Header />);

    expect(screen.getByText('Browse Mentors')).toBeInTheDocument();
    expect(screen.queryByText('My Availability')).not.toBeInTheDocument();
  });

  it('should render "My Availability" for mentors', () => {
    useAuthStore.getState().setUser(createMockUser({
      id: 'mentor-123',
      email: 'mentor@example.com',
      role: 'mentor',
    }));

    renderWithProviders(<Header />);

    expect(screen.getByText('My Availability')).toBeInTheDocument();
    expect(screen.queryByText('Browse Mentors')).not.toBeInTheDocument();
  });

  it('should render user menu', () => {
    useAuthStore.getState().setUser(createMockUser());

    renderWithProviders(<Header />);

    // Avatar initials should be present
    expect(screen.getByText('TE')).toBeInTheDocument();
  });
});
