import type { ErrorHandler } from 'hono';

export const errorHandler: ErrorHandler = (err, c) => {
  console.error('API Error:', err);

  // Default 500 error
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred';

  return c.json({
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
    },
  }, status);
};
