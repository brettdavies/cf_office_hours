/**
 * MatchingService tests against an in-memory D1 database.
 */

// External dependencies
import { beforeEach, describe, expect, it } from 'vitest';

// Internal modules
import { MatchingService, toExplanation } from '../../../services/matching.service';
import { createTestDb, insertRow } from '../../helpers/d1';

type Raw = ReturnType<typeof createTestDb>['raw'];

function seedUser(raw: Raw, id: string, role: string): void {
  insertRow(raw, 'users', {
    id,
    airtable_record_id: `air-${id}`,
    email: `${id}@test.com`,
    role,
  });
  insertRow(raw, 'user_profiles', {
    id: `p-${id}`,
    user_id: id,
    name: `Name ${id}`,
  });
}

function seedMatch(
  raw: Raw,
  opts: {
    userId: string;
    recommendedUserId: string;
    score: number;
    algorithm?: string;
    summary?: string;
  }
): void {
  const algorithm = opts.algorithm ?? 'tag-based-v1';
  insertRow(raw, 'user_match_cache', {
    id: `c-${opts.userId}-${opts.recommendedUserId}-${algorithm}`,
    user_id: opts.userId,
    recommended_user_id: opts.recommendedUserId,
    match_score: opts.score,
    match_explanation: JSON.stringify({
      tagOverlap: [{ category: 'technology', tag: 'react' }],
      stageMatch: true,
      reputationCompatible: true,
      summary: opts.summary ?? 'Strong match',
    }),
    algorithm_version: algorithm,
  });
}

describe('MatchingService', () => {
  let service: MatchingService;
  let raw: Raw;

  beforeEach(() => {
    const db = createTestDb();
    raw = db.raw;
    service = new MatchingService(db.DB as unknown as D1Database);
  });

  describe('getRecommendedMentors', () => {
    it('returns matches sorted by score descending', async () => {
      seedUser(raw, 'mentee-1', 'mentee');
      seedUser(raw, 'mentor-1', 'mentor');
      seedUser(raw, 'mentor-2', 'mentor');
      seedUser(raw, 'mentor-3', 'mentor');
      seedMatch(raw, { userId: 'mentee-1', recommendedUserId: 'mentor-1', score: 85 });
      seedMatch(raw, { userId: 'mentee-1', recommendedUserId: 'mentor-2', score: 72 });
      seedMatch(raw, { userId: 'mentee-1', recommendedUserId: 'mentor-3', score: 91 });

      const results = await service.getRecommendedMentors('mentee-1', { limit: 10 });

      expect(results.map(r => r.score)).toEqual([91, 85, 72]);
      expect(results[0].user.id).toBe('mentor-3');
      expect(results[0].explanation.summary).toBeTypeOf('string');
    });

    it('respects the limit', async () => {
      seedUser(raw, 'mentee-1', 'mentee');
      for (let i = 0; i < 5; i++) {
        seedUser(raw, `m-${i}`, 'mentor');
        seedMatch(raw, { userId: 'mentee-1', recommendedUserId: `m-${i}`, score: 50 + i });
      }
      const results = await service.getRecommendedMentors('mentee-1', { limit: 2 });
      expect(results).toHaveLength(2);
    });

    it('caps the limit at 20', async () => {
      seedUser(raw, 'mentee-1', 'mentee');
      for (let i = 0; i < 25; i++) {
        seedUser(raw, `m-${i}`, 'mentor');
        seedMatch(raw, { userId: 'mentee-1', recommendedUserId: `m-${i}`, score: 10 + i });
      }
      const results = await service.getRecommendedMentors('mentee-1', { limit: 50 });
      expect(results).toHaveLength(20);
    });

    it('applies the minScore filter', async () => {
      seedUser(raw, 'mentee-1', 'mentee');
      seedUser(raw, 'mentor-1', 'mentor');
      seedUser(raw, 'mentor-2', 'mentor');
      seedMatch(raw, { userId: 'mentee-1', recommendedUserId: 'mentor-1', score: 80 });
      seedMatch(raw, { userId: 'mentee-1', recommendedUserId: 'mentor-2', score: 60 });
      const results = await service.getRecommendedMentors('mentee-1', { minScore: 75 });
      expect(results.map(r => r.score)).toEqual([80]);
    });

    it('filters by algorithm version', async () => {
      seedUser(raw, 'mentee-1', 'mentee');
      seedUser(raw, 'mentor-1', 'mentor');
      seedMatch(raw, { userId: 'mentee-1', recommendedUserId: 'mentor-1', score: 80 });
      seedMatch(raw, {
        userId: 'mentee-1',
        recommendedUserId: 'mentor-1',
        score: 99,
        algorithm: 'ml-v2',
      });
      const results = await service.getRecommendedMentors('mentee-1', {
        algorithmVersion: 'ml-v2',
      });
      expect(results.map(r => r.score)).toEqual([99]);
    });

    it('returns an empty array when there are no matches', async () => {
      seedUser(raw, 'mentee-1', 'mentee');
      expect(await service.getRecommendedMentors('mentee-1')).toEqual([]);
    });
  });

  describe('getRecommendedMentees', () => {
    it('returns mentees recommended for a mentor', async () => {
      seedUser(raw, 'mentee-1', 'mentee');
      seedUser(raw, 'mentor-1', 'mentor');
      seedMatch(raw, { userId: 'mentee-1', recommendedUserId: 'mentor-1', score: 80 });

      const results = await service.getRecommendedMentees('mentor-1');

      expect(results).toHaveLength(1);
      expect(results[0].score).toBe(80);
      expect(results[0].user.role).toBe('mentee');
    });
  });

  describe('explainMatch', () => {
    beforeEach(() => {
      seedUser(raw, 'mentee-1', 'mentee');
      seedUser(raw, 'mentor-1', 'mentor');
      seedMatch(raw, {
        userId: 'mentee-1',
        recommendedUserId: 'mentor-1',
        score: 85,
        summary: 'Strong match: 5 shared tags',
      });
    });

    it('returns the explanation for a cached match', async () => {
      const result = await service.explainMatch('mentee-1', 'mentor-1');
      expect(result?.summary).toBe('Strong match: 5 shared tags');
    });

    it('resolves bidirectionally (user2 -> user1)', async () => {
      const result = await service.explainMatch('mentor-1', 'mentee-1');
      expect(result?.summary).toBe('Strong match: 5 shared tags');
    });

    it('returns null when no cached match exists', async () => {
      expect(await service.explainMatch('mentee-1', 'someone-else')).toBeNull();
    });

    it('respects a custom algorithm version', async () => {
      expect(await service.explainMatch('mentee-1', 'mentor-1', 'ml-v2')).toBeNull();
    });
  });
});

