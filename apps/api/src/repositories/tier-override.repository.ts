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
    const enriched = await Promise.all(
      transformedRequests.map(async (request) => {
        const { data: matchData } = await this.supabase
          .from('user_match_cache')
          .select('match_score')
          .eq('user_id', request.mentee_id)
          .eq('recommended_user_id', request.mentor_id)
          .eq('algorithm_version', 'tag-based-v1')
          .maybeSingle();

        return {
          ...request,
          match_score: matchData?.match_score ?? null,
        };
      }),
    );

    return enriched;
  }
}
