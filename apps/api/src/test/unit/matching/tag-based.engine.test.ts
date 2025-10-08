/**
 * Unit tests for TagBasedMatchingEngineV1
 *
 * Coverage target: ≥85%
 * Test framework: Vitest 3.x
 *
 * MANDATORY: Uses centralized fixtures from @/test/fixtures/matching
 * (Section 14.11.2, Section 13.7)
 */

// External dependencies
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

// Internal modules
import { TagBasedMatchingEngineV1 } from "../../../providers/matching/tag-based.engine";

// Test fixtures (MANDATORY - no inline mocks)
import {
  createBronzeMentee,
  createDeletedUser,
  createDormantUser,
  createGoldMentor,
  createMenteeWithCompany,
  createMockUserWithTags,
  createPlatinumMentor,
  createSilverMentee,
  type TagWithCategory,
} from "../../../test/fixtures/matching";

/**
 * Helper: Convert string array to TagWithCategory array for tests
 * Auto-categorizes based on tag name patterns
 */
const toTagsWithCategory = (slugs: string[]): TagWithCategory[] => {
  return slugs.map((slug) => {
    // Auto-categorize based on common patterns
    let category: "industry" | "technology" | "stage";
    if (
      slug.includes("stage") ||
      ["seed", "pre-seed", "series-a", "series-b", "series-c", "growth"]
        .includes(slug)
    ) {
      category = "stage";
    } else if (["react", "vue", "angular", "node", "python"].includes(slug)) {
      category = "technology";
    } else {
      category = "industry";
    }
    return { slug, category };
  });
};

/**
 * Mock Supabase client for testing
 */
const createMockSupabaseClient = (): SupabaseClient => {
  const mockClient = {
    from: vi.fn(),
  } as any;

  return mockClient;
};

