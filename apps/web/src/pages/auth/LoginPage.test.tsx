import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';
import { loginAs } from '@/services/auth';

// Mock the auth service
vi.mock('@/services/auth', () => ({
  loginAs: vi.fn(),
}));

// Mock notification store
const mockAddToast = vi.fn();
vi.mock('@/stores/notificationStore', () => ({
  useNotificationStore: vi.fn(() => mockAddToast),
}));

const session = (role: 'mentee' | 'mentor' | 'coordinator') => ({
  access_token: 't',
  user: { id: 'u', email: `${role}@example.com`, role },
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a button for each role', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /login as mentee/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login as mentor/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login as coordinator/i })).toBeInTheDocument();
  });

  it.each(['mentee', 'mentor', 'coordinator'] as const)(
    'logs in as %s when its button is clicked',
    async role => {
      vi.mocked(loginAs).mockResolvedValue(session(role));

      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: new RegExp(`login as ${role}`, 'i') }));

      await waitFor(() => {
        expect(loginAs).toHaveBeenCalledWith(role);
      });
    }
  );

  it('shows a loading state on the clicked button while signing in', async () => {
    vi.mocked(loginAs).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(session('mentee')), 100))
    );

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /login as mentee/i }));

    expect(screen.getByRole('button', { name: /signing in\.\.\./i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /login as mentee/i })).toBeInTheDocument();
    });
  });

  it('shows an error toast when login fails', async () => {
    vi.mocked(loginAs).mockRejectedValue(new Error('No accounts available'));

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /login as coordinator/i }));

    await waitFor(() => {
      expect(loginAs).toHaveBeenCalled();
      expect(mockAddToast).toHaveBeenCalled();
    });
  });
});
