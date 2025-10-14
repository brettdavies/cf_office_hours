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
import { createMockUserProfile } from '@/test/fixtures/user';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { createMockUseCurrentUserResult, renderWithRouter } from '@/test/test-utils';

// Mock useCurrentUser hook
vi.mock('@/hooks/useCurrentUser');

// Simple page components for testing
const ProfilePage = () => <div>Profile Page</div>;
const DashboardPage = () => <div>Dashboard Page</div>;
const AvailabilityPage = () => <div>Availability Page</div>;
const MentorsPage = () => <div>Mentors Page</div>;

describe('Navigation Integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should navigate between pages when clicking links', async () => {
    const user = userEvent.setup();

    // Mock useCurrentUser to return mentee user
    vi.mocked(useCurrentUser).mockReturnValue(
      createMockUseCurrentUserResult({
        data: createMockUserProfile({ role: 'mentee' })
      })
    );

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

    // Click Home link (dashboard)
    const homeLink = screen.getByText('Home');
    await user.click(homeLink);

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

    // Mock useCurrentUser to return mentor user
    vi.mocked(useCurrentUser).mockReturnValue(
      createMockUseCurrentUserResult({
        data: createMockUserProfile({
          id: 'mentor-123',
          email: 'mentor@example.com',
          role: 'mentor',
        })
      })
    );

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
    // Mock useCurrentUser to return mentee user
    vi.mocked(useCurrentUser).mockReturnValue(
      createMockUseCurrentUserResult({
        data: createMockUserProfile({ role: 'mentee' })
      })
    );

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

    // Home link should not have active class
    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).toHaveClass('text-gray-600');
  });
});
