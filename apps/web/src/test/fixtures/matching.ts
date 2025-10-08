/**
 * Centralized Mock Fixtures for Matching
 *
 * Factory functions for creating mock match results, explanations, and related data.
 * CRITICAL: All tests MUST use these centralized factories (Coding Standard 14.11.2).
 */

// Types
import type { paths } from '@shared/types/api.generated';

type MatchUser =
  paths['/v1/matching/find-matches']['post']['responses']['200']['content']['application/json']['matches'][number]['user'];
type MatchResult =
  paths['/v1/matching/find-matches']['post']['responses']['200']['content']['application/json']['matches'][number];
type MatchExplanation = NonNullable<
  paths['/v1/matching/explain']['post']['responses']['200']['content']['application/json']['explanation']
>;

/**
 * Creates a mock user with profile and sensible defaults.
 */
export const createMockUserWithProfile = (
  overrides?: Partial<MatchUser>
): MatchUser => ({
  id: 'user-123',
  airtable_record_id: null,
  email: 'user@example.com',
  role: 'mentor',
  reputation_tier: 'gold',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  profile: {
    id: 'profile-123',
    user_id: 'user-123',
    name: 'Jane Mentor',
    avatar_url: null,
    title: 'Senior Engineer',
    company: 'Tech Corp',
    bio: 'Experienced mentor',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  tags: [
    {
      taxonomy_id: 'tag-1',
      category: 'industry',
      value: 'fintech',
      display_name: 'FinTech',
    },
    {
      taxonomy_id: 'tag-2',
      category: 'technology',
      value: 'react',
      display_name: 'React',
    },
  ],
  ...overrides,
});

/**
 * Creates a mock match explanation with sensible defaults.
 */
export const createMockMatchExplanation = (
  overrides?: Partial<MatchExplanation>
): MatchExplanation => ({
  tagOverlap: [
    { category: 'industry', tag: 'FinTech' },
    { category: 'technology', tag: 'React' },
  ],
  stageMatch: true,
  reputationCompatible: true,
  summary: '2 shared tags, compatible stage and reputation',
  ...overrides,
});

/**
 * Creates a mock match result with sensible defaults.
 * Each call generates a unique ID to prevent React key collisions in tests.
 */
export const createMockMatchResult = (overrides?: Partial<MatchResult>): MatchResult => {
  const uniqueId = `match-user-${Math.random().toString(36).substr(2, 9)}`;
  return {
    user: createMockUserWithProfile({
      id: uniqueId,
      email: 'match@example.com',
      role: 'mentee',
      profile: {
        id: `match-profile-${uniqueId}`,
        user_id: uniqueId,
        name: 'John Mentee',
        avatar_url: null,
        title: 'Junior Developer',
        company: 'Startup Inc',
        bio: 'Looking for guidance',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
    }),
    score: 85,
    explanation: createMockMatchExplanation(),
    ...overrides,
  };
};

/**
 * Pre-configured mock scenarios for common test cases
 */
export const mockMatches = {
  highScore: createMockMatchResult({
    score: 95,
    explanation: createMockMatchExplanation({
      tagOverlap: [
        { category: 'industry', tag: 'FinTech' },
        { category: 'technology', tag: 'React' },
        { category: 'technology', tag: 'TypeScript' },
      ],
      summary: '3 shared tags, compatible stage and reputation',
    }),
  }),
  mediumScore: createMockMatchResult({
    score: 65,
    explanation: createMockMatchExplanation({
      tagOverlap: [{ category: 'industry', tag: 'FinTech' }],
      stageMatch: true,
      reputationCompatible: false,
      summary: '1 shared tag, compatible stage but different reputation',
    }),
  }),
  lowScore: createMockMatchResult({
    score: 45,
    explanation: createMockMatchExplanation({
      tagOverlap: [],
      stageMatch: false,
      reputationCompatible: false,
      summary: 'No shared tags, incompatible stage and reputation',
    }),
  }),
  noTags: createMockMatchResult({
    user: createMockUserWithProfile({
      tags: [],
    }),
    score: 30,
    explanation: createMockMatchExplanation({
      tagOverlap: [],
      summary: 'No tags available',
    }),
  }),
};
