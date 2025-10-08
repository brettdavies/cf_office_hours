import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserMenu } from './UserMenu';
import { renderWithProviders, createMockUser } from '@/test/test-utils';
import { useAuthStore } from '@/stores/authStore';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock useAuth hook
const mockSignOut = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => {
    const { user } = useAuthStore.getState();
    return {
      user,
      session: user ? { access_token: 'test-token', refresh_token: 'test-refresh' } : null,
      isLoading: false,
      isAuthenticated: !!user,
      signOut: mockSignOut,
    };
  },
}));

describe('UserMenu', () => {
  beforeEach(() => {
    // Clear auth store and mocks before each test
    useAuthStore.getState().clearAuth();
    vi.clearAllMocks();
  });

  it('should render avatar with user initials', () => {
    useAuthStore.getState().setUser(createMockUser());

    renderWithProviders(<UserMenu />);

    // Avatar fallback should show first 2 letters of email
    expect(screen.getByText('TE')).toBeInTheDocument();
  });

  it('should display user email in dropdown', async () => {
    const user = userEvent.setup();
    useAuthStore.getState().setUser(createMockUser({ email: 'john@example.com' }));

    renderWithProviders(<UserMenu />);

    // Click avatar to open dropdown
    const avatar = screen.getByText('JO');
    await user.click(avatar);

    // Email should be visible
    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  it('should show logout button in dropdown', async () => {
    const user = userEvent.setup();
    useAuthStore.getState().setUser(createMockUser());

    renderWithProviders(<UserMenu />);

    // Click avatar to open dropdown
    const avatar = screen.getByText('TE');
    await user.click(avatar);

    // Logout button should be visible
    await waitFor(() => {
      expect(screen.getByText('Log out')).toBeInTheDocument();
    });
  });

  it('should call signOut and navigate to login when logout clicked', async () => {
    const user = userEvent.setup();
    useAuthStore.getState().setUser(createMockUser());

    renderWithProviders(<UserMenu />);

    // Click avatar to open dropdown
    const avatar = screen.getByText('TE');
    await user.click(avatar);

    // Click logout button
    const logoutButton = await screen.findByText('Log out');
    await user.click(logoutButton);

    // Should call signOut
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });

    // Should navigate to login
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('should render avatar fallback when profile exists', () => {
    useAuthStore.getState().setUser(
      createMockUser({
        profile: {
          id: 'profile-123',
          user_id: 'user-123',
          name: 'Test User',
          title: null,
          company: null,
          bio: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      })
    );

    renderWithProviders(<UserMenu />);

    // Avatar should still show fallback (TE) even with avatar_url
    // The image is an implementation detail that loads async
    expect(screen.getByText('TE')).toBeInTheDocument();
  });
});
