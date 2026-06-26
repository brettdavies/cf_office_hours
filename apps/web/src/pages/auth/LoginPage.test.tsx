import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LoginPage from './LoginPage';
import { login } from '@/services/auth';

// Mock the auth service
vi.mock('@/services/auth', () => ({
  login: vi.fn(),
}));

// Mock notification store
const mockAddToast = vi.fn();
vi.mock('@/stores/notificationStore', () => ({
  useNotificationStore: vi.fn(() => mockAddToast),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render email input and submit button', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should call login on form submit with a valid email', async () => {
    vi.mocked(login).mockResolvedValue({
      access_token: 't',
      user: { id: 'u', email: 'test@example.com', role: 'mentee' },
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('should show loading state while submitting', async () => {
    vi.mocked(login).mockImplementation(
      () =>
        new Promise(resolve =>
          setTimeout(
            () =>
              resolve({
                access_token: 't',
                user: { id: 'u', email: 'test@example.com', role: 'mentee' },
              }),
            100
          )
        )
    );

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), {
      target: { value: 'test@example.com' },
    });
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    expect(screen.getByText(/signing in\.\.\./i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
    });
  });

  it('should not call login on empty email', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(login).not.toHaveBeenCalled();
    });
  });

  it('should handle login errors gracefully', async () => {
    vi.mocked(login).mockRejectedValue(new Error('Not registered'));

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalled();
      expect(mockAddToast).toHaveBeenCalled();
    });
  });

  it('should support keyboard submission with the Enter key', async () => {
    vi.mocked(login).mockResolvedValue({
      access_token: 't',
      user: { id: 'u', email: 'test@example.com', role: 'mentee' },
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.keyDown(emailInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(login).toHaveBeenCalled();
    });
  });

  describe('Query Parameter - Email Auto-fill', () => {
    const renderAt = (path: string) =>
      render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/auth/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      );

    it('auto-fills email from the query parameter', () => {
      renderAt('/auth/login?u=test@example.com');
      const input = screen.getByPlaceholderText(/enter your email/i) as HTMLInputElement;
      expect(input.value).toBe('test@example.com');
    });

    it('ignores an invalid email query parameter', () => {
      renderAt('/auth/login?u=invalid');
      const input = screen.getByPlaceholderText(/enter your email/i) as HTMLInputElement;
      expect(input.value).toBe('');
    });

    it('handles a URL-encoded email query parameter', () => {
      renderAt('/auth/login?u=test%40example.com');
      const input = screen.getByPlaceholderText(/enter your email/i) as HTMLInputElement;
      expect(input.value).toBe('test@example.com');
    });

    it('handles a URL-encoded email with a plus character', () => {
      renderAt('/auth/login?u=test%2Bmentor%40example.com');
      const input = screen.getByPlaceholderText(/enter your email/i) as HTMLInputElement;
      expect(input.value).toBe('test+mentor@example.com');
    });

    it('handles an unencoded plus (decoded as space)', () => {
      renderAt('/auth/login?u=test mentor@example.com');
      const input = screen.getByPlaceholderText(/enter your email/i) as HTMLInputElement;
      expect(input.value).toBe('test+mentor@example.com');
    });

    it('allows editing a pre-filled email', () => {
      renderAt('/auth/login?u=test@example.com');
      const input = screen.getByPlaceholderText(/enter your email/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'newemail@example.com' } });
      expect(input.value).toBe('newemail@example.com');
    });

    it('handles a missing query parameter', () => {
      renderAt('/auth/login');
      const input = screen.getByPlaceholderText(/enter your email/i) as HTMLInputElement;
      expect(input.value).toBe('');
    });
  });
});