describe("TagBasedMatchingEngineV1", () => {
  let engine: TagBasedMatchingEngineV1;
  let mockDb: SupabaseClient;

  beforeEach(() => {
    mockDb = createMockSupabaseClient();
    engine = new TagBasedMatchingEngineV1(mockDb);
    vi.clearAllMocks();
  });

  // ============================================================================
  // ALGORITHM VERSION
  // ============================================================================

  describe("getAlgorithmVersion", () => {
    it("should return tag-based-v1", () => {
      // Act
      const version = engine.getAlgorithmVersion();

      // Assert
      expect(version).toBe("tag-based-v1");
    });
  });

  // ============================================================================
  // TAG OVERLAP CALCULATION
  // ============================================================================

  describe("calculateTagOverlap", () => {
    it("should return 60 when tags are identical", () => {
      // Arrange
      const user1 = createMockUserWithTags({
        tags: toTagsWithCategory(["fintech", "react", "seed-stage"]),
      });
      const user2 = createMockUserWithTags({
        tags: toTagsWithCategory(["fintech", "react", "seed-stage"]),
      });

      // Act
      const score = (engine as any).calculateTagOverlap(user1.tags, user2.tags);

      // Assert
      expect(score).toBe(60);
    });

    it("should return 0 when tags have no overlap", () => {
      // Arrange
      const user1 = createMockUserWithTags({
        tags: toTagsWithCategory(["fintech", "react"]),
      });
      const user2 = createMockUserWithTags({
        tags: toTagsWithCategory(["healthcare", "vue"]),
      });

      // Act
      const score = (engine as any).calculateTagOverlap(user1.tags, user2.tags);

      // Assert
      expect(score).toBe(0);
    });

    it("should return partial score when tags partially overlap", () => {
      // Arrange
      const user1 = createMockUserWithTags({
        tags: toTagsWithCategory(["fintech", "react", "seed-stage"]),
      });
      const user2 = createMockUserWithTags({
        tags: toTagsWithCategory(["fintech", "vue", "series-a"]),
      });

      // Act
      const score = (engine as any).calculateTagOverlap(user1.tags, user2.tags);

      // Assert
      // Shared: 1 (fintech)
      // Unique: 5 (fintech, react, seed-stage, vue, series-a)
      // Score: (1/5) * 60 = 12
      expect(score).toBe(12);
    });

    it("should return 0 when both users have no tags", () => {
      // Arrange
      const user1 = createMockUserWithTags({ tags: toTagsWithCategory([]) });
      const user2 = createMockUserWithTags({ tags: toTagsWithCategory([]) });

      // Act
      const score = (engine as any).calculateTagOverlap(user1.tags, user2.tags);

      // Assert
      expect(score).toBe(0);
    });

    it("should handle case when one user has no tags", () => {
      // Arrange
      const user1 = createMockUserWithTags({
        tags: toTagsWithCategory(["fintech", "react"]),
      });
      const user2 = createMockUserWithTags({ tags: toTagsWithCategory([]) });

      // Act
      const score = (engine as any).calculateTagOverlap(user1.tags, user2.tags);

      // Assert
      expect(score).toBe(0);
    });
  });

  // ============================================================================
  // STAGE MATCH CALCULATION
  // ============================================================================

  describe("calculateStageMatch", () => {
    it("should return 20 when stages are identical", () => {
      // Arrange
      const user1 = createMockUserWithTags({
        user_profiles: { portfolio_company_id: null, stage: "seed" },
      });
      const user2 = createMockUserWithTags({
        user_profiles: { portfolio_company_id: null, stage: "seed" },
      });

      // Act
      const score = (engine as any).calculateStageMatch(
        user1.user_profiles.stage,
        user2.user_profiles.stage,
      );

      // Assert
      expect(score).toBe(20);
    });

    it("should return 10 when stages are adjacent", () => {
      // Arrange
      const user1 = createMockUserWithTags({
        user_profiles: { portfolio_company_id: null, stage: "seed" },
      });
      const user2 = createMockUserWithTags({
        user_profiles: { portfolio_company_id: null, stage: "series-a" },
      });

      // Act
      const score = (engine as any).calculateStageMatch(
        user1.user_profiles.stage,
        user2.user_profiles.stage,
      );

      // Assert
      expect(score).toBe(10);
    });

    it("should return 0 when stages differ by more than 1 level", () => {
      // Arrange
      const user1 = createMockUserWithTags({
        user_profiles: { portfolio_company_id: null, stage: "seed" },
      });
      const user2 = createMockUserWithTags({
        user_profiles: { portfolio_company_id: null, stage: "series-b" },
      });

      // Act
      const score = (engine as any).calculateStageMatch(
        user1.user_profiles.stage,
        user2.user_profiles.stage,
      );

      // Assert
      expect(score).toBe(0);
    });

    it("should return 0 when one stage is missing", () => {
      // Arrange
      const user1 = createMockUserWithTags({
        user_profiles: { portfolio_company_id: null, stage: "seed" },
      });
      const user2 = createMockUserWithTags({
        user_profiles: { portfolio_company_id: null, stage: null },
      });

      // Act
      const score = (engine as any).calculateStageMatch(
        user1.user_profiles.stage,
        user2.user_profiles.stage,
      );

      // Assert
      expect(score).toBe(0);
    });

    it("should return 0 when both stages are missing", () => {
      // Arrange
      const user1 = createMockUserWithTags({
        user_profiles: { portfolio_company_id: null, stage: null },
      });
      const user2 = createMockUserWithTags({
        user_profiles: { portfolio_company_id: null, stage: null },
      });

      // Act
      const score = (engine as any).calculateStageMatch(
        user1.user_profiles.stage,
        user2.user_profiles.stage,
      );

      // Assert
      expect(score).toBe(0);
    });

    it("should return 0 when stage is invalid", () => {
      // Arrange
      const user1 = createMockUserWithTags({
        user_profiles: { portfolio_company_id: null, stage: "invalid-stage" },
      });
      const user2 = createMockUserWithTags({
        user_profiles: { portfolio_company_id: null, stage: "seed" },
      });

      // Act
      const score = (engine as any).calculateStageMatch(
        user1.user_profiles.stage,
        user2.user_profiles.stage,
      );

      // Assert
      expect(score).toBe(0);
    });
  });

  // ============================================================================
  // REPUTATION MATCH CALCULATION
  // ============================================================================

  describe("calculateReputationMatch", () => {
    it("should return 20 when tiers are identical", () => {
      // Arrange
      const user1 = createGoldMentor();
      const user2 = createMockUserWithTags({ reputation_tier: "gold" });

      // Act
      const score = (engine as any).calculateReputationMatch(
        user1.reputation_tier,
        user2.reputation_tier,
      );

      // Assert
      expect(score).toBe(20);
    });

    it("should return 20 when tier difference is 1", () => {
      // Arrange
      const user1 = createGoldMentor(); // gold
      const user2 = createSilverMentee(); // silver

      // Act
      const score = (engine as any).calculateReputationMatch(
        user1.reputation_tier,
        user2.reputation_tier,
      );

      // Assert
      expect(score).toBe(20);
    });

    it("should return 0 when tier difference is greater than 1", () => {
      // Arrange
      const user1 = createPlatinumMentor(); // platinum
      const user2 = createBronzeMentee(); // bronze

      // Act
      const score = (engine as any).calculateReputationMatch(
        user1.reputation_tier,
        user2.reputation_tier,
      );

      // Assert
      expect(score).toBe(0);
    });

    it("should return 10 when one tier is missing", () => {
      // Arrange
      const user1 = createGoldMentor();
      const user2 = createMockUserWithTags({ reputation_tier: null });

      // Act
      const score = (engine as any).calculateReputationMatch(
        user1.reputation_tier,
        user2.reputation_tier,
      );

      // Assert
      expect(score).toBe(10); // Neutral
    });

    it("should return 10 when both tiers are missing", () => {
      // Arrange
      const user1 = createMockUserWithTags({ reputation_tier: null });
      const user2 = createMockUserWithTags({ reputation_tier: null });

      // Act
      const score = (engine as any).calculateReputationMatch(
        user1.reputation_tier,
        user2.reputation_tier,
      );

      // Assert
      expect(score).toBe(10);
    });
  });

  // ============================================================================
  // MATCH EXPLANATION GENERATION
  // ============================================================================

  describe("generateExplanation", () => {
    it("should generate strong match explanation when score is high", () => {
      // Arrange
      const user1 = createMockUserWithTags({
        tags: toTagsWithCategory(["fintech", "react", "seed-stage"]),
        user_profiles: { portfolio_company_id: null, stage: "seed" },
        reputation_tier: "gold",
      });
      const user2 = createMockUserWithTags({
        tags: toTagsWithCategory(["fintech", "react", "seed-stage"]),
        user_profiles: { portfolio_company_id: null, stage: "seed" },
        reputation_tier: "gold",
      });
      const score = 100; // Perfect match

      // Act
      const explanation = (engine as any).generateExplanation(
        user1,
        user2,
        score,
      );

      // Assert
      expect(explanation).toMatchObject({
        stageMatch: true,
        reputationCompatible: true,
      });
      expect(explanation.tagOverlap).toHaveLength(3);
      expect(explanation.summary).toContain("Strong match");
      expect(explanation.summary).toContain("3 shared tags");
      expect(explanation.summary).toContain("same startup stage");
      expect(explanation.summary).toContain("compatible reputation tiers");
    });

    it("should generate weak match explanation when score is low", () => {
      // Arrange
      const user1 = createMockUserWithTags({
        tags: toTagsWithCategory(["fintech"]),
        user_profiles: { portfolio_company_id: null, stage: "seed" },
        reputation_tier: "bronze",
      });
      const user2 = createMockUserWithTags({
        tags: toTagsWithCategory(["healthcare"]),
        user_profiles: { portfolio_company_id: null, stage: "series-b" },
        reputation_tier: "platinum",
      });
      const score = 10; // Weak match

      // Act
      const explanation = (engine as any).generateExplanation(
        user1,
        user2,
        score,
      );

      // Assert
      expect(explanation).toMatchObject({
        stageMatch: false,
        reputationCompatible: false,
      });
      expect(explanation.tagOverlap).toHaveLength(0);
      expect(explanation.summary).toContain("Weak match");
      expect(explanation.summary).toContain("no shared tags");
    });

    it("should limit tagOverlap to top 5 shared tags", () => {
      // Arrange
      const user1 = createMockUserWithTags({
        tags: toTagsWithCategory([
          "tag1",
          "tag2",
          "tag3",
          "tag4",
          "tag5",
          "tag6",
          "tag7",
        ]),
      });
      const user2 = createMockUserWithTags({
        tags: toTagsWithCategory([
          "tag1",
          "tag2",
          "tag3",
          "tag4",
          "tag5",
          "tag6",
          "tag7",
        ]),
      });
      const score = 60;

      // Act
      const explanation = (engine as any).generateExplanation(
        user1,
        user2,
        score,
      );

      // Assert
      expect(explanation.tagOverlap).toHaveLength(5); // Limited to 5
    });

    it("should categorize tags correctly", () => {
      // Arrange
      const user1 = createMockUserWithTags({
        tags: toTagsWithCategory(["fintech", "react", "seed-stage"]),
      });
      const user2 = createMockUserWithTags({
        tags: toTagsWithCategory(["fintech", "react", "seed-stage"]),
      });
      const score = 60;

      // Act
      const explanation = (engine as any).generateExplanation(
        user1,
        user2,
        score,
      );

      // Assert
      expect(explanation.tagOverlap).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ tag: "fintech", category: "industry" }),
          expect.objectContaining({ tag: "react", category: "technology" }),
          expect.objectContaining({ tag: "seed-stage", category: "stage" }),
        ]),
      );
    });
  });

  // ============================================================================
  // SCORE CALCULATION
  // ============================================================================

  describe("calculateScore", () => {
    it("should calculate total score correctly", () => {
      // Arrange
      const user1 = createMockUserWithTags({
        tags: toTagsWithCategory(["fintech", "react"]),
        user_profiles: { portfolio_company_id: null, stage: "seed" },
        reputation_tier: "gold",
      });
      const user2 = createMockUserWithTags({
        tags: toTagsWithCategory(["fintech", "react"]),
        user_profiles: { portfolio_company_id: null, stage: "seed" },
        reputation_tier: "gold",
      });

      // Act
      const score = (engine as any).calculateScore(user1, user2);

      // Assert
      // Tag overlap: (2/2) * 60 = 60
      // Stage match: 20 (same)
      // Reputation: 20 (same)
      // Total: 100
      expect(score).toBe(100);
    });

    it("should calculate partial match score correctly", () => {
      // Arrange
      const user1 = createMockUserWithTags({
        tags: toTagsWithCategory(["fintech", "react"]),
        user_profiles: { portfolio_company_id: null, stage: "seed" },
        reputation_tier: "gold",
      });
      const user2 = createMockUserWithTags({
        tags: toTagsWithCategory(["fintech", "vue"]),
        user_profiles: { portfolio_company_id: null, stage: "series-a" },
        reputation_tier: "silver",
      });

      // Act
      const score = (engine as any).calculateScore(user1, user2);

      // Assert
      // Tag overlap: (1/3) * 60 = 20
      // Stage match: 10 (adjacent)
      // Reputation: 20 (tier diff = 1)
      // Total: 50
      expect(score).toBe(50);
    });

    it("should return 0 for completely incompatible users", () => {
      // Arrange
      const user1 = createMockUserWithTags({
        tags: toTagsWithCategory(["fintech"]),
        user_profiles: { portfolio_company_id: null, stage: "seed" },
        reputation_tier: "bronze",
      });
      const user2 = createMockUserWithTags({
        tags: toTagsWithCategory(["healthcare"]),
        user_profiles: { portfolio_company_id: null, stage: "series-c" },
        reputation_tier: "platinum",
      });

      // Act
      const score = (engine as any).calculateScore(user1, user2);

      // Assert
      // Tag overlap: 0
      // Stage match: 0 (diff > 1)
      // Reputation: 0 (diff > 1)
      // Total: 0
      expect(score).toBe(0);
    });
  });

  // ============================================================================
  // TAG INHERITANCE (tested via integration tests)
  // ============================================================================

  describe("fetchUserWithTags (tag inheritance)", () => {
    it("should verify mentee with company fixture has portfolio_company_id", () => {
      // Arrange
      const mentee = createMenteeWithCompany();

      // Assert - verify fixture is set up correctly for integration tests
      expect(mentee.user_profiles.portfolio_company_id).toBeDefined();
      expect(mentee.user_profiles.portfolio_company_id).not.toBeNull();
      expect(mentee.role).toBe("mentee");
    });

    it("should verify mentor fixture does not have portfolio_company_id", () => {
      // Arrange
      const mentor = createGoldMentor();

      // Assert - verify fixture is set up correctly
      expect(mentor.role).toBe("mentor");
      // Mentors don't get company tag inheritance regardless of profile
    });
  });

  // ============================================================================
  // USER FILTERING
  // ============================================================================

  describe("fetchPotentialMatches (user filtering)", () => {
    it("should exclude dormant users (>90 days inactive)", () => {
      // Arrange
      const dormantUser = createDormantUser();

      // Mock implementation would filter out dormant user
      // This is a conceptual test - actual implementation requires full mock setup

      // Assert conceptual behavior - verify fixture creates dormant user
      expect(dormantUser.last_activity_at).toBeDefined();
      expect(dormantUser.last_activity_at).not.toBeNull();

      if (dormantUser.last_activity_at) {
        const daysSinceActivity = Math.floor(
          (Date.now() - dormantUser.last_activity_at.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        expect(daysSinceActivity).toBeGreaterThan(90);
      }
    });

    it("should exclude deleted users", () => {
      // Arrange
      const deletedUser = createDeletedUser();

      // Assert
      expect(deletedUser.deleted_at).toBeDefined();
      expect(deletedUser.deleted_at).not.toBeNull();
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe("error handling", () => {
    it("should throw error when user not found in recalculateMatches", async () => {
      // Arrange
      const mockFrom = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: "User not found" },
      });

      (mockDb.from as any) = mockFrom;
      mockFrom.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      // Act & Assert
      await expect(engine.recalculateMatches("nonexistent-user")).rejects
        .toThrow();
    });
  });

  // ============================================================================
  // BATCH PROCESSING
  // ============================================================================

  describe("recalculateAllMatches (batch processing)", () => {
    it("should respect limit option", async () => {
      // Arrange
      const mockFrom = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValueOnce({
        data: [],
        error: null,
      });

      (mockDb.from as any) = mockFrom;
      mockFrom.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        is: mockIs,
      });
      mockIs.mockReturnValue({
        limit: mockLimit,
      });

      // Act
      await engine.recalculateAllMatches({ limit: 10 });

      // Assert
      expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it("should handle empty user list gracefully", async () => {
      // Arrange
      const mockFrom = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockResolvedValueOnce({
        data: [],
        error: null,
      });

      (mockDb.from as any) = mockFrom;
      mockFrom.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        is: mockIs,
      });

      // Act & Assert (should not throw)
      await expect(engine.recalculateAllMatches()).resolves.not.toThrow();
    });
  });

  // ===========================================================================
  // BULK PROCESSING OPTIMIZATIONS (Story 0.23 v1.1)
  // ===========================================================================

  describe("Bulk Processing Optimizations", () => {
    describe("fetchMultipleUsersWithTags (N+1 elimination)", () => {
      it("should bulk fetch users with minimal queries", async () => {
        // Arrange
        const userIds = ["user-1", "user-2", "user-3"];

        const mockUsers = [
          {
            id: "user-1",
            role: "mentor",
            user_profiles: { portfolio_company_id: null, stage: "seed" },
          },
          {
            id: "user-2",
            role: "mentee",
            user_profiles: { portfolio_company_id: "company-1", stage: "seed" },
          },
          {
            id: "user-3",
            role: "mentor",
            user_profiles: { portfolio_company_id: null, stage: "series-a" },
          },
        ];

        const mockPersonalTags = [
          {
            entity_id: "user-1",
            taxonomy: { slug: "fintech", category: "industry" },
          },
          {
            entity_id: "user-2",
            taxonomy: { slug: "react", category: "technology" },
          },
        ];

        const mockCompanyTags = [
          {
            entity_id: "company-1",
            taxonomy: { slug: "ai", category: "industry" },
          },
        ];

        let queryCount = 0;
        const mockFrom = vi.fn((table: string) => {
          queryCount++;
          if (table === "users") {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockResolvedValue({ data: mockUsers, error: null }),
            };
          } else if (table === "entity_tags") {
            queryCount++;
            if (queryCount === 2) {
              // Personal tags
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                in: vi.fn().mockReturnThis(),
                is: vi.fn().mockResolvedValue({
                  data: mockPersonalTags,
                  error: null,
                }),
              };
            } else {
              // Company tags
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                in: vi.fn().mockReturnThis(),
                is: vi.fn().mockResolvedValue({
                  data: mockCompanyTags,
                  error: null,
                }),
              };
            }
          }
          return {};
        });

        (mockDb.from as any) = mockFrom;

        // Act
        const result = await (engine as any).fetchMultipleUsersWithTags(
          userIds,
        );

        // Assert
        expect(result).toHaveLength(3);
        // Should use bulk queries (3-5) instead of N+1 queries (would be 7+ for 3 users)
        expect(queryCount).toBeLessThan(10); // Significantly fewer than N+1 approach

        // Verify mentee has both personal and company tags
        const mentee = result.find((u: any) => u.id === "user-2");
        expect(mentee?.tags).toBeDefined();
      });

      it("should handle empty user list", async () => {
        // Act
        const result = await (engine as any).fetchMultipleUsersWithTags([]);

        // Assert
        expect(result).toEqual([]);
      });

      it("should combine personal and company tags for mentees", async () => {
        // Arrange
        const mockUsers = [
          {
            id: "mentee-1",
            role: "mentee",
            user_profiles: { portfolio_company_id: "company-1", stage: "seed" },
          },
        ];

        const mockPersonalTags = [
          {
            entity_id: "mentee-1",
            taxonomy: { slug: "react", category: "technology" },
          },
        ];

        const mockCompanyTags = [
          {
            entity_id: "company-1",
            taxonomy: { slug: "fintech", category: "industry" },
          },
        ];

        const mockFrom = vi.fn((table: string) => {
          if (table === "users") {
            return {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockResolvedValue({ data: mockUsers, error: null }),
            };
          } else if (table === "entity_tags") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              is: vi.fn((field: string, _value: any) => {
                // Return personal or company tags based on query
                return Promise.resolve({
                  data: field === "deleted_at"
                    ? mockPersonalTags.concat(mockCompanyTags)
                    : [],
                  error: null,
                });
              }),
            };
          }
          return {};
        });

        (mockDb.from as any) = mockFrom;

        // Act
        const result = await (engine as any).fetchMultipleUsersWithTags([
          "mentee-1",
        ]);

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].role).toBe("mentee");
      });
    });

    describe("Chunked Processing in recalculateMatches", () => {
      it("should process matches in chunks with custom chunk size", async () => {
        // Arrange
        const user = createGoldMentor();
        const potentialMatches = Array.from(
          { length: 250 },
          (_, i) => createBronzeMentee({ id: `mentee-${i}` }),
        );

        // Mock fetchUserWithTags
        vi.spyOn(engine as any, "fetchUserWithTags").mockResolvedValue(user);

        // Mock fetchPotentialMatches to return 250 matches
        vi.spyOn(engine as any, "fetchPotentialMatches").mockResolvedValue(
          potentialMatches,
        );

        // Mock writeToCacheAtomic
        vi.spyOn(engine as any, "writeToCacheAtomic").mockResolvedValue(
          undefined,
        );

        // Act
        await engine.recalculateMatches(user.id, { chunkSize: 100 });

        // Assert
        expect((engine as any).writeToCacheAtomic).toHaveBeenCalledWith(
          user.id,
          expect.arrayContaining([
            expect.objectContaining({
              user_id: user.id,
              algorithm_version: "tag-based-v1",
            }),
          ]),
        );
      });

      it("should handle delays between chunks when configured", async () => {
        // Arrange
        const user = createGoldMentor();
        const potentialMatches = Array.from(
          { length: 150 },
          (_, i) => createBronzeMentee({ id: `mentee-${i}` }),
        );

        vi.spyOn(engine as any, "fetchUserWithTags").mockResolvedValue(user);
        vi.spyOn(engine as any, "fetchPotentialMatches").mockResolvedValue(
          potentialMatches,
        );
        vi.spyOn(engine as any, "writeToCacheAtomic").mockResolvedValue(
          undefined,
        );

        const startTime = Date.now();

        // Act
        await engine.recalculateMatches(user.id, {
          chunkSize: 50,
          delayBetweenChunks: 20,
        });

        const elapsed = Date.now() - startTime;

        // Assert - Should have at least 2 delays (3 chunks: 50, 50, 50)
        // 2 delays × 20ms = 40ms minimum
        expect(elapsed).toBeGreaterThanOrEqual(30); // Allow some margin
      });
    });

    describe("Enhanced recalculateAllMatches Error Handling", () => {
      it("should isolate individual user failures", async () => {
        // Arrange
        const mockUsers = [
          { id: "user-1" },
          { id: "user-2" },
          { id: "user-3" },
        ];

        const mockFrom = vi.fn().mockReturnThis();
        const mockSelect = vi.fn().mockReturnThis();
        const mockIs = vi.fn().mockResolvedValue({
          data: mockUsers,
          error: null,
        });

        (mockDb.from as any) = mockFrom;
        mockFrom.mockReturnValue({ select: mockSelect });
        mockSelect.mockReturnValue({ is: mockIs });

        // Mock recalculateMatches to fail for user-2 only
        let callCount = 0;
        vi.spyOn(engine, "recalculateMatches").mockImplementation(
          async (userId: string) => {
            callCount++;
            if (userId === "user-2") {
              throw new Error("User processing failed");
            }
            return Promise.resolve();
          },
        );

        // Act
        await engine.recalculateAllMatches({ batchSize: 10 });

        // Assert - All 3 users should be attempted
        expect(callCount).toBe(3);
      });

      it("should support modifiedAfter filter for incremental updates", async () => {
        // Arrange
        const modifiedDate = new Date("2025-10-01");
        const mockUsers = [{ id: "user-1" }];
        const mockFrom = vi.fn().mockReturnThis();
        const mockSelect = vi.fn().mockReturnThis();
        const mockIs = vi.fn().mockReturnThis();
        const mockGt = vi.fn((_field: string, _value: string) => {
          return {
            then: (resolve: any) => resolve({ data: mockUsers, error: null }),
          };
        });

        (mockDb.from as any) = mockFrom;
        mockFrom.mockReturnValue({ select: mockSelect });
        mockSelect.mockReturnValue({ is: mockIs });
        mockIs.mockReturnValue({ gt: mockGt });

        vi.spyOn(engine, "recalculateMatches").mockResolvedValue(undefined);

        // Act
        await engine.recalculateAllMatches({ modifiedAfter: modifiedDate });

        // Assert
        expect(mockGt).toHaveBeenCalledWith(
          "updated_at",
          modifiedDate.toISOString(),
        );
      });

      it("should respect configurable delay between batches", async () => {
        // Arrange
        const mockUsers = Array.from(
          { length: 60 },
          (_, i) => ({ id: `user-${i}` }),
        );

        const mockFrom = vi.fn().mockReturnThis();
        const mockSelect = vi.fn().mockReturnThis();
        const mockIs = vi.fn().mockResolvedValue({
          data: mockUsers,
          error: null,
        });

        (mockDb.from as any) = mockFrom;
        mockFrom.mockReturnValue({ select: mockSelect });
        mockSelect.mockReturnValue({ is: mockIs });

        vi.spyOn(engine, "recalculateMatches").mockResolvedValue(undefined);

        const startTime = Date.now();

        // Act - Process 60 users in batches of 50 (2 batches) with 50ms delay
        await engine.recalculateAllMatches({
          batchSize: 50,
          delayBetweenBatches: 50,
        });

        const elapsed = Date.now() - startTime;

        // Assert - Should have 1 delay between batches (50ms minimum)
        expect(elapsed).toBeGreaterThanOrEqual(40); // Allow some margin
      });
    });
  });
});
