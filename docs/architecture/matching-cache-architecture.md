# Matching Cache Architecture

The deep-dive design for the event-driven cached matching system. The implementation lives in
`apps/api/src/providers/matching/`, `apps/api/src/services/matching.service.ts`, and
`apps/api/src/events/matching-triggers.ts`; this document explains the shape and the reasoning. For the broader backend
context see [8.6 Matching Providers and Events](./8-backend-architecture.md#86-matching-providers-and-events).

## The problem

Computing recommendations on demand is expensive: scoring every candidate for a user at request time adds seconds of
latency and scales poorly. The matching UI needs results in well under 100ms.

## The solution

Precompute scores in the background and read them from a cache table:

1. Matching engines calculate scores when a user's inputs change (profile, tags, reputation).
2. Results are written to the `user_match_cache` table, tagged with the `algorithm_version` that produced them.
3. The UI reads recommendations with a single indexed `SELECT` — always fast.
4. Multiple algorithms coexist in the cache (keyed by `algorithm_version`), enabling comparison and gradual rollout.

## Two different operations

The core decision is that **calculation is polymorphic but retrieval is not**.

- **Calculate** (`IMatchingEngine`) — expensive, and the logic varies by algorithm. This is the one interface.
- **Retrieve** (`MatchingService`) — always the same cache query regardless of which engine produced the rows. No
  interface; a plain service class.

The algorithm is **data, not behavior**: which engine calculated a row is a column to filter by, not a method to
dispatch on.

```sql
-- Retrieval is the same query for every algorithm.
SELECT * FROM user_match_cache
WHERE user_id = ?1
  AND algorithm_version = ?2
ORDER BY match_score DESC;
```

## When recalculation happens

Recalculation is event-driven and fire-and-forget (see [8.6.2 Events](./8-backend-architecture.md#862-events)). The
handlers in `events/matching-triggers.ts` refresh a user's cached matches when:

- a profile is updated (wired to `PUT /v1/users/me`),
- a user's tags change,
- a portfolio company's tags change (refreshes every linked mentee), or
- a user's reputation tier changes.

Each handler is wrapped in `withErrorHandling()` and invoked without blocking the request, so a recalculation failure is
logged but never surfaced to the caller.

## Engines

| Engine                     | `algorithm_version` | Scoring                                                                        |
| -------------------------- | ------------------- | ------------------------------------------------------------------------------ |
| `TagBasedMatchingEngineV1` | `tag-based-v1`      | Weighted tag overlap with rarity (shared industries/technologies/stages), 0–60 |
| `AiBasedMatchingEngineV1`  | `ai-based-v1`       | OpenAI scores the mentor's bio against the mentee's company profile, 0–100     |

Both extend `BaseMatchingEngine`, which provides the shared machinery: candidate fetching by opposite role, a 90-day
dormancy cutoff, chunked batch processing, and an atomic per-user cache write. To add an engine, extend
`BaseMatchingEngine` and implement the scoring and fetch hooks — see
[`apps/api/src/providers/matching/README.md`](../../apps/api/src/providers/matching/README.md).

## Bulk processing on Workers

The engines run entirely inside the API Worker and follow a bulk pattern that suits the edge runtime:

```text
Worker (matching engine)
  ├─ Bulk fetch    : a few prepared D1 queries instead of N+1
  ├─ Parallel score: in-memory Promise.all over a batch of candidates
  └─ Atomic write  : delete-then-insert per user via env.DB.batch()
```

- **Bulk fetch.** `fetchMultipleUsersWithTags()` collapses hundreds of per-user lookups into a handful of `IN (...)`
  prepared statements.
- **Parallel calculate.** Scoring is in-memory and cheap; batches run under `Promise.all`.
- **Atomic write.** `writeToCacheAtomic()` replaces a user's rows for an algorithm version in a single `env.DB.batch()`
  transaction, so a reader never sees a half-updated set.

```ts
// Atomic per-user cache replacement (delete then insert) in one transaction.
await env.DB.batch([
  env.DB.prepare('DELETE FROM user_match_cache WHERE user_id = ?1 AND algorithm_version = ?2').bind(userId, version),
  ...rows.map(r =>
    env.DB
      .prepare(
        `INSERT INTO user_match_cache
           (id, user_id, recommended_user_id, match_score, match_explanation, algorithm_version)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
      )
      .bind(newId(), userId, r.recommendedUserId, r.score, JSON.stringify(r.explanation), version)
  ),
]);
```

## Performance targets

- Cache read (matching UI): < 100ms.
- Cache write (single user): < 500ms.
- Cache write (100 users): < 1 minute.

These are exercised by the engine unit tests under `apps/api/src/test/`; see
[13. Testing Strategy](./13-testing-strategy.md).

## Why this holds up

Adding a future algorithm (for example, an ML engine that calls an external API) does not change the read path: it
writes rows under a new `algorithm_version`, and `MatchingService` reads them with the same query. If an engine needs
long external calls beyond a Worker's CPU budget, the natural home is a separate scheduled or queued path that still
writes to `user_match_cache` — the cache contract stays the same.
