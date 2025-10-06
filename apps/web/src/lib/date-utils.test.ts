/**
 * Tests for Date Formatting Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  formatDateKey,
  formatFullDate,
  formatShortDate,
  formatTime,
  formatTimeRange,
} from './date-utils';

describe('date-utils', () => {
  describe('formatDateKey', () => {
    it('should format ISO string to yyyy-MM-dd', () => {
      // Using times from slot fixtures that work in local timezone
      expect(formatDateKey('2025-10-15T19:00:00Z')).toBe('2025-10-15');
    });

    it('should handle different times on same day consistently', () => {
      expect(formatDateKey('2025-10-15T14:00:00Z')).toBe('2025-10-15');
      expect(formatDateKey('2025-10-15T22:00:00Z')).toBe('2025-10-15');
    });

    it('should handle single-digit months and days with leading zeros', () => {
      expect(formatDateKey('2025-01-05T19:00:00Z')).toBe('2025-01-05');
      expect(formatDateKey('2025-12-25T19:00:00Z')).toBe('2025-12-25');
    });
  });

  describe('formatFullDate', () => {
    it('should format ISO string to full date with day of week', () => {
      // October 15, 2025 (using slot fixture time)
      expect(formatFullDate('2025-10-15T19:00:00Z')).toContain('October 15, 2025');
    });

    it('should format different dates correctly', () => {
      // October 16, 2025
      expect(formatFullDate('2025-10-16T15:00:00Z')).toContain('October 16, 2025');
    });

    it('should include day of week', () => {
      const result = formatFullDate('2025-10-15T19:00:00Z');
      // Should contain a day of week (Monday, Tuesday, etc.)
      expect(result).toMatch(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/);
    });
  });

  describe('formatShortDate', () => {
    it('should format ISO string to short date (month and day)', () => {
      expect(formatShortDate('2025-10-15T19:00:00Z')).toBe('October 15');
    });

    it('should format different months correctly', () => {
      expect(formatShortDate('2025-10-16T15:00:00Z')).toBe('October 16');
      expect(formatShortDate('2025-12-25T19:00:00Z')).toBe('December 25');
    });

    it('should not include year', () => {
      const result = formatShortDate('2025-10-15T19:00:00Z');
      expect(result).toBe('October 15');
      expect(result).not.toContain('2025');
    });
  });

  describe('formatTime', () => {
    it('should format ISO string to 12-hour time with AM/PM', () => {
      // Using slot fixture time: 2:00 PM CDT = 19:00 UTC
      const result = formatTime('2025-10-15T19:00:00Z');
      expect(result).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
    });

    it('should format time correctly for morning slots', () => {
      // Using slot fixture: 9:00 AM CDT = 14:00 UTC
      const result = formatTime('2025-10-15T14:00:00Z');
      expect(result).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
    });

    it('should format time correctly for afternoon slots', () => {
      // Using slot fixture: 2:00 PM CDT = 19:00 UTC
      const result = formatTime('2025-10-15T19:00:00Z');
      expect(result).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
    });

    it('should format time correctly for evening slots', () => {
      // Using slot fixture: 5:00 PM CDT = 22:00 UTC
      const result = formatTime('2025-10-15T22:00:00Z');
      expect(result).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
    });

    it('should not include leading zeros for hours', () => {
      const result = formatTime('2025-10-15T14:00:00Z');
      // Should start with single digit for hours 1-9
      expect(result).not.toMatch(/^0/);
    });
  });

  describe('formatTimeRange', () => {
    it('should format two ISO strings into time range', () => {
      // Using slot fixture times: 2:00 PM - 2:30 PM CDT
      const result = formatTimeRange('2025-10-15T19:00:00Z', '2025-10-15T19:30:00Z');
      expect(result).toMatch(/^\d{1,2}:\d{2} (AM|PM) - \d{1,2}:\d{2} (AM|PM)$/);
    });

    it('should handle morning time ranges', () => {
      // Using slot fixture: 9:00 AM - 9:30 AM CDT
      const result = formatTimeRange('2025-10-15T14:00:00Z', '2025-10-15T14:30:00Z');
      expect(result).toMatch(/^\d{1,2}:\d{2} (AM|PM) - \d{1,2}:\d{2} (AM|PM)$/);
    });

    it('should handle evening time ranges', () => {
      // Using slot fixture: 5:00 PM - 5:30 PM CDT
      const result = formatTimeRange('2025-10-15T22:00:00Z', '2025-10-15T22:30:00Z');
      expect(result).toMatch(/^\d{1,2}:\d{2} (AM|PM) - \d{1,2}:\d{2} (AM|PM)$/);
    });

    it('should include hyphen with spaces', () => {
      const result = formatTimeRange('2025-10-15T19:00:00Z', '2025-10-15T19:30:00Z');
      expect(result).toContain(' - ');
    });
  });
});
