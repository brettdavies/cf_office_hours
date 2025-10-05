/**
 * Hono context variables for type-safe access to request-scoped data.
 *
 * Variables are set by middleware and accessed in route handlers.
 */
export interface Variables {
  /**
   * Authenticated user information injected by requireAuth middleware.
   */
  user: {
    id: string;
    email: string;
    role: string;
  };
}
