/**
 * Unit tests for AvailabilityPage component.
 *
 * Tests rendering, data fetching, empty states, loading states,
 * error handling, and successful creation flow.
 */

// External dependencies
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { format, parseISO } from 'date-fns';

// Internal modules
import AvailabilityPage from './AvailabilityPage';
import { apiClient, ApiError } from '@/lib/api-client';
import { createMockAvailabilityBlock } from '@/test/fixtures/availability';

// Mock API client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    getMyAvailability: vi.fn(),
    createAvailability: vi.fn(),
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

// Mock toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe('AvailabilityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering with availability blocks', () => {
    it('should render availability list with multiple mock blocks (3+ items)', async () => {
      const mockBlocks = [
        createMockAvailabilityBlock({
          id: 'avail-1',
          start_time: '2025-10-15T09:00:00Z',
          end_time: '2025-10-15T12:00:00Z',
          location_custom: 'Conference Room A',
        }),
        createMockAvailabilityBlock({
          id: 'avail-2',
          start_time: '2025-10-20T14:00:00Z',
          end_time: '2025-10-20T17:00:00Z',
          slot_duration_minutes: 60,
        }),
        createMockAvailabilityBlock({
          id: 'avail-3',
          start_time: '2025-10-25T10:00:00Z',
          end_time: '2025-10-25T16:00:00Z',
          slot_duration_minutes: 45,
          location_custom: 'Office 201',
        }),
      ];

      vi.mocked(apiClient.getMyAvailability).mockResolvedValueOnce(mockBlocks);

      render(<AvailabilityPage />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText('Loading availability...')).not.toBeInTheDocument();
      });

      // Verify all 3 blocks are rendered
      expect(screen.getByText('Oct 15, 2025')).toBeInTheDocument();
      expect(screen.getByText('Oct 20, 2025')).toBeInTheDocument();
      expect(screen.getByText('Oct 25, 2025')).toBeInTheDocument();
    });

    it('should display date, time range, location, meeting type for each block', async () => {
      const mockBlock = createMockAvailabilityBlock({
        location_custom: 'Conference Room A',
      });

      vi.mocked(apiClient.getMyAvailability).mockResolvedValueOnce([mockBlock]);

      render(<AvailabilityPage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading availability...')).not.toBeInTheDocument();
      });

      // Check formatted date
      const formattedDate = format(parseISO(mockBlock.start_time), 'MMM d, yyyy');
      expect(screen.getByText(formattedDate)).toBeInTheDocument();

      // Check time range
      expect(screen.getByText('09:00 - 17:00')).toBeInTheDocument();

      // Check location
      expect(screen.getByText(/Conference Room A/i)).toBeInTheDocument();

      // Check meeting type
      expect(screen.getByText('online')).toBeInTheDocument();
    });

    it('should format dates correctly (e.g., "Oct 10, 2025")', async () => {
      const mockBlocks = [
        createMockAvailabilityBlock({
          id: 'avail-1',
          start_time: '2025-10-10T09:00:00Z',
          end_time: '2025-10-10T17:00:00Z',
        }),
        createMockAvailabilityBlock({
          id: 'avail-2',
          start_time: '2025-12-01T10:00:00Z',
          end_time: '2025-12-01T12:00:00Z',
        }),
      ];

      vi.mocked(apiClient.getMyAvailability).mockResolvedValueOnce(mockBlocks);

      render(<AvailabilityPage />);

      await waitFor(() => {
        expect(screen.getByText('Oct 10, 2025')).toBeInTheDocument();
      });

      expect(screen.getByText('Dec 1, 2025')).toBeInTheDocument();
    });

    it('should display time in HH:mm format', async () => {
      const mockBlock = createMockAvailabilityBlock({
        start_time: '2025-10-15T14:30:00Z',
        end_time: '2025-10-15T18:45:00Z',
      });

      vi.mocked(apiClient.getMyAvailability).mockResolvedValueOnce([mockBlock]);

      render(<AvailabilityPage />);

      await waitFor(() => {
        expect(screen.getByText('14:30 - 18:45')).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    it('should render empty state when no availability blocks exist', async () => {
      vi.mocked(apiClient.getMyAvailability).mockResolvedValueOnce([]);

      render(<AvailabilityPage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading availability...')).not.toBeInTheDocument();
      });

      expect(
        screen.getByText("You haven't created any availability blocks yet.")
      ).toBeInTheDocument();
      expect(screen.getByText('Click "Create Availability" to get started.')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading indicator while fetching data', () => {
      // Don't resolve the promise immediately
      vi.mocked(apiClient.getMyAvailability).mockReturnValueOnce(new Promise(() => {}));

      render(<AvailabilityPage />);

      expect(screen.getByText('Loading availability...')).toBeInTheDocument();
    });

    it('should hide loading indicator after data loads', async () => {
      vi.mocked(apiClient.getMyAvailability).mockResolvedValueOnce([]);

      render(<AvailabilityPage />);

      expect(screen.getByText('Loading availability...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Loading availability...')).not.toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should show error toast when API call fails', async () => {
      const error = new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Failed to load availability');

      vi.mocked(apiClient.getMyAvailability).mockRejectedValueOnce(error);

      render(<AvailabilityPage />);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to load availability',
          variant: 'error',
        });
      });
    });

    it('should display error message when API call fails', async () => {
      const error = new ApiError(403, 'FORBIDDEN', 'You are not a mentor');

      vi.mocked(apiClient.getMyAvailability).mockRejectedValueOnce(error);

      render(<AvailabilityPage />);

      await waitFor(() => {
        expect(screen.getByText('You are not a mentor')).toBeInTheDocument();
      });
    });

    it('should handle non-ApiError errors gracefully', async () => {
      vi.mocked(apiClient.getMyAvailability).mockRejectedValueOnce(new Error('Network error'));

      render(<AvailabilityPage />);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to load availability',
          variant: 'error',
        });
      });
    });
  });

  describe('"Create Availability" button', () => {
    it('should render "Create Availability" button', async () => {
      vi.mocked(apiClient.getMyAvailability).mockResolvedValueOnce([]);

      render(<AvailabilityPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create availability/i })).toBeInTheDocument();
      });
    });
  });

  describe('title and heading', () => {
    it('should render page title', async () => {
      vi.mocked(apiClient.getMyAvailability).mockResolvedValueOnce([]);

      render(<AvailabilityPage />);

      await waitFor(() => {
        expect(screen.getByText('My Availability')).toBeInTheDocument();
      });
    });
  });
});
