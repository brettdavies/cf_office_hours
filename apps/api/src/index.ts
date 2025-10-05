// External dependencies
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

// Internal modules
import { errorHandler } from './middleware/error-handler';
import { requireAuth } from './middleware/auth';

// Types
import type { Env } from './types/bindings';
import type { Variables } from './types/context';

// Create Hono app with Cloudflare bindings and variables
const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Global middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://officehours.youcanjustdothings.io'],
  credentials: true,
}));
app.use('*', prettyJSON());

// Health check (no auth required)
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected test route (requires auth)
app.get('/protected', requireAuth, (c) => {
  const user = c.get('user');
  return c.json({ message: 'Authenticated', user });
});

// Global error handler (must be last)
app.onError(errorHandler);

// 404 handler
app.notFound((c) => {
  return c.json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
      timestamp: new Date().toISOString(),
    },
  }, 404);
});

export default app;
