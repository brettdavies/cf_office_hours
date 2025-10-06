/**
 * Unit tests for type-safe API client.
 *
 * Tests:
 * - Request headers (Authorization, Content-Type)
 * - Success responses with correct typing
 * - Error handling (400, 401, 404, 500)
 * - Request body serialization
 */

// External dependencies
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Internal modules
import { apiClient, ApiError } from './api-client';
import {
  createMockAvailabilityBlock,
  createMockAvailabilityRequest,
} from '@/test/fixtures/availability';
import { createMockTimeSlot, createMockSlotsResponse } from '@/test/fixtures/slots';
import { createMockBooking } from '@/test/fixtures/bookings';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch
global.fetch = vi.fn();

describe('apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCurrentUser', () => {
    it('should fetch current user with correct headers', async () => {
      const mockUser = {
        id: 'user-123',
        airtable_record_id: null,
        email: 'test@example.com',
        role: 'mentee' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        profile: {
          id: 'profile-123',
          user_id: 'user-123',
          name: 'Test User',
          title: null,
          company: null,
          bio: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      const result = await apiClient.getCurrentUser();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/users/me'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockUser);
    });

    it('should include Authorization header when token exists', async () => {
      localStorageMock.setItem('auth_token', 'test-token-123');

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'user-123',
          email: 'test@example.com',
          role: 'mentee',
          profile: { name: 'Test' },
        }),
      });

      await apiClient.getCurrentUser();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123',
          }),
        })
      );
    });

    it('should throw ApiError on 404 response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: '2024-01-01T00:00:00Z',
          },
        }),
      });

      try {
        await apiClient.getCurrentUser();
        expect.fail('Should have thrown ApiError');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(404);
        expect((error as ApiError).code).toBe('USER_NOT_FOUND');
        expect((error as ApiError).message).toBe('User not found');
      }
    });

    it('should throw ApiError on 401 response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid token',
            timestamp: '2024-01-01T00:00:00Z',
          },
        }),
      });

      try {
        await apiClient.getCurrentUser();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(401);
        expect((error as ApiError).code).toBe('UNAUTHORIZED');
      }
    });
  });

  describe('updateCurrentUser', () => {
    it('should send PUT request with correct body', async () => {
      const updateData = {
        name: 'Updated Name',
        bio: 'New bio',
      };

      const mockResponse = {
        id: 'user-123',
        airtable_record_id: null,
        email: 'test@example.com',
        role: 'mentee' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        profile: {
          id: 'profile-123',
          user_id: 'user-123',
          name: 'Updated Name',
          title: null,
          company: null,
          bio: 'New bio',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiClient.updateCurrentUser(updateData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/users/me'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw ApiError with details on 400 validation error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            timestamp: '2024-01-01T00:00:00Z',
            details: {
              name: ['Name must be at least 2 characters'],
            },
          },
        }),
      });

      try {
        await apiClient.updateCurrentUser({ name: 'A' });
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(400);
        expect((error as ApiError).code).toBe('VALIDATION_ERROR');
        expect((error as ApiError).details).toEqual({
          name: ['Name must be at least 2 characters'],
        });
      }
    });

    it('should handle partial updates', async () => {
      const updateData = { bio: 'Only updating bio' };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'user-123',
          email: 'test@example.com',
          role: 'mentee',
          profile: {
            name: 'Existing Name',
            bio: 'Only updating bio',
          },
        }),
      });

      await apiClient.updateCurrentUser(updateData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(updateData),
        })
      );
    });
  });

  describe('generic methods', () => {
    it('should provide type-safe get method', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'user-123',
          email: 'test@example.com',
          role: 'mentee',
          profile: { name: 'Test User' },
        }),
      });

      // TypeScript will ensure path is valid
      const result = await apiClient.get('/v1/users/me');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('profile');
    });

    it('should provide type-safe put method', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'user-123',
          email: 'test@example.com',
          role: 'mentee',
          profile: { name: 'Updated' },
        }),
      });

      // TypeScript will validate request body shape via specific method
      const result = await apiClient.updateCurrentUser({
        name: 'Updated',
      });
      expect(result).toHaveProperty('id');
    });
  });

  describe('getMyAvailability', () => {
    it('should fetch availability with correct endpoint and headers', async () => {
      const mockAvailability = [createMockAvailabilityBlock()];

      localStorageMock.setItem('auth_token', 'test-token-123');

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAvailability,
      });

      const result = await apiClient.getMyAvailability();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/availability'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token-123',
          }),
        })
      );
      expect(result).toEqual(mockAvailability);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('meeting_type', 'online');
      expect(result[0]).toHaveProperty('recurrence_pattern', 'one_time');
    });

    it('should handle 401 unauthorized error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid token',
            timestamp: '2025-10-05T00:00:00Z',
          },
        }),
      });

      try {
        await apiClient.getMyAvailability();
        expect.fail('Should have thrown ApiError');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(401);
        expect((error as ApiError).code).toBe('UNAUTHORIZED');
      }
    });

    it('should handle 403 forbidden error for non-mentors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: {
            code: 'FORBIDDEN',
            message: 'Only mentors can access this endpoint',
            timestamp: '2025-10-05T00:00:00Z',
          },
        }),
      });

      try {
        await apiClient.getMyAvailability();
        expect.fail('Should have thrown ApiError');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(403);
        expect((error as ApiError).code).toBe('FORBIDDEN');
      }
    });
  });

  describe('createAvailability', () => {
    it('should send POST request with correctly formatted request body', async () => {
      const requestData = createMockAvailabilityRequest();
      const mockResponse = createMockAvailabilityBlock({ description: '' });

      localStorageMock.setItem('auth_token', 'test-token-123');

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiClient.createAvailability(requestData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/availability'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token-123',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
      expect(result.meeting_type).toBe('online');
    });

    it('should handle 400 validation error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            timestamp: '2025-10-05T00:00:00Z',
            details: {
              end_time: ['End time must be after start time'],
            },
          },
        }),
      });

      try {
        await apiClient.createAvailability(
          createMockAvailabilityRequest({
            start_time: '2025-10-15T17:00:00Z',
            end_time: '2025-10-15T09:00:00Z',
          })
        );
        expect.fail('Should have thrown ApiError');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(400);
        expect((error as ApiError).code).toBe('VALIDATION_ERROR');
        expect((error as ApiError).details).toHaveProperty('end_time');
      }
    });

    it('should handle 401/403 errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: {
            code: 'FORBIDDEN',
            message: 'Only mentors can create availability',
            timestamp: '2025-10-05T00:00:00Z',
          },
        }),
      });

      try {
        await apiClient.createAvailability(createMockAvailabilityRequest());
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(403);
      }
    });

    it('should handle 500 server error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create availability',
            timestamp: '2025-10-05T00:00:00Z',
          },
        }),
      });

      try {
        await apiClient.createAvailability(createMockAvailabilityRequest());
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(500);
        expect((error as ApiError).code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      await expect(apiClient.getCurrentUser()).rejects.toThrow('Network error');
    });

    it('should handle malformed error responses', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      try {
        await apiClient.getCurrentUser();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(500);
        expect((error as ApiError).code).toBe('UNKNOWN_ERROR');
      }
    });

    it('should handle 500 server errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Something went wrong',
            timestamp: '2024-01-01T00:00:00Z',
          },
        }),
      });

      try {
        await apiClient.getCurrentUser();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(500);
        expect((error as ApiError).code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('getAvailableSlots', () => {
    it('should fetch slots with mentor_id parameter', async () => {
      const mockResponse = createMockSlotsResponse([
        createMockTimeSlot({ id: 'slot-1', start_time: '2025-10-15T09:00:00Z' }),
        createMockTimeSlot({ id: 'slot-2', start_time: '2025-10-15T10:00:00Z' }),
      ]);

      localStorageMock.setItem('auth_token', 'test-token-123');

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiClient.getAvailableSlots({ mentor_id: 'mentor-123' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/availability/slots?mentor_id=mentor-123'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token-123',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
      expect(result.slots).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should fetch slots without parameters', async () => {
      const mockResponse = createMockSlotsResponse([createMockTimeSlot()]);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await apiClient.getAvailableSlots();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/availability/slots'),
        expect.any(Object)
      );
    });

    it('should handle multiple query parameters', async () => {
      const mockResponse = createMockSlotsResponse([]);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await apiClient.getAvailableSlots({
        mentor_id: 'mentor-123',
        start_date: '2025-10-15',
        end_date: '2025-10-31',
        meeting_type: 'online',
        limit: 25,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(
          /mentor_id=mentor-123.*start_date=2025-10-15.*end_date=2025-10-31.*meeting_type=online.*limit=25/
        ),
        expect.any(Object)
      );
    });

    it('should handle 401 unauthorized error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid token',
            timestamp: '2025-10-06T00:00:00Z',
          },
        }),
      });

      try {
        await apiClient.getAvailableSlots({ mentor_id: 'mentor-123' });
        expect.fail('Should have thrown ApiError');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(401);
        expect((error as ApiError).code).toBe('UNAUTHORIZED');
      }
    });

    it('should handle 403 forbidden error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to view these slots',
            timestamp: '2025-10-06T00:00:00Z',
          },
        }),
      });

      try {
        await apiClient.getAvailableSlots({ mentor_id: 'mentor-123' });
        expect.fail('Should have thrown ApiError');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(403);
        expect((error as ApiError).code).toBe('FORBIDDEN');
      }
    });

    it('should handle 404 no slots found', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: {
            code: 'NOT_FOUND',
            message: 'No slots found for the given parameters',
            timestamp: '2025-10-06T00:00:00Z',
          },
        }),
      });

      try {
        await apiClient.getAvailableSlots({ mentor_id: 'mentor-123' });
        expect.fail('Should have thrown ApiError');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(404);
        expect((error as ApiError).code).toBe('NOT_FOUND');
      }
    });

    it('should return correctly formatted slots data', async () => {
      const mockSlots = [
        createMockTimeSlot({
          id: 'slot-morning',
          start_time: '2025-10-15T09:00:00Z',
          end_time: '2025-10-15T09:30:00Z',
          is_booked: false,
        }),
        createMockTimeSlot({
          id: 'slot-afternoon',
          start_time: '2025-10-15T14:00:00Z',
          end_time: '2025-10-15T14:30:00Z',
          is_booked: true,
        }),
      ];

      const mockResponse = createMockSlotsResponse(mockSlots);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiClient.getAvailableSlots({ mentor_id: 'mentor-123' });

      expect(result.slots).toHaveLength(2);
      expect(result.slots[0]).toHaveProperty('id', 'slot-morning');
      expect(result.slots[0]).toHaveProperty('is_booked', false);
      expect(result.slots[0]).toHaveProperty('mentor');
      expect(result.slots[0].mentor).toHaveProperty('name');
      expect(result.slots[1]).toHaveProperty('is_booked', true);
      expect(result.pagination).toEqual({
        total: 2,
        limit: 50,
        has_more: false,
      });
    });
  });

  describe('createBooking', () => {
    it('should send POST request with correct request body', async () => {
      const requestData = {
        time_slot_id: 'slot-123',
        meeting_goal: 'Discuss product-market fit strategy for early-stage SaaS startup',
      };
      const mockBooking = createMockBooking({
        time_slot_id: 'slot-123',
        mentee_id: 'current-user-123',
        status: 'pending',
      });

      localStorageMock.setItem('auth_token', 'test-token-123');

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockBooking,
      });

      const result = await apiClient.createBooking(requestData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/bookings'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token-123',
          }),
        })
      );
      expect(result).toEqual(mockBooking);
      expect(result.status).toBe('pending');
    });

    it('should handle 201 success response', async () => {
      const mockBooking = createMockBooking();

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockBooking,
      });

      const result = await apiClient.createBooking({
        time_slot_id: 'slot-123',
        meeting_goal: 'Discuss go-to-market strategy',
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('status', 'pending');
      expect(result).toHaveProperty('meeting_goal');
    });

    it('should handle 400 validation error (meeting_goal too short)', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Meeting goal must be at least 10 characters',
            timestamp: '2025-10-06T00:00:00Z',
            details: {
              meeting_goal: ['Meeting goal must be at least 10 characters'],
            },
          },
        }),
      });

      try {
        await apiClient.createBooking({
          time_slot_id: 'slot-123',
          meeting_goal: 'Short',
        });
        expect.fail('Should have thrown ApiError');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(400);
        expect((error as ApiError).code).toBe('VALIDATION_ERROR');
        expect((error as ApiError).details).toHaveProperty('meeting_goal');
      }
    });

    it('should handle 409 slot unavailable error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: {
            code: 'SLOT_UNAVAILABLE',
            message: 'This slot is already booked',
            timestamp: '2025-10-06T00:00:00Z',
            details: {
              time_slot_id: 'slot-123',
            },
          },
        }),
      });

      try {
        await apiClient.createBooking({
          time_slot_id: 'slot-123',
          meeting_goal: 'Discuss product strategy',
        });
        expect.fail('Should have thrown ApiError');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(409);
        expect((error as ApiError).code).toBe('SLOT_UNAVAILABLE');
        expect((error as ApiError).message).toBe('This slot is already booked');
      }
    });

    it('should handle 404 slot not found error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: {
            code: 'SLOT_NOT_FOUND',
            message: 'Time slot not found',
            timestamp: '2025-10-06T00:00:00Z',
          },
        }),
      });

      try {
        await apiClient.createBooking({
          time_slot_id: 'nonexistent-slot',
          meeting_goal: 'Discuss product strategy',
        });
        expect.fail('Should have thrown ApiError');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(404);
        expect((error as ApiError).code).toBe('SLOT_NOT_FOUND');
      }
    });

    it('should handle 401/403 authentication errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid JWT token',
            timestamp: '2025-10-06T00:00:00Z',
          },
        }),
      });

      try {
        await apiClient.createBooking({
          time_slot_id: 'slot-123',
          meeting_goal: 'Discuss product strategy',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(401);
        expect((error as ApiError).code).toBe('UNAUTHORIZED');
      }
    });
  });
});
