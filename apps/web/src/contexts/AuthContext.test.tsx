import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuthContext } from './AuthContext';
import { createTestQueryClient } from '@/test/test-utils';

const storeSession = (token: string, user: Record<string, unknown>): void => {
  localStorage.setItem('cf_oh_token', token);
  localStorage.setItem('cf_oh_user', JSON.stringify(user));
};

// Mirrors the cross-tab notification the auth service emits on login/logout.
const notifyAuthChange = (): void => {
  window.dispatchEvent(new StorageEvent('storage', { key: 'cf_oh_token' }));
};

const TestComponent = () => {
  const { session, isAuthenticated } = useAuthContext();
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
      <div data-testid="session-token">{session?.access_token ? 'Has Token' : 'No Token'}</div>
    </div>
  );
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
};

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders authenticated when a session is stored', () => {
    storeSession('mock-access-token', {
      id: 'user-123',
      email: 'test@example.com',
      role: 'mentee',
    });

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    expect(screen.getByTestId('session-token')).toHaveTextContent('Has Token');
  });

  it('renders unauthenticated when no session is stored', () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    expect(screen.getByTestId('session-token')).toHaveTextContent('No Token');
  });

  it('reacts to a sign-in', async () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');

    act(() => {
      storeSession('new-token', {
        id: 'user-456',
        email: 'new@example.com',
        role: 'mentor',
      });
      notifyAuthChange();
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('session-token')).toHaveTextContent('Has Token');
    });
  });

  it('reacts to a sign-out', async () => {
    storeSession('tok', { id: 'u', email: 'e@example.com', role: 'mentee' });
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');

    act(() => {
      localStorage.clear();
      notifyAuthChange();
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });
  });

  it('throws when useAuthContext is used outside a provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestComponent />)).toThrow(
      'useAuthContext must be used within an AuthProvider'
    );
    consoleSpy.mockRestore();
  });

  it('treats a corrupt stored session as signed out', () => {
    localStorage.setItem('cf_oh_token', 'tok');
    localStorage.setItem('cf_oh_user', 'not-json');

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
  });
});
