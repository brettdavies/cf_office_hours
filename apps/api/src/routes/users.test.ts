/**
 * User API Routes Integration Tests
 *
 * Tests HTTP endpoints with mocked service layer.
 */

// External dependencies
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Internal modules
import app from '../index';
import { UserService } from '../services/user.service';

// Types
import type { UserResponse } from '@cf-office-hours/shared';

// Mock UserService
vi.mock('../services/user.service');

// Mock requireAuth middleware to inject a test user
vi.mock('../middleware/auth', () => ({
  requireAuth: vi.fn(async (c, next) => {
    c.set('user', {
      id: 'test-user-123',
      email: 'test@example.com',
      role: 'mentee',
    });
    return await next();
  }),
}));

describe('User API Routes', () => {
  const mockUser: UserResponse = {
    id: 'test-user-123',
    airtable_record_id: null,
    email: 'test@example.com',
    role: 'mentee',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    profile: {
      id: 'profile-123',
      user_id: 'test-user-123',
      name: 'Test User',
      title: 'Software Engineer',
      company: 'Acme Corp',
      bio: 'Test bio',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /v1/users/me', () => {
    it('should return current user profile', async () => {
      vi.spyOn(UserService.prototype, 'getMe').mockResolvedValue(mockUser);

      const res = await app.request('/v1/users/me', {
        headers: { Authorization: 'Bearer mock-token' },
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as UserResponse;
      expect(data.id).toBe('test-user-123');
      expect(data.email).toBe('test@example.com');
      expect(data.profile.name).toBe('Test User');
    });

    it('should return 404 when user not found', async () => {
      const AppError = (await import('../lib/errors')).AppError;
      vi.spyOn(UserService.prototype, 'getMe').mockRejectedValue(
        new AppError(404, 'User not found', 'USER_NOT_FOUND')
      );

      const res = await app.request('/v1/users/me', {
        headers: { Authorization: 'Bearer mock-token' },
      });

      expect(res.status).toBe(404);
      const data = (await res.json()) as { error: { code: string; message: string } };
      expect(data.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('PUT /v1/users/me', () => {
    it('should update user profile', async () => {
      const updatedUser = {
        ...mockUser,
        profile: {
          ...mockUser.profile,
          name: 'Updated Name',
          bio: 'Updated bio',
        },
      };

      vi.spyOn(UserService.prototype, 'updateMe').mockResolvedValue(updatedUser);

      const res = await app.request('/v1/users/me', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer mock-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Updated Name', bio: 'Updated bio' }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as UserResponse;
      expect(data.profile.name).toBe('Updated Name');
      expect(data.profile.bio).toBe('Updated bio');
    });

    it('should return 400 for invalid data (name too short)', async () => {
      const res = await app.request('/v1/users/me', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer mock-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'A' }), // Too short (min 2 chars)
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid data (bio too long)', async () => {
      const longBio = 'A'.repeat(501); // Max 500 chars

      const res = await app.request('/v1/users/me', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer mock-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bio: longBio }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /v1/users/:id', () => {
    it('should return public user profile', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const otherUser = {
        ...mockUser,
        id: validUuid,
        email: 'other@example.com',
        profile: {
          ...mockUser.profile,
          id: '550e8400-e29b-41d4-a716-446655440001',
          user_id: validUuid,
          name: 'Other User',
        },
      };

      vi.spyOn(UserService.prototype, 'getPublicProfile').mockResolvedValue(otherUser);

      const res = await app.request(`/v1/users/${validUuid}`, {
        headers: { Authorization: 'Bearer mock-token' },
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as UserResponse;
      expect(data.id).toBe(validUuid);
      expect(data.profile.name).toBe('Other User');
    });

    it('should return 404 when user not found', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440002';
      const AppError = (await import('../lib/errors')).AppError;
      vi.spyOn(UserService.prototype, 'getPublicProfile').mockRejectedValue(
        new AppError(404, 'User not found', 'USER_NOT_FOUND')
      );

      const res = await app.request(`/v1/users/${validUuid}`, {
        headers: { Authorization: 'Bearer mock-token' },
      });

      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      const res = await app.request('/v1/users/not-a-uuid', {
        headers: { Authorization: 'Bearer mock-token' },
      });

      expect(res.status).toBe(400);
    });
  });

  describe('OpenAPI Documentation', () => {
    it('should generate valid OpenAPI spec', async () => {
      const res = await app.request('/api/openapi.json');
      expect(res.status).toBe(200);

      const spec = (await res.json()) as { paths: Record<string, unknown> };
      expect(spec.paths['/v1/users/me']).toBeDefined();
      expect(spec.paths['/v1/users/{id}']).toBeDefined();
    });
  });
});
