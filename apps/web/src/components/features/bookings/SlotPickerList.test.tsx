/**
 * Unit tests for SlotPickerList component.
 *
 * Tests slot rendering, grouping by date, user interactions,
 * loading states, error handling, and empty states.
 */

// External dependencies
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Internal modules
import { SlotPickerList } from './SlotPickerList';
import { apiClient, ApiError } from '@/lib/api-client';
import { createMockTimeSlot, mockSlotsResponses } from '@/test/fixtures/slots';

// Mock API client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    getAvailableSlots: vi.fn(),
  },
  ApiError: class extends Error {
    constructor(
      public statusCode: number,
      public code: string,
      message: string
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

describe('SlotPickerList', () => {
  const user = userEvent.setup();
  const mockOnSlotSelect = vi.fn();
  const mentorId = 'mentor-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('slot list rendering', () => {
    it('should render multiple slots across different dates', async () => {
      const mockSlots = [
        createMockTimeSlot({
          id: 'slot-1',
          start_time: '2025-10-15T14:00:00Z', // 9:00 AM CDT
          end_time: '2025-10-15T14:30:00Z',
        }),
        createMockTimeSlot({
          id: 'slot-2',
          start_time: '2025-10-15T19:00:00Z', // 2:00 PM CDT
          end_time: '2025-10-15T19:30:00Z',
        }),
        createMockTimeSlot({
          id: 'slot-3',
          start_time: '2025-10-16T15:00:00Z', // 10:00 AM CDT
          end_time: '2025-10-16T15:30:00Z',
        }),
      ];

      vi.mocked(apiClient.getAvailableSlots).mockResolvedValueOnce({
        slots: mockSlots,
        pagination: { total: 3, limit: 50, has_more: false },
      });

      render(<SlotPickerList mentorId={mentorId} onSlotSelect={mockOnSlotSelect} />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Check all slots are rendered
      expect(screen.getByText('9:00 AM')).toBeInTheDocument();
      expect(screen.getByText('2:00 PM')).toBeInTheDocument();
      expect(screen.getByText('10:00 AM')).toBeInTheDocument();
    });

    it('should display time in readable 12-hour format', async () => {
      const mockSlots = [
        createMockTimeSlot({
          start_time: '2025-10-15T14:00:00Z', // 9:00 AM CDT
          end_time: '2025-10-15T14:30:00Z',
        }),
        createMockTimeSlot({
          start_time: '2025-10-15T19:00:00Z', // 2:00 PM CDT
          end_time: '2025-10-15T19:30:00Z',
        }),
        createMockTimeSlot({
          start_time: '2025-10-15T22:00:00Z', // 5:00 PM CDT
          end_time: '2025-10-15T22:30:00Z',
        }),
      ];

      vi.mocked(apiClient.getAvailableSlots).mockResolvedValueOnce({
        slots: mockSlots,
        pagination: { total: 3, limit: 50, has_more: false },
      });

      render(<SlotPickerList mentorId={mentorId} onSlotSelect={mockOnSlotSelect} />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Verify 12-hour format with AM/PM
      expect(screen.getByText('9:00 AM')).toBeInTheDocument();
      expect(screen.getByText('2:00 PM')).toBeInTheDocument();
      expect(screen.getByText('5:00 PM')).toBeInTheDocument();
    });
  });

  describe('date grouping', () => {
    it('should group slots by date with headers', async () => {
      vi.mocked(apiClient.getAvailableSlots).mockResolvedValueOnce(
        mockSlotsResponses.multipleSlotsDifferentDays
      );

      render(<SlotPickerList mentorId={mentorId} onSlotSelect={mockOnSlotSelect} />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Check date headers are present
      expect(screen.getByText(/Wednesday, October 15, 2025/i)).toBeInTheDocument();
      expect(screen.getByText(/Thursday, October 16, 2025/i)).toBeInTheDocument();
    });

    it('should display dates in chronological order', async () => {
      const mockSlots = [
        createMockTimeSlot({
          id: 'slot-future',
          start_time: '2025-10-20T15:00:00Z', // 10:00 AM CDT
        }),
        createMockTimeSlot({
          id: 'slot-soon',
          start_time: '2025-10-16T15:00:00Z', // 10:00 AM CDT
        }),
        createMockTimeSlot({
          id: 'slot-today',
          start_time: '2025-10-15T15:00:00Z', // 10:00 AM CDT
        }),
      ];

      vi.mocked(apiClient.getAvailableSlots).mockResolvedValueOnce({
        slots: mockSlots,
        pagination: { total: 3, limit: 50, has_more: false },
      });

      render(<SlotPickerList mentorId={mentorId} onSlotSelect={mockOnSlotSelect} />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Get all date headers
      const headers = screen.getAllByRole('heading', { level: 3 });
      expect(headers).toHaveLength(3);

      // Verify chronological order
      expect(headers[0]).toHaveTextContent('Wednesday, October 15, 2025');
      expect(headers[1]).toHaveTextContent('Thursday, October 16, 2025');
      expect(headers[2]).toHaveTextContent('Monday, October 20, 2025');
    });
  });

  describe('booked slots', () => {
    it('should disable booked slots', async () => {
      vi.mocked(apiClient.getAvailableSlots).mockResolvedValueOnce(
        mockSlotsResponses.mixedAvailability
      );

      render(<SlotPickerList mentorId={mentorId} onSlotSelect={mockOnSlotSelect} />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Find the booked slot button (contains "Booked" text)
      const buttons = screen.getAllByRole('button');
      const bookedButton = buttons.find(btn => btn.textContent?.includes('Booked'));

      expect(bookedButton).toBeDisabled();
    });

    it('should show visual indicator for booked slots', async () => {
      vi.mocked(apiClient.getAvailableSlots).mockResolvedValueOnce(
        mockSlotsResponses.mixedAvailability
      );

      render(<SlotPickerList mentorId={mentorId} onSlotSelect={mockOnSlotSelect} />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Check that booked slot has "(Booked)" label
      expect(screen.getByText(/\(Booked\)/i)).toBeInTheDocument();
    });

    it('should not trigger callback when booked slot is clicked', async () => {
      vi.mocked(apiClient.getAvailableSlots).mockResolvedValueOnce(
        mockSlotsResponses.mixedAvailability
      );

      render(<SlotPickerList mentorId={mentorId} onSlotSelect={mockOnSlotSelect} />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Attempt to click booked slot (button is disabled so click won't work)
      const buttons = screen.getAllByRole('button');
      const bookedButton = buttons.find(btn => btn.textContent?.includes('Booked'));

      if (bookedButton) {
        await user.click(bookedButton);
      }

      // Callback should not be triggered
      expect(mockOnSlotSelect).not.toHaveBeenCalled();
    });
  });

  describe('available slots', () => {
    it('should be clickable', async () => {
      vi.mocked(apiClient.getAvailableSlots).mockResolvedValueOnce(mockSlotsResponses.single);

      render(<SlotPickerList mentorId={mentorId} onSlotSelect={mockOnSlotSelect} />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      const slotButton = screen.getByRole('button', { name: /book slot at 2:00 PM/i });
      expect(slotButton).not.toBeDisabled();
    });

    it('should trigger onSlotSelect callback when clicked', async () => {
      const mockSlot = createMockTimeSlot({
        id: 'test-slot',
        start_time: '2025-10-15T19:00:00Z', // 2:00 PM CDT
      });

      vi.mocked(apiClient.getAvailableSlots).mockResolvedValueOnce({
        slots: [mockSlot],
        pagination: { total: 1, limit: 50, has_more: false },
      });

      render(<SlotPickerList mentorId={mentorId} onSlotSelect={mockOnSlotSelect} />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      const slotButton = screen.getByRole('button', { name: /book slot at 2:00 PM/i });
      await user.click(slotButton);

      expect(mockOnSlotSelect).toHaveBeenCalledTimes(1);
      expect(mockOnSlotSelect).toHaveBeenCalledWith(mockSlot);
    });
  });

  describe('loading state', () => {
    it('should show loading indicator while fetching data', async () => {
      vi.mocked(apiClient.getAvailableSlots).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockSlotsResponses.empty), 100))
      );

      render(<SlotPickerList mentorId={mentorId} onSlotSelect={mockOnSlotSelect} />);

      // Should show loading message
      expect(screen.getByText(/loading available slots/i)).toBeInTheDocument();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/loading available slots/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    it('should show empty state when no slots exist', async () => {
      vi.mocked(apiClient.getAvailableSlots).mockResolvedValueOnce(mockSlotsResponses.empty);

      render(<SlotPickerList mentorId={mentorId} onSlotSelect={mockOnSlotSelect} />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      expect(screen.getByText(/no available slots at this time/i)).toBeInTheDocument();
    });

    it('should show helpful message in empty state', async () => {
      vi.mocked(apiClient.getAvailableSlots).mockResolvedValueOnce(mockSlotsResponses.empty);

      render(<SlotPickerList mentorId={mentorId} onSlotSelect={mockOnSlotSelect} />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      expect(screen.getByText(/please check back later/i)).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should show error message when API call fails', async () => {
      vi.mocked(apiClient.getAvailableSlots).mockRejectedValueOnce(
        new ApiError(500, 'SERVER_ERROR', 'Internal server error')
      );

      render(<SlotPickerList mentorId={mentorId} onSlotSelect={mockOnSlotSelect} />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      expect(screen.getByText(/unable to load available slots/i)).toBeInTheDocument();
    });

    it('should handle 401 unauthorized error', async () => {
      vi.mocked(apiClient.getAvailableSlots).mockRejectedValueOnce(
        new ApiError(401, 'UNAUTHORIZED', 'Missing or invalid token')
      );

      render(<SlotPickerList mentorId={mentorId} onSlotSelect={mockOnSlotSelect} />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      expect(screen.getByText(/please log in to view available slots/i)).toBeInTheDocument();
    });

    it('should handle 403 forbidden error', async () => {
      vi.mocked(apiClient.getAvailableSlots).mockRejectedValueOnce(
        new ApiError(403, 'FORBIDDEN', 'You do not have permission')
      );

      render(<SlotPickerList mentorId={mentorId} onSlotSelect={mockOnSlotSelect} />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      expect(
        screen.getByText(/you do not have permission to view these slots/i)
      ).toBeInTheDocument();
    });

    it('should show empty state on 404 (no slots found)', async () => {
      vi.mocked(apiClient.getAvailableSlots).mockRejectedValueOnce(
        new ApiError(404, 'NOT_FOUND', 'No slots found')
      );

      render(<SlotPickerList mentorId={mentorId} onSlotSelect={mockOnSlotSelect} />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // 404 should be treated as empty state, not error
      expect(screen.getByText(/no available slots at this time/i)).toBeInTheDocument();
    });
  });

  describe('API integration', () => {
    it('should call getAvailableSlots with correct mentor_id', async () => {
      vi.mocked(apiClient.getAvailableSlots).mockResolvedValueOnce(mockSlotsResponses.empty);

      render(<SlotPickerList mentorId={mentorId} onSlotSelect={mockOnSlotSelect} />);

      await waitFor(() => {
        expect(apiClient.getAvailableSlots).toHaveBeenCalledWith({ mentor_id: mentorId });
      });
    });

    it('should refetch slots when mentorId changes', async () => {
      vi.mocked(apiClient.getAvailableSlots).mockResolvedValue(mockSlotsResponses.empty);

      const { rerender } = render(
        <SlotPickerList mentorId="mentor-1" onSlotSelect={mockOnSlotSelect} />
      );

      await waitFor(() => {
        expect(apiClient.getAvailableSlots).toHaveBeenCalledWith({
          mentor_id: 'mentor-1',
        });
      });

      vi.clearAllMocks();

      // Change mentor ID
      rerender(<SlotPickerList mentorId="mentor-2" onSlotSelect={mockOnSlotSelect} />);

      await waitFor(() => {
        expect(apiClient.getAvailableSlots).toHaveBeenCalledWith({
          mentor_id: 'mentor-2',
        });
      });
    });
  });
});
