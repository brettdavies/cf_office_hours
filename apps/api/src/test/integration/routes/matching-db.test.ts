/**
 * Matching API Routes — real-DB integration tests.
 *
 * Unlike matching.test.ts (which mocks MatchingService), these tests inject a
 * real in-memory D1 via the getDb mock and leave MatchingService and the route
 * SQL (including the distinct_users_with_scores / algorithm_versions views)
 * unmocked. Only auth is mocked to inject a coordinator.
 */

// External dependencies
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';

// Internal modules
import { app } from '../../../index';
import { createTestDb, insertRow } from '../../helpers/d1';

// Types
import type { MatchExplanation } from '@cf-office-hours/shared';

// Response body shapes as the HTTP layer serializes them. `Response.json()` is
// typed `unknown`, so each read asserts the documented DTO it returns.
interface ExplainBody {
  explanation: MatchExplanation;
}
interface UsersBody {
  users: Array<{ id: string }>;
}
interface ErrorBody {
  error: { code: string; message: string; timestamp: string };
}

// Holder lets the hoisted getDb mock return the per-test database.
const dbHolder = vi.hoisted(() => ({ current: null as unknown }));

vi.mock('../../../lib/db', () => ({
  getDb: () => dbHolder.current,
}));

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
    vi.fn(async (_c, next) => {
      return await next();
    })
  ),
}));

const AUTH = { Authorization: 'Bearer mock-token', 'Content-Type': 'application/json' };

// Valid UUID v4 strings keyed by a small integer (explain route validates UUIDs).
const uuid = (n: number): string =>
  `00000000-0000-4000-8000-${n.toString().padStart(12, '0')}`;

const AI_EXPLANATION = {
  reasoning: 'AI-generated match based on mentor expertise and company focus areas',
  generated_by: 'pure-database-seed',
  match_confidence: 'High potential for productive mentoring relationship',
  algorithm_version: 'ai-based-v1',
  mentor_bio_summary: 'Experienced professional with relevant industry background',
  company_description: 'Apex Dynamics focuses on innovation in their sector',
};

const TAG_EXPLANATION = {
  tagOverlap: [{ category: 'industry', tag: 'healthcare' }],
  summary: 'Weak match: 1 shared tags (healthcare)',
};

