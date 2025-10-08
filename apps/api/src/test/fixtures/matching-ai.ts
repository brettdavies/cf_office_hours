/**
 * Test Fixtures for AI-Based Matching Domain (Backend API)
 *
 * Centralized mock data factories for AI matching algorithm tests.
 * MANDATORY: All AI matching tests MUST use these fixtures (Section 14.11.2).
 *
 * @module test/fixtures/matching-ai
 */

// Internal imports
import type { BaseUserData } from "../../providers/matching/base.engine";

/**
 * User with profile and portfolio company data (enriched for AI matching)
 */
export interface UserWithProfile extends BaseUserData {
  user_profiles: {
    bio: string | null;
    portfolio_company_id: string | null;
  };
  portfolio_company: {
    description: string | null;
  } | null;
}

/**
 * Portfolio company with description field
 */
export interface PortfolioCompanyWithDescription {
  description: string;
}

/**
 * Simple UUID generator for tests (no external dependencies)
 */
let idCounter = 0;
const generateId = (): string => {
  idCounter++;
  return `ai-test-${idCounter.toString().padStart(8, "0")}`;
};

/**
 * Creates a mock mentor with bio for AI matching tests.
 *
 * @param overrides - Partial object to override default values
 * @returns Complete UserWithProfile object with mentor role and bio
 *
 * @example
 * // Default mentor with bio
 * const mentor = createMockUserWithBio();
 *
 * @example
 * // Mentor with custom bio
 * const mentor = createMockUserWithBio({
 *   user_profiles: {
 *     bio: 'Expert in blockchain and cryptocurrency',
 *     portfolio_company_id: null,
 *   }
 * });
 *
 * @example
 * // Mentor without bio (edge case)
 * const mentorNoBio = createMockUserWithBio({
 *   user_profiles: { bio: null, portfolio_company_id: null }
 * });
 */
export const createMockUserWithBio = (
  overrides?: Partial<UserWithProfile>,
): UserWithProfile => {
  const id = generateId();
  const now = new Date();

  return {
    id,
    email: `mentor-${id}@example.com`,
    role: "mentor",
    is_active: true,
    last_activity_at: now,
    deleted_at: null,
    user_profiles: {
      bio:
        "Experienced software engineer with 10 years in cloud infrastructure and DevOps. Expert in Kubernetes, AWS, and microservices architecture.",
      portfolio_company_id: null,
    },
    portfolio_company: null,
    ...overrides,
  };
};

/**
 * Creates a mock mentee with portfolio company for AI matching tests.
 *
 * @param overrides - Partial object to override default values
 * @returns Complete UserWithProfile object with mentee role and company description
 *
 * @example
 * // Default mentee with company description
 * const mentee = createMockMenteeWithCompany();
 *
 * @example
 * // Mentee with custom company description
 * const mentee = createMockMenteeWithCompany({
 *   portfolio_company: {
 *     description: 'Fintech startup building crypto payment platform'
 *   }
 * });
 *
 * @example
 * // Mentee without company (edge case)
 * const menteeNoCompany = createMockMenteeWithCompany({
 *   portfolio_company: null
 * });
 */
export const createMockMenteeWithCompany = (
  overrides?: Partial<UserWithProfile>,
): UserWithProfile => {
  const id = generateId();
  const companyId = generateId();
  const now = new Date();

  return {
    id,
    email: `mentee-${id}@example.com`,
    role: "mentee",
    is_active: true,
    last_activity_at: now,
    deleted_at: null,
    user_profiles: {
      bio: null,
      portfolio_company_id: companyId,
    },
    portfolio_company: {
      description:
        "AI-powered analytics platform for healthcare. Building real-time data pipelines with Kubernetes and AWS.",
    },
    ...overrides,
  };
};

/**
 * Creates a mock portfolio company with description.
 *
 * @param overrides - Partial object to override default values
 * @returns PortfolioCompanyWithDescription object
 *
 * @example
 * const company = createMockPortfolioCompany();
 *
 * @example
 * const company = createMockPortfolioCompany({
 *   description: 'E-commerce platform for sustainable fashion'
 * });
 */
export const createMockPortfolioCompany = (
  overrides?: Partial<PortfolioCompanyWithDescription>,
): PortfolioCompanyWithDescription => ({
  description: "Cloud-native SaaS platform for enterprise analytics",
  ...overrides,
});

// ============================================================================
// PRE-CONFIGURED SCENARIOS
// ============================================================================

/**
 * Pre-configured mock scenarios for common AI matching test cases
 *
 * @example
 * // Use pre-configured mentor with bio
 * const mentor = mockAiMatchData.mentorWithBio;
 *
 * @example
 * // Use pre-configured mentee with company
 * const mentee = mockAiMatchData.menteeWithCompany;
 *
 * @example
 * // Test missing data scenario
 * const mentorNoBio = mockAiMatchData.missingBio;
 */
export const mockAiMatchData = {
  /**
   * Mentor with high-quality bio (cloud infrastructure expert)
   */
  mentorWithBio: createMockUserWithBio(),

  /**
   * Mentee with portfolio company description (healthcare analytics)
   */
  menteeWithCompany: createMockMenteeWithCompany(),

  /**
   * Mentor without bio (missing required data for AI scoring)
   */
  missingBio: createMockUserWithBio({
    user_profiles: { bio: null, portfolio_company_id: null },
  }),

  /**
   * Mentee without portfolio company (missing required data for AI scoring)
   */
  missingCompany: createMockMenteeWithCompany({
    user_profiles: { bio: null, portfolio_company_id: null },
    portfolio_company: null,
  }),

  /**
   * Mentor with DevOps expertise (good match for cloud-native companies)
   */
  devOpsMentor: createMockUserWithBio({
    user_profiles: {
      bio:
        "DevOps engineer specializing in CI/CD pipelines, infrastructure as code, and container orchestration. 8 years experience with AWS, Docker, and Kubernetes.",
      portfolio_company_id: null,
    },
  }),

  /**
   * Mentee with fintech company (good match for finance/payment experts)
   */
  fintechMentee: createMockMenteeWithCompany({
    portfolio_company: {
      description:
        "Fintech startup building a payment processing platform for small businesses. Tech stack: Node.js, React, PostgreSQL.",
    },
  }),

  /**
   * Mentor with product management expertise
   */
  productMentor: createMockUserWithBio({
    user_profiles: {
      bio:
        "Senior Product Manager with 12 years experience in B2B SaaS. Led product strategy for 3 successful Series A-C companies. Expert in user research, roadmap planning, and go-to-market.",
      portfolio_company_id: null,
    },
  }),

  /**
   * Mentee with early-stage consumer app
   */
  consumerAppMentee: createMockMenteeWithCompany({
    portfolio_company: {
      description:
        "Pre-seed consumer social app focused on local community building. Looking for guidance on user acquisition and product-market fit.",
    },
  }),

  /**
   * Deleted mentor (should not appear in matches)
   */
  deletedMentor: createMockUserWithBio({
    deleted_at: new Date(),
  }),

  /**
   * Inactive mentee (should not appear in matches)
   */
  inactiveMentee: createMockMenteeWithCompany({
    is_active: false,
  }),
};
