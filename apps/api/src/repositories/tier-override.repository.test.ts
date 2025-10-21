/**
 * Tier Override Repository Tests
 *
 * Tests data access layer for tier override requests.
 * Covers query building, match score enrichment, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TierOverrideRepository } from './tier-override.repository';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client
const createMockSupabaseClient = () => {
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockIn = vi.fn();
  const mockOrder = vi.fn();
  const mockFrom = vi.fn();

  // Chain methods
  mockFrom.mockReturnValue({
    select: mockSelect,
  });

  mockSelect.mockReturnValue({
    eq: mockEq,
    in: mockIn,
  });

  mockEq.mockReturnValue({
    order: mockOrder,
    eq: mockEq,
    in: mockIn,
  });

  mockIn.mockReturnValue({
    in: mockIn,
    eq: mockEq,
  });

  mockOrder.mockReturnValue({
    data: null,
    error: null,
  });

  return {
    from: mockFrom,
    _mockSelect: mockSelect,
    _mockEq: mockEq,
    _mockIn: mockIn,
    _mockOrder: mockOrder,
  };
};

describe('TierOverrideRepository', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let repository: TierOverrideRepository;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    // @ts-expect-error - Mocking Supabase client
    repository = new TierOverrideRepository({ SUPABASE: mockSupabase });
  });

  describe('getPendingWithUsers', () => {
    it('should fetch pending requests with user profiles', async () => {
      const mockRequests = [
        {
          id: 'req-1',
          mentee_id: 'mentee-1',
          mentor_id: 'mentor-1',
          status: 'pending',
          reason: 'Need help',
          created_at: '2025-01-01T00:00:00Z',
          expires_at: '2025-01-08T00:00:00Z',
          mentee: {
            id: 'mentee-1',
            email: 'mentee@test.com',
            role: 'mentee',
            reputation_tier: 'bronze',
            profile: [{
              id: 'profile-1',
              user_id: 'mentee-1',
              name: 'Mentee Test',
              title: 'Founder',
              company: 'TestCo',
              bio: 'Test bio',
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z',
            }],
          },
          mentor: {
            id: 'mentor-1',
            email: 'mentor@test.com',
            role: 'mentor',
            reputation_tier: 'platinum',
            profile: [{
              id: 'profile-2',
              user_id: 'mentor-1',
              name: 'Mentor Test',
              title: 'Advisor',
              company: 'AdviceCo',
              bio: 'Test bio',
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z',
            }],
          },
        },
      ];

      const mockMatchScores = [
        {
          user_id: 'mentee-1',
          recommended_user_id: 'mentor-1',
          match_score: 85.5,
        },
      ];

      // Setup mock responses
      mockSupabase._mockOrder.mockResolvedValueOnce({
        data: mockRequests,
        error: null,
      });

      mockSupabase._mockEq.mockResolvedValueOnce({
        data: mockMatchScores,
        error: null,
      });

      const result = await repository.getPendingWithUsers();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('req-1');
      expect(result[0].mentee.profile.name).toBe('Mentee Test');
      expect(result[0].mentor.profile.name).toBe('Mentor Test');
      expect(result[0].match_score).toBe(85.5);
      expect(mockSupabase.from).toHaveBeenCalledWith('tier_override_requests');
    });

    it('should handle missing match scores gracefully', async () => {
      const mockRequests = [
        {
          id: 'req-1',
          mentee_id: 'mentee-1',
          mentor_id: 'mentor-1',
          mentee: {
            id: 'mentee-1',
            profile: [{ name: 'Test' }],
          },
          mentor: {
            id: 'mentor-1',
            profile: [{ name: 'Test' }],
          },
        },
      ];

      mockSupabase._mockOrder.mockResolvedValueOnce({
        data: mockRequests,
        error: null,
      });

      mockSupabase._mockEq.mockResolvedValueOnce({
        data: [], // No match scores
        error: null,
      });

      const result = await repository.getPendingWithUsers();

      expect(result).toHaveLength(1);
      expect(result[0].match_score).toBeNull();
    });

    it('should handle empty results', async () => {
      mockSupabase._mockOrder.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await repository.getPendingWithUsers();

      expect(result).toEqual([]);
    });

    it('should throw error when database query fails', async () => {
      mockSupabase._mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error', code: '500' },
      });

      await expect(repository.getPendingWithUsers()).rejects.toThrow(
        'Failed to fetch tier override requests',
      );
    });

    it('should fetch match scores in single query (no N+1)', async () => {
      const mockRequests = [
        {
          id: 'req-1',
          mentee_id: 'mentee-1',
          mentor_id: 'mentor-1',
          mentee: { id: 'mentee-1', profile: [{ name: 'Test1' }] },
          mentor: { id: 'mentor-1', profile: [{ name: 'Test1' }] },
        },
        {
          id: 'req-2',
          mentee_id: 'mentee-2',
          mentor_id: 'mentor-2',
          mentee: { id: 'mentee-2', profile: [{ name: 'Test2' }] },
          mentor: { id: 'mentor-2', profile: [{ name: 'Test2' }] },
        },
      ];

      mockSupabase._mockOrder.mockResolvedValueOnce({
        data: mockRequests,
        error: null,
      });

      mockSupabase._mockEq.mockResolvedValueOnce({
        data: [
          { user_id: 'mentee-1', recommended_user_id: 'mentor-1', match_score: 80 },
          { user_id: 'mentee-2', recommended_user_id: 'mentor-2', match_score: 90 },
        ],
        error: null,
      });

      await repository.getPendingWithUsers();

      // Should use .in() to fetch all match scores at once
      expect(mockSupabase._mockIn).toHaveBeenCalled();
      // Should NOT call database N times (no Promise.all with individual queries)
    });

    it('should continue without match scores if match score query fails', async () => {
      const mockRequests = [
        {
          id: 'req-1',
          mentee_id: 'mentee-1',
          mentor_id: 'mentor-1',
          mentee: { id: 'mentee-1', profile: [{ name: 'Test' }] },
          mentor: { id: 'mentor-1', profile: [{ name: 'Test' }] },
        },
      ];

      mockSupabase._mockOrder.mockResolvedValueOnce({
        data: mockRequests,
        error: null,
      });

      mockSupabase._mockEq.mockResolvedValueOnce({
        data: null,
        error: { message: 'Match score query failed' },
      });

      const result = await repository.getPendingWithUsers();

      expect(result).toHaveLength(1);
      expect(result[0].match_score).toBeNull();
    });
  });
});
