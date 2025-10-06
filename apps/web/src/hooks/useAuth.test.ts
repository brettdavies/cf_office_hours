/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuth } from './useAuth';
import { supabase } from '@/services/supabase';

// Mock Supabase client
vi.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset Zustand store
    localStorage.clear();
  });

  it('should return initial unauthenticated state', () => {
    // Mock no session
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    } as any);

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('should set session and fetch user when session exists', async () => {
    const mockSession = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'user-123',
        email: 'test@example.com',
      },
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: {},
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession as any },
      error: null,
    });

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    });

    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    } as any);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    expect(result.current.user).toEqual({
      id: 'user-123',
      email: 'test@example.com',
      name: undefined,
      avatar_url: undefined,
    });
    expect(result.current.session).toEqual({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
    });
  });

  it('should clear auth on sign out', async () => {
    const mockSession = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession as any },
      error: null,
    });

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: {},
        } as any,
      },
      error: null,
    });

    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: null,
    });

    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    } as any);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await result.current.signOut();

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('should handle auth state change events', async () => {
    let authCallback: any;

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation(callback => {
      authCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      } as any;
    });

    const mockSession = {
      access_token: 'new-token',
      refresh_token: 'new-refresh',
    };

    const mockUser = {
      id: 'user-456',
      email: 'new@example.com',
      user_metadata: {},
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    // Simulate SIGNED_IN event
    authCallback('SIGNED_IN', mockSession);

    await waitFor(() => {
      expect(result.current.session).toEqual({
        access_token: 'new-token',
        refresh_token: 'new-refresh',
      });
    });
  });
});
