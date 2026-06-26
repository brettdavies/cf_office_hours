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
import { BaseRepository } from '../lib/base-repository';
import { nowIso } from '../lib/d1-utils';

// Types
import type { UserProfileResponse, UserResponse } from '@cf-office-hours/shared';

/** Columns selected for the nested profile object, aliased to avoid id/created_at collisions. */
const USER_WITH_PROFILE_SQL = `
  SELECT
    u.id, u.airtable_record_id, u.email, u.role, u.created_at, u.updated_at,
    p.id AS p_id, p.user_id AS p_user_id, p.name AS p_name, p.title AS p_title,
    p.company AS p_company, p.bio AS p_bio,
    p.created_at AS p_created_at, p.updated_at AS p_updated_at
  FROM users u
  JOIN user_profiles p ON p.user_id = u.id
`;

interface UserProfileRow {
  id: string;
  airtable_record_id: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
  p_id: string;
  p_user_id: string;
  p_name: string;
  p_title: string | null;
  p_company: string | null;
  p_bio: string | null;
  p_created_at: string;
  p_updated_at: string;
}

/** Profile columns a caller may update, guarding the dynamic UPDATE against arbitrary keys. */
const UPDATABLE_PROFILE_COLUMNS = new Set([
  'name',
  'title',
  'company',
  'portfolio_company_id',
  'phone',
  'bio',
  'avatar_source_type',
  'avatar_metadata',
  'reminder_preference',
  'metadata',
  'expertise_description',
  'ideal_mentee_description',
]);

const mapRow = (row: UserProfileRow): UserResponse =>
  ({
    id: row.id,
    airtable_record_id: row.airtable_record_id,
    email: row.email,
    role: row.role,
    created_at: row.created_at,
    updated_at: row.updated_at,
    profile: {
      id: row.p_id,
      user_id: row.p_user_id,
      name: row.p_name,
      title: row.p_title,
      company: row.p_company,
      bio: row.p_bio,
      created_at: row.p_created_at,
      updated_at: row.p_updated_at,
    } as UserProfileResponse,
  }) as UserResponse;

export class UserRepository extends BaseRepository {
  /**
   * Fetches a user with their profile by user ID.
   *
   * @param userId - UUID of the user
   * @returns User with profile or null if not found
   */
  async getUserWithProfile(userId: string): Promise<UserResponse | null> {
    try {
      const row = await this.db
        .prepare(`${USER_WITH_PROFILE_SQL} WHERE u.id = ?`)
        .bind(userId)
        .first<UserProfileRow>();

      return row ? mapRow(row) : null;
    } catch (error) {
      console.error('Failed to fetch user:', { userId, error });
      return null;
    }
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
    try {
      const sql = filters?.role
        ? `${USER_WITH_PROFILE_SQL} WHERE u.role = ?`
        : USER_WITH_PROFILE_SQL;
      const stmt = filters?.role ? this.db.prepare(sql).bind(filters.role) : this.db.prepare(sql);

      const { results } = await stmt.all<UserProfileRow>();
      return (results ?? []).map(mapRow);
    } catch (error) {
      console.error('Failed to list users:', { filters, error });
      return [];
    }
  }

  /**
   * Updates a user's profile.
   *
   * @param userId - UUID of the user
   * @param updates - Partial profile data to update
   * @returns Updated user with profile or null if update failed
   */
  async updateProfile(
    userId: string,
    updates: Partial<Omit<UserProfileResponse, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<UserResponse | null> {
    const entries = Object.entries(updates).filter(([key]) => UPDATABLE_PROFILE_COLUMNS.has(key));

    if (entries.length === 0) {
      return this.getUserWithProfile(userId);
    }

    const setClause = entries
      .map(([key]) => `${key} = ?`)
      .concat('updated_at = ?')
      .join(', ');
    const values = entries
      .map(([, value]) => (value === undefined ? null : value))
      .concat(nowIso());

    try {
      await this.db
        .prepare(`UPDATE user_profiles SET ${setClause} WHERE user_id = ?`)
        .bind(...values, userId)
        .run();
    } catch (error) {
      console.error('Failed to update profile:', { userId, error });
      return null;
    }

    return this.getUserWithProfile(userId);
  }
}
