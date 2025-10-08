/**
 * User Repository - Data access layer for user entities.
 *
 * Responsibilities:
 * - Execute database queries for user and user_profile tables
 * - Map database rows to TypeScript interfaces
 * - Handle query errors
 * - NO business logic (that belongs in service layer)
 */

// Internal modules
import { BaseRepository } from "../lib/base-repository";

// Types
import type {
  UserProfileResponse,
  UserResponse,
} from "@cf-office-hours/shared";

export class UserRepository extends BaseRepository {
  /**
   * Fetches a user with their profile by user ID.
   *
   * Joins users table with user_profiles table.
   *
   * @param userId - UUID of the user
   * @returns User with profile or null if not found
   */
  async getUserWithProfile(userId: string): Promise<UserResponse | null> {
    const { data, error } = await this.supabase
      .from("users")
      .select(
        `
        id,
        airtable_record_id,
        email,
        role,
        created_at,
        updated_at,
        profile:user_profiles(
          id,
          user_id,
          name,
          title,
          company,
          bio,
          created_at,
          updated_at
        )
      `,
      )
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Failed to fetch user:", { userId, error });
      return null;
    }

    if (!data || !data.profile) {
      return null;
    }

    // Transform nested array to single object (Supabase returns profile as array)
    const profileArray = data.profile as unknown as UserProfileResponse[];
    const profile = Array.isArray(profileArray)
      ? profileArray[0]
      : profileArray;

    return {
      ...data,
      profile,
    } as UserResponse;
  }

  /**
   * Lists users with optional role filter.
   *
   * Returns active users (not soft-deleted) with their profiles.
   *
   * @param filters - Optional filters (role)
   * @returns Array of users with profiles
   */
  async listUsers(
    filters?: { role?: "mentee" | "mentor" | "coordinator" },
  ): Promise<UserResponse[]> {
    let query = this.supabase
      .from("users")
      .select(
        `
        id,
        airtable_record_id,
        email,
        role,
        created_at,
        updated_at,
        profile:user_profiles(
          id,
          user_id,
          name,
          title,
          company,
          bio,
          created_at,
          updated_at
        )
      `,
      );

    if (filters?.role) {
      query = query.eq("role", filters.role);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to list users:", { filters, error });
      return [];
    }

    if (!data) {
      return [];
    }

    // Transform nested arrays to single objects
    return data
      .filter((user) => user.profile)
      .map((user) => {
        const profileArray = user.profile as unknown as UserProfileResponse[];
        const profile = Array.isArray(profileArray)
          ? profileArray[0]
          : profileArray;
        return {
          ...user,
          profile,
        } as UserResponse;
      });
  }

  /**
   * Updates a user's profile.
   *
   * Uses PostgreSQL RETURNING clause to get updated data in single query,
   * then fetches the complete user object with profile.
   *
   * @param userId - UUID of the user
   * @param updates - Partial profile data to update
   * @returns Updated user with profile or null if update failed
   */
  async updateProfile(
    userId: string,
    updates: Partial<
      Omit<UserProfileResponse, "id" | "user_id" | "created_at" | "updated_at">
    >,
  ): Promise<UserResponse | null> {
    // Update profile and verify success
    const { error } = await this.supabase
      .from("user_profiles")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to update profile:", { userId, error });
      return null;
    }

    // Fetch complete user with updated profile
    // Note: We need the full user object, so a second query is necessary
    // for the JOIN. This is acceptable for Epic 0's simplicity.
    return this.getUserWithProfile(userId);
  }
}
