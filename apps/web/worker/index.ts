/**
 * Static-assets Worker for the SPA.
 *
 * `wrangler.jsonc` sets `not_found_handling: "single-page-application"`, so the
 * ASSETS binding answers a missing hashed asset with `index.html` (`text/html`).
 * A browser module loader that receives HTML for a `.js`/`.css` request fails on
 * the MIME type instead of getting a clean 404. `run_worker_first: ["/assets/*"]`
 * forces this Worker to run first for asset paths so it can convert that
 * SPA-fallback HTML into a real 404, while genuine SPA routes keep their
 * `index.html` 200.
 */

import { isImmutableAssetPath } from './asset-routing';

export interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

function isHtmlResponse(response: Response): boolean {
  const contentType = response.headers.get('content-type');
  return contentType !== null && contentType.toLowerCase().includes('text/html');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const assetResponse = await env.ASSETS.fetch(request);

    const { pathname } = new URL(request.url);
    if (isImmutableAssetPath(pathname) && isHtmlResponse(assetResponse)) {
      return new Response('Not Found', {
        status: 404,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'no-store',
        },
      });
    }

    return assetResponse;
  },
};
