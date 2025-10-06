/**
 * Logging Middleware
 *
 * Logs all incoming API requests with relevant metadata.
 * Helps with debugging and monitoring in development and production.
 */

// External dependencies
import type { Context, Next } from 'hono';

// Types
import type { Variables } from '../types/context';

/**
 * Middleware to log incoming API requests.
 *
 * Logs:
 * - HTTP method
 * - Request path
 * - User ID (if authenticated)
 * - Timestamp
 *
 * Response logging added after request completes:
 * - Status code
 * - Request duration
 */
export const loggingMiddleware = async (c: Context<{ Variables: Variables }>, next: Next) => {
  const startTime = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  // Get user ID from context if authenticated (set by auth middleware)
  const user = c.get('user');
  const userId = user?.id || 'anonymous';

  console.log('[API] Request received', {
    method,
    path,
    userId,
    timestamp: new Date().toISOString(),
  });

  // Execute request
  await next();

  // Log response
  const duration = Date.now() - startTime;
  const statusCode = c.res.status;

  console.log('[API] Request completed', {
    method,
    path,
    userId,
    statusCode,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
  });
};
