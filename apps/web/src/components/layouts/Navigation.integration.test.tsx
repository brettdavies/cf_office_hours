/**
 * Integration tests for navigation flow.
 *
 * Tests the complete navigation experience including:
 * - Clicking navigation links
 * - URL updates
 * - Active link highlighting
 * - Role-based navigation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { renderWithRouter, createMockUser } from '@/test/test-utils';
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

// Simple page components for testing
const ProfilePage = () => <div>Profile Page</div>;
const DashboardPage = () => <div>Dashboard Page</div>;
const AvailabilityPage = () => <div>Availability Page</div>;
const MentorsPage = () => <div>Mentors Page</div>;

describe('Navigation Integration', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('should navigate between pages when clicking links', async () => {
    const user = userEvent.setup();
    useAuthStore.getState().setUser(createMockUser({ role: 'mentee' }));

    renderWithRouter(
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/mentors" element={<MentorsPage />} />
        </Route>
      </Routes>,
      { initialEntries: ['/profile'] }
    );

    // Start on profile page
    expect(screen.getByText('Profile Page')).toBeInTheDocument();

    // Click My Bookings link
    const bookingsLink = screen.getByText('My Bookings');
    await user.click(bookingsLink);

    // Should navigate to dashboard
    await waitFor(() => {
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    });

    // Click Browse Mentors link
    const mentorsLink = screen.getByText('Browse Mentors');
    await user.click(mentorsLink);

    // Should navigate to mentors page
    await waitFor(() => {
      expect(screen.getByText('Mentors Page')).toBeInTheDocument();
    });
  });

  it('should navigate to availability page for mentors', async () => {
    const user = userEvent.setup();
    useAuthStore.getState().setUser(createMockUser({
      id: 'mentor-123',
      email: 'mentor@example.com',
      role: 'mentor',
    }));

    renderWithRouter(
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/availability" element={<AvailabilityPage />} />
        </Route>
      </Routes>,
      { initialEntries: ['/profile'] }
    );

    // Click My Availability link
    const availabilityLink = screen.getByText('My Availability');
    await user.click(availabilityLink);

    // Should navigate to availability page
    await waitFor(() => {
      expect(screen.getByText('Availability Page')).toBeInTheDocument();
    });
  });

  it('should highlight active navigation link', async () => {
    useAuthStore.getState().setUser(createMockUser({ role: 'mentee' }));

    renderWithRouter(
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
      </Routes>,
      { initialEntries: ['/profile'] }
    );

    // Profile link should have active class
    const profileLink = screen.getByText('My Profile').closest('a');
    expect(profileLink).toHaveClass('text-primary');

    // My Bookings link should not have active class
    const bookingsLink = screen.getByText('My Bookings').closest('a');
    expect(bookingsLink).toHaveClass('text-gray-600');
  });
});
