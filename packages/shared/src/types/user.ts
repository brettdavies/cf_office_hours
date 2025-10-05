/**
 * User type definitions for CF Office Hours platform.
 *
 * Minimal implementation for Epic 0. Extended fields (reputation, avatar, etc.)
 * will be added in later epics.
 */

/**
 * User roles in the platform.
 */
export type UserRole = 'mentee' | 'mentor' | 'coordinator';

/**
 * Base user entity from the users table.
 *
 * Minimal fields for Epic 0. Additional fields added in Epic 1:
 * - Soft delete (deleted_at, deleted_by)
 * - Audit fields (created_by, updated_by)
 * - Reputation (reputation_score, reputation_tier, last_activity_at)
 */
export interface IUser {
  id: string;
  airtable_record_id: string | null;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

/**
 * User profile entity from the user_profiles table.
 *
 * Minimal fields for Epic 0. Additional fields added in Epic 2:
 * - Avatar (avatar_url, avatar_source_type, avatar_metadata)
 * - Mentor-specific (expertise, ideal_mentee)
 * - Mentee-specific (pitch_deck_url, pitchvc_url)
 * - Additional links (links array)
 * - Preferences (reminder_preferences)
 */
export interface IUserProfile {
  id: string;
  user_id: string;
  name: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Combined user with profile data.
 *
 * Used by API endpoints to return complete user information.
 */
export interface IUserWithProfile extends IUser {
  profile: IUserProfile;
}
