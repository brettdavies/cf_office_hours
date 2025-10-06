/**
 * Unit tests for NotificationService.
 *
 * Tests email formatting and sending logic for booking confirmations.
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

// External dependencies
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Internal modules
import { NotificationService } from './notification.service';
import { createMockBooking } from '../test/fixtures/bookings';

// Types
import type { EmailRecipient } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    service = new NotificationService();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('sendBookingConfirmationEmail', () => {
    const mockBooking = createMockBooking({
      id: 'booking-123',
      meeting_start_time: '2025-10-15T19:00:00Z',
      meeting_end_time: '2025-10-15T19:30:00Z',
      meeting_goal: 'Discuss product-market fit for early-stage SaaS startup',
      location: 'online',
    });

    const mentor: EmailRecipient = {
      email: 'mentor@example.com',
      name: 'Jane Mentor',
    };

    const mentee: EmailRecipient = {
      email: 'mentee@example.com',
      name: 'John Mentee',
    };

    it('should log email for mentor with correct recipient', async () => {
      await service.sendBookingConfirmationEmail(mockBooking, mentor, mentee);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[EMAIL] Booking Confirmation - Mentor',
        expect.objectContaining({
          to: 'mentor@example.com',
          booking_id: 'booking-123',
        })
      );
    });

    it('should log email for mentee with correct recipient', async () => {
      await service.sendBookingConfirmationEmail(mockBooking, mentor, mentee);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[EMAIL] Booking Confirmation - Mentee',
        expect.objectContaining({
          to: 'mentee@example.com',
          booking_id: 'booking-123',
        })
      );
    });

    it('should include correct subject line for mentor', async () => {
      await service.sendBookingConfirmationEmail(mockBooking, mentor, mentee);

      const mentorEmailLog = consoleLogSpy.mock.calls.find(
        call => call[0] === '[EMAIL] Booking Confirmation - Mentor'
      );
      expect(mentorEmailLog).toBeDefined();
      expect(mentorEmailLog![1].subject).toBe('Meeting Confirmed with John Mentee');
    });

    it('should include correct subject line for mentee', async () => {
      await service.sendBookingConfirmationEmail(mockBooking, mentor, mentee);

      const menteeEmailLog = consoleLogSpy.mock.calls.find(
        call => call[0] === '[EMAIL] Booking Confirmation - Mentee'
      );
      expect(menteeEmailLog).toBeDefined();
      expect(menteeEmailLog![1].subject).toBe('Meeting Confirmed with Jane Mentor');
    });

    it('should include formatted date in email body', async () => {
      await service.sendBookingConfirmationEmail(mockBooking, mentor, mentee);

      const mentorEmailLog = consoleLogSpy.mock.calls.find(
        call => call[0] === '[EMAIL] Booking Confirmation - Mentor'
      );
      expect(mentorEmailLog).toBeDefined();
      expect(mentorEmailLog![1].body).toContain('Wednesday, October 15, 2025');
    });

    it('should include formatted time range in email body', async () => {
      await service.sendBookingConfirmationEmail(mockBooking, mentor, mentee);

      const mentorEmailLog = consoleLogSpy.mock.calls.find(
        call => call[0] === '[EMAIL] Booking Confirmation - Mentor'
      );
      expect(mentorEmailLog).toBeDefined();
      // Time should be formatted as "h:mm a" (e.g., "2:00 PM - 2:30 PM")
      expect(mentorEmailLog![1].body).toMatch(/Time: \d{1,2}:\d{2} [AP]M - \d{1,2}:\d{2} [AP]M/);
    });

    it('should include meeting goal in email body', async () => {
      await service.sendBookingConfirmationEmail(mockBooking, mentor, mentee);

      const mentorEmailLog = consoleLogSpy.mock.calls.find(
        call => call[0] === '[EMAIL] Booking Confirmation - Mentor'
      );
      expect(mentorEmailLog).toBeDefined();
      expect(mentorEmailLog![1].body).toContain(
        'Discuss product-market fit for early-stage SaaS startup'
      );
    });

    it('should include location in email body', async () => {
      await service.sendBookingConfirmationEmail(mockBooking, mentor, mentee);

      const mentorEmailLog = consoleLogSpy.mock.calls.find(
        call => call[0] === '[EMAIL] Booking Confirmation - Mentor'
      );
      expect(mentorEmailLog).toBeDefined();
      expect(mentorEmailLog![1].body).toContain('Location: online');
    });

    it('should include other participant name in email body for mentor', async () => {
      await service.sendBookingConfirmationEmail(mockBooking, mentor, mentee);

      const mentorEmailLog = consoleLogSpy.mock.calls.find(
        call => call[0] === '[EMAIL] Booking Confirmation - Mentor'
      );
      expect(mentorEmailLog).toBeDefined();
      expect(mentorEmailLog![1].body).toContain('Hi Jane Mentor');
      expect(mentorEmailLog![1].body).toContain('Participant: John Mentee');
    });

    it('should include other participant name in email body for mentee', async () => {
      await service.sendBookingConfirmationEmail(mockBooking, mentor, mentee);

      const menteeEmailLog = consoleLogSpy.mock.calls.find(
        call => call[0] === '[EMAIL] Booking Confirmation - Mentee'
      );
      expect(menteeEmailLog).toBeDefined();
      expect(menteeEmailLog![1].body).toContain('Hi John Mentee');
      expect(menteeEmailLog![1].body).toContain('Participant: Jane Mentor');
    });

    it('should include dashboard URL in email body', async () => {
      await service.sendBookingConfirmationEmail(mockBooking, mentor, mentee);

      const mentorEmailLog = consoleLogSpy.mock.calls.find(
        call => call[0] === '[EMAIL] Booking Confirmation - Mentor'
      );
      expect(mentorEmailLog).toBeDefined();
      expect(mentorEmailLog![1].body).toContain(
        'https://officehours.youcanjustdothings.io/dashboard'
      );
    });

    it('should log both emails (mentor and mentee)', async () => {
      await service.sendBookingConfirmationEmail(mockBooking, mentor, mentee);

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[EMAIL] Booking Confirmation - Mentor',
        expect.any(Object)
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[EMAIL] Booking Confirmation - Mentee',
        expect.any(Object)
      );
    });

    it('should include timestamp in email logs', async () => {
      const beforeTimestamp = new Date().toISOString();
      await service.sendBookingConfirmationEmail(mockBooking, mentor, mentee);
      const afterTimestamp = new Date().toISOString();

      const mentorEmailLog = consoleLogSpy.mock.calls.find(
        call => call[0] === '[EMAIL] Booking Confirmation - Mentor'
      );
      expect(mentorEmailLog).toBeDefined();
      expect(mentorEmailLog![1].timestamp).toBeDefined();
      expect(mentorEmailLog![1].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      // Timestamp should be between before and after
      expect(mentorEmailLog![1].timestamp >= beforeTimestamp).toBe(true);
      expect(mentorEmailLog![1].timestamp <= afterTimestamp).toBe(true);
    });

    it('should handle errors gracefully without throwing', async () => {
      // Force an error by making format throw (mock private method behavior)
      const invalidBooking = createMockBooking({
        meeting_start_time: 'invalid-date',
      });

      // Should not throw
      await expect(
        service.sendBookingConfirmationEmail(invalidBooking, mentor, mentee)
      ).resolves.not.toThrow();

      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[EMAIL] Failed to send booking confirmation:',
        expect.objectContaining({
          booking_id: invalidBooking.id,
          error: expect.any(String),
        })
      );
    });

    it('should not throw when email sending fails', async () => {
      const invalidBooking = createMockBooking({
        meeting_start_time: 'invalid-date',
      });

      await expect(
        service.sendBookingConfirmationEmail(invalidBooking, mentor, mentee)
      ).resolves.toBeUndefined();
    });

    it('should handle different location values', async () => {
      const bookingWithLocation = createMockBooking({
        location: 'Building A, Room 101',
      });

      await service.sendBookingConfirmationEmail(bookingWithLocation, mentor, mentee);

      const mentorEmailLog = consoleLogSpy.mock.calls.find(
        call => call[0] === '[EMAIL] Booking Confirmation - Mentor'
      );
      expect(mentorEmailLog).toBeDefined();
      expect(mentorEmailLog![1].body).toContain('Location: Building A, Room 101');
    });

    it('should handle Online location as fallback', async () => {
      const bookingNoLocation = createMockBooking({
        location: null as unknown as string, // Force null location
      });

      await service.sendBookingConfirmationEmail(bookingNoLocation, mentor, mentee);

      const mentorEmailLog = consoleLogSpy.mock.calls.find(
        call => call[0] === '[EMAIL] Booking Confirmation - Mentor'
      );
      expect(mentorEmailLog).toBeDefined();
      expect(mentorEmailLog![1].body).toContain('Location: Online');
    });

    it('should use custom dashboard URL when provided', async () => {
      const customService = new NotificationService('http://localhost:3000');

      await customService.sendBookingConfirmationEmail(mockBooking, mentor, mentee);

      const mentorEmailLog = consoleLogSpy.mock.calls.find(
        call => call[0] === '[EMAIL] Booking Confirmation - Mentor'
      );
      expect(mentorEmailLog).toBeDefined();
      expect(mentorEmailLog![1].body).toContain('http://localhost:3000/dashboard');
    });

    it('should use default dashboard URL when not provided', async () => {
      const defaultService = new NotificationService();

      await defaultService.sendBookingConfirmationEmail(mockBooking, mentor, mentee);

      const mentorEmailLog = consoleLogSpy.mock.calls.find(
        call => call[0] === '[EMAIL] Booking Confirmation - Mentor'
      );
      expect(mentorEmailLog).toBeDefined();
      expect(mentorEmailLog![1].body).toContain(
        'https://officehours.youcanjustdothings.io/dashboard'
      );
    });
  });
});
