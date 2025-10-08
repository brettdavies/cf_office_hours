/**
 * User Service - Business logic layer for user operations.
 *
 * Responsibilities:
 * - Business logic and orchestration
 * - Call repository methods
 * - Throw AppError for failure cases
 * - NO HTTP concerns (no access to request/response)
 */

// Internal modules
import { UserRepository } from '../repositories/user.repository';
import { AppError } from '../lib/errors';

// Types
import type { UpdateProfileRequest, UserResponse } from '@cf-office-hours/shared';
import type { Env } from '../types/bindings';

export class UserService {
  private userRepo: UserRepository;

  constructor(env: Env) {
    this.userRepo = new UserRepository(env);
  }

  /**
   * Gets the current user's profile.
   *
   * @param userId - UUID of the authenticated user
   * @returns User with profile
   * @throws {AppError} 404 if user not found
   */
  async getMe(userId: string): Promise<UserResponse> {
    const user = await this.userRepo.getUserWithProfile(userId);

    if (!user) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }

    return user;
  }

  /**
   * Updates the current user's profile.
   *
   * @param userId - UUID of the authenticated user
   * @param data - Profile fields to update
   * @returns Updated user with profile
   * @throws {AppError} 500 if update fails
   */
  async updateMe(userId: string, data: UpdateProfileRequest): Promise<UserResponse> {
    const updated = await this.userRepo.updateProfile(userId, data);

    if (!updated) {
      throw new AppError(500, 'Failed to update profile', 'UPDATE_FAILED');
    }

    return updated;
  }

  /**
   * Lists users with optional role filter.
   *
   * @param filters - Optional filters (role)
   * @returns Array of users with profiles
   */
  async listUsers(filters?: {
    role?: 'mentee' | 'mentor' | 'coordinator';
  }): Promise<UserResponse[]> {
    const users = await this.userRepo.listUsers(filters);
    return users;
  }

  /**
   * Gets a public user profile by ID.
   *
   * For Epic 0, returns same data as getMe().
   * Epic 2 will add privacy filtering for public profiles.
   *
   * @param userId - UUID of the user to fetch
   * @returns User with profile
   * @throws {AppError} 404 if user not found
   */
  async getPublicProfile(userId: string): Promise<UserResponse> {
    // For Epic 0, same as getMe()
    // Epic 2 will filter private fields based on privacy settings
    return this.getMe(userId);
  }
}
