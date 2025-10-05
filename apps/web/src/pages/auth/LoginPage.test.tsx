import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
    render(<LoginPage />);

    expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send magic link/i })).toBeInTheDocument();
  });

  it('should call Supabase signInWithOtp on form submit with valid email', async () => {
    const mockSignIn = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.auth.signInWithOtp).mockImplementation(mockSignIn);

    render(<LoginPage />);

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
    const mockSignIn = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
    );
    vi.mocked(supabase.auth.signInWithOtp).mockImplementation(mockSignIn);

    render(<LoginPage />);

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
    render(<LoginPage />);

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

    render(<LoginPage />);

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

    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText(/enter your email/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.keyDown(emailInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled();
    });
  });
});
