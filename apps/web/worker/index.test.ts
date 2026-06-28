import { describe, it, expect } from 'vitest';
import worker, { type Env } from './index';

// Runs under the default jsdom environment: Request/Response/URL are Node
// globals available there. A node test environment is deliberately not used
// because the shared src/test/setup.ts touches bare `window`.

function htmlResponse(): Response {
  return new Response('<!doctype html><title>app</title>', {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

function jsResponse(): Response {
  return new Response('export const x = 1;', {
    status: 200,
    headers: { 'content-type': 'application/javascript' },
  });
}

function envReturning(responder: () => Response): Env {
  return {
    ASSETS: {
      fetch: async () => responder(),
    },
  };
}

function fetchWith(url: string, responder: () => Response, init?: RequestInit): Promise<Response> {
  return worker.fetch(new Request(url, init), envReturning(responder));
}

describe('static-assets worker', () => {
  it('returns a real 404 for a missing hashed asset (SPA fallback HTML)', async () => {
    const res = await fetchWith(
      'https://host/assets/CoordinatorMatchingPage-abc12345.js',
      htmlResponse
    );

    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('text/plain');
    expect(await res.text()).not.toContain('<!doctype html>');
  });

  it('passes through an existing asset unchanged', async () => {
    const res = await fetchWith('https://host/assets/index-deadbeef.js', jsResponse);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/javascript');
  });

  it('serves index.html for a genuine SPA route', async () => {
    const res = await fetchWith('https://host/coordinator/matching', htmlResponse);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  it('serves index.html for the root path', async () => {
    const res = await fetchWith('https://host/', htmlResponse);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  describe('red-team', () => {
    it('normalizes dotdot traversal away from the asset prefix and passes through', async () => {
      // new URL().pathname collapses `/assets/../index.html` to `/index.html`.
      const res = await fetchWith('https://host/assets/../index.html', htmlResponse);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');
    });

    it('normalizes encoded traversal (%2e%2e) away from the asset prefix and passes through', async () => {
      // The WHATWG URL Standard treats `%2e%2e` (case-insensitive) as a
      // double-dot path segment, so `new URL().pathname` collapses
      // `/assets/%2e%2e/index.html` to `/index.html` exactly like literal `..`.
      // The same spec-compliant parser runs in the Worker runtime, so the
      // encoded form can never stay under /assets/ to reach the 404 branch.
      const res = await fetchWith('https://host/assets/%2e%2e/index.html', htmlResponse);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');
    });

    it.each(['HEAD', 'POST'])('404s a missing asset for non-GET method %s', async method => {
      const res = await fetchWith('https://host/assets/missing-deadbeef.js', htmlResponse, {
        method,
      });

      expect(res.status).toBe(404);
    });

    it.each(['/dashboard/assets', '/my-assets-overview'])(
      'passes through a route that merely looks like an asset: %s',
      async pathname => {
        const res = await fetchWith(`https://host${pathname}`, htmlResponse);

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/html');
      }
    );

    it('404s a missing double-extension asset', async () => {
      const res = await fetchWith('https://host/assets/app.js.html', htmlResponse);

      expect(res.status).toBe(404);
    });

    it('ignores the query string when discriminating (missing -> 404)', async () => {
      const res = await fetchWith('https://host/assets/index-abc12345.js?v=2', htmlResponse);

      expect(res.status).toBe(404);
    });

    it('ignores the query string when discriminating (existing -> passthrough)', async () => {
      const res = await fetchWith('https://host/assets/index-abc12345.js?v=2', jsResponse);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/javascript');
    });

    it('passes through a case-variant asset path (loader requests exact lowercase)', async () => {
      const res = await fetchWith('https://host/ASSETS/index-abc.js', htmlResponse);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');
    });
  });
});
