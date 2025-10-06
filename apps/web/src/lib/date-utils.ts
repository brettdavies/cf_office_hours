/**
 * Date Formatting Utilities
 *
 * Centralized date formatting functions for consistent date/time display
 * across the application. All functions accept ISO 8601 strings as input.
 */

// External dependencies
import { format, parseISO } from 'date-fns';

/**
 * Formats an ISO date string to a date key for grouping (yyyy-MM-dd)
 *
 * @param isoDateString - ISO 8601 date string
 * @returns Formatted date key (e.g., "2025-01-15")
 *
 * @example
 * ```typescript
 * formatDateKey("2025-01-15T14:30:00Z") // "2025-01-15"
 * ```
 */
export const formatDateKey = (isoDateString: string): string => {
  return format(parseISO(isoDateString), 'yyyy-MM-dd');
};

/**
 * Formats an ISO date string to a full date label
 *
 * @param isoDateString - ISO 8601 date string
 * @returns Formatted full date (e.g., "Monday, January 15, 2025")
 *
 * @example
 * ```typescript
 * formatFullDate("2025-01-15T14:30:00Z") // "Wednesday, January 15, 2025"
 * ```
 */
export const formatFullDate = (isoDateString: string): string => {
  return format(parseISO(isoDateString), 'EEEE, MMMM d, yyyy');
};

/**
 * Formats an ISO date string to a short date label
 *
 * @param isoDateString - ISO 8601 date string
 * @returns Formatted short date (e.g., "January 15")
 *
 * @example
 * ```typescript
 * formatShortDate("2025-01-15T14:30:00Z") // "January 15"
 * ```
 */
export const formatShortDate = (isoDateString: string): string => {
  return format(parseISO(isoDateString), 'MMMM d');
};

/**
 * Formats an ISO date string to a time label (12-hour format)
 *
 * @param isoDateString - ISO 8601 date string
 * @returns Formatted time (e.g., "2:30 PM")
 *
 * @example
 * ```typescript
 * formatTime("2025-01-15T14:30:00Z") // "2:30 PM"
 * ```
 */
export const formatTime = (isoDateString: string): string => {
  return format(parseISO(isoDateString), 'h:mm a');
};

/**
 * Formats a time range from ISO date strings
 *
 * @param startIsoString - ISO 8601 start date string
 * @param endIsoString - ISO 8601 end date string
 * @returns Formatted time range (e.g., "2:30 PM - 3:30 PM")
 *
 * @example
 * ```typescript
 * formatTimeRange("2025-01-15T14:30:00Z", "2025-01-15T15:30:00Z")
 * // "2:30 PM - 3:30 PM"
 * ```
 */
export const formatTimeRange = (startIsoString: string, endIsoString: string): string => {
  return `${formatTime(startIsoString)} - ${formatTime(endIsoString)}`;
};
