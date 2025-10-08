/**
 * Test Fixtures for Matching Domain (Backend API)
 *
 * Centralized mock data factories for matching algorithm tests.
 * MANDATORY: All matching tests MUST use these fixtures (Section 14.11.2).
 */

// Types
import type { MatchExplanation, UserMatchCache } from '@/providers/matching/interface';

/**
 * Simple UUID generator for tests (no external dependencies)
 */
let idCounter = 0;
const generateId = (): string => {
  idCounter++;
  return `test-${idCounter.toString().padStart(8, '0')}`;
};

/**
 * User data structure (matches database schema)
 */
export interface User {
  id: string;
  airtable_record_id: string | null;
  email: string;
  role: 'mentee' | 'mentor' | 'coordinator';
  reputation_tier?: 'bronze' | 'silver' | 'gold' | 'platinum' | null;
  is_active?: boolean;
  last_activity_at?: Date | null;
  deleted_at?: Date | null;
  created_at: Date;
  updated_at: Date;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_by?: string | null;
}

/**
 * User profile data (embedded in UserWithTags)
 */
export interface UserProfile {
  id: string;
  user_id: string;
  portfolio_company_id: string | null;
  stage: string | null;
  name: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Tag with category from database
 */
export interface TagWithCategory {
  slug: string;
  category: 'industry' | 'technology' | 'stage';
}

/**
 * User with tags and profile (enriched type for matching)
 */
export interface UserWithTags extends User {
  user_profiles: UserProfile;
  tags: TagWithCategory[];
}

/**
 * Portfolio company data
 */
export interface PortfolioCompany {
  id: string;
  airtable_record_id: string | null;
  name: string;
  stage: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Creates a mock user with default values
 *
 * @param overrides - Partial object to override default values
 * @returns Complete User object
 *
 * @example
 * const user = createMockUser({ role: 'mentor', reputation_tier: 'gold' });
 */
export const createMockUser = (overrides?: Partial<User>): User => {
  const id = generateId();
  const now = new Date();

  return {
    id,
    airtable_record_id: `airtable-${id}`,
    email: `user-${id}@test.com`,
    role: 'mentee',
    reputation_tier: 'silver',
    is_active: true,
    last_activity_at: now,
    deleted_at: null,
    created_at: new Date(now.getTime() - 86400000), // 1 day ago
    updated_at: now,
    created_by: null,
    updated_by: null,
    deleted_by: null,
    ...overrides,
  };
};

/**
 * Creates a mock user with tags (includes user_profiles)
 *
 * @param overrides - Partial object with optional tags array
 * @returns Complete UserWithTags object
 *
 * @example
 * const mentee = createMockUserWithTags({
 *   role: 'mentee',
 *   tags: [
 *     { slug: 'fintech', category: 'industry' },
 *     { slug: 'react', category: 'technology' },
 *     { slug: 'seed', category: 'stage' }
 *   ]
 * });
 */
export const createMockUserWithTags = (
  overrides?: Partial<Omit<UserWithTags, 'user_profiles'>> & {
    tags?: TagWithCategory[];
    user_profiles?: Partial<UserProfile>;
  }
): UserWithTags => {
  const baseUser = createMockUser(overrides);
  const userId = baseUser.id;

  // Build default profile
  const defaultProfile: UserProfile = {
    id: generateId(),
    user_id: userId,
    portfolio_company_id: null,
    stage: 'seed',
    name: `Test User ${userId}`,
    title: 'Software Engineer',
    company: 'Test Company',
    bio: 'Test bio for matching tests',
    created_at: baseUser.created_at,
    updated_at: baseUser.updated_at,
  };

  return {
    ...baseUser,
    user_profiles: {
      ...defaultProfile,
      ...overrides?.user_profiles,
    },
    tags: overrides?.tags || [
      { slug: 'fintech', category: 'industry' },
      { slug: 'react', category: 'technology' },
      { slug: 'seed', category: 'stage' },
    ],
  };
};

/**
 * Creates a mock portfolio company
 *
 * @param overrides - Partial object to override default values
 * @returns Complete PortfolioCompany object
 *
 * @example
 * const company = createMockPortfolioCompany({ stage: 'series-a' });
 */
export const createMockPortfolioCompany = (
  overrides?: Partial<PortfolioCompany>
): PortfolioCompany => {
  const id = generateId();
  const now = new Date();

  return {
    id,
    airtable_record_id: `airtable-company-${id}`,
    name: `Test Company ${id}`,
    stage: 'seed',
    created_at: new Date(now.getTime() - 86400000), // 1 day ago
    updated_at: now,
    ...overrides,
  };
};

/**
 * Creates a mock match cache entry
 *
 * @param overrides - Partial object to override default values
 * @returns Complete UserMatchCache object
 *
 * @example
 * const cache = createMockMatchCache({
 *   user_id: 'user-123',
 *   match_score: 85.5
 * });
 */
export const createMockMatchCache = (overrides?: Partial<UserMatchCache>): UserMatchCache => {
  const now = new Date();

  return {
    id: generateId(),
    user_id: generateId(),
    recommended_user_id: generateId(),
    match_score: 75.5,
    match_explanation: {
      tagOverlap: [
        { category: 'technology', tag: 'react' },
        { category: 'industry', tag: 'fintech' },
      ],
      stageMatch: true,
      reputationCompatible: true,
      summary: 'Strong match: 2 shared tags, same startup stage, compatible reputation tiers',
    },
    algorithm_version: 'tag-based-v1',
    calculated_at: now,
    created_at: new Date(now.getTime() - 86400000), // 1 day ago
    updated_at: now,
    ...overrides,
  };
};

/**
 * Creates a mock match explanation
 *
 * @param overrides - Partial object to override default values
 * @returns Complete MatchExplanation object
 *
 * @example
 * const explanation = createMockMatchExplanation({
 *   summary: 'Weak match: no shared tags'
 * });
 */
export const createMockMatchExplanation = (
  overrides?: Partial<MatchExplanation>
): MatchExplanation => ({
  tagOverlap: [
    { category: 'technology', tag: 'react' },
    { category: 'industry', tag: 'fintech' },
  ],
  stageMatch: true,
  reputationCompatible: true,
  summary: 'Strong match: 2 shared tags, same startup stage, compatible reputation tiers',
  ...overrides,
});

// ============================================================================
// PRE-CONFIGURED SCENARIOS
// ============================================================================

/**
 * Pre-configured scenario: Bronze mentee
 */
export const createBronzeMentee = (
  overrides?: Partial<Omit<UserWithTags, 'user_profiles'>> & {
    tags?: TagWithCategory[];
    user_profiles?: Partial<UserProfile>;
  }
): UserWithTags =>
  createMockUserWithTags({
    role: 'mentee',
    reputation_tier: 'bronze',
    tags: [
      { slug: 'fintech', category: 'industry' },
      { slug: 'seed', category: 'stage' },
    ],
    ...overrides,
  });

/**
 * Pre-configured scenario: Silver mentee
 */
export const createSilverMentee = (
  overrides?: Partial<Omit<UserWithTags, 'user_profiles'>> & {
    tags?: TagWithCategory[];
    user_profiles?: Partial<UserProfile>;
  }
): UserWithTags =>
  createMockUserWithTags({
    role: 'mentee',
    reputation_tier: 'silver',
    tags: [
      { slug: 'fintech', category: 'industry' },
      { slug: 'react', category: 'technology' },
      { slug: 'seed', category: 'stage' },
    ],
    ...overrides,
  });

/**
 * Pre-configured scenario: Gold mentor
 */
export const createGoldMentor = (
  overrides?: Partial<Omit<UserWithTags, 'user_profiles'>> & {
    tags?: TagWithCategory[];
    user_profiles?: Partial<UserProfile>;
  }
): UserWithTags =>
  createMockUserWithTags({
    role: 'mentor',
    reputation_tier: 'gold',
    tags: [
      { slug: 'fintech', category: 'industry' },
      { slug: 'react', category: 'technology' },
      { slug: 'series-a', category: 'stage' },
    ],
    ...overrides,
  });

/**
 * Pre-configured scenario: Platinum mentor
 */
export const createPlatinumMentor = (
  overrides?: Partial<Omit<UserWithTags, 'user_profiles'>> & {
    tags?: TagWithCategory[];
    user_profiles?: Partial<UserProfile>;
  }
): UserWithTags =>
  createMockUserWithTags({
    role: 'mentor',
    reputation_tier: 'platinum',
    tags: [
      { slug: 'fintech', category: 'industry' },
      { slug: 'vue', category: 'technology' },
      { slug: 'series-b', category: 'stage' },
    ],
    ...overrides,
  });

/**
 * Pre-configured scenario: Mentee with portfolio company
 */
export const createMenteeWithCompany = (): UserWithTags => {
  const company = createMockPortfolioCompany({ stage: 'seed' });
  const userId = generateId();
  const now = new Date();

  return createMockUserWithTags({
    role: 'mentee',
    reputation_tier: 'silver',
    user_profiles: {
      id: generateId(),
      user_id: userId,
      portfolio_company_id: company.id,
      stage: company.stage,
      name: `Test Mentee ${userId}`,
      title: 'Founder',
      company: company.name,
      bio: 'Test mentee with portfolio company',
      created_at: now,
      updated_at: now,
    },
    tags: [
      { slug: 'fintech', category: 'industry' },
      { slug: 'react', category: 'technology' },
      { slug: 'seed', category: 'stage' },
    ],
  });
};

/**
 * Pre-configured scenario: Inactive/dormant user (>90 days since last activity)
 */
export const createDormantUser = (): UserWithTags => {
  const dormancyDate = new Date();
  dormancyDate.setDate(dormancyDate.getDate() - 180); // 180 days ago (well past 90 day threshold)

  return createMockUserWithTags({
    role: 'mentee',
    reputation_tier: 'silver',
    is_active: true,
    last_activity_at: dormancyDate,
    tags: [
      { slug: 'fintech', category: 'industry' },
    ],
  });
};

/**
 * Pre-configured scenario: Deleted user
 */
export const createDeletedUser = (): UserWithTags => {
  const now = new Date();
  return createMockUserWithTags({
    role: 'mentor',
    reputation_tier: 'gold',
    deleted_at: new Date(now.getTime() - 3600000), // Deleted 1 hour ago
    deleted_by: generateId(),
    tags: [
      { slug: 'fintech', category: 'industry' },
      { slug: 'react', category: 'technology' },
    ],
  });
};
