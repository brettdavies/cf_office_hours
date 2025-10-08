/**
 * Common Zod validation schemas shared across API routes.
 *
 * These schemas serve multiple purposes:
 * 1. Runtime validation of API requests/responses
 * 2. TypeScript type generation via z.infer
 * 3. OpenAPI specification generation
 */

// External dependencies
import * as z from "zod";

/**
 * Standard error response schema used across all API endpoints.
 *
 * This ensures consistent error response format throughout the API.
 * Used by all route files for OpenAPI documentation and response validation.
 */
export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    timestamp: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});

/**
 * TypeScript type for error responses.
 * Provides compile-time type safety for error handling.
 */
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
