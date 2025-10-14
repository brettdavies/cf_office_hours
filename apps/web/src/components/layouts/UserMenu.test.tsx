import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserMenu } from './UserMenu';
import { renderWithProviders, createMockUseCurrentUserResult } from '@/test/test-utils';
import { createMockUserProfile, mockUserProfiles } from '@/test/fixtures/user';
import { supabase } from '@/services/supabase';
import { useCurrentUser } from '@/hooks/useCurrentUser';

// Mock lucide-react to avoid lazy loading issues in tests
vi.mock('lucide-react', () => ({
  LogOut: () => <div data-testid="logout-icon" />,
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock useCurrentUser hook
vi.mock('@/hooks/useCurrentUser');

// Mock Supabase
vi.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

describe('UserMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render avatar with user initials', async () => {
    vi.mocked(useCurrentUser).mockReturnValue(
      createMockUseCurrentUserResult({
        data: createMockUserProfile()
      })
    );

    renderWithProviders(<UserMenu />);

    // Avatar fallback should show first 2 letters of email
    await waitFor(
      () => {
        expect(screen.getByText('TE')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should display user email in dropdown', async () => {
    const user = userEvent.setup();
    vi.mocked(useCurrentUser).mockReturnValue(
      createMockUseCurrentUserResult({
        data: createMockUserProfile({ email: 'john@example.com' })
      })
    );

    renderWithProviders(<UserMenu />);

    // Click avatar to open dropdown
    const avatar = await screen.findByText('JO', {}, { timeout: 3000 });
    await user.click(avatar);

    // Email should be visible
    await waitFor(
      () => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should show logout button in dropdown', async () => {
    const user = userEvent.setup();
    vi.mocked(useCurrentUser).mockReturnValue(
      createMockUseCurrentUserResult({
        data: createMockUserProfile()
      })
    );

    renderWithProviders(<UserMenu />);

    // Click avatar to open dropdown
    const avatar = await screen.findByText('TE', {}, { timeout: 3000 });
    await user.click(avatar);

    // Logout button should be visible
    await waitFor(
      () => {
        expect(screen.getByText('Log out')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should call signOut and navigate to login when logout clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useCurrentUser).mockReturnValue(
      createMockUseCurrentUserResult({
        data: createMockUserProfile()
      })
    );

    renderWithProviders(<UserMenu />);

    // Click avatar to open dropdown
    const avatar = await screen.findByText('TE', {}, { timeout: 3000 });
    await user.click(avatar);

    // Click logout button
    const logoutButton = await screen.findByText('Log out', {}, { timeout: 3000 });
    await user.click(logoutButton);

    // Should call Supabase signOut
    await waitFor(
      () => {
        expect(supabase.auth.signOut).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Should navigate to login
    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalledWith('/auth/login');
      },
      { timeout: 3000 }
    );
  });

  it('should render avatar fallback when profile exists', async () => {
    vi.mocked(useCurrentUser).mockReturnValue(
      createMockUseCurrentUserResult({
        data: mockUserProfiles.minimal
      })
    );

    renderWithProviders(<UserMenu />);

    // Avatar should still show fallback (TE) even with avatar_url
    // The image is an implementation detail that loads async
    await waitFor(
      () => {
        expect(screen.getByText('TE')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});
