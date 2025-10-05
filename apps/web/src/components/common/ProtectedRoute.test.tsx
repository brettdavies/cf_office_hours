import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';

// Mock useAuth hook
vi.mock('@/hooks/useAuth');

// Mock child component
const TestChild = () => <div>Protected Content</div>;

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should show loading spinner when auth is loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,
      signOut: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<TestChild />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/loading\.\.\./i)).toBeInTheDocument();
    expect(screen.queryByText(/protected content/i)).not.toBeInTheDocument();
  });

  it('should redirect to login when not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      isLoading: false,
      isAuthenticated: false,
      signOut: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<TestChild />} />
          </Route>
          <Route path="/auth/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/login page/i)).toBeInTheDocument();
    expect(screen.queryByText(/protected content/i)).not.toBeInTheDocument();
  });

  it('should render children when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      session: { access_token: 'token', refresh_token: 'refresh' },
      isLoading: false,
      isAuthenticated: true,
      signOut: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<TestChild />} />
          </Route>
          <Route path="/auth/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/protected content/i)).toBeInTheDocument();
  });

  it('should not render children when loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,
      signOut: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<TestChild />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText(/protected content/i)).not.toBeInTheDocument();
  });

  it('should handle transition from loading to authenticated', () => {
    // Initially loading
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,
      signOut: vi.fn(),
    });

    const { rerender } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<TestChild />} />
          </Route>
          <Route path="/auth/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/loading\.\.\./i)).toBeInTheDocument();

    // Then authenticated
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '123', email: 'test@example.com' },
      session: { access_token: 'token', refresh_token: 'refresh' },
      isLoading: false,
      isAuthenticated: true,
      signOut: vi.fn(),
    });

    rerender(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<TestChild />} />
          </Route>
          <Route path="/auth/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/protected content/i)).toBeInTheDocument();
  });
});
