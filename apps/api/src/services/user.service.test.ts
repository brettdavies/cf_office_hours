/**
 * UserService Unit Tests
 *
 * Tests business logic layer with mocked repository.
 */

// External dependencies
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Internal modules
import { UserService } from './user.service';
import { UserRepository } from '../repositories/user.repository';
import { AppError } from '../lib/errors';

// Types
import type { IUserWithProfile } from '@cf-office-hours/shared';
import type { Env } from '../types/bindings';

// Mock UserRepository
vi.mock('../repositories/user.repository');

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepo: ReturnType<typeof vi.mocked<UserRepository>>;
  const mockEnv = {} as Env;

  const mockUser: IUserWithProfile = {
    id: 'user-123',
    airtable_record_id: null,
    email: 'test@example.com',
    role: 'mentee',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    profile: {
      id: 'profile-123',
      user_id: 'user-123',
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
    userService = new UserService(mockEnv);
    mockUserRepo = vi.mocked(userService['userRepo']);
  });

  describe('getMe', () => {
    it('should return user profile for valid user ID', async () => {
      mockUserRepo.getUserWithProfile = vi.fn().mockResolvedValue(mockUser);

      const result = await userService.getMe('user-123');

      expect(result).toEqual(mockUser);
      expect(mockUserRepo.getUserWithProfile).toHaveBeenCalledWith('user-123');
      expect(mockUserRepo.getUserWithProfile).toHaveBeenCalledTimes(1);
    });

    it('should throw AppError when user not found', async () => {
      mockUserRepo.getUserWithProfile = vi.fn().mockResolvedValue(null);

      await expect(userService.getMe('nonexistent')).rejects.toThrow(AppError);
      await expect(userService.getMe('nonexistent')).rejects.toThrow('User not found');

      try {
        await userService.getMe('nonexistent');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        if (error instanceof AppError) {
          expect(error.statusCode).toBe(404);
          expect(error.code).toBe('USER_NOT_FOUND');
        }
      }
    });
  });

  describe('updateMe', () => {
    it('should update user profile successfully', async () => {
      const updatedUser = {
        ...mockUser,
        profile: {
          ...mockUser.profile,
          name: 'Updated Name',
          bio: 'Updated bio',
        },
      };

      mockUserRepo.updateProfile = vi.fn().mockResolvedValue(updatedUser);

      const result = await userService.updateMe('user-123', {
        name: 'Updated Name',
        bio: 'Updated bio',
      });

      expect(result).toEqual(updatedUser);
      expect(result.profile.name).toBe('Updated Name');
      expect(result.profile.bio).toBe('Updated bio');
      expect(mockUserRepo.updateProfile).toHaveBeenCalledWith('user-123', {
        name: 'Updated Name',
        bio: 'Updated bio',
      });
    });

    it('should throw AppError when update fails', async () => {
      mockUserRepo.updateProfile = vi.fn().mockResolvedValue(null);

      await expect(
        userService.updateMe('user-123', { name: 'Updated Name' })
      ).rejects.toThrow(AppError);

      try {
        await userService.updateMe('user-123', { name: 'Updated Name' });
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        if (error instanceof AppError) {
          expect(error.statusCode).toBe(500);
          expect(error.code).toBe('UPDATE_FAILED');
        }
      }
    });
  });

  describe('getPublicProfile', () => {
    it('should return public profile for any user', async () => {
      mockUserRepo.getUserWithProfile = vi.fn().mockResolvedValue(mockUser);

      const result = await userService.getPublicProfile('user-456');

      expect(result).toEqual(mockUser);
      expect(mockUserRepo.getUserWithProfile).toHaveBeenCalledWith('user-456');
    });

    it('should throw AppError when user not found', async () => {
      mockUserRepo.getUserWithProfile = vi.fn().mockResolvedValue(null);

      await expect(userService.getPublicProfile('nonexistent')).rejects.toThrow(AppError);

      try {
        await userService.getPublicProfile('nonexistent');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        if (error instanceof AppError) {
          expect(error.statusCode).toBe(404);
          expect(error.code).toBe('USER_NOT_FOUND');
        }
      }
    });
  });
});
