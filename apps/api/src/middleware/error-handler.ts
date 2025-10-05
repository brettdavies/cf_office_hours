// External dependencies
import type { ErrorHandler } from 'hono';

// Internal modules
import { AppError } from '../lib/errors';

export const errorHandler: ErrorHandler = (err, c) => {
  console.error('API Error:', err);

  // Handle AppError instances
  if (err instanceof AppError) {
    return c.json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        timestamp: new Date().toISOString(),
      },
    }, err.statusCode as 400 | 401 | 403 | 404 | 500);
  }

  // Handle unknown errors
  const status = (err as { status?: number }).status || 500;
  const code = (err as { code?: string }).code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred';

  return c.json({
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
    },
  }, status as 500);
};