describe('toExplanation', () => {
  it('preserves real tag overlap and summary for the tag-based shape', () => {
    const raw = JSON.stringify({
      tagOverlap: [{ category: 'industry', tag: 'healthcare' }],
      summary: 'Weak match: 1 shared tags (healthcare)',
    });

    const result = toExplanation(raw, 'tag-based-v1');

    expect(result.tagOverlap).toEqual([{ category: 'industry', tag: 'healthcare' }]);
    expect(result.summary).toBe('Weak match: 1 shared tags (healthcare)');
    expect(result.aiInsights).toBeUndefined();
  });

  it('maps the ai-based seed shape into aiInsights without false negatives', () => {
    const raw = JSON.stringify({
      reasoning: 'AI-generated match based on mentor expertise and company focus areas',
      generated_by: 'pure-database-seed',
      match_confidence: 'High potential for productive mentoring relationship',
      algorithm_version: 'ai-based-v1',
      mentor_bio_summary: 'Experienced professional with relevant industry background',
      company_description: 'Apex Dynamics focuses on innovation in their sector',
    });

    const result = toExplanation(raw, 'ai-based-v1');

    expect(result.aiInsights).toEqual({
      reasoning: 'AI-generated match based on mentor expertise and company focus areas',
      confidence: 'High potential for productive mentoring relationship',
      mentorSummary: 'Experienced professional with relevant industry background',
      companyDescription: 'Apex Dynamics focuses on innovation in their sector',
    });
    // No false negatives: tag overlap empty (not evaluated), summary derived from confidence.
    expect(result.tagOverlap).toEqual([]);
    expect(result.summary).toBe('High potential for productive mentoring relationship');
  });

  it('preserves the summary for the ai-based live-engine shape and leaves aiInsights unset', () => {
    const raw = JSON.stringify({ tagOverlap: [], summary: 'Good AI match for these two' });

    const result = toExplanation(raw, 'ai-based-v1');

    expect(result.summary).toBe('Good AI match for these two');
    expect(result.aiInsights).toBeUndefined();
    expect(result.tagOverlap).toEqual([]);
  });

  it('keeps an explicit non-empty summary over the derived ai fallback', () => {
    const raw = JSON.stringify({
      summary: 'Curated summary wins',
      reasoning: 'reasoning fallback',
      match_confidence: 'confidence fallback',
    });

    const result = toExplanation(raw, 'ai-based-v1');

    expect(result.summary).toBe('Curated summary wins');
    expect(result.aiInsights?.reasoning).toBe('reasoning fallback');
  });

  it('falls back to reasoning when confidence is absent', () => {
    const raw = JSON.stringify({ reasoning: 'Only reasoning present' });

    const result = toExplanation(raw, 'ai-based-v1');

    expect(result.summary).toBe('Only reasoning present');
    expect(result.aiInsights).toEqual({ reasoning: 'Only reasoning present' });
  });

  it('degrades to safe defaults for malformed JSON', () => {
    const result = toExplanation('{not valid json', 'tag-based-v1');

    expect(result).toEqual({
      tagOverlap: [],
      stageMatch: false,
      reputationCompatible: false,
      summary: '',
    });
  });

  it('degrades to safe defaults for an empty string', () => {
    expect(toExplanation('', 'tag-based-v1')).toEqual({
      tagOverlap: [],
      stageMatch: false,
      reputationCompatible: false,
      summary: '',
    });
  });

  it('degrades to safe defaults for null/undefined raw', () => {
    expect(toExplanation(null as unknown as string, 'tag-based-v1').aiInsights).toBeUndefined();
    expect(toExplanation(undefined as unknown as string, 'tag-based-v1').summary).toBe('');
  });

  it('still surfaces present content for an unknown algorithm', () => {
    const raw = JSON.stringify({
      reasoning: 'surfaced for unknown algo',
      summary: 'kept summary',
    });

    const result = toExplanation(raw, 'ml-v9');

    expect(result.summary).toBe('kept summary');
    expect(result.aiInsights).toEqual({ reasoning: 'surfaced for unknown algo' });
  });
});
