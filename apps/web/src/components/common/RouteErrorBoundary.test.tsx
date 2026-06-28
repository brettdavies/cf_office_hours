import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { RouteErrorBoundary } from './RouteErrorBoundary';
import * as chunkReload from '@/lib/chunk-reload';

vi.mock('@/lib/chunk-reload', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/chunk-reload')>();
  return { ...actual, reloadOnceForChunkError: vi.fn() };
});

const reloadOnceMock = vi.mocked(chunkReload.reloadOnceForChunkError);
const reloadMock = vi.fn();
const originalLocation = window.location;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

function ThrowChunk(): never {
  throw new Error('Failed to fetch dynamically imported module: https://x/assets/Page-abc.js');
}

function ThrowGeneric(): never {
  throw new Error('boom generic');
}

function renderRoute(Child: () => never) {
  const router = createMemoryRouter(
    [
      {
        errorElement: <RouteErrorBoundary />,
        children: [{ path: '/', element: <Child /> }],
      },
    ],
    { initialEntries: ['/'] }
  );
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  reloadOnceMock.mockReset();
  reloadOnceMock.mockReturnValue(true);
  reloadMock.mockClear();
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { reload: reloadMock, href: 'http://localhost/' },
  });
  // React logs caught errors to console.error; silence to keep test output clean.
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: originalLocation,
  });
});

describe('RouteErrorBoundary', () => {
  it('triggers one guarded reload and shows the recovery fallback on a chunk-load error', () => {
    renderRoute(ThrowChunk);

    expect(reloadOnceMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/a new version is available/i)).toBeInTheDocument();
    expect(screen.queryByText(/unexpected application error/i)).not.toBeInTheDocument();
  });

  it('shows a recoverable fallback without looping when the guard suppressed the reload', () => {
    reloadOnceMock.mockReturnValue(false);

    renderRoute(ThrowChunk);

    expect(reloadOnceMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
  });

  it('renders the generic fallback and never reloads on a non-chunk error', () => {
    renderRoute(ThrowGeneric);

    expect(reloadOnceMock).not.toHaveBeenCalled();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/boom generic/i)).toBeInTheDocument();
  });

  it('reloads the page when the manual Reload button is clicked', () => {
    reloadOnceMock.mockReturnValue(false);

    renderRoute(ThrowChunk);
    fireEvent.click(screen.getByRole('button', { name: /reload/i }));

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
