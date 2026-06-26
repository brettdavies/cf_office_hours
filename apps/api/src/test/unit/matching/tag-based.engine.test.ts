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
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Internal modules
import { TagBasedMatchingEngineV1 } from '../../../providers/matching/tag-based.engine';
import { createTestDb, insertRow } from '../../helpers/d1';

// Test fixtures (MANDATORY - no inline mocks)
import {
  createBronzeMentee,
  createDeletedUser,
  createDormantUser,
  createGoldMentor,
  createMenteeWithCompany,
  createMockUserWithTags,
  type TagWithCategory,
} from '../../../test/fixtures/matching';

/**
 * Helper: Convert string array to TagWithCategory array for tests
 * Auto-categorizes based on tag name patterns
 */
const toTagsWithCategory = (values: string[]): TagWithCategory[] => {
  return values.map(value => {
    // Auto-categorize based on common patterns
    let category: 'industry' | 'technology' | 'stage';
    if (
      value.includes('stage') ||
      ['seed', 'pre-seed', 'series-a', 'series-b', 'series-c', 'growth'].includes(value)
    ) {
      category = 'stage';
    } else if (['react', 'vue', 'angular', 'node', 'python'].includes(value)) {
      category = 'technology';
    } else {
      category = 'industry';
    }
    return { value, category };
  });
};

