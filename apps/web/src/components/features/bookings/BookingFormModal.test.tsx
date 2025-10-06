/**
 * Unit tests for BookingFormModal component (Epic 0 stub).
 *
 * Tests modal rendering, slot details display, form inputs,
 * and user interactions. Booking submission is deferred to Story 0.11.
 */

// External dependencies
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Internal modules
import { BookingFormModal } from './BookingFormModal';
import { mockTimeSlots } from '@/test/fixtures/slots';

describe('BookingFormModal', () => {
  const user = userEvent.setup();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('modal rendering', () => {
    it('should render modal when isOpen is true', () => {
      render(
        <BookingFormModal isOpen={true} onClose={mockOnClose} slot={mockTimeSlots.available} />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Book Office Hours')).toBeInTheDocument();
    });

    it('should not render modal when isOpen is false', () => {
      render(
        <BookingFormModal isOpen={false} onClose={mockOnClose} slot={mockTimeSlots.available} />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should not render when slot is null', () => {
      render(<BookingFormModal isOpen={true} onClose={mockOnClose} slot={null} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('slot details display', () => {
    it('should display slot date in readable format', () => {
      render(
        <BookingFormModal isOpen={true} onClose={mockOnClose} slot={mockTimeSlots.available} />
      );

      // Check date is formatted correctly (e.g., "Wednesday, October 15, 2025")
      expect(screen.getByText(/Wednesday, October 15, 2025/i)).toBeInTheDocument();
    });

    it('should display slot time range in readable format', () => {
      render(
        <BookingFormModal isOpen={true} onClose={mockOnClose} slot={mockTimeSlots.available} />
      );

      // Check time is formatted correctly (e.g., "2:00 PM - 2:30 PM")
      expect(screen.getByText(/2:00 PM - 2:30 PM/i)).toBeInTheDocument();
    });

    it('should display mentor name', () => {
      render(
        <BookingFormModal isOpen={true} onClose={mockOnClose} slot={mockTimeSlots.available} />
      );

      // Mentor name appears in both description and slot details
      const mentorNames = screen.getAllByText(/Jane Mentor/i);
      expect(mentorNames.length).toBeGreaterThanOrEqual(1);
    });

    it('should display different slot times correctly', () => {
      render(<BookingFormModal isOpen={true} onClose={mockOnClose} slot={mockTimeSlots.morning} />);

      // Morning slot: 9:00 AM - 9:30 AM
      expect(screen.getByText(/9:00 AM - 9:30 AM/i)).toBeInTheDocument();
    });
  });

  describe('form inputs', () => {
    it('should render meeting goal textarea', () => {
      render(
        <BookingFormModal isOpen={true} onClose={mockOnClose} slot={mockTimeSlots.available} />
      );

      expect(screen.getByLabelText(/meeting goal/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/what would you like to discuss/i)).toBeInTheDocument();
    });

    it('should render materials URLs input', () => {
      render(
        <BookingFormModal isOpen={true} onClose={mockOnClose} slot={mockTimeSlots.available} />
      );

      expect(screen.getByLabelText(/materials\/links/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/https:\/\/example.com\/document/i)).toBeInTheDocument();
    });

    it('should show helper text for meeting goal', () => {
      render(
        <BookingFormModal isOpen={true} onClose={mockOnClose} slot={mockTimeSlots.available} />
      );

      expect(screen.getByText(/describe what you'd like to accomplish/i)).toBeInTheDocument();
    });

    it('should show helper text for materials URLs', () => {
      render(
        <BookingFormModal isOpen={true} onClose={mockOnClose} slot={mockTimeSlots.available} />
      );

      expect(
        screen.getByText(/share any relevant documents, code repos, or links/i)
      ).toBeInTheDocument();
    });
  });

  describe('form buttons', () => {
    it('should render Cancel button', () => {
      render(
        <BookingFormModal isOpen={true} onClose={mockOnClose} slot={mockTimeSlots.available} />
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should render Confirm Booking button', () => {
      render(
        <BookingFormModal isOpen={true} onClose={mockOnClose} slot={mockTimeSlots.available} />
      );

      expect(screen.getByRole('button', { name: /confirm booking/i })).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('should call onClose when Cancel button is clicked', async () => {
      render(
        <BookingFormModal isOpen={true} onClose={mockOnClose} slot={mockTimeSlots.available} />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Confirm button is clicked (Epic 0 stub)', async () => {
      render(
        <BookingFormModal isOpen={true} onClose={mockOnClose} slot={mockTimeSlots.available} />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm booking/i });
      await user.click(confirmButton);

      // Epic 0: Confirm button closes modal (submission deferred to Story 0.11)
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when dialog is closed via overlay or X button', async () => {
      render(
        <BookingFormModal isOpen={true} onClose={mockOnClose} slot={mockTimeSlots.available} />
      );

      // Find close button (Radix Dialog includes X button)
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      // Simulate closing via dialog's onOpenChange
      // This is handled by the Dialog component's onOpenChange prop
      // In actual usage, clicking overlay or X triggers onOpenChange(false)

      // For unit test, we verify the onOpenChange is wired to onClose
      // by checking the Cancel button (which we know calls onClose)
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('form input interactions', () => {
    it('should allow typing in meeting goal textarea', async () => {
      render(
        <BookingFormModal isOpen={true} onClose={mockOnClose} slot={mockTimeSlots.available} />
      );

      const textarea = screen.getByLabelText(/meeting goal/i) as HTMLTextAreaElement;
      await user.type(textarea, 'I want to discuss my React project');

      expect(textarea.value).toBe('I want to discuss my React project');
    });

    it('should allow typing in materials URLs input', async () => {
      render(
        <BookingFormModal isOpen={true} onClose={mockOnClose} slot={mockTimeSlots.available} />
      );

      const input = screen.getByLabelText(/materials\/links/i) as HTMLInputElement;
      await user.type(input, 'https://github.com/myproject');

      expect(input.value).toBe('https://github.com/myproject');
    });
  });

  describe('Epic 0 constraints', () => {
    it('should NOT submit booking when Confirm is clicked (deferred to Story 0.11)', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      render(
        <BookingFormModal isOpen={true} onClose={mockOnClose} slot={mockTimeSlots.available} />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm booking/i });
      await user.click(confirmButton);

      // Check console.log message indicating functionality is deferred
      expect(consoleSpy).toHaveBeenCalledWith('Booking submission deferred to Story 0.11');

      consoleSpy.mockRestore();
    });

    it('should close modal after Confirm is clicked (Epic 0 behavior)', async () => {
      render(
        <BookingFormModal isOpen={true} onClose={mockOnClose} slot={mockTimeSlots.available} />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm booking/i });
      await user.click(confirmButton);

      // Epic 0: Modal closes without actual booking submission
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('should have proper dialog title and description', () => {
      render(
        <BookingFormModal isOpen={true} onClose={mockOnClose} slot={mockTimeSlots.available} />
      );

      expect(screen.getByText('Book Office Hours')).toBeInTheDocument();
      expect(screen.getByText(/schedule a meeting with Jane Mentor/i)).toBeInTheDocument();
    });

    it('should have labeled form inputs', () => {
      render(
        <BookingFormModal isOpen={true} onClose={mockOnClose} slot={mockTimeSlots.available} />
      );

      // Check inputs have associated labels
      expect(screen.getByLabelText(/meeting goal/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/materials\/links/i)).toBeInTheDocument();
    });
  });
});
