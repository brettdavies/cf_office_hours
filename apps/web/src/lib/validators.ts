/**
 * Email validation utilities
 */

/**
 * Basic email format validation regex
 * Checks for: something@something.something
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates if a string is a valid email format
 * @param email - Email string to validate
 * @returns true if email format is valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return EMAIL_REGEX.test(email.trim());
}
