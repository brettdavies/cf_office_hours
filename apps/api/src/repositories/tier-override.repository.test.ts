/**
 * Tier Override Repository tests against an in-memory D1 database.
 */

// External dependencies
import { describe, it, expect, beforeEach } from 'vitest';

// Internal modules
import { TierOverrideRepository } from './tier-override.repository';
import { createTestDb, insertRow } from '../test/helpers/d1';

// Types
import type { Env } from '../types/bindings';

type Raw = ReturnType<typeof createTestDb>['raw'];

function seedPair(
  raw: Raw,
  opts: { menteeId: string; mentorId: string; reqId: string; status?: string }
): void {
  const { menteeId, mentorId, reqId, status = 'pending' } = opts;
  insertRow(raw, 'users', {
    id: menteeId,
    airtable_record_id: `air-${menteeId}`,
    email: `${menteeId}@test.com`,
    role: 'mentee',
    reputation_tier: 'bronze',
  });
  insertRow(raw, 'users', {
    id: mentorId,
    airtable_record_id: `air-${mentorId}`,
    email: `${mentorId}@test.com`,
    role: 'mentor',
    reputation_tier: 'platinum',
  });
  insertRow(raw, 'user_profiles', {
    id: `p-${menteeId}`,
    user_id: menteeId,
    name: `Name ${menteeId}`,
    title: 'Founder',
    company: 'TestCo',
  });
  insertRow(raw, 'user_profiles', {
    id: `p-${mentorId}`,
    user_id: mentorId,
    name: `Name ${mentorId}`,
    title: 'Advisor',
    company: 'AdviceCo',
  });
  insertRow(raw, 'tier_override_requests', {
    id: reqId,
    mentee_id: menteeId,
    mentor_id: mentorId,
    reason: 'Need help',
    status,
    scope: 'one_time',
    expires_at: '2025-01-08T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
  });
}

describe('TierOverrideRepository.getPendingWithUsers', () => {
  let repository: TierOverrideRepository;
  let raw: Raw;

  beforeEach(() => {
    const db = createTestDb();
    raw = db.raw;
    repository = new TierOverrideRepository({ DB: db.DB } as unknown as Env);
  });

  it('returns pending requests with profiles and the match score', async () => {
    seedPair(raw, { menteeId: 'mentee-1', mentorId: 'mentor-1', reqId: 'req-1' });
    insertRow(raw, 'user_match_cache', {
      id: 'c1',
      user_id: 'mentee-1',
      recommended_user_id: 'mentor-1',
      match_score: 85.5,
      match_explanation: '{}',
      algorithm_version: 'tag-based-v1',
    });

    const result = await repository.getPendingWithUsers();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('req-1');
    expect(result[0].mentee.profile.name).toBe('Name mentee-1');
    expect(result[0].mentor.profile.name).toBe('Name mentor-1');
    expect(result[0].match_score).toBe(85.5);
  });

  it('returns a null match score when no cache entry exists', async () => {
    seedPair(raw, { menteeId: 'mentee-1', mentorId: 'mentor-1', reqId: 'req-1' });
    const result = await repository.getPendingWithUsers();
    expect(result).toHaveLength(1);
    expect(result[0].match_score).toBeNull();
  });

  it('excludes non-pending requests', async () => {
    seedPair(raw, {
      menteeId: 'mentee-1',
      mentorId: 'mentor-1',
      reqId: 'req-1',
      status: 'approved',
    });
    expect(await repository.getPendingWithUsers()).toEqual([]);
  });

  it('returns an empty array when there are no requests', async () => {
    expect(await repository.getPendingWithUsers()).toEqual([]);
  });
});
