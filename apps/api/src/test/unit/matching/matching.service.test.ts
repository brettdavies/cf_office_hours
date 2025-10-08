/**
 * MatchingService Unit Tests
 *
 * Tests retrieval logic for pre-calculated match recommendations.
 * Uses centralized fixtures from @/test/fixtures/matching (Section 14.11.2).
 */

// External dependencies
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Internal modules
import { MatchingService } from '../../../services/matching.service';
import { createMockMatchExplanation, createMockUser } from '../../../test/fixtures/matching';

// Types
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a mock Supabase client with chainable query builder
 */
const createMockSupabaseClient = () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  };

  const mockDb = {
    from: vi.fn().mockReturnValue(mockQuery),
  } as unknown as SupabaseClient;

  return { mockDb, mockQuery };
};

describe('MatchingService', () => {
  let service: MatchingService;
  let mockDb: SupabaseClient;
  let mockQuery: any;

  beforeEach(() => {
    const mocks = createMockSupabaseClient();
    mockDb = mocks.mockDb;
    mockQuery = mocks.mockQuery;
    service = new MatchingService(mockDb);
    vi.clearAllMocks();
  });

  describe('getRecommendedMentors', () => {
    it('should return sorted matches from cache', async () => {
      const userId = 'mentee-123';
      const mockUser1 = createMockUser({ id: 'mentor-1', role: 'mentor' });
      const mockUser2 = createMockUser({ id: 'mentor-2', role: 'mentor' });
      const mockUser3 = createMockUser({ id: 'mentor-3', role: 'mentor' });

      const mockMatches = [
        {
          match_score: 85,
          match_explanation: createMockMatchExplanation(),
          recommended_user: {
            ...mockUser1,
            profile: {
              id: 'profile-1',
              user_id: mockUser1.id,
              name: 'Mentor One',
              title: 'Senior Engineer',
              company: 'Tech Co',
              bio: 'Experienced mentor',
              created_at: mockUser1.created_at.toISOString(),
              updated_at: mockUser1.updated_at.toISOString(),
            },
          },
        },
        {
          match_score: 72,
          match_explanation: createMockMatchExplanation(),
          recommended_user: {
            ...mockUser2,
            profile: {
              id: 'profile-2',
              user_id: mockUser2.id,
              name: 'Mentor Two',
              title: 'Lead Developer',
              company: 'Startup Inc',
              bio: 'Helpful mentor',
              created_at: mockUser2.created_at.toISOString(),
              updated_at: mockUser2.updated_at.toISOString(),
            },
          },
        },
        {
          match_score: 91,
          match_explanation: createMockMatchExplanation(),
          recommended_user: {
            ...mockUser3,
            profile: {
              id: 'profile-3',
              user_id: mockUser3.id,
              name: 'Mentor Three',
              title: 'CTO',
              company: 'Big Corp',
              bio: 'Great mentor',
              created_at: mockUser3.created_at.toISOString(),
              updated_at: mockUser3.updated_at.toISOString(),
            },
          },
        },
      ];

      // Mock the query chain to return data
      mockQuery.maybeSingle.mockResolvedValue({
        data: mockMatches,
        error: null,
      });
      // For the main query (not using maybeSingle), mock the final result
      vi.mocked(mockDb.from).mockReturnValue({
        ...mockQuery,
        then: async (resolve: any) => resolve({ data: mockMatches, error: null }),
      } as any);

      const results = await service.getRecommendedMentors(userId);

      expect(results).toHaveLength(3);
      expect(results[0].score).toBe(85);
      expect(results[1].score).toBe(72);
      expect(results[2].score).toBe(91);
      expect(results[0].user.id).toBe('mentor-1');
      expect(mockDb.from).toHaveBeenCalledWith('user_match_cache');
    });

    it('should respect limit option', async () => {
      const userId = 'mentee-123';

      // Mock empty response
      vi.mocked(mockDb.from).mockReturnValue({
        ...mockQuery,
        then: async (resolve: any) => resolve({ data: [], error: null }),
      } as any);

      await service.getRecommendedMentors(userId, { limit: 10 });

      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it('should cap limit at 20', async () => {
      const userId = 'mentee-123';

      vi.mocked(mockDb.from).mockReturnValue({
        ...mockQuery,
        then: async (resolve: any) => resolve({ data: [], error: null }),
      } as any);

      await service.getRecommendedMentors(userId, { limit: 50 });

      // Should cap at 20
      expect(mockQuery.limit).toHaveBeenCalledWith(20);
    });

    it('should respect minScore filter', async () => {
      const userId = 'mentee-123';

      vi.mocked(mockDb.from).mockReturnValue({
        ...mockQuery,
        then: async (resolve: any) => resolve({ data: [], error: null }),
      } as any);

      await service.getRecommendedMentors(userId, { minScore: 75 });

      expect(mockQuery.gte).toHaveBeenCalledWith('match_score', 75);
    });

    it('should respect algorithmVersion filter', async () => {
      const userId = 'mentee-123';

      vi.mocked(mockDb.from).mockReturnValue({
        ...mockQuery,
        then: async (resolve: any) => resolve({ data: [], error: null }),
      } as any);

      await service.getRecommendedMentors(userId, {
        algorithmVersion: 'ml-v2',
      });

      expect(mockQuery.eq).toHaveBeenCalledWith('algorithm_version', 'ml-v2');
    });

    it('should return empty array if no matches found', async () => {
      const userId = 'mentee-123';

      vi.mocked(mockDb.from).mockReturnValue({
        ...mockQuery,
        then: async (resolve: any) => resolve({ data: [], error: null }),
      } as any);

      const results = await service.getRecommendedMentors(userId);

      expect(results).toEqual([]);
    });

    it('should throw error on database failure', async () => {
      const userId = 'mentee-123';

      vi.mocked(mockDb.from).mockReturnValue({
        ...mockQuery,
        then: async (resolve: any) =>
          resolve({
            data: null,
            error: { message: 'Database connection failed' },
          }),
      } as any);

      await expect(service.getRecommendedMentors(userId)).rejects.toThrow(
        'Failed to fetch matches'
      );
    });
  });

  describe('getRecommendedMentees', () => {
    it('should return sorted matches from cache', async () => {
      const userId = 'mentor-123';
      const mockUser1 = createMockUser({ id: 'mentee-1', role: 'mentee' });

      const mockMatches = [
        {
          match_score: 80,
          match_explanation: createMockMatchExplanation(),
          recommended_user: {
            ...mockUser1,
            profile: {
              id: 'profile-1',
              user_id: mockUser1.id,
              name: 'Mentee One',
              title: 'Junior Dev',
              company: 'Startup',
              bio: 'Eager to learn',
              created_at: mockUser1.created_at.toISOString(),
              updated_at: mockUser1.updated_at.toISOString(),
            },
          },
        },
      ];

      vi.mocked(mockDb.from).mockReturnValue({
        ...mockQuery,
        then: async (resolve: any) => resolve({ data: mockMatches, error: null }),
      } as any);

      const results = await service.getRecommendedMentees(userId);

      expect(results).toHaveLength(1);
      expect(results[0].score).toBe(80);
      expect(results[0].user.role).toBe('mentee');
    });

    it('should use correct algorithm version default', async () => {
      const userId = 'mentor-123';

      vi.mocked(mockDb.from).mockReturnValue({
        ...mockQuery,
        then: async (resolve: any) => resolve({ data: [], error: null }),
      } as any);

      await service.getRecommendedMentees(userId);

      expect(mockQuery.eq).toHaveBeenCalledWith('algorithm_version', 'tag-based-v1');
    });
  });

  describe('explainMatch', () => {
    it('should return explanation for cached match (user1 → user2)', async () => {
      const userId1 = 'mentee-123';
      const userId2 = 'mentor-456';
      const mockExplanation = createMockMatchExplanation({
        summary: 'Strong match: 5 shared tags, same startup stage, compatible reputation tiers',
      });

      mockQuery.maybeSingle.mockResolvedValue({
        data: { match_explanation: mockExplanation, match_score: 85 },
        error: null,
      });

      const result = await service.explainMatch(userId1, userId2);

      expect(result).toEqual(mockExplanation);
      expect(mockQuery.or).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('algorithm_version', 'tag-based-v1');
    });

    it('should return null if no cached match found', async () => {
      const userId1 = 'mentee-123';
      const userId2 = 'mentor-456';

      mockQuery.maybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await service.explainMatch(userId1, userId2);

      expect(result).toBeNull();
    });

    it('should handle bidirectional lookup', async () => {
      const userId1 = 'mentor-456';
      const userId2 = 'mentee-123';
      const mockExplanation = createMockMatchExplanation();

      mockQuery.maybeSingle.mockResolvedValue({
        data: { match_explanation: mockExplanation, match_score: 85 },
        error: null,
      });

      const result = await service.explainMatch(userId1, userId2);

      expect(result).toEqual(mockExplanation);
      // Should use OR query for bidirectional lookup
      expect(mockQuery.or).toHaveBeenCalledWith(expect.stringContaining('user_id.eq.'));
    });

    it('should throw error on database failure', async () => {
      const userId1 = 'mentee-123';
      const userId2 = 'mentor-456';

      mockQuery.maybeSingle.mockResolvedValue({
        data: null,
        error: { message: 'Connection timeout' },
      });

      await expect(service.explainMatch(userId1, userId2)).rejects.toThrow(
        'Failed to fetch match explanation'
      );
    });

    it('should respect custom algorithm version', async () => {
      const userId1 = 'mentee-123';
      const userId2 = 'mentor-456';

      mockQuery.maybeSingle.mockResolvedValue({ data: null, error: null });

      await service.explainMatch(userId1, userId2, 'ml-v2');

      expect(mockQuery.eq).toHaveBeenCalledWith('algorithm_version', 'ml-v2');
    });
  });
});
