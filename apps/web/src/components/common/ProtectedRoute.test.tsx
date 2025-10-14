/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { renderWithRouter } from '@/test/test-utils';

// Mock useAuthContext hook
const mockUseAuthContext = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => mockUseAuthContext(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock child component
const TestChild = () => <div>Protected Content</div>;

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUseAuthContext.mockReset();
  });

  it('should show loading spinner when auth is loading', () => {
    mockUseAuthContext.mockReturnValue({
      session: null,
      isLoading: true,
      isAuthenticated: false,
    });

    renderWithRouter(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<TestChild />} />
        </Route>
      </Routes>
    );

    expect(screen.getByText(/Loading\.\.\./i)).toBeInTheDocument();
    expect(screen.queryByText(/protected content/i)).not.toBeInTheDocument();
  });

  it('should redirect to login when not authenticated', () => {
    mockUseAuthContext.mockReturnValue({
      session: null,
      isLoading: false,
      isAuthenticated: false,
    });

    renderWithRouter(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<TestChild />} />
        </Route>
        <Route path="/auth/login" element={<div>Login Page</div>} />
      </Routes>
    );

    expect(screen.getByText(/login page/i)).toBeInTheDocument();
    expect(screen.queryByText(/protected content/i)).not.toBeInTheDocument();
  });

  it('should render children when authenticated', () => {
    mockUseAuthContext.mockReturnValue({
      session: { access_token: 'token', refresh_token: 'refresh' } as any,
      isLoading: false,
      isAuthenticated: true,
    });

    renderWithRouter(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<TestChild />} />
        </Route>
        <Route path="/auth/login" element={<div>Login Page</div>} />
      </Routes>
    );

    expect(screen.getByText(/protected content/i)).toBeInTheDocument();
  });

  it('should not render children when loading', () => {
    mockUseAuthContext.mockReturnValue({
      session: null,
      isLoading: true,
      isAuthenticated: false,
    });

    renderWithRouter(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<TestChild />} />
        </Route>
      </Routes>
    );

    expect(screen.queryByText(/protected content/i)).not.toBeInTheDocument();
  });

  it('should handle transition from loading to authenticated', () => {
    // Initially loading
    mockUseAuthContext.mockReturnValue({
      session: null,
      isLoading: true,
      isAuthenticated: false,
    });

    const { rerender } = renderWithRouter(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<TestChild />} />
        </Route>
        <Route path="/auth/login" element={<div>Login Page</div>} />
      </Routes>
    );

    expect(screen.getByText(/Loading\.\.\./i)).toBeInTheDocument();

    // Then authenticated
    mockUseAuthContext.mockReturnValue({
      session: { access_token: 'token', refresh_token: 'refresh' } as any,
      isLoading: false,
      isAuthenticated: true,
    });

    rerender(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<TestChild />} />
        </Route>
        <Route path="/auth/login" element={<div>Login Page</div>} />
      </Routes>
    );

    expect(screen.getByText(/protected content/i)).toBeInTheDocument();
  });
});
