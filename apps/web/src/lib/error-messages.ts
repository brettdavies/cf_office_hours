// src/lib/error-messages.ts

/**
 * Centralized error message dictionary.
 * Maps error codes to user-friendly messages.
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Authentication & Authorization
  UNAUTHORIZED: 'You need to be logged in to perform this action.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  EMAIL_NOT_WHITELISTED: 'Your email is not authorized. Please contact an administrator for access.',

  // User & Profile
  USER_NOT_FOUND: 'User not found.',
  PROFILE_NOT_FOUND: 'Profile not found.',
  PROFILE_FETCH_ERROR: 'Failed to load user profile. Please try again.',

  // Bookings
  BOOKING_NOT_FOUND: 'Booking not found.',
  SLOT_UNAVAILABLE: 'This time slot is no longer available. Please select another slot.',
  SLOT_ALREADY_BOOKED: 'This slot was just booked by another user. Please select another slot.',
  CALENDAR_CONFLICT: 'You have a conflicting event on your calendar at this time.',
  BOOKING_LIMIT_REACHED: 'You have reached your weekly booking limit for your tier.',
  CALENDAR_CONNECTION_REQUIRED: 'Please connect your calendar to book meetings.',
  BOOKING_TOO_SOON: 'Bookings must be made at least 1 day in advance.',

  // Reputation & Tiers
  TIER_RESTRICTION: 'This mentor requires a higher reputation tier. You can request an exception.',
  DORMANT_USER: 'This user is currently inactive. Please contact a coordinator for assistance.',

  // Availability
  AVAILABILITY_NOT_FOUND: 'Availability block not found.',
  AVAILABILITY_HAS_BOOKINGS: 'Cannot delete availability with confirmed bookings. Cancel the bookings first.',

  // Tier Overrides
  OVERRIDE_REQUEST_NOT_FOUND: 'Override request not found.',
  OVERRIDE_ALREADY_USED: 'This override has already been used.',
  OVERRIDE_EXPIRED: 'This override request has expired.',

  // Calendar Integration
  CALENDAR_PROVIDER_ERROR: 'Failed to connect to your calendar provider. Please try again.',
  CALENDAR_TOKEN_EXPIRED: 'Your calendar connection has expired. Please reconnect.',

  // Airtable Sync
  AIRTABLE_SYNC_ERROR: 'Failed to sync data from Airtable.',

  // Validation
  VALIDATION_ERROR: 'Please check your input and try again.',
  MISSING_REQUIRED_FIELD: 'Please fill in all required fields.',

  // Generic
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again later.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
};

/**
 * Gets a user-friendly error message for a given error code.
 *
 * @param errorCode - The error code from the API
 * @param fallback - Fallback message if error code not found
 * @returns User-friendly error message
 */
export const getErrorMessage = (
  errorCode: string | undefined,
  fallback: string = ERROR_MESSAGES.INTERNAL_ERROR
): string => {
  if (!errorCode) {
    return fallback;
  }

  return ERROR_MESSAGES[errorCode] || fallback;
};

/**
 * Gets multiple error messages for validation errors.
 *
 * @param errors - Array of error codes
 * @returns Array of user-friendly error messages
 */
export const getErrorMessages = (errors: string[]): string[] => {
  return errors.map((code) => getErrorMessage(code));
};
