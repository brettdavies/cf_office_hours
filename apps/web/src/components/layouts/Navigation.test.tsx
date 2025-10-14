import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Navigation } from './Navigation';
import { createMockUserProfile } from '@/test/fixtures/user';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { renderWithProviders, createMockUseCurrentUserResult } from '@/test/test-utils';

// Mock AuthContext
vi.mock('@/contexts/AuthContext', async () => {
  const actual = await vi.importActual('@/contexts/AuthContext');
  return {
    ...actual,
    useAuthContext: () => ({
      session: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
        access_token: 'test-token',
      },
      user: null,
      isLoading: false,
      isAuthenticated: true,
    }),
  };
});

// Mock useCurrentUser hook after other mocks
vi.mock('@/hooks/useCurrentUser');

describe('Navigation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should render all common navigation links', () => {
    vi.mocked(useCurrentUser).mockReturnValue(
      createMockUseCurrentUserResult({
        data: createMockUserProfile({ role: 'mentee' }),
      })
    );

    renderWithProviders(<Navigation />);

    // First check if the navigation element exists
    expect(screen.getByTestId('navigation')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('My Profile')).toBeInTheDocument();
  });

  it('should render "Browse Mentors" link for mentees', () => {
    vi.mocked(useCurrentUser).mockReturnValue(
      createMockUseCurrentUserResult({
        data: createMockUserProfile({ role: 'mentee' }),
      })
    );

    renderWithProviders(<Navigation />);

    expect(screen.getByText('Browse Mentors')).toBeInTheDocument();
    expect(screen.queryByText('My Availability')).not.toBeInTheDocument();
  });

  it('should render "My Availability" link for mentors', () => {
    vi.mocked(useCurrentUser).mockReturnValue(
      createMockUseCurrentUserResult({
        data: createMockUserProfile({
          id: 'mentor-123',
          email: 'mentor@example.com',
          role: 'mentor',
        }),
      })
    );

    renderWithProviders(<Navigation />);

    expect(screen.getByText('My Availability')).toBeInTheDocument();
    expect(screen.queryByText('Browse Mentors')).not.toBeInTheDocument();
  });

  it('should render "Find Matches" link for coordinators', () => {
    vi.mocked(useCurrentUser).mockReturnValue(
      createMockUseCurrentUserResult({
        data: createMockUserProfile({
          id: 'coordinator-123',
          email: 'coordinator@example.com',
          role: 'coordinator',
        }),
      })
    );

    renderWithProviders(<Navigation />);

    expect(screen.getByText('Find Matches')).toBeInTheDocument();
    expect(screen.queryByText('My Availability')).not.toBeInTheDocument();
  });

  it('should have correct href attributes', () => {
    vi.mocked(useCurrentUser).mockReturnValue(
      createMockUseCurrentUserResult({
        data: createMockUserProfile({ role: 'mentee' }),
      })
    );

    renderWithProviders(<Navigation />);

    const homeLink = screen.getByText('Home').closest('a');
    const profileLink = screen.getByText('My Profile').closest('a');
    const mentorsLink = screen.getByText('Browse Mentors').closest('a');

    expect(homeLink).toHaveAttribute('href', '/dashboard');
    expect(profileLink).toHaveAttribute('href', '/profile');
    expect(mentorsLink).toHaveAttribute('href', '/mentors');
  });
});
