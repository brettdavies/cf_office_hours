/**
 * Notification Service - Handles email notifications for booking events.
 *
 * Responsibilities:
 * - Format and send booking confirmation emails
 * - Log notification events for debugging
 * - Handle notification failures gracefully (don't block business operations)
 *
 * Epic 0 Implementation:
 * - Console logging with structured email content
 * - Production email integration deferred to Epic 4
 */

// External dependencies
import { format } from 'date-fns';

// Types
import type { BookingResponse } from '@cf-office-hours/shared';

/**
 * Email recipient information.
 */
export interface EmailRecipient {
  email: string;
  name: string;
}

/**
 * Formatted email content for booking confirmation.
 */
export interface BookingConfirmationEmail {
  to: string;
  subject: string;
  body: string;
}

export class NotificationService {
  private dashboardUrl: string;

  constructor(dashboardUrl?: string) {
    this.dashboardUrl = dashboardUrl || 'https://officehours.youcanjustdothings.io';
  }

  /**
   * Sends booking confirmation emails to both mentor and mentee.
   *
   * Epic 0: Logs email content to console for development/testing.
   * Production email integration (Supabase/SendGrid) deferred to Epic 4.
   *
   * @param booking - Created booking with time slot details
   * @param mentor - Mentor recipient information
   * @param mentee - Mentee recipient information
   * @throws Never throws - logs errors but doesn't fail
   *
   * @example
   * ```typescript
   * try {
   *   await notificationService.sendBookingConfirmationEmail(booking, mentor, mentee);
   * } catch (error) {
   *   // This will never throw in Epic 0
   * }
   * ```
   */
  async sendBookingConfirmationEmail(
    booking: BookingResponse,
    mentor: EmailRecipient,
    mentee: EmailRecipient
  ): Promise<void> {
    try {
      // Generate email for mentor
      const mentorEmail = this.formatBookingConfirmationEmail(booking, mentor, mentee);

      // Generate email for mentee
      const menteeEmail = this.formatBookingConfirmationEmail(booking, mentee, mentor);

      // Epic 0: Log emails to console
      // Production: Replace with Supabase/SendGrid integration in Epic 4
      console.log('[EMAIL] Booking Confirmation - Mentor', {
        to: mentorEmail.to,
        subject: mentorEmail.subject,
        body: mentorEmail.body,
        booking_id: booking.id,
        timestamp: new Date().toISOString(),
      });

      console.log('[EMAIL] Booking Confirmation - Mentee', {
        to: menteeEmail.to,
        subject: menteeEmail.subject,
        body: menteeEmail.body,
        booking_id: booking.id,
        timestamp: new Date().toISOString(),
      });

      // TODO (Epic 4): Implement actual email sending
      // await this.sendEmail(mentorEmail);
      // await this.sendEmail(menteeEmail);
    } catch (error) {
      // Log error but don't throw - email failures shouldn't block booking creation
      console.error('[EMAIL] Failed to send booking confirmation:', {
        booking_id: booking.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Formats a booking confirmation email for a specific recipient.
   *
   * @param booking - Booking details
   * @param recipient - Email recipient (mentor or mentee)
   * @param otherParticipant - The other participant in the booking
   * @returns Formatted email object
   */
  private formatBookingConfirmationEmail(
    booking: BookingResponse,
    recipient: EmailRecipient,
    otherParticipant: EmailRecipient
  ): BookingConfirmationEmail {
    const startTime = new Date(booking.meeting_start_time);
    const endTime = new Date(booking.meeting_end_time);

    // Format date and time
    const formattedDate = format(startTime, 'EEEE, MMMM dd, yyyy');
    const formattedStartTime = format(startTime, 'h:mm a');
    const formattedEndTime = format(endTime, 'h:mm a');

    // Build email body
    const body = `Hi ${recipient.name},

Your meeting has been confirmed!

Meeting Details:
- Date: ${formattedDate}
- Time: ${formattedStartTime} - ${formattedEndTime} (UTC)
- Location: ${booking.location || 'Online'}
- Participant: ${otherParticipant.name}

Meeting Goal:
${booking.meeting_goal}

You can view your upcoming meetings at: ${this.dashboardUrl}/dashboard

—
CF Office Hours`;

    return {
      to: recipient.email,
      subject: `Meeting Confirmed with ${otherParticipant.name}`,
      body,
    };
  }
}
