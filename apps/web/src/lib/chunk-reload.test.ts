import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isChunkLoadError,
  reloadOnceForChunkError,
  registerPreloadErrorHandler,
} from './chunk-reload';

const reloadMock = vi.fn();
const originalLocation = window.location;
const originalSessionStorage = window.sessionStorage;

function useFreshStorage() {
  Object.defineProperty(window, 'sessionStorage', {
    configurable: true,
    writable: true,
    value: originalSessionStorage,
  });
  window.sessionStorage.clear();
}

function useThrowingStorage() {
  Object.defineProperty(window, 'sessionStorage', {
    configurable: true,
    get() {
      throw new Error('SecurityError: storage is disabled');
    },
  });
}

beforeEach(() => {
  reloadMock.mockClear();
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { reload: reloadMock, href: 'http://localhost/' },
  });
  useFreshStorage();
});

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: originalLocation,
  });
  Object.defineProperty(window, 'sessionStorage', {
    configurable: true,
    writable: true,
    value: originalSessionStorage,
  });
});

describe('isChunkLoadError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://x/assets/Page-abc.js',
    'error loading dynamically imported module',
    'Importing a module script failed.',
    'Unable to preload CSS for /assets/style-abc.css',
    'Loading chunk 42 failed.',
    'Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of "text/html".',
  ])('returns true for chunk-load message form: %s', message => {
    expect(isChunkLoadError(new Error(message))).toBe(true);
  });

  it('returns true when error.name is ChunkLoadError', () => {
    const error = new Error('boom');
    error.name = 'ChunkLoadError';
    expect(isChunkLoadError(error)).toBe(true);
  });

  it('returns true for a plain string carrying the signature', () => {
    expect(isChunkLoadError('Failed to fetch dynamically imported module')).toBe(true);
  });

  it('returns true for a plain object with a matching message', () => {
    expect(isChunkLoadError({ message: 'error loading dynamically imported module' })).toBe(true);
  });

  it.each([null, undefined, 'just a string', 42, {}])(
    'returns false for non-chunk input: %s',
    input => {
      expect(isChunkLoadError(input)).toBe(false);
    }
  );

  it('returns false for a generic Error', () => {
    expect(isChunkLoadError(new Error('boom'))).toBe(false);
  });
});

describe('reloadOnceForChunkError', () => {
  it('reloads exactly once and stamps the guard on the first call', () => {
    const result = reloadOnceForChunkError();

    expect(result).toBe(true);
    expect(reloadMock).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem('chunkReloadAt')).not.toBeNull();
  });

  it('suppresses a second reload within the guard window (loop guard)', () => {
    reloadOnceForChunkError();
    reloadMock.mockClear();

    const result = reloadOnceForChunkError();

    expect(result).toBe(false);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('reloads again after the guard window elapses (later deploy)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-27T00:00:00Z'));
    expect(reloadOnceForChunkError()).toBe(true);
    expect(reloadMock).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date('2026-06-27T00:00:11Z'));
    expect(reloadOnceForChunkError()).toBe(true);
    expect(reloadMock).toHaveBeenCalledTimes(2);
  });

  it('fails safe (no reload) when sessionStorage read throws', () => {
    useThrowingStorage();

    const result = reloadOnceForChunkError();

    expect(result).toBe(false);
    expect(reloadMock).not.toHaveBeenCalled();
  });
});

describe('registerPreloadErrorHandler', () => {
  function dispatchPreloadError() {
    window.dispatchEvent(new Event('vite:preloadError', { cancelable: true }));
  }

  it('reloads once on a vite:preloadError event and respects the guard', () => {
    const cleanup = registerPreloadErrorHandler();

    dispatchPreloadError();
    expect(reloadMock).toHaveBeenCalledTimes(1);

    dispatchPreloadError();
    expect(reloadMock).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('calls preventDefault on the event', () => {
    const cleanup = registerPreloadErrorHandler();
    const event = new Event('vite:preloadError', { cancelable: true });

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    cleanup();
  });

  it('removes the listener on cleanup', () => {
    const cleanup = registerPreloadErrorHandler();
    cleanup();

    dispatchPreloadError();

    expect(reloadMock).not.toHaveBeenCalled();
  });
});
