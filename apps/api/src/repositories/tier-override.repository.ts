/**
 * Tier Override Repository - Data access layer for tier override requests.
 *
 * Responsibilities:
 * - Fetch tier override requests with joined user data
 * - Enrich requests with match scores from user_match_cache
 * - NO business logic (that belongs in service layer)
 */

// Internal modules
import { BaseRepository } from '../lib/base-repository';

// Types
interface UserWithProfile {
  id: string;
  email: string;
  role: 'mentee' | 'mentor' | 'coordinator';
  reputation_tier: 'bronze' | 'silver' | 'gold' | 'platinum' | null;
  profile: {
    id: string;
    user_id: string;
    name: string;
    title: string | null;
    company: string | null;
    bio: string | null;
    created_at: string;
    updated_at: string;
  };
}

export interface TierOverrideRequestWithUsers {
  id: string;
  mentee_id: string;
  mentor_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied' | 'rejected';
  scope: 'one_time';
  expires_at: string;
  used_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  mentee: UserWithProfile;
  mentor: UserWithProfile;
  match_score: number | null;
}

interface PendingRow {
  id: string;
  mentee_id: string;
  mentor_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied' | 'rejected';
  scope: 'one_time';
  expires_at: string;
  used_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  mentee_email: string;
  mentee_role: 'mentee' | 'mentor' | 'coordinator';
  mentee_tier: 'bronze' | 'silver' | 'gold' | 'platinum' | null;
  mentee_p_id: string;
  mentee_p_user_id: string;
  mentee_p_name: string;
  mentee_p_title: string | null;
  mentee_p_company: string | null;
  mentee_p_bio: string | null;
  mentee_p_created_at: string;
  mentee_p_updated_at: string;
  mentor_email: string;
  mentor_role: 'mentee' | 'mentor' | 'coordinator';
  mentor_tier: 'bronze' | 'silver' | 'gold' | 'platinum' | null;
  mentor_p_id: string;
  mentor_p_user_id: string;
  mentor_p_name: string;
  mentor_p_title: string | null;
  mentor_p_company: string | null;
  mentor_p_bio: string | null;
  mentor_p_created_at: string;
  mentor_p_updated_at: string;
}

export class TierOverrideRepository extends BaseRepository {
  /**
   * Fetches all pending tier override requests with enriched user data.
   *
   * Joins users and user_profiles for both mentee and mentor, then enriches with
   * match scores from user_match_cache (tag-based-v1 algorithm) in a single query.
   *
   * @returns Array of tier override requests with user profiles and match scores
   */
  async getPendingWithUsers(): Promise<TierOverrideRequestWithUsers[]> {
    let rows: PendingRow[];
    try {
      const res = await this.db
        .prepare(
          `SELECT
             r.id, r.mentee_id, r.mentor_id, r.reason, r.status, r.scope, r.expires_at,
             r.used_at, r.reviewed_by, r.reviewed_at, r.review_notes,
             r.created_at, r.created_by, r.updated_at, r.updated_by,
             me.email AS mentee_email, me.role AS mentee_role, me.reputation_tier AS mentee_tier,
             mep.id AS mentee_p_id, mep.user_id AS mentee_p_user_id, mep.name AS mentee_p_name,
             mep.title AS mentee_p_title, mep.company AS mentee_p_company, mep.bio AS mentee_p_bio,
             mep.created_at AS mentee_p_created_at, mep.updated_at AS mentee_p_updated_at,
             mo.email AS mentor_email, mo.role AS mentor_role, mo.reputation_tier AS mentor_tier,
             mop.id AS mentor_p_id, mop.user_id AS mentor_p_user_id, mop.name AS mentor_p_name,
             mop.title AS mentor_p_title, mop.company AS mentor_p_company, mop.bio AS mentor_p_bio,
             mop.created_at AS mentor_p_created_at, mop.updated_at AS mentor_p_updated_at
           FROM tier_override_requests r
           JOIN users me ON me.id = r.mentee_id
           JOIN user_profiles mep ON mep.user_id = me.id
           JOIN users mo ON mo.id = r.mentor_id
           JOIN user_profiles mop ON mop.user_id = mo.id
           WHERE r.status = 'pending'
           ORDER BY r.created_at DESC`
        )
        .all<PendingRow>();
      rows = res.results ?? [];
    } catch (error) {
      console.error('[TIER_OVERRIDE_REPO] Failed to fetch pending requests:', error);
      throw new Error(
        `Failed to fetch tier override requests: ${
          error instanceof Error ? error.message : 'unknown'
        }`
      );
    }

    if (rows.length === 0) {
      return [];
    }

    const matchScoreMap = await this.fetchMatchScores(
      rows.map(r => r.mentee_id),
      rows.map(r => r.mentor_id)
    );

    return rows.map(row => ({
      id: row.id,
      mentee_id: row.mentee_id,
      mentor_id: row.mentor_id,
      reason: row.reason,
      status: row.status,
      scope: row.scope,
      expires_at: row.expires_at,
      used_at: row.used_at,
      reviewed_by: row.reviewed_by,
      reviewed_at: row.reviewed_at,
      review_notes: row.review_notes,
      created_at: row.created_at,
      created_by: row.created_by,
      updated_at: row.updated_at,
      updated_by: row.updated_by,
      mentee: {
        id: row.mentee_id,
        email: row.mentee_email,
        role: row.mentee_role,
        reputation_tier: row.mentee_tier,
        profile: {
          id: row.mentee_p_id,
          user_id: row.mentee_p_user_id,
          name: row.mentee_p_name,
          title: row.mentee_p_title,
          company: row.mentee_p_company,
          bio: row.mentee_p_bio,
          created_at: row.mentee_p_created_at,
          updated_at: row.mentee_p_updated_at,
        },
      },
      mentor: {
        id: row.mentor_id,
        email: row.mentor_email,
        role: row.mentor_role,
        reputation_tier: row.mentor_tier,
        profile: {
          id: row.mentor_p_id,
          user_id: row.mentor_p_user_id,
          name: row.mentor_p_name,
          title: row.mentor_p_title,
          company: row.mentor_p_company,
          bio: row.mentor_p_bio,
          created_at: row.mentor_p_created_at,
          updated_at: row.mentor_p_updated_at,
        },
      },
      match_score: matchScoreMap.get(`${row.mentee_id}-${row.mentor_id}`) ?? null,
    }));
  }

  /**
   * Loads tag-based match scores for the given mentee/mentor id sets in one query.
   *
   * @returns Map keyed by "menteeId-mentorId" to match score
   */
  private async fetchMatchScores(
    menteeIds: string[],
    mentorIds: string[]
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (menteeIds.length === 0 || mentorIds.length === 0) {
      return map;
    }

    const menteePlaceholders = menteeIds.map(() => '?').join(', ');
    const mentorPlaceholders = mentorIds.map(() => '?').join(', ');

    try {
      const { results } = await this.db
        .prepare(
          `SELECT user_id, recommended_user_id, match_score
           FROM user_match_cache
           WHERE user_id IN (${menteePlaceholders})
             AND recommended_user_id IN (${mentorPlaceholders})
             AND algorithm_version = 'tag-based-v1'`
        )
        .bind(...menteeIds, ...mentorIds)
        .all<{
          user_id: string;
          recommended_user_id: string;
          match_score: number;
        }>();

      for (const score of results ?? []) {
        map.set(`${score.user_id}-${score.recommended_user_id}`, score.match_score);
      }
    } catch (error) {
      console.error('[TIER_OVERRIDE_REPO] Failed to fetch match scores:', error);
      // Non-fatal - requests are returned without match scores.
    }

    return map;
  }
}
