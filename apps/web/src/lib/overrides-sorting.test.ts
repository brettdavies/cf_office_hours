/**
 * Overrides Sorting Utility Tests
 *
 * Tests pure sorting function for tier override requests.
 */

import { describe, it, expect } from 'vitest';
import { sortOverrideRequests } from './overrides-sorting';
import type { TierOverrideRequest } from '@/services/api/bookings';

// Mock tier override requests for testing
const createMockRequest = (overrides: Partial<TierOverrideRequest> = {}): TierOverrideRequest => ({
  id: 'req-1',
  mentee_id: 'mentee-1',
  mentor_id: 'mentor-1',
  reason: 'Need help',
  status: 'pending',
  created_at: '2025-01-01T00:00:00Z',
  expires_at: '2025-01-08T00:00:00Z',
  match_score: 85,
  mentee: {
    id: 'mentee-1',
    email: 'mentee@test.com',
    role: 'mentee',
    reputation_tier: 'bronze',
    profile: {
      id: 'profile-1',
      user_id: 'mentee-1',
      name: 'Alice Mentee',
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
      name: 'Bob Mentor',
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

describe('sortOverrideRequests', () => {
  describe('time_pending sorting', () => {
    it('should sort by time pending ascending (oldest first)', () => {
      const requests = [
        createMockRequest({ id: 'req-2', created_at: '2025-01-02T00:00:00Z' }),
        createMockRequest({ id: 'req-1', created_at: '2025-01-01T00:00:00Z' }),
      ];

      const result = sortOverrideRequests(requests, 'time_pending_asc');

      expect(result[0].id).toBe('req-1');
      expect(result[1].id).toBe('req-2');
    });

    it('should sort by time pending descending (newest first)', () => {
      const requests = [
        createMockRequest({ id: 'req-1', created_at: '2025-01-01T00:00:00Z' }),
        createMockRequest({ id: 'req-2', created_at: '2025-01-02T00:00:00Z' }),
      ];

      const result = sortOverrideRequests(requests, 'time_pending_desc');

      expect(result[0].id).toBe('req-2');
      expect(result[1].id).toBe('req-1');
    });
  });

  describe('expiration sorting', () => {
    it('should sort by expiration ascending (soonest first)', () => {
      const requests = [
        createMockRequest({ id: 'req-2', expires_at: '2025-01-10T00:00:00Z' }),
        createMockRequest({ id: 'req-1', expires_at: '2025-01-08T00:00:00Z' }),
      ];

      const result = sortOverrideRequests(requests, 'expiration_asc');

      expect(result[0].id).toBe('req-1');
      expect(result[1].id).toBe('req-2');
    });

    it('should sort by expiration descending (latest first)', () => {
      const requests = [
        createMockRequest({ id: 'req-1', expires_at: '2025-01-08T00:00:00Z' }),
        createMockRequest({ id: 'req-2', expires_at: '2025-01-10T00:00:00Z' }),
      ];

      const result = sortOverrideRequests(requests, 'expiration_desc');

      expect(result[0].id).toBe('req-2');
      expect(result[1].id).toBe('req-1');
    });
  });

  describe('mentee name sorting', () => {
    it('should sort by mentee name ascending (A-Z)', () => {
      const requests = [
        createMockRequest({
          id: 'req-2',
          mentee: { ...createMockRequest().mentee, profile: { ...createMockRequest().mentee.profile, name: 'Charlie' } },
        }),
        createMockRequest({
          id: 'req-1',
          mentee: { ...createMockRequest().mentee, profile: { ...createMockRequest().mentee.profile, name: 'Alice' } },
        }),
      ];

      const result = sortOverrideRequests(requests, 'mentee_name_asc');

      expect(result[0].mentee.profile.name).toBe('Alice');
      expect(result[1].mentee.profile.name).toBe('Charlie');
    });

    it('should sort by mentee name descending (Z-A)', () => {
      const requests = [
        createMockRequest({
          id: 'req-1',
          mentee: { ...createMockRequest().mentee, profile: { ...createMockRequest().mentee.profile, name: 'Alice' } },
        }),
        createMockRequest({
          id: 'req-2',
          mentee: { ...createMockRequest().mentee, profile: { ...createMockRequest().mentee.profile, name: 'Charlie' } },
        }),
      ];

      const result = sortOverrideRequests(requests, 'mentee_name_desc');

      expect(result[0].mentee.profile.name).toBe('Charlie');
      expect(result[1].mentee.profile.name).toBe('Alice');
    });
  });

  describe('mentor name sorting', () => {
    it('should sort by mentor name ascending (A-Z)', () => {
      const requests = [
        createMockRequest({
          id: 'req-2',
          mentor: { ...createMockRequest().mentor, profile: { ...createMockRequest().mentor.profile, name: 'Diana' } },
        }),
        createMockRequest({
          id: 'req-1',
          mentor: { ...createMockRequest().mentor, profile: { ...createMockRequest().mentor.profile, name: 'Bob' } },
        }),
      ];

      const result = sortOverrideRequests(requests, 'mentor_name_asc');

      expect(result[0].mentor.profile.name).toBe('Bob');
      expect(result[1].mentor.profile.name).toBe('Diana');
    });

    it('should sort by mentor name descending (Z-A)', () => {
      const requests = [
        createMockRequest({
          id: 'req-1',
          mentor: { ...createMockRequest().mentor, profile: { ...createMockRequest().mentor.profile, name: 'Bob' } },
        }),
        createMockRequest({
          id: 'req-2',
          mentor: { ...createMockRequest().mentor, profile: { ...createMockRequest().mentor.profile, name: 'Diana' } },
        }),
      ];

      const result = sortOverrideRequests(requests, 'mentor_name_desc');

      expect(result[0].mentor.profile.name).toBe('Diana');
      expect(result[1].mentor.profile.name).toBe('Bob');
    });
  });

  describe('match score sorting', () => {
    it('should sort by match score ascending (lowest first)', () => {
      const requests = [
        createMockRequest({ id: 'req-2', match_score: 85 }),
        createMockRequest({ id: 'req-1', match_score: 65 }),
      ];

      const result = sortOverrideRequests(requests, 'match_score_asc');

      expect(result[0].match_score).toBe(65);
      expect(result[1].match_score).toBe(85);
    });

    it('should sort by match score descending (highest first)', () => {
      const requests = [
        createMockRequest({ id: 'req-1', match_score: 65 }),
        createMockRequest({ id: 'req-2', match_score: 85 }),
      ];

      const result = sortOverrideRequests(requests, 'match_score_desc');

      expect(result[0].match_score).toBe(85);
      expect(result[1].match_score).toBe(65);
    });

    it('should put null match scores at end when ascending', () => {
      const requests = [
        createMockRequest({ id: 'req-3', match_score: null }),
        createMockRequest({ id: 'req-1', match_score: 65 }),
        createMockRequest({ id: 'req-2', match_score: 85 }),
      ];

      const result = sortOverrideRequests(requests, 'match_score_asc');

      expect(result[0].match_score).toBe(65);
      expect(result[1].match_score).toBe(85);
      expect(result[2].match_score).toBeNull();
    });

    it('should put null match scores at end when descending', () => {
      const requests = [
        createMockRequest({ id: 'req-1', match_score: 65 }),
        createMockRequest({ id: 'req-3', match_score: null }),
        createMockRequest({ id: 'req-2', match_score: 85 }),
      ];

      const result = sortOverrideRequests(requests, 'match_score_desc');

      expect(result[0].match_score).toBe(85);
      expect(result[1].match_score).toBe(65);
      expect(result[2].match_score).toBeNull();
    });
  });

  describe('immutability', () => {
    it('should not mutate the original array', () => {
      const requests = [
        createMockRequest({ id: 'req-2', match_score: 85 }),
        createMockRequest({ id: 'req-1', match_score: 65 }),
      ];
      const original = [...requests];

      sortOverrideRequests(requests, 'match_score_asc');

      expect(requests).toEqual(original);
    });
  });
});
