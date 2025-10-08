/**
 * Matching API Routes Integration Tests
 *
 * Tests HTTP endpoints with mocked service layer.
 */

// External dependencies
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Internal modules
import app from '../../../index';
import { MatchingService } from '../../../services/matching.service';

// Types
import type { MatchResult } from '../../../services/matching.service';
import type { UserResponse } from '@cf-office-hours/shared';

// Mock MatchingService
vi.mock('../../../services/matching.service');

// Mock createSupabaseClient to avoid environment dependency
vi.mock('../../../lib/db', () => ({
  createSupabaseClient: vi.fn(() => ({}) as any),
}));

// Mock requireAuth middleware to inject a test user with coordinator role
vi.mock('../../../middleware/auth', () => ({
  requireAuth: vi.fn(async (c, next) => {
    c.set('user', {
      id: 'coordinator-123',
      email: 'coordinator@example.com',
      role: 'coordinator',
    });
    return await next();
  }),
  requireRole: vi.fn(() =>
    vi.fn(async (c, next) => {
      return await next();
    })
  ),
}));

describe('Matching API Routes', () => {
  const mockMenteeUser: UserResponse = {
    id: 'mentee-123',
    airtable_record_id: null,
    email: 'mentee@example.com',
    role: 'mentee',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    profile: {
      id: 'profile-123',
      user_id: 'mentee-123',
      name: 'John Mentee',
      title: 'Junior Engineer',
      company: 'Startup Inc',
      bio: 'Looking for guidance',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
  };

  const mockMentorUser: UserResponse = {
    id: 'mentor-456',
    airtable_record_id: null,
    email: 'mentor@example.com',
    role: 'mentor',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    profile: {
      id: 'profile-456',
      user_id: 'mentor-456',
      name: 'Jane Mentor',
      title: 'Senior Engineer',
      company: 'Tech Corp',
      bio: 'Experienced mentor',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
  };

  const mockMatches: MatchResult[] = [
    {
      user: mockMentorUser,
      score: 50,
      explanation: {
        tagOverlap: [
          { category: 'technology', tag: 'react' },
          { category: 'industry', tag: 'fintech' },
        ],
        summary: 'Strong match: 2 shared tags (react, fintech)',
      },
    },
    {
      user: {
        ...mockMentorUser,
        id: 'mentor-789',
        email: 'mentor2@example.com',
        profile: {
          ...mockMentorUser.profile,
          id: 'profile-789',
          user_id: 'mentor-789',
          name: 'Bob Advisor',
        },
      },
      score: 30,
      explanation: {
        tagOverlap: [{ category: 'industry', tag: 'fintech' }],
        summary: 'Moderate match: 1 shared tags (fintech)',
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /v1/matching/find-matches', () => {
    it('should return cached mentor matches for a mentee', async () => {
      vi.spyOn(MatchingService.prototype, 'getRecommendedMentors').mockResolvedValue(mockMatches);

      const res = await app.request('/v1/matching/find-matches', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mock-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: '00000000-0000-0000-0000-000000000123',
          targetRole: 'mentor',
          options: {
            algorithmVersion: 'tag-based-v1',
            limit: 5,
            minScore: 70,
          },
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.matches).toHaveLength(2);
      expect(data.matches[0].score).toBe(50); // Match mock data
      expect(data.matches[0].user.id).toBe('mentor-456');
      expect(data.matches[0].explanation.tagOverlap).toHaveLength(2);
    });

    it('should return cached mentee matches for a mentor', async () => {
      const menteeMatches: MatchResult[] = [
        {
          user: mockMenteeUser,
          score: 30,
          explanation: {
            tagOverlap: [{ category: 'technology', tag: 'react' }],
            summary: 'Moderate match: 1 shared tags (react)',
          },
        },
      ];

      vi.spyOn(MatchingService.prototype, 'getRecommendedMentees').mockResolvedValue(menteeMatches);

      const res = await app.request('/v1/matching/find-matches', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mock-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: '00000000-0000-0000-0000-000000000456',
          targetRole: 'mentee',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.matches).toHaveLength(1);
      expect(data.matches[0].user.id).toBe('mentee-123');
    });

    it('should handle validation errors for invalid request', async () => {
      const res = await app.request('/v1/matching/find-matches', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mock-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'invalid-uuid',
          targetRole: 'mentor',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it('should return empty array when no matches found', async () => {
      vi.spyOn(MatchingService.prototype, 'getRecommendedMentors').mockResolvedValue([]);

      const res = await app.request('/v1/matching/find-matches', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mock-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: '00000000-0000-0000-0000-000000000000',
          targetRole: 'mentor',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.matches).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      vi.spyOn(MatchingService.prototype, 'getRecommendedMentors').mockRejectedValue(
        new Error('Database connection failed')
      );

      const res = await app.request('/v1/matching/find-matches', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mock-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: '00000000-0000-0000-0000-000000000000',
          targetRole: 'mentor',
        }),
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toContain('Database connection failed');
    });
  });

  describe('POST /v1/matching/explain', () => {
    it('should return match explanation for cached user pair', async () => {
      const mockExplanation = {
        tagOverlap: [
          { category: 'technology', tag: 'react' },
          { category: 'industry', tag: 'fintech' },
        ],
        summary: 'Strong match: 2 shared tags (react, fintech)',
      };

      vi.spyOn(MatchingService.prototype, 'explainMatch').mockResolvedValue(mockExplanation);

      const res = await app.request('/v1/matching/explain', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mock-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId1: '00000000-0000-0000-0000-000000000001',
          userId2: '00000000-0000-0000-0000-000000000002',
          algorithmVersion: 'tag-based-v1',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.explanation).toBeDefined();
      expect(data.explanation.tagOverlap).toHaveLength(2);
      expect(data.explanation.summary).toContain('Strong match');
    });

    it('should return 404 when no cached match found', async () => {
      vi.spyOn(MatchingService.prototype, 'explainMatch').mockResolvedValue(null);

      const res = await app.request('/v1/matching/explain', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mock-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId1: '00000000-0000-0000-0000-000000000001',
          userId2: '00000000-0000-0000-0000-000000000002',
        }),
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error.code).toBe('MATCH_NOT_FOUND');
      expect(data.error.message).toContain('No cached match found');
    });

    it('should handle validation errors for invalid UUIDs', async () => {
      const res = await app.request('/v1/matching/explain', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mock-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId1: 'invalid-uuid',
          userId2: 'also-invalid',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      vi.spyOn(MatchingService.prototype, 'explainMatch').mockRejectedValue(
        new Error('Database timeout')
      );

      const res = await app.request('/v1/matching/explain', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mock-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId1: '00000000-0000-0000-0000-000000000001',
          userId2: '00000000-0000-0000-0000-000000000002',
        }),
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toContain('Database timeout');
    });

    it('should use default algorithm version when not specified', async () => {
      const explainMatchSpy = vi
        .spyOn(MatchingService.prototype, 'explainMatch')
        .mockResolvedValue(null);

      await app.request('/v1/matching/explain', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mock-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId1: '00000000-0000-0000-0000-000000000001',
          userId2: '00000000-0000-0000-0000-000000000002',
        }),
      });

      expect(explainMatchSpy).toHaveBeenCalledWith(
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
        'tag-based-v1'
      );
    });
  });
});
