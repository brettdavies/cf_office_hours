/**
 * Unit tests for BookingService.
 *
 * Tests business logic for booking creation (Epic 0: Simple).
 */

// External dependencies
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Internal modules
import { BookingService } from './booking.service';
import { AppError } from '../lib/errors';
import { createMockBooking } from '../test/fixtures/bookings';
import { createMockTimeSlot } from '../test/fixtures/slots';

// Types
import type { Env } from '../types/bindings';
import type { CreateBookingRequest } from '@cf-office-hours/shared';

// Mock repository
const mockRepository = {
  getTimeSlot: vi.fn(),
  createBooking: vi.fn(),
};

vi.mock('../repositories/booking.repository', () => ({
  BookingRepository: vi.fn().mockImplementation(() => mockRepository),
}));

describe('BookingService', () => {
  let service: BookingService;
  let mockEnv: Env;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = {
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-key',
    } as Env;
    service = new BookingService(mockEnv);
  });

  describe('createBooking', () => {
    const validRequest: CreateBookingRequest = {
      time_slot_id: 'slot-123',
      meeting_goal: 'Discuss product-market fit for early-stage SaaS startup',
    };

    const mockSlot = createMockTimeSlot({
      id: 'slot-123',
      mentor_id: 'mentor-123',
      start_time: '2025-10-15T19:00:00Z',
      end_time: '2025-10-15T19:30:00Z',
      is_booked: false,
    });

    it('should create booking successfully when slot is available', async () => {
      const mockBooking = createMockBooking({
        time_slot_id: 'slot-123',
        mentee_id: 'mentee-123',
        status: 'pending',
      });

      mockRepository.getTimeSlot.mockResolvedValue(mockSlot);
      mockRepository.createBooking.mockResolvedValue(mockBooking);

      const result = await service.createBooking('mentee-123', validRequest);

      expect(result).toEqual(mockBooking);
      expect(mockRepository.getTimeSlot).toHaveBeenCalledWith('slot-123');
      expect(mockRepository.createBooking).toHaveBeenCalledWith({
        time_slot_id: 'slot-123',
        mentor_id: 'mentor-123',
        mentee_id: 'mentee-123',
        meeting_goal: validRequest.meeting_goal,
        meeting_start_time: mockSlot.start_time,
        meeting_end_time: mockSlot.end_time,
        location: 'online',
      });
    });

    it('should have status=pending for new bookings (Epic 0)', async () => {
      const mockBooking = createMockBooking({ status: 'pending' });

      mockRepository.getTimeSlot.mockResolvedValue(mockSlot);
      mockRepository.createBooking.mockResolvedValue(mockBooking);

      const result = await service.createBooking('mentee-123', validRequest);

      expect(result.status).toBe('pending');
    });

    it('should throw 404 when slot not found', async () => {
      mockRepository.getTimeSlot.mockResolvedValue(null);

      await expect(service.createBooking('mentee-123', validRequest)).rejects.toThrow(AppError);

      await expect(service.createBooking('mentee-123', validRequest)).rejects.toMatchObject({
        statusCode: 404,
        code: 'SLOT_NOT_FOUND',
        message: 'Time slot not found',
      });

      expect(mockRepository.createBooking).not.toHaveBeenCalled();
    });

    it('should throw 409 when slot is already booked', async () => {
      const bookedSlot = createMockTimeSlot({ ...mockSlot, is_booked: true });
      mockRepository.getTimeSlot.mockResolvedValue(bookedSlot);

      await expect(service.createBooking('mentee-123', validRequest)).rejects.toThrow(AppError);

      await expect(service.createBooking('mentee-123', validRequest)).rejects.toMatchObject({
        statusCode: 409,
        code: 'SLOT_UNAVAILABLE',
        message: 'This slot is already booked',
      });

      expect(mockRepository.createBooking).not.toHaveBeenCalled();
    });

    it('should handle database function SLOT_NOT_FOUND error', async () => {
      mockRepository.getTimeSlot.mockResolvedValue(mockSlot);
      mockRepository.createBooking.mockRejectedValue(new Error('SLOT_NOT_FOUND'));

      await expect(service.createBooking('mentee-123', validRequest)).rejects.toMatchObject({
        statusCode: 404,
        code: 'SLOT_NOT_FOUND',
      });
    });

    it('should handle database function SLOT_UNAVAILABLE error', async () => {
      mockRepository.getTimeSlot.mockResolvedValue(mockSlot);
      mockRepository.createBooking.mockRejectedValue(new Error('SLOT_UNAVAILABLE'));

      await expect(service.createBooking('mentee-123', validRequest)).rejects.toMatchObject({
        statusCode: 409,
        code: 'SLOT_UNAVAILABLE',
      });
    });

    it('should handle generic database errors', async () => {
      mockRepository.getTimeSlot.mockResolvedValue(mockSlot);
      mockRepository.createBooking.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.createBooking('mentee-123', validRequest)).rejects.toMatchObject({
        statusCode: 500,
        code: 'DATABASE_ERROR',
        message: 'Failed to create booking',
      });
    });

    it('should use location=online for Epic 0 bookings', async () => {
      const mockBooking = createMockBooking();
      mockRepository.getTimeSlot.mockResolvedValue(mockSlot);
      mockRepository.createBooking.mockResolvedValue(mockBooking);

      await service.createBooking('mentee-123', validRequest);

      const createBookingCall = mockRepository.createBooking.mock.calls[0][0];
      expect(createBookingCall.location).toBe('online');
    });

    it('should extract mentor_id from time slot', async () => {
      const slotWithMentor = createMockTimeSlot({ mentor_id: 'specific-mentor-456' });
      const mockBooking = createMockBooking({ mentor_id: 'specific-mentor-456' });

      mockRepository.getTimeSlot.mockResolvedValue(slotWithMentor);
      mockRepository.createBooking.mockResolvedValue(mockBooking);

      const result = await service.createBooking('mentee-123', validRequest);

      expect(result.mentor_id).toBe('specific-mentor-456');
      const createBookingCall = mockRepository.createBooking.mock.calls[0][0];
      expect(createBookingCall.mentor_id).toBe('specific-mentor-456');
    });

    it('should extract meeting times from time slot', async () => {
      const customTimeSlot = createMockTimeSlot({
        start_time: '2025-10-20T15:00:00Z',
        end_time: '2025-10-20T16:00:00Z',
      });
      const mockBooking = createMockBooking({
        meeting_start_time: '2025-10-20T15:00:00Z',
        meeting_end_time: '2025-10-20T16:00:00Z',
      });

      mockRepository.getTimeSlot.mockResolvedValue(customTimeSlot);
      mockRepository.createBooking.mockResolvedValue(mockBooking);

      await service.createBooking('mentee-123', validRequest);

      const createBookingCall = mockRepository.createBooking.mock.calls[0][0];
      expect(createBookingCall.meeting_start_time).toBe('2025-10-20T15:00:00Z');
      expect(createBookingCall.meeting_end_time).toBe('2025-10-20T16:00:00Z');
    });
  });
});
