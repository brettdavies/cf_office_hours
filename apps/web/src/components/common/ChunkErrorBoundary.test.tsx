import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChunkErrorBoundary } from './ChunkErrorBoundary';
import * as chunkReload from '@/lib/chunk-reload';

vi.mock('@/lib/chunk-reload', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/chunk-reload')>();
  return { ...actual, reloadOnceForChunkError: vi.fn() };
});

const reloadOnceMock = vi.mocked(chunkReload.reloadOnceForChunkError);
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

function ThrowChunk(): never {
  throw new Error('Failed to fetch dynamically imported module: https://x/assets/Page-abc.js');
}

function ThrowGeneric(): never {
  throw new Error('boom generic');
}

beforeEach(() => {
  reloadOnceMock.mockReset();
  reloadOnceMock.mockReturnValue(true);
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('ChunkErrorBoundary', () => {
  it('renders the recovery fallback and triggers one guarded reload on a chunk-load error', () => {
    render(
      <ChunkErrorBoundary>
        <ThrowChunk />
      </ChunkErrorBoundary>
    );

    expect(reloadOnceMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/a new version is available/i)).toBeInTheDocument();
  });

  it('renders the generic fallback and never reloads on a non-chunk error', () => {
    render(
      <ChunkErrorBoundary>
        <ThrowGeneric />
      </ChunkErrorBoundary>
    );

    expect(reloadOnceMock).not.toHaveBeenCalled();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/boom generic/i)).toBeInTheDocument();
  });

  it('renders children and does not reload when nothing throws', () => {
    render(
      <ChunkErrorBoundary>
        <div>healthy content</div>
      </ChunkErrorBoundary>
    );

    expect(screen.getByText('healthy content')).toBeInTheDocument();
    expect(reloadOnceMock).not.toHaveBeenCalled();
  });
});
