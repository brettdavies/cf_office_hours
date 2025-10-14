import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, createMockUseCurrentUserResult } from '@/test/test-utils';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { createMockUserProfile } from '@/test/fixtures/user';
import { useCurrentUser } from '@/hooks/useCurrentUser';

// Mock useCurrentUser hook
vi.mock('@/hooks/useCurrentUser');

describe('AppLayout', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should render header with navigation', () => {
    vi.mocked(useCurrentUser).mockReturnValue(
      createMockUseCurrentUserResult({
        data: createMockUserProfile({
          id: 'user-123',
          email: 'test@example.com',
          role: 'mentee',
        }),
      })
    );

    renderWithProviders(
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<div>Test Content</div>} />
        </Route>
      </Routes>
    );

    // Header should be present
    expect(screen.getByText('CF Office Hours')).toBeInTheDocument();
    expect(screen.getByText('My Profile')).toBeInTheDocument();
  });

  it('should render child routes in main content area', () => {
    vi.mocked(useCurrentUser).mockReturnValue(
      createMockUseCurrentUserResult({
        data: createMockUserProfile({
          id: 'user-123',
          email: 'test@example.com',
          role: 'mentee',
        }),
      })
    );

    renderWithProviders(
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<div>Test Page Content</div>} />
        </Route>
      </Routes>
    );

    // Child route content should be visible
    expect(screen.getByText('Test Page Content')).toBeInTheDocument();
  });

  it('should have proper layout structure', () => {
    vi.mocked(useCurrentUser).mockReturnValue(
      createMockUseCurrentUserResult({
        data: createMockUserProfile({
          id: 'user-123',
          email: 'test@example.com',
          role: 'mentee',
        }),
      })
    );

    const { container } = renderWithProviders(
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<div>Test Content</div>} />
        </Route>
      </Routes>
    );

    // Should have header and main elements
    const header = container.querySelector('header');
    const main = container.querySelector('main');

    expect(header).toBeInTheDocument();
    expect(main).toBeInTheDocument();
  });
});