describe('Matching API Routes (real DB)', () => {
  let raw: DatabaseSync;

  const seedUser = (id: string, role: string, name = `Name ${id}`): void => {
    insertRow(raw, 'users', {
      id,
      airtable_record_id: `air-${id}`,
      email: `${id}@test.com`,
      role,
    });
    insertRow(raw, 'user_profiles', { id: `p-${id}`, user_id: id, name });
  };

  const seedCache = (opts: {
    userId: string;
    recId: string;
    score: number;
    algorithm: string;
    explanation: unknown;
  }): void => {
    insertRow(raw, 'user_match_cache', {
      id: `c-${opts.userId}-${opts.recId}-${opts.algorithm}`,
      user_id: opts.userId,
      recommended_user_id: opts.recId,
      match_score: opts.score,
      match_explanation: JSON.stringify(opts.explanation),
      algorithm_version: opts.algorithm,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    const db = createTestDb();
    raw = db.raw;
    dbHolder.current = db.DB as unknown;
  });

  describe('POST /v1/matching/explain', () => {
    it('surfaces AI insights with no tag/stage/reputation false-negatives for an ai-based high score', async () => {
      const mentee = uuid(1);
      const mentor = uuid(2);
      seedUser(mentee, 'mentee');
      seedUser(mentor, 'mentor');
      seedCache({
        userId: mentee,
        recId: mentor,
        score: 99.5,
        algorithm: 'ai-based-v1',
        explanation: AI_EXPLANATION,
      });

      const res = await app.request('/v1/matching/explain', {
        method: 'POST',
        headers: AUTH,
        body: JSON.stringify({ userId1: mentee, userId2: mentor, algorithmVersion: 'ai-based-v1' }),
      });

      expect(res.status).toBe(200);
      const { explanation } = (await res.json()) as ExplainBody;
      expect(explanation.aiInsights).toEqual({
        reasoning: AI_EXPLANATION.reasoning,
        confidence: AI_EXPLANATION.match_confidence,
        mentorSummary: AI_EXPLANATION.mentor_bio_summary,
        companyDescription: AI_EXPLANATION.company_description,
      });
      expect(explanation.summary.length).toBeGreaterThan(0);
      // No false negatives: empty tag overlap (not evaluated) and booleans default false.
      expect(explanation.tagOverlap).toEqual([]);
      expect(explanation.stageMatch).toBe(false);
      expect(explanation.reputationCompatible).toBe(false);
    });

    it('returns real tag overlap and summary for a tag-based pair', async () => {
      const mentee = uuid(3);
      const mentor = uuid(4);
      seedUser(mentee, 'mentee');
      seedUser(mentor, 'mentor');
      seedCache({
        userId: mentee,
        recId: mentor,
        score: 42,
        algorithm: 'tag-based-v1',
        explanation: TAG_EXPLANATION,
      });

      const res = await app.request('/v1/matching/explain', {
        method: 'POST',
        headers: AUTH,
        body: JSON.stringify({ userId1: mentee, userId2: mentor, algorithmVersion: 'tag-based-v1' }),
      });

      expect(res.status).toBe(200);
      const { explanation } = (await res.json()) as ExplainBody;
      expect(explanation.tagOverlap).toHaveLength(1);
      expect(explanation.tagOverlap[0]).toEqual({ category: 'industry', tag: 'healthcare' });
      expect(explanation.summary).toContain('healthcare');
      expect(explanation.aiInsights).toBeUndefined();
    });

    it('returns 404 MATCH_NOT_FOUND for a non-existent algorithm version', async () => {
      const mentee = uuid(5);
      const mentor = uuid(6);
      seedUser(mentee, 'mentee');
      seedUser(mentor, 'mentor');
      seedCache({
        userId: mentee,
        recId: mentor,
        score: 80,
        algorithm: 'ai-based-v1',
        explanation: AI_EXPLANATION,
      });

      const res = await app.request('/v1/matching/explain', {
        method: 'POST',
        headers: AUTH,
        body: JSON.stringify({ userId1: mentee, userId2: mentor, algorithmVersion: 'does-not-exist' }),
      });

      expect(res.status).toBe(404);
      const data = (await res.json()) as ErrorBody;
      expect(data.error.code).toBe('MATCH_NOT_FOUND');
    });
  });

  describe('GET /v1/matching/users-with-scores', () => {
    const getIds = async (algorithm: string, role?: string): Promise<string[]> => {
      const params = new URLSearchParams({ algorithmVersion: algorithm });
      if (role) params.set('role', role);
      const res = await app.request(`/v1/matching/users-with-scores?${params.toString()}`, {
        headers: AUTH,
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as UsersBody;
      return data.users.map(u => u.id);
    };

    const seedBaseDataset = (): void => {
      const mentees = [uuid(10), uuid(11)];
      const mentors = [uuid(20), uuid(21)];
      mentees.forEach(id => seedUser(id, 'mentee'));
      mentors.forEach(id => seedUser(id, 'mentor'));
      for (const algorithm of ['ai-based-v1', 'tag-based-v1']) {
        for (const mentee of mentees) {
          for (const mentor of mentors) {
            seedCache({
              userId: mentee,
              recId: mentor,
              score: 75,
              algorithm,
              explanation: algorithm === 'ai-based-v1' ? AI_EXPLANATION : TAG_EXPLANATION,
            });
          }
        }
      }
    };

    it('returns no duplicate IDs for every role × algorithm', async () => {
      seedBaseDataset();

      for (const algorithm of ['ai-based-v1', 'tag-based-v1']) {
        for (const role of [undefined, 'mentor', 'mentee']) {
          const ids = await getIds(algorithm, role);
          expect(ids.length).toBeGreaterThan(0);
          // Response-level dedup guarantee (R7): the real picker output never repeats an ID.
          expect(new Set(ids).size).toBe(ids.length);
        }
      }
    });

    it('role=all total equals mentor + mentee with no cross-column overlap', async () => {
      seedBaseDataset();

      const all = await getIds('ai-based-v1');
      const mentors = await getIds('ai-based-v1', 'mentor');
      const mentees = await getIds('ai-based-v1', 'mentee');

      expect(all.length).toBe(mentors.length + mentees.length);
      expect(new Set(all).size).toBe(all.length);
    });

    it('red-team: a user present in both cache columns is collapsed to their role column exactly once', async () => {
      const mentee = uuid(30);
      const mentor = uuid(31);
      const both = uuid(32); // role=mentor, but appears in both columns
      seedUser(mentee, 'mentee');
      seedUser(mentor, 'mentor');
      seedUser(both, 'mentor');
      // `both` appears as recommended_user_id (mentor column) AND user_id (mentee column).
      seedCache({ userId: mentee, recId: both, score: 90, algorithm: 'ai-based-v1', explanation: AI_EXPLANATION });
      seedCache({ userId: both, recId: mentor, score: 70, algorithm: 'ai-based-v1', explanation: AI_EXPLANATION });

      const all = await getIds('ai-based-v1');

      expect(all.filter(id => id === both)).toHaveLength(1);
      expect(new Set(all).size).toBe(all.length);
    });

    it('red-team: a user whose role disagrees with their cache-column membership is dropped', async () => {
      const mentee = uuid(40);
      const mislabeled = uuid(41); // role=mentor but only present in the user_id (mentee) column
      seedUser(mentee, 'mentee');
      seedUser(mislabeled, 'mentor');
      seedCache({ userId: mislabeled, recId: mentee, score: 65, algorithm: 'ai-based-v1', explanation: AI_EXPLANATION });

      const all = await getIds('ai-based-v1');

      expect(all).not.toContain(mislabeled);
    });

    it('red-team: a non-existent algorithm version returns an empty list', async () => {
      seedBaseDataset();
      const ids = await getIds('ghost-algorithm-v9');
      expect(ids).toEqual([]);
    });

    it('SQL role-collapse invariant: no user id survives the collapse twice', async () => {
      seedBaseDataset();
      // Mirror the route's JS role-collapse in SQL: keep only the row whose
      // column_source matches the user's role, then prove zero id appears twice.
      const dupes = raw
        .prepare(
          `SELECT id, COUNT(*) AS c FROM (
             SELECT u.id
             FROM users u
             JOIN distinct_users_with_scores d ON d.id = u.id
             WHERE d.algorithm_version = ?
               AND ((u.role = 'mentee' AND d.column_source = 'user_id')
                 OR (u.role = 'mentor' AND d.column_source = 'recommended_user_id'))
           ) GROUP BY id HAVING c > 1`
        )
        .all('ai-based-v1');
      expect(dupes).toEqual([]);
    });
  });

  describe('GET /v1/matching/users-with-scores — security & bounds', () => {
    it('treats a SQL-injection algorithmVersion as an opaque bound parameter', async () => {
      seedUser(uuid(50), 'mentee');
      seedUser(uuid(51), 'mentor');
      seedCache({ userId: uuid(50), recId: uuid(51), score: 80, algorithm: 'tag-based-v1', explanation: TAG_EXPLANATION });

      const before = (raw.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number }).c;

      const params = new URLSearchParams({ algorithmVersion: "'; DROP TABLE users;--" });
      const res = await app.request(`/v1/matching/users-with-scores?${params.toString()}`, {
        headers: AUTH,
      });

      expect(res.status).toBe(200);
      expect(((await res.json()) as UsersBody).users).toEqual([]);
      const after = (raw.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number }).c;
      expect(after).toBe(before);
    });

    it('rejects an invalid role enum with a 400', async () => {
      const res = await app.request('/v1/matching/users-with-scores?algorithmVersion=tag-based-v1&role=foo', {
        headers: AUTH,
      });
      expect(res.status).toBe(400);
      const data = (await res.json()) as ErrorBody;
      expect(data.error).toBeDefined();
    });

    it('rejects an oversized limit with a 400 (bounded by the query schema)', async () => {
      const res = await app.request('/v1/matching/users-with-scores?algorithmVersion=tag-based-v1&limit=100000', {
        headers: AUTH,
      });
      expect(res.status).toBe(400);
    });

    it('handles an oversized algorithmVersion string without error', async () => {
      const params = new URLSearchParams({ algorithmVersion: 'x'.repeat(10000) });
      const res = await app.request(`/v1/matching/users-with-scores?${params.toString()}`, {
        headers: AUTH,
      });
      expect(res.status).toBe(200);
      expect(((await res.json()) as UsersBody).users).toEqual([]);
    });
  });
});
