// External dependencies
import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

// Internal modules
import { errorHandler } from './middleware/error-handler';
import { requireAuth } from './middleware/auth';
import { loggingMiddleware } from './middleware/logging';
import { routes } from './routes';

// Types
import type { Env } from './types/bindings';
import type { Variables } from './types/context';

// Create OpenAPI-enabled Hono app with Cloudflare bindings and variables
const app = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();

// Global middleware
app.use('*', logger());
app.use('*', loggingMiddleware); // Custom logging middleware (Story 0.16.1)
app.use(
  '*',
  cors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://officehours.youcanjustdothings.io',
    ],
    credentials: true,
  })
);
app.use('*', prettyJSON());

// Health check (no auth required)
app.get('/health', c => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected test route (requires auth)
app.get('/protected', requireAuth, c => {
  const user = c.get('user');
  return c.json({ message: 'Authenticated', user });
});

// Mount API v1 routes
app.route('/v1', routes);

// OpenAPI documentation
app.doc('/api/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'CF Office Hours API',
    version: '1.0.0',
    description: 'API for Capital Factory Office Hours platform',
  },
  servers: [
    {
      url: 'http://localhost:8787',
      description: 'Local development',
    },
    {
      url: 'https://api.officehours.youcanjustdothings.io',
      description: 'Production',
    },
  ],
});

// Swagger UI for API documentation
app.get('/api/docs', swaggerUI({ url: '/api/openapi.json' }));

// Global error handler (must be last)
app.onError(errorHandler);

// 404 handler
app.notFound(c => {
  return c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
        timestamp: new Date().toISOString(),
      },
    },
    404
  );
});

export default app;
