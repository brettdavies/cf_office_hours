import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LoginPage from './LoginPage';
import { supabase } from '@/services/supabase';

// Mock Supabase
vi.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
    },
  },
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
    expect(screen.getByRole('button', { name: /send magic link/i })).toBeInTheDocument();
  });

  it('should call Supabase signInWithOtp on form submit with valid email', async () => {
    const mockSignIn = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.auth.signInWithOtp).mockImplementation(mockSignIn);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const submitButton = screen.getByRole('button', { name: /send magic link/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: expect.objectContaining({
          emailRedirectTo: expect.stringContaining('/auth/callback'),
        }),
      });
    });
  });

  it('should show loading state while submitting', async () => {
    const mockSignIn = vi
      .fn()
      .mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
      );
    vi.mocked(supabase.auth.signInWithOtp).mockImplementation(mockSignIn);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const submitButton = screen.getByRole('button', { name: /send magic link/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    expect(screen.getByText(/sending\.\.\./i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText(/send magic link/i)).toBeInTheDocument();
    });
  });

  it('should handle empty email validation', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const submitButton = screen.getByRole('button', { name: /send magic link/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(supabase.auth.signInWithOtp).not.toHaveBeenCalled();
    });
  });

  it('should handle API errors gracefully', async () => {
    const mockSignIn = vi.fn().mockResolvedValue({
      error: new Error('Network error'),
    });
    vi.mocked(supabase.auth.signInWithOtp).mockImplementation(mockSignIn);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const submitButton = screen.getByRole('button', { name: /send magic link/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled();
    });
  });

  it('should support keyboard submission with Enter key', async () => {
    const mockSignIn = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.auth.signInWithOtp).mockImplementation(mockSignIn);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText(/enter your email/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.keyDown(emailInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled();
    });
  });

  describe('Query Parameter - Email Auto-fill', () => {
    it('should auto-fill email from query parameter', () => {
      render(
        <MemoryRouter initialEntries={['/auth/login?u=test@example.com']}>
          <Routes>
            <Route path="/auth/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i) as HTMLInputElement;
      expect(emailInput.value).toBe('test@example.com');
    });

    it('should ignore invalid email query parameter', () => {
      render(
        <MemoryRouter initialEntries={['/auth/login?u=invalid']}>
          <Routes>
            <Route path="/auth/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i) as HTMLInputElement;
      expect(emailInput.value).toBe('');
    });

    it('should handle URL-encoded email query parameter', () => {
      render(
        <MemoryRouter initialEntries={['/auth/login?u=test%40example.com']}>
          <Routes>
            <Route path="/auth/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i) as HTMLInputElement;
      expect(emailInput.value).toBe('test@example.com');
    });

    it('should handle URL-encoded email with plus character', () => {
      render(
        <MemoryRouter initialEntries={['/auth/login?u=test%2Bmentor%40example.com']}>
          <Routes>
            <Route path="/auth/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i) as HTMLInputElement;
      expect(emailInput.value).toBe('test+mentor@example.com');
    });

    it('should handle unencoded plus character (decoded as space by browser)', () => {
      // When user types ?u=test+mentor@example.com in browser, the + is decoded as space
      // Our code converts the space back to + to support this common pattern
      render(
        <MemoryRouter initialEntries={['/auth/login?u=test mentor@example.com']}>
          <Routes>
            <Route path="/auth/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i) as HTMLInputElement;
      expect(emailInput.value).toBe('test+mentor@example.com');
    });

    it('should handle email with plus in username (e.g., test+mentor@example.com)', () => {
      // Real email addresses can have plus in the local part (not just for tagging)
      render(
        <MemoryRouter initialEntries={['/auth/login?u=test mentor@example.com']}>
          <Routes>
            <Route path="/auth/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i) as HTMLInputElement;
      expect(emailInput.value).toBe('test+mentor@example.com');
    });

    it('should allow user to edit pre-filled email', () => {
      render(
        <MemoryRouter initialEntries={['/auth/login?u=test@example.com']}>
          <Routes>
            <Route path="/auth/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i) as HTMLInputElement;
      expect(emailInput.value).toBe('test@example.com');

      fireEvent.change(emailInput, { target: { value: 'newemail@example.com' } });
      expect(emailInput.value).toBe('newemail@example.com');
    });

    it('should handle missing query parameter (no regression)', () => {
      render(
        <MemoryRouter initialEntries={['/auth/login']}>
          <Routes>
            <Route path="/auth/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      );

      const emailInput = screen.getByPlaceholderText(/enter your email/i) as HTMLInputElement;
      expect(emailInput.value).toBe('');
    });
  });
});
