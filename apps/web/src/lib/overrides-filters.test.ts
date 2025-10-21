/**
 * Overrides Filtering Utility Tests
 *
 * Tests pure filtering function for tier override requests.
 */

import { describe, it, expect } from 'vitest';
import { filterOverrideRequests } from './overrides-filters';
import type { TierOverrideRequest } from '@/services/api/bookings';
import type { Filters } from '@/components/coordinator/OverridesFilterPanel';

// Mock tier override requests for testing
const createMockRequest = (overrides: Partial<TierOverrideRequest> = {}): TierOverrideRequest => ({
  id: 'req-1',
  mentee_id: 'mentee-1',
  mentor_id: 'mentor-1',
  reason: 'Need help',
  status: 'pending',
  created_at: '2025-01-01T00:00:00Z',
  expires_at: '2025-01-08T00:00:00Z',
  match_score: 85.5,
  mentee: {
    id: 'mentee-1',
    email: 'mentee@test.com',
    role: 'mentee',
    reputation_tier: 'bronze',
    profile: {
      id: 'profile-1',
      user_id: 'mentee-1',
      name: 'Mentee Test',
      title: 'Founder',
      company: 'TestCo',
      bio: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    airtable_record_id: null,
  },
  mentor: {
    id: 'mentor-1',
    email: 'mentor@test.com',
    role: 'mentor',
    reputation_tier: 'platinum',
    profile: {
      id: 'profile-2',
      user_id: 'mentor-1',
      name: 'Mentor Test',
      title: 'Advisor',
      company: 'AdviceCo',
      bio: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    airtable_record_id: null,
  },
  ...overrides,
});

describe('filterOverrideRequests', () => {
  const defaultFilters: Filters = {
    mentorTiers: ['bronze', 'silver', 'gold', 'platinum'],
    menteeTiers: ['bronze', 'silver', 'gold', 'platinum'],
    tierDifferences: [2, 3, 4],
    matchScoreBuckets: ['excellent', 'good', 'fair', 'poor', 'unknown'],
  };

  it('should return all requests when filters match all', () => {
    const requests = [createMockRequest(), createMockRequest({ id: 'req-2' })];
    const result = filterOverrideRequests(requests, defaultFilters);

    expect(result).toHaveLength(2);
  });

  it('should filter by mentor tier', () => {
    const requests = [
      createMockRequest({ mentor: { ...createMockRequest().mentor, reputation_tier: 'platinum' } }),
      createMockRequest({
        id: 'req-2',
        mentor: { ...createMockRequest().mentor, id: 'mentor-2', reputation_tier: 'silver' },
      }),
    ];

    const filters = {
      ...defaultFilters,
      mentorTiers: ['platinum'] as const,
    };

    const result = filterOverrideRequests(requests, filters);

    expect(result).toHaveLength(1);
    expect(result[0].mentor.reputation_tier).toBe('platinum');
  });

  it('should filter by mentee tier', () => {
    const requests = [
      createMockRequest({ mentee: { ...createMockRequest().mentee, reputation_tier: 'bronze' } }),
      createMockRequest({
        id: 'req-2',
        mentee: { ...createMockRequest().mentee, id: 'mentee-2', reputation_tier: 'silver' },
      }),
    ];

    const filters = {
      ...defaultFilters,
      menteeTiers: ['bronze'] as const,
    };

    const result = filterOverrideRequests(requests, filters);

    expect(result).toHaveLength(1);
    expect(result[0].mentee.reputation_tier).toBe('bronze');
  });

  it('should filter by tier difference', () => {
    const requests = [
      createMockRequest({
        // platinum (4) - bronze (1) = 3
        mentor: { ...createMockRequest().mentor, reputation_tier: 'platinum' },
        mentee: { ...createMockRequest().mentee, reputation_tier: 'bronze' },
      }),
      createMockRequest({
        id: 'req-2',
        // gold (3) - silver (2) = 1
        mentor: { ...createMockRequest().mentor, id: 'mentor-2', reputation_tier: 'gold' },
        mentee: { ...createMockRequest().mentee, id: 'mentee-2', reputation_tier: 'silver' },
      }),
    ];

    const filters = {
      ...defaultFilters,
      tierDifferences: [3],
    };

    const result = filterOverrideRequests(requests, filters);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('req-1');
  });

  it('should filter by match score bucket - excellent', () => {
    const requests = [
      createMockRequest({ match_score: 85 }), // excellent
      createMockRequest({ id: 'req-2', match_score: 65 }), // good
    ];

    const filters = {
      ...defaultFilters,
      matchScoreBuckets: ['excellent'] as const,
    };

    const result = filterOverrideRequests(requests, filters);

    expect(result).toHaveLength(1);
    expect(result[0].match_score).toBe(85);
  });

  it('should filter by match score bucket - good', () => {
    const requests = [
      createMockRequest({ match_score: 85 }), // excellent
      createMockRequest({ id: 'req-2', match_score: 65 }), // good
    ];

    const filters = {
      ...defaultFilters,
      matchScoreBuckets: ['good'] as const,
    };

    const result = filterOverrideRequests(requests, filters);

    expect(result).toHaveLength(1);
    expect(result[0].match_score).toBe(65);
  });

  it('should filter by match score bucket - unknown', () => {
    const requests = [
      createMockRequest({ match_score: 85 }),
      createMockRequest({ id: 'req-2', match_score: null }),
    ];

    const filters = {
      ...defaultFilters,
      matchScoreBuckets: ['unknown'] as const,
    };

    const result = filterOverrideRequests(requests, filters);

    expect(result).toHaveLength(1);
    expect(result[0].match_score).toBeNull();
  });

  it('should combine multiple filters', () => {
    const requests = [
      createMockRequest({
        id: 'req-1',
        match_score: 85,
        mentor: { ...createMockRequest().mentor, reputation_tier: 'platinum' },
        mentee: { ...createMockRequest().mentee, reputation_tier: 'bronze' },
      }),
      createMockRequest({
        id: 'req-2',
        match_score: 65,
        mentor: { ...createMockRequest().mentor, id: 'mentor-2', reputation_tier: 'gold' },
        mentee: { ...createMockRequest().mentee, id: 'mentee-2', reputation_tier: 'silver' },
      }),
    ];

    const filters = {
      mentorTiers: ['platinum'] as const,
      menteeTiers: ['bronze'] as const,
      tierDifferences: [3],
      matchScoreBuckets: ['excellent'] as const,
    };

    const result = filterOverrideRequests(requests, filters);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('req-1');
  });

  it('should exclude requests with missing tier data', () => {
    const requests = [
      createMockRequest({
        mentor: { ...createMockRequest().mentor, reputation_tier: null },
      }),
    ];

    const result = filterOverrideRequests(requests, defaultFilters);

    expect(result).toHaveLength(0);
  });

  it('should return empty array when no requests match', () => {
    const requests = [
      createMockRequest({
        mentor: { ...createMockRequest().mentor, reputation_tier: 'bronze' },
      }),
    ];

    const filters = {
      ...defaultFilters,
      mentorTiers: ['platinum'] as const,
    };

    const result = filterOverrideRequests(requests, filters);

    expect(result).toHaveLength(0);
  });
});
