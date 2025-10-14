import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, createMockUseCurrentUserResult } from '@/test/test-utils';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileMenu } from './MobileMenu';
import { createMockUserProfile } from '@/test/fixtures/user';
import { useCurrentUser } from '@/hooks/useCurrentUser';

// Mock useCurrentUser hook
vi.mock('@/hooks/useCurrentUser');

describe('MobileMenu', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should render hamburger menu button', async () => {
    vi.mocked(useCurrentUser).mockReturnValue(createMockUseCurrentUserResult());

    renderWithProviders(<MobileMenu />);

    // Wait for lazy-loaded icon to render
    await waitFor(() => {
      const menuButton = screen.getByRole('button', { name: /open menu/i });
      expect(menuButton).toBeInTheDocument();
    });
  });

  it('should show navigation links when opened', async () => {
    const user = userEvent.setup();

    vi.mocked(useCurrentUser).mockReturnValue(createMockUseCurrentUserResult());

    renderWithProviders(<MobileMenu />);

    // Wait for lazy-loaded icon and click hamburger menu
    const menuButton = await screen.findByRole('button', { name: /open menu/i });
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

    vi.mocked(useCurrentUser).mockReturnValue(
      createMockUseCurrentUserResult({
        data: createMockUserProfile({
          id: 'mentor-123',
          email: 'mentor@example.com',
          role: 'mentor',
        }),
      })
    );

    renderWithProviders(<MobileMenu />);

    // Wait for lazy-loaded icon and click hamburger menu
    const menuButton = await screen.findByRole('button', { name: /open menu/i });
    await user.click(menuButton);

    // Should show My Availability instead of Browse Mentors
    await waitFor(() => {
      expect(screen.getByText('My Availability')).toBeInTheDocument();
      expect(screen.queryByText('Browse Mentors')).not.toBeInTheDocument();
    });
  });
});
