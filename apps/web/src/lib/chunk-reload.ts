/**
 * Stale-chunk recovery shared by the React error boundaries and the
 * `vite:preloadError` window listener.
 *
 * After a redeploy, a long-open tab requests a hashed lazy chunk that no longer
 * exists. The module loader rejects it (missing asset or wrong MIME). These
 * helpers detect that failure and reload once, behind a fail-safe loop guard so
 * a genuinely missing asset cannot reload forever.
 */

const RELOAD_AT_KEY = 'chunkReloadAt';
const RELOAD_WINDOW_MS = 10_000;

const CHUNK_ERROR_SIGNATURES = [
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'importing a module script failed',
  'unable to preload css',
  'chunkloaderror',
  'loading chunk',
  'failed to load module script',
  'expected a javascript module script but the server responded with a mime type of',
];

function matchesSignature(text: string): boolean {
  const lower = text.toLowerCase();
  return CHUNK_ERROR_SIGNATURES.some(signature => lower.includes(signature));
}

/**
 * True when `error` looks like a dynamic-import / chunk-load failure, across the
 * Chrome, Firefox, and Safari message forms plus the wrong-MIME signature.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (error == null) return false;
  if (typeof error === 'string') return matchesSignature(error);
  if (error instanceof Error) {
    if (error.name === 'ChunkLoadError') return true;
    return matchesSignature(error.message) || matchesSignature(error.name);
  }
  if (typeof error === 'object') {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === 'string') return matchesSignature(maybeMessage);
  }
  return false;
}

/**
 * Reload at most once per {@link RELOAD_WINDOW_MS} window, returning whether a
 * reload was triggered.
 *
 * Fail-safe: if `sessionStorage` is unavailable (private mode, disabled storage,
 * partitioned iframe) the guard flag cannot be persisted, so this does NOT
 * reload — reloading without a persisted guard would hard-loop on a genuinely
 * missing asset. Callers render a manual recovery fallback when this returns
 * `false`.
 */
export function reloadOnceForChunkError(): boolean {
  let lastReloadAt: number | null;
  try {
    const stored = window.sessionStorage.getItem(RELOAD_AT_KEY);
    lastReloadAt = stored === null ? null : Number(stored);
  } catch {
    return false;
  }

  if (
    lastReloadAt !== null &&
    Number.isFinite(lastReloadAt) &&
    Date.now() - lastReloadAt < RELOAD_WINDOW_MS
  ) {
    return false;
  }

  try {
    window.sessionStorage.setItem(RELOAD_AT_KEY, String(Date.now()));
  } catch {
    return false;
  }

  window.location.reload();
  return true;
}

/**
 * Register a `vite:preloadError` listener that intercepts a failed
 * `modulepreload` and triggers a guarded reload. Returns a cleanup function that
 * removes the listener.
 */
export function registerPreloadErrorHandler(): () => void {
  const handler = (event: Event): void => {
    event.preventDefault();
    reloadOnceForChunkError();
  };
  window.addEventListener('vite:preloadError', handler);
  return () => {
    window.removeEventListener('vite:preloadError', handler);
  };
}
