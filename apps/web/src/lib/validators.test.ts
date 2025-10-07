import { describe, it, expect } from 'vitest';
import { isValidEmail } from './validators';

describe('isValidEmail', () => {
  describe('valid emails', () => {
    it('should accept standard email format', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user@domain.co.uk')).toBe(true);
    });

    it('should accept emails with plus (+) character', () => {
      expect(isValidEmail('test+mentor@example.com')).toBe(true);
      expect(isValidEmail('user+tag@domain.co.uk')).toBe(true);
      expect(isValidEmail('email+multiple+plus@example.com')).toBe(true);
    });

    it('should accept emails with dots in local part', () => {
      expect(isValidEmail('first.last@example.com')).toBe(true);
      expect(isValidEmail('user.name.test@domain.com')).toBe(true);
    });

    it('should accept emails with numbers', () => {
      expect(isValidEmail('user123@example.com')).toBe(true);
      expect(isValidEmail('123user@domain.com')).toBe(true);
    });

    it('should accept emails with hyphens', () => {
      expect(isValidEmail('first-last@example.com')).toBe(true);
      expect(isValidEmail('user@my-domain.com')).toBe(true);
    });

    it('should accept emails with underscores', () => {
      expect(isValidEmail('first_last@example.com')).toBe(true);
      expect(isValidEmail('user_name@domain.com')).toBe(true);
    });

    it('should accept emails with subdomains', () => {
      expect(isValidEmail('user@mail.example.com')).toBe(true);
      expect(isValidEmail('test@subdomain.domain.co.uk')).toBe(true);
    });

    it('should handle leading/trailing whitespace', () => {
      expect(isValidEmail('  test@example.com  ')).toBe(true);
      expect(isValidEmail('\tuser@domain.com\n')).toBe(true);
    });
  });

  describe('invalid emails', () => {
    it('should reject emails without @ symbol', () => {
      expect(isValidEmail('testexample.com')).toBe(false);
      expect(isValidEmail('userdomain.com')).toBe(false);
    });

    it('should reject emails without domain', () => {
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('user@domain')).toBe(false);
    });

    it('should reject emails without local part', () => {
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('@domain.co.uk')).toBe(false);
    });

    it('should reject emails with spaces in middle', () => {
      expect(isValidEmail('test user@example.com')).toBe(false);
      expect(isValidEmail('test@exam ple.com')).toBe(false);
    });

    it('should reject emails with multiple @ symbols', () => {
      expect(isValidEmail('test@@example.com')).toBe(false);
      expect(isValidEmail('test@user@example.com')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidEmail('')).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(isValidEmail(null as any)).toBe(false);
      expect(isValidEmail(undefined as any)).toBe(false);
      expect(isValidEmail(123 as any)).toBe(false);
      expect(isValidEmail({} as any)).toBe(false);
    });

    it('should reject plain text', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('not an email')).toBe(false);
    });

    it('should reject emails without TLD', () => {
      expect(isValidEmail('test@example')).toBe(false);
    });
  });
});
