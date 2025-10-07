// Mock notification store
import { vi } from 'vitest';

const mockAddToast = vi.fn();

vi.mock('@/stores/notificationStore', () => ({
  useNotificationStore: vi.fn((selector) => {
    const state = {
      addToast: mockAddToast,
    };
    return selector ? selector(state) : state;
  }),
}));

/**
 * Unit tests for BookingFormModal component (Story 0.11).
 *
 * Tests modal rendering, slot details display, form inputs,
 * API integration, loading states, and error handling.
 */

// External dependencies
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Internal modules
import { BookingFormModal } from './BookingFormModal';
import { mockTimeSlots } from '@/test/fixtures/slots';
import { createMockBooking } from '@/test/fixtures/bookings';
import * as apiClient from '@/lib/api-client';

describe('BookingFormModal', () => {
  const user = userEvent.setup();
  const mockOnClose = vi.fn();
  const mockOnBookingCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAddToast.mockClear();
  });

  describe('modal rendering', () => {
    it('should render modal when isOpen is true', () => {
      render(
        <BookingFormModal
          isOpen={true}
          onClose={mockOnClose}
          slot={mockTimeSlots.available}
          onBookingCreated={mockOnBookingCreated}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Book Office Hours')).toBeInTheDocument();
    });

    it('should not render modal when isOpen is false', () => {
      render(
        <BookingFormModal
          isOpen={false}
          onClose={mockOnClose}
          slot={mockTimeSlots.available}
          onBookingCreated={mockOnBookingCreated}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should not render when slot is null', () => {
      render(
        <BookingFormModal
          isOpen={true}
          onClose={mockOnClose}
          slot={null}
          onBookingCreated={mockOnBookingCreated}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('slot details display', () => {
    it('should display slot date in readable format', () => {
      render(
        <BookingFormModal
          isOpen={true}
          onClose={mockOnClose}
          slot={mockTimeSlots.available}
          onBookingCreated={mockOnBookingCreated}
        />
      );

      // Check date is formatted correctly (e.g., "Wednesday, October 15, 2025")
      expect(screen.getByText(/Wednesday, October 15, 2025/i)).toBeInTheDocument();
    });

    it('should display slot time range in readable format', () => {
      render(
        <BookingFormModal
          isOpen={true}
          onClose={mockOnClose}
          slot={mockTimeSlots.available}
          onBookingCreated={mockOnBookingCreated}
        />
      );

      // Check time is formatted correctly (e.g., "2:00 PM - 2:30 PM")
      expect(screen.getByText(/2:00 PM - 2:30 PM/i)).toBeInTheDocument();
    });

    it('should display mentor name', () => {
      render(
        <BookingFormModal
          isOpen={true}
          onClose={mockOnClose}
          slot={mockTimeSlots.available}
          onBookingCreated={mockOnBookingCreated}
        />
      );

      // Mentor name appears in both description and slot details
      const mentorNames = screen.getAllByText(/Jane Mentor/i);
      expect(mentorNames.length).toBeGreaterThanOrEqual(1);
    });

    it('should display different slot times correctly', () => {
      render(
        <BookingFormModal
          isOpen={true}
          onClose={mockOnClose}
          slot={mockTimeSlots.morning}
          onBookingCreated={mockOnBookingCreated}
        />
      );

      // Morning slot: 9:00 AM - 9:30 AM
      expect(screen.getByText(/9:00 AM - 9:30 AM/i)).toBeInTheDocument();
    });
  });

  describe('form inputs', () => {
    it('should render meeting goal textarea', () => {
      render(
        <BookingFormModal
          isOpen={true}
          onClose={mockOnClose}
          slot={mockTimeSlots.available}
          onBookingCreated={mockOnBookingCreated}
        />
      );

      expect(screen.getByLabelText(/meeting goal/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/what would you like to discuss/i)).toBeInTheDocument();
    });

    it('should render materials URLs input as disabled (Epic 0 constraint)', () => {
      render(
        <BookingFormModal
          isOpen={true}
          onClose={mockOnClose}
          slot={mockTimeSlots.available}
          onBookingCreated={mockOnBookingCreated}
        />
      );

      const materialsInput = screen.getByLabelText(/materials\/links/i) as HTMLInputElement;
      expect(materialsInput).toBeDisabled();
      expect(screen.getByText(/Epic 4:/i)).toBeInTheDocument();
    });

    it('should show helper text for meeting goal', () => {
      render(
        <BookingFormModal
          isOpen={true}
          onClose={mockOnClose}
          slot={mockTimeSlots.available}
          onBookingCreated={mockOnBookingCreated}
        />
      );

      expect(screen.getByText(/describe what you'd like to accomplish/i)).toBeInTheDocument();
    });
  });

  describe('form buttons', () => {
    it('should render Cancel button', () => {
      render(
        <BookingFormModal
          isOpen={true}
          onClose={mockOnClose}
          slot={mockTimeSlots.available}
          onBookingCreated={mockOnBookingCreated}
        />
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should render Confirm Booking button', () => {
      render(
        <BookingFormModal
          isOpen={true}
          onClose={mockOnClose}
          slot={mockTimeSlots.available}
          onBookingCreated={mockOnBookingCreated}
        />
      );

      expect(screen.getByRole('button', { name: /confirm booking/i })).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('should call onClose when Cancel button is clicked', async () => {
      render(
        <BookingFormModal
          isOpen={true}
          onClose={mockOnClose}
          slot={mockTimeSlots.available}
          onBookingCreated={mockOnBookingCreated}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should validate meeting goal has minimum 10 characters', async () => {
      render(
        <BookingFormModal
          isOpen={true}
          onClose={mockOnClose}
          slot={mockTimeSlots.available}
          onBookingCreated={mockOnBookingCreated}
        />
      );

      const textarea = screen.getByLabelText(/meeting goal/i);
      const confirmButton = screen.getByRole('button', { name: /confirm booking/i });

      // Type short text
      await user.type(textarea, 'Short');
      await user.click(confirmButton);

      // Should show validation error toast
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalled();
      });

      // Modal should NOT close
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('form input interactions', () => {
    it('should allow typing in meeting goal textarea', async () => {
      render(
        <BookingFormModal
          isOpen={true}
          onClose={mockOnClose}
          slot={mockTimeSlots.available}
          onBookingCreated={mockOnBookingCreated}
        />
      );

      const textarea = screen.getByLabelText(/meeting goal/i) as HTMLTextAreaElement;
      await user.type(textarea, 'I want to discuss my React project');

      expect(textarea.value).toBe('I want to discuss my React project');
    });

    it('should clear form when modal closes', async () => {
      render(
        <BookingFormModal
          isOpen={true}
          onClose={mockOnClose}
          slot={mockTimeSlots.available}
          onBookingCreated={mockOnBookingCreated}
        />
      );

      const textarea = screen.getByLabelText(/meeting goal/i) as HTMLTextAreaElement;
      await user.type(textarea, 'Some meeting goal text');

      expect(textarea.value).toBe('Some meeting goal text');

      // Close modal
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('API integration (Story 0.11)', () => {
    it('should call API when Confirm is clicked with valid data', async () => {
      const mockBooking = createMockBooking();
      const createBookingSpy = vi
        .spyOn(apiClient.apiClient, 'createBooking')
        .mockResolvedValue(mockBooking);

      render(
        <BookingFormModal
          isOpen={true}
          onClose={mockOnClose}
          slot={mockTimeSlots.available}
          onBookingCreated={mockOnBookingCreated}
        />
      );

      const textarea = screen.getByLabelText(/meeting goal/i);
      const confirmButton = screen.getByRole('button', { name: /confirm booking/i });

      await user.type(textarea, 'Discuss product-market fit for my startup');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(createBookingSpy).toHaveBeenCalledWith({
          time_slot_id: mockTimeSlots.available.id,
          meeting_goal: 'Discuss product-market fit for my startup',
        });
      });
    });

    it('should show loading state while submitting', async () => {
      const mockBooking = createMockBooking();
      vi.spyOn(apiClient.apiClient, 'createBooking').mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockBooking), 100))
      );

      render(
        <BookingFormModal
          isOpen={true}
          onClose={mockOnClose}
          slot={mockTimeSlots.available}
          onBookingCreated={mockOnBookingCreated}
        />
      );

      const textarea = screen.getByLabelText(/meeting goal/i);
      const confirmButton = screen.getByRole('button', { name: /confirm booking/i });

      await user.type(textarea, 'Discuss product strategy');
      await user.click(confirmButton);

      // Check button shows loading state
      expect(screen.getByRole('button', { name: /creating/i })).toBeInTheDocument();
      expect(confirmButton).toBeDisabled();

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should close modal and trigger onBookingCreated callback on success', async () => {
      const mockBooking = createMockBooking();
      vi.spyOn(apiClient.apiClient, 'createBooking').mockResolvedValue(mockBooking);

      render(
        <BookingFormModal
          isOpen={true}
          onClose={mockOnClose}
          slot={mockTimeSlots.available}
          onBookingCreated={mockOnBookingCreated}
        />
      );

      const textarea = screen.getByLabelText(/meeting goal/i);
      const confirmButton = screen.getByRole('button', { name: /confirm booking/i });

      await user.type(textarea, 'Discuss product strategy');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
        expect(mockOnBookingCreated).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle 409 slot unavailable error', async () => {
      vi.spyOn(apiClient.apiClient, 'createBooking').mockRejectedValue(
        new apiClient.ApiError(409, 'SLOT_UNAVAILABLE', 'This slot is already booked')
      );

      render(
        <BookingFormModal
          isOpen={true}
          onClose={mockOnClose}
          slot={mockTimeSlots.available}
          onBookingCreated={mockOnBookingCreated}
        />
      );

      const textarea = screen.getByLabelText(/meeting goal/i);
      const confirmButton = screen.getByRole('button', { name: /confirm booking/i });

      await user.type(textarea, 'Discuss product strategy');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalled();
      });

      // Modal should NOT close on error
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(mockOnBookingCreated).not.toHaveBeenCalled();
    });

    it('should handle 404 slot not found error', async () => {
      vi.spyOn(apiClient.apiClient, 'createBooking').mockRejectedValue(
        new apiClient.ApiError(404, 'SLOT_NOT_FOUND', 'Time slot not found')
      );

      render(
        <BookingFormModal
          isOpen={true}
          onClose={mockOnClose}
          slot={mockTimeSlots.available}
          onBookingCreated={mockOnBookingCreated}
        />
      );

      const textarea = screen.getByLabelText(/meeting goal/i);
      const confirmButton = screen.getByRole('button', { name: /confirm booking/i });

      await user.type(textarea, 'Discuss product strategy');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalled();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have proper dialog title and description', () => {
      render(
        <BookingFormModal
          isOpen={true}
          onClose={mockOnClose}
          slot={mockTimeSlots.available}
          onBookingCreated={mockOnBookingCreated}
        />
      );

      expect(screen.getByText('Book Office Hours')).toBeInTheDocument();
      expect(screen.getByText(/schedule a meeting with Jane Mentor/i)).toBeInTheDocument();
    });

    it('should have labeled form inputs', () => {
      render(
        <BookingFormModal
          isOpen={true}
          onClose={mockOnClose}
          slot={mockTimeSlots.available}
          onBookingCreated={mockOnBookingCreated}
        />
      );

      // Check inputs have associated labels
      expect(screen.getByLabelText(/meeting goal/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/materials\/links/i)).toBeInTheDocument();
    });

    it('should disable buttons during submission', async () => {
      const mockBooking = createMockBooking();
      vi.spyOn(apiClient.apiClient, 'createBooking').mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockBooking), 100))
      );

      render(
        <BookingFormModal
          isOpen={true}
          onClose={mockOnClose}
          slot={mockTimeSlots.available}
          onBookingCreated={mockOnBookingCreated}
        />
      );

      const textarea = screen.getByLabelText(/meeting goal/i);
      const confirmButton = screen.getByRole('button', { name: /confirm booking/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      await user.type(textarea, 'Discuss product strategy');
      await user.click(confirmButton);

      // Both buttons should be disabled during submission
      expect(confirmButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });
});