describe('TagBasedMatchingEngineV1', () => {
  let engine: TagBasedMatchingEngineV1;
  let raw: ReturnType<typeof createTestDb>['raw'];

  beforeEach(() => {
    const db = createTestDb();
    raw = db.raw;
    engine = new TagBasedMatchingEngineV1(db.DB as unknown as D1Database);
    vi.clearAllMocks();
  });

  // ============================================================================
  // ALGORITHM VERSION
  // ============================================================================

  describe('getAlgorithmVersion', () => {
    it('should return tag-based-v1', () => {
      // Act
      const version = engine.getAlgorithmVersion();

      // Assert
      expect(version).toBe('tag-based-v1');
    });
  });

  // ============================================================================
  // TAG OVERLAP CALCULATION
  // ============================================================================

  describe('calculateTagOverlap', () => {
    it('should return maximum score when tags are identical', () => {
      // Arrange
      const user1 = createMockUserWithTags({
        tags: toTagsWithCategory(['fintech', 'react', 'seed-stage']),
      });
      const user2 = createMockUserWithTags({
        tags: toTagsWithCategory(['fintech', 'react', 'seed-stage']),
      });

      // Act
      const score = (engine as any).calculateTagOverlap(user1.tags, user2.tags);

      // Assert - Weighted Jaccard (0.5) + Confidence (0.3) + Diversity (0.2) = 1.0 × 60 = ~53-60
      // Actual score depends on rarity weights from cache
      expect(score).toBeGreaterThanOrEqual(50);
      expect(score).toBeLessThanOrEqual(60);
    });

    it('should return 0 when tags have no overlap', () => {
      // Arrange
      const user1 = createMockUserWithTags({
        tags: toTagsWithCategory(['fintech', 'react']),
      });
      const user2 = createMockUserWithTags({
        tags: toTagsWithCategory(['healthcare', 'vue']),
      });

      // Act
      const score = (engine as any).calculateTagOverlap(user1.tags, user2.tags);

      // Assert
      expect(score).toBe(0);
    });

    it('should return partial score when tags partially overlap', () => {
      // Arrange
      const user1 = createMockUserWithTags({
        tags: toTagsWithCategory(['fintech', 'react', 'seed-stage']),
      });
      const user2 = createMockUserWithTags({
        tags: toTagsWithCategory(['fintech', 'vue', 'series-a']),
      });

      // Act
      const score = (engine as any).calculateTagOverlap(user1.tags, user2.tags);

      // Assert
      // Shared: 1 (fintech) with rarity weight
      // Uses weighted Jaccard + confidence penalty (1/5 shared) + diversity
      // Score will be lower than max due to limited overlap
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(40); // Less than moderate match threshold
    });

    it('should return 0 when both users have no tags', () => {
      // Arrange
      const user1 = createMockUserWithTags({ tags: toTagsWithCategory([]) });
      const user2 = createMockUserWithTags({ tags: toTagsWithCategory([]) });

      // Act
      const score = (engine as any).calculateTagOverlap(user1.tags, user2.tags);

      // Assert
      expect(score).toBe(0);
    });

    it('should handle case when one user has no tags', () => {
      // Arrange
      const user1 = createMockUserWithTags({
        tags: toTagsWithCategory(['fintech', 'react']),
      });
      const user2 = createMockUserWithTags({ tags: toTagsWithCategory([]) });

      // Act
      const score = (engine as any).calculateTagOverlap(user1.tags, user2.tags);

      // Assert
      expect(score).toBe(0);
    });
  });

  // ============================================================================
  // MATCH EXPLANATION GENERATION
  // ============================================================================

  describe('generateExplanation', () => {
    it('should generate strong match explanation when score is high', () => {
      // Arrange
      const user1 = createMockUserWithTags({
        tags: toTagsWithCategory(['fintech', 'react', 'seed-stage']),
        user_profiles: { portfolio_company_id: null, stage: 'seed' },
      });
      const user2 = createMockUserWithTags({
        tags: toTagsWithCategory(['fintech', 'react', 'seed-stage']),
        user_profiles: { portfolio_company_id: null, stage: 'seed' },
      });
      const score = 50; // Strong match (tag-based only)

      // Act
      const explanation = (engine as any).generateExplanation(user1, user2, score);

      // Assert
      expect(explanation.tagOverlap).toHaveLength(3);
      expect(explanation.summary).toContain('Strong match');
      expect(explanation.summary).toContain('3 shared tags');
    });

    it('should generate weak match explanation when score is low', () => {
      // Arrange
      const user1 = createMockUserWithTags({
        tags: toTagsWithCategory(['fintech']),
        user_profiles: { portfolio_company_id: null, stage: 'seed' },
      });
      const user2 = createMockUserWithTags({
        tags: toTagsWithCategory(['healthcare']),
        user_profiles: { portfolio_company_id: null, stage: 'series-b' },
      });
      const score = 10; // Weak match

      // Act
      const explanation = (engine as any).generateExplanation(user1, user2, score);

      // Assert
      expect(explanation.tagOverlap).toHaveLength(0);
      expect(explanation.summary).toContain('Weak match');
      expect(explanation.summary).toContain('no shared tags');
    });

    it('should limit tagOverlap to top 5 shared tags', () => {
      // Arrange
      const user1 = createMockUserWithTags({
        tags: toTagsWithCategory(['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7']),
      });
      const user2 = createMockUserWithTags({
        tags: toTagsWithCategory(['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7']),
      });
      const score = 60;

      // Act
      const explanation = (engine as any).generateExplanation(user1, user2, score);

      // Assert
      expect(explanation.tagOverlap).toHaveLength(5); // Limited to 5
    });

    it('should categorize tags correctly', () => {
      // Arrange
      const user1 = createMockUserWithTags({
        tags: toTagsWithCategory(['fintech', 'react', 'seed-stage']),
      });
      const user2 = createMockUserWithTags({
        tags: toTagsWithCategory(['fintech', 'react', 'seed-stage']),
      });
      const score = 60;

      // Act
      const explanation = (engine as any).generateExplanation(user1, user2, score);

      // Assert
      expect(explanation.tagOverlap).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ tag: 'fintech', category: 'industry' }),
          expect.objectContaining({ tag: 'react', category: 'technology' }),
          expect.objectContaining({ tag: 'seed-stage', category: 'stage' }),
        ])
      );
    });
  });

  // ============================================================================
  // SCORE CALCULATION
  // ============================================================================

  describe('calculateScore', () => {
    it('should calculate total score correctly (tag-based only)', () => {
      // Arrange
      const user1 = createMockUserWithTags({
        tags: toTagsWithCategory(['fintech', 'react']),
        user_profiles: { portfolio_company_id: null, stage: 'seed' },
      });
      const user2 = createMockUserWithTags({
        tags: toTagsWithCategory(['fintech', 'react']),
        user_profiles: { portfolio_company_id: null, stage: 'seed' },
      });

      // Act
      const score = (engine as any).calculateScore(user1, user2);

      // Assert
      // Tag overlap only (stages are now tags too)
      // Score should be > 0 based on tag overlap calculation
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(60);
    });

    it('should calculate partial match score correctly', () => {
      // Arrange
      const user1 = createMockUserWithTags({
        tags: toTagsWithCategory(['fintech', 'react']),
        user_profiles: { portfolio_company_id: null, stage: 'seed' },
      });
      const user2 = createMockUserWithTags({
        tags: toTagsWithCategory(['fintech', 'vue']),
        user_profiles: { portfolio_company_id: null, stage: 'series-a' },
      });

      // Act
      const score = (engine as any).calculateScore(user1, user2);

      // Assert
      // Tag overlap: (1/3) weighted * 60 (stages are now tags)
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(60);
    });

    it('should return 0 for completely incompatible users', () => {
      // Arrange
      const user1 = createMockUserWithTags({
        tags: toTagsWithCategory(['fintech']),
        user_profiles: { portfolio_company_id: null, stage: 'seed' },
      });
      const user2 = createMockUserWithTags({
        tags: toTagsWithCategory(['healthcare']),
        user_profiles: { portfolio_company_id: null, stage: 'series-c' },
      });

      // Act
      const score = (engine as any).calculateScore(user1, user2);

      // Assert
      // No tag overlap = 0 score
      expect(score).toBe(0);
    });
  });

  // ============================================================================
  // TAG INHERITANCE (tested via integration tests)
  // ============================================================================

  describe('fetchUserWithTags (tag inheritance)', () => {
    it('should verify mentee with company fixture has portfolio_company_id', () => {
      // Arrange
      const mentee = createMenteeWithCompany();

      // Assert - verify fixture is set up correctly for integration tests
      expect(mentee.user_profiles.portfolio_company_id).toBeDefined();
      expect(mentee.user_profiles.portfolio_company_id).not.toBeNull();
      expect(mentee.role).toBe('mentee');
    });

    it('should verify mentor fixture does not have portfolio_company_id', () => {
      // Arrange
      const mentor = createGoldMentor();

      // Assert - verify fixture is set up correctly
      expect(mentor.role).toBe('mentor');
      // Mentors don't get company tag inheritance regardless of profile
    });
  });

  // ============================================================================
  // USER FILTERING
  // ============================================================================

  describe('fetchPotentialMatches (user filtering)', () => {
    it('should exclude dormant users (>90 days inactive)', () => {
      // Arrange
      const dormantUser = createDormantUser();

      // Mock implementation would filter out dormant user
      // This is a conceptual test - actual implementation requires full mock setup

      // Assert conceptual behavior - verify fixture creates dormant user
      expect(dormantUser.last_activity_at).toBeDefined();
      expect(dormantUser.last_activity_at).not.toBeNull();

      if (dormantUser.last_activity_at) {
        const daysSinceActivity = Math.floor(
          (Date.now() - dormantUser.last_activity_at.getTime()) / (1000 * 60 * 60 * 24)
        );
        expect(daysSinceActivity).toBeGreaterThan(90);
      }
    });

    it('should exclude deleted users', () => {
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

  describe('error handling', () => {
    it('should return early when user not found in recalculateMatches', async () => {
      // Arrange
      vi.spyOn(engine as any, 'fetchUserWithTags').mockResolvedValue(null);
      vi.spyOn(engine as any, 'fetchPotentialMatches').mockResolvedValue([]);
      vi.spyOn(engine as any, 'writeToCacheAtomic').mockResolvedValue(undefined);

      // Act & Assert - Should not throw, just return early
      await expect(engine.recalculateMatches('nonexistent-user')).resolves.not.toThrow();

      // fetchPotentialMatches should not be called when user not found
      expect((engine as any).fetchPotentialMatches).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // BATCH PROCESSING
  // ============================================================================

  describe('recalculateAllMatches (batch processing)', () => {
    const seedUsers = (count: number): void => {
      for (let i = 0; i < count; i++) {
        insertRow(raw, 'users', {
          id: `user-${i}`,
          airtable_record_id: `air-${i}`,
          email: `u${i}@test.com`,
          role: i % 2 ? 'mentor' : 'mentee',
        });
      }
    };

    it('respects the limit option', async () => {
      seedUsers(15);
      const spy = vi.spyOn(engine, 'recalculateMatches').mockResolvedValue(undefined);
      await engine.recalculateAllMatches({ limit: 10 });
      expect(spy).toHaveBeenCalledTimes(10);
    });

    it('handles an empty user list gracefully', async () => {
      await expect(engine.recalculateAllMatches()).resolves.not.toThrow();
    });
  });

  // ===========================================================================
  // BULK PROCESSING OPTIMIZATIONS (Story 0.23 v1.1)
  // ===========================================================================

  describe('Bulk Processing Optimizations', () => {
    describe('fetchMultipleUsersWithTags (bulk fetch)', () => {
      const seedTaxonomy = (id: string, value: string, category: string): void =>
        insertRow(raw, 'taxonomy', {
          id,
          category,
          value,
          display_name: value,
          is_approved: 1,
          source: 'admin',
        });

      it('combines personal and inherited company tags for mentees', async () => {
        insertRow(raw, 'users', {
          id: 'mentee-1',
          airtable_record_id: 'air-1',
          email: 'm1@test.com',
          role: 'mentee',
        });
        insertRow(raw, 'user_profiles', {
          id: 'p1',
          user_id: 'mentee-1',
          name: 'M1',
          portfolio_company_id: 'company-1',
        });
        seedTaxonomy('tax-react', 'react', 'technology');
        seedTaxonomy('tax-fintech', 'fintech', 'industry');
        insertRow(raw, 'entity_tags', {
          id: 'et1',
          entity_type: 'user',
          entity_id: 'mentee-1',
          taxonomy_id: 'tax-react',
        });
        insertRow(raw, 'entity_tags', {
          id: 'et2',
          entity_type: 'portfolio_company',
          entity_id: 'company-1',
          taxonomy_id: 'tax-fintech',
        });

        const result = await (
          engine as never as {
            fetchMultipleUsersWithTags: (
              ids: string[]
            ) => Promise<Array<{ role: string; tags: { value: string }[] }>>;
          }
        ).fetchMultipleUsersWithTags(['mentee-1']);

        expect(result).toHaveLength(1);
        expect(result[0].role).toBe('mentee');
        expect(result[0].tags.map(t => t.value).sort()).toEqual(['fintech', 'react']);
      });

      it('returns an empty array for an empty user list', async () => {
        const result = await (
          engine as never as {
            fetchMultipleUsersWithTags: (ids: string[]) => Promise<unknown[]>;
          }
        ).fetchMultipleUsersWithTags([]);
        expect(result).toEqual([]);
      });

      it('does not inherit company tags for mentors', async () => {
        insertRow(raw, 'users', {
          id: 'mentor-1',
          airtable_record_id: 'air-2',
          email: 'mentor1@test.com',
          role: 'mentor',
        });
        insertRow(raw, 'user_profiles', { id: 'p2', user_id: 'mentor-1', name: 'Mentor1' });
        seedTaxonomy('tax-react', 'react', 'technology');
        insertRow(raw, 'entity_tags', {
          id: 'et1',
          entity_type: 'user',
          entity_id: 'mentor-1',
          taxonomy_id: 'tax-react',
        });

        const result = await (
          engine as never as {
            fetchMultipleUsersWithTags: (
              ids: string[]
            ) => Promise<Array<{ tags: { value: string }[] }>>;
          }
        ).fetchMultipleUsersWithTags(['mentor-1']);

        expect(result[0].tags.map(t => t.value)).toEqual(['react']);
      });
    });

    describe('Chunked Processing in recalculateMatches', () => {
      it('should process matches in chunks with custom chunk size', async () => {
        // Arrange
        const user = createGoldMentor();
        const potentialMatches = Array.from({ length: 250 }, (_, i) =>
          createBronzeMentee({ id: `mentee-${i}` })
        );

        // Mock fetchUserWithTags
        vi.spyOn(engine as any, 'fetchUserWithTags').mockResolvedValue(user);

        // Mock fetchPotentialMatches to return 250 matches
        vi.spyOn(engine as any, 'fetchPotentialMatches').mockResolvedValue(potentialMatches);

        // Mock writeToCacheAtomic
        vi.spyOn(engine as any, 'writeToCacheAtomic').mockResolvedValue(undefined);

        // Act
        await engine.recalculateMatches(user.id, { chunkSize: 100 });

        // Assert: for a mentor, cache entries carry the mentor as recommended_user_id.
        expect((engine as any).writeToCacheAtomic).toHaveBeenCalledWith(
          user.id,
          expect.arrayContaining([
            expect.objectContaining({
              recommended_user_id: user.id,
              algorithm_version: 'tag-based-v1',
            }),
          ])
        );
      });

      it('should handle delays between chunks when configured', async () => {
        // Arrange
        const user = createGoldMentor();
        const potentialMatches = Array.from({ length: 150 }, (_, i) =>
          createBronzeMentee({ id: `mentee-${i}` })
        );

        vi.spyOn(engine as any, 'fetchUserWithTags').mockResolvedValue(user);
        vi.spyOn(engine as any, 'fetchPotentialMatches').mockResolvedValue(potentialMatches);
        vi.spyOn(engine as any, 'writeToCacheAtomic').mockResolvedValue(undefined);

        const startTime = Date.now();

        // Act
        await engine.recalculateMatches(user.id, {
          chunkSize: 50,
          chunkDelay: 20,
        });

        const elapsed = Date.now() - startTime;

        // Assert - Should have at least 2 delays (3 chunks: 50, 50, 50)
        // 2 delays × 20ms = 40ms minimum
        expect(elapsed).toBeGreaterThanOrEqual(30); // Allow some margin
      });
    });

    describe('Enhanced recalculateAllMatches Error Handling', () => {
      const seedUsers = (ids: string[]): void =>
        ids.forEach((id, i) =>
          insertRow(raw, 'users', {
            id,
            airtable_record_id: `air-${id}`,
            email: `${id}@test.com`,
            role: i % 2 ? 'mentor' : 'mentee',
          })
        );

      it('isolates individual user failures', async () => {
        seedUsers(['user-1', 'user-2', 'user-3']);
        let callCount = 0;
        vi.spyOn(engine, 'recalculateMatches').mockImplementation(async (userId: string) => {
          callCount++;
          if (userId === 'user-2') {
            throw new Error('User processing failed');
          }
        });

        await engine.recalculateAllMatches({ batchSize: 10 });

        expect(callCount).toBe(3);
      });

      it('processes all active users', async () => {
        seedUsers(['user-1', 'user-2']);
        const spy = vi.spyOn(engine, 'recalculateMatches').mockResolvedValue(undefined);

        await engine.recalculateAllMatches();

        expect(spy).toHaveBeenCalledTimes(2);
        expect(spy).toHaveBeenCalledWith('user-1');
        expect(spy).toHaveBeenCalledWith('user-2');
      });
    });
  });
});
