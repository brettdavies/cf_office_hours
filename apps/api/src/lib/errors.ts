/**
 * Custom error class for application errors.
 *
 * Extends the standard Error class to include:
 * - HTTP status code
 * - Error code (machine-readable identifier)
 * - Optional details object for additional context
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}
