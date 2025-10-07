/**
 * Cloudflare Pages Function for SPA (Single Page Application) routing
 *
 * This function handles all routes and serves index.html for client-side routing,
 * while allowing static assets to pass through normally.
 *
 * Route: [[path]] matches all paths (catch-all)
 * Method: onRequest handles all HTTP methods
 */

export async function onRequest(context: {
  request: Request;
  next: () => Promise<Response>;
  env: Record<string, unknown>;
}) {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // Allow static assets to pass through (they have file extensions)
  if (
    pathname.startsWith('/assets/') ||
    pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)
  ) {
    return context.next();
  }

  // For all other routes, serve index.html to enable client-side routing
  // This allows React Router to handle the routing
  const response = await context.next();

  // If the response is 404 (route doesn't exist as static file), serve index.html
  if (response.status === 404) {
    const indexResponse = await fetch(new URL('/', context.request.url));
    return new Response(indexResponse.body, {
      ...indexResponse,
      headers: {
        ...Object.fromEntries(indexResponse.headers),
        'Content-Type': 'text/html',
      },
    });
  }

  return response;
}
