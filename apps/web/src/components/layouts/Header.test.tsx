import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, createMockUseCurrentUserResult } from '@/test/test-utils';
import { screen } from '@testing-library/react';
import { Header } from './Header';
import { createMockUserProfile } from '@/test/fixtures/user';
import { useCurrentUser } from '@/hooks/useCurrentUser';

// Mock useCurrentUser hook
vi.mock('@/hooks/useCurrentUser');

describe('Header', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should render application branding', () => {
    vi.mocked(useCurrentUser).mockReturnValue(createMockUseCurrentUserResult());

    renderWithProviders(<Header />);

    expect(screen.getByText('CF Office Hours')).toBeInTheDocument();
  });

  it('should render navigation links', () => {
    vi.mocked(useCurrentUser).mockReturnValue(createMockUseCurrentUserResult());

    renderWithProviders(<Header />);

    expect(screen.getByText('My Profile')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('should render "Browse Mentors" for mentees', () => {
    vi.mocked(useCurrentUser).mockReturnValue(
      createMockUseCurrentUserResult({
        data: createMockUserProfile({ role: 'mentee' }),
      })
    );

    renderWithProviders(<Header />);

    expect(screen.getByText('Browse Mentors')).toBeInTheDocument();
    expect(screen.queryByText('My Availability')).not.toBeInTheDocument();
  });

  it('should render "My Availability" for mentors', () => {
    vi.mocked(useCurrentUser).mockReturnValue(
      createMockUseCurrentUserResult({
        data: createMockUserProfile({
          id: 'mentor-123',
          email: 'mentor@example.com',
          role: 'mentor',
        }),
      })
    );

    renderWithProviders(<Header />);

    expect(screen.getByText('My Availability')).toBeInTheDocument();
    expect(screen.queryByText('Browse Mentors')).not.toBeInTheDocument();
  });

  it('should render user menu', async () => {
    vi.mocked(useCurrentUser).mockReturnValue(
      createMockUseCurrentUserResult({
        data: createMockUserProfile(),
      })
    );

    renderWithProviders(<Header />);

    // Avatar initials should be present (first 2 letters of email)
    await screen.findByText('TE');
  });
});
