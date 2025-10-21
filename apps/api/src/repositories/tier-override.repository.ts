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
  role: string;
  reputation_tier: string | null;
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
  status: string;
  scope: string;
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

export class TierOverrideRepository extends BaseRepository {
  /**
   * Fetches all pending tier override requests with enriched user data.
   *
   * Joins with users and user_profiles tables, then enriches with match scores
   * from user_match_cache (tag-based-v1 algorithm).
   *
   * @returns Array of tier override requests with user profiles and match scores
   */
  async getPendingWithUsers(): Promise<TierOverrideRequestWithUsers[]> {
    // Fetch tier override requests with joined user profiles
    const { data: requests, error: requestsError } = await this.supabase
      .from('tier_override_requests')
      .select(
        `
        *,
        mentee:users!mentee_id(
          id,
          email,
          role,
          reputation_tier,
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
        ),
        mentor:users!mentor_id(
          id,
          email,
          role,
          reputation_tier,
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
        )
      `,
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (requestsError) {
      console.error('[TIER_OVERRIDE_REPO] Failed to fetch pending requests:', requestsError);
      throw new Error(`Failed to fetch tier override requests: ${requestsError.message}`);
    }

    if (!requests || requests.length === 0) {
      return [];
    }

    // Transform nested arrays to objects (Supabase returns as arrays)
    const transformedRequests = requests.map((request) => {
      const menteeProfile = Array.isArray(request.mentee.profile)
        ? request.mentee.profile[0]
        : request.mentee.profile;
      const mentorProfile = Array.isArray(request.mentor.profile)
        ? request.mentor.profile[0]
        : request.mentor.profile;

      return {
        ...request,
        mentee: {
          ...request.mentee,
          profile: menteeProfile,
        },
        mentor: {
          ...request.mentor,
          profile: mentorProfile,
        },
      };
    });

    // Enrich with match scores from user_match_cache
    // PERFORMANCE FIX: Fetch all match scores in single query instead of N queries
    const menteeIds = transformedRequests.map((r) => r.mentee_id);
    const mentorIds = transformedRequests.map((r) => r.mentor_id);

    const { data: matchScores, error: matchError } = await this.supabase
      .from('user_match_cache')
      .select('user_id, recommended_user_id, match_score')
      .in('user_id', menteeIds)
      .in('recommended_user_id', mentorIds)
      .eq('algorithm_version', 'tag-based-v1');

    if (matchError) {
      console.error('[TIER_OVERRIDE_REPO] Failed to fetch match scores:', matchError);
      // Non-fatal error - continue without match scores
    }

    // Create lookup map for O(1) access: "mentee_id-mentor_id" -> match_score
    const matchScoreMap = new Map<string, number>();
    if (matchScores) {
      for (const score of matchScores) {
        const key = `${score.user_id}-${score.recommended_user_id}`;
        matchScoreMap.set(key, score.match_score);
      }
    }

    // Map match scores to requests
    const enriched = transformedRequests.map((request) => {
      const key = `${request.mentee_id}-${request.mentor_id}`;
      const matchScore = matchScoreMap.get(key) ?? null;

      return {
        ...request,
        match_score: matchScore,
      };
    });

    return enriched;
  }
}
