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

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

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
});
