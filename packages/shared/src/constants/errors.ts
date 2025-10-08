/**
 * Error codes and constants shared across the application.
 *
 * Provides consistent error codes for:
 * - API error responses
 * - Service layer error handling
 * - Client-side error handling
 */

/**
 * Standard HTTP status codes used throughout the API.
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Application-specific error codes.
 * These correspond to AppError codes used in the service layer.
 */
export const ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  USER_NOT_FOUND: "USER_NOT_FOUND",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",

  // Resource Operations
  NOT_FOUND: "NOT_FOUND",
  CREATION_FAILED: "CREATION_FAILED",
  UPDATE_FAILED: "UPDATE_FAILED",
  DELETE_FAILED: "DELETE_FAILED",

  // Booking Operations
  SLOT_NOT_FOUND: "SLOT_NOT_FOUND",
  SLOT_UNAVAILABLE: "SLOT_UNAVAILABLE",
  BOOKING_NOT_FOUND: "BOOKING_NOT_FOUND",

  // Availability Operations
  AVAILABILITY_NOT_FOUND: "AVAILABILITY_NOT_FOUND",
  FETCH_FAILED: "FETCH_FAILED",

  // Database Operations
  DATABASE_ERROR: "DATABASE_ERROR",

  // Internal Errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

/**
 * User-friendly error messages for common error codes.
 * These can be used for client-side error display.
 */
export const ERROR_MESSAGES = {
  [ERROR_CODES.UNAUTHORIZED]: "Authentication required",
  [ERROR_CODES.FORBIDDEN]: "Access denied",
  [ERROR_CODES.USER_NOT_FOUND]: "User not found",
  [ERROR_CODES.VALIDATION_ERROR]: "Invalid request data",
  [ERROR_CODES.NOT_FOUND]: "Resource not found",
  [ERROR_CODES.CREATION_FAILED]: "Failed to create resource",
  [ERROR_CODES.UPDATE_FAILED]: "Failed to update resource",
  [ERROR_CODES.SLOT_NOT_FOUND]: "Time slot not found",
  [ERROR_CODES.SLOT_UNAVAILABLE]: "Time slot no longer available",
  [ERROR_CODES.DATABASE_ERROR]: "Database operation failed",
  [ERROR_CODES.INTERNAL_ERROR]: "An unexpected error occurred",
} as const;
