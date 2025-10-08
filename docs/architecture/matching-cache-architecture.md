# Matching System Cache Architecture Plan

## Document Purpose

This document serves as the **planning and decision record** for the event-driven cached matching system implemented across Stories 0.22-0.25.

**Status:** ✅ Architecture Complete - Content migrated to SoT documents
**Last Updated:** 2025-10-07
**Implementation Stories:** 0.22, 0.23, 0.24, 0.25

**⚠️ Note:** Most content from this planning document has been migrated to the authoritative sources:
- **Requirements:** [2-requirements.md](../prd/2-requirements.md) (FR13, FR13a, FR13b, FR14, FR17)
- **Interface Specs:** [4-technical-constraints-and-integration.md](../prd/4-technical-constraints-and-integration.md) (IMatchingEngine Interface)
- **Data Models:** [4-data-models.md](4-data-models.md) (Section 4.8: Matching & Recommendation Models)
- **Backend Architecture:** [8-backend-architecture.md](8-backend-architecture.md) (Section 8.8: IMatchingEngine Interface)
- **API Specification:** [5-api-specification.md](5-api-specification.md) (Section 8: Matching & Recommendations)
- **Testing Strategy:** [13-testing-strategy.md](13-testing-strategy.md) (Epic 6: Matching & Discovery)
- **Story Details:** [5-epic-and-story-structure.md](../prd/5-epic-and-story-structure.md) (Stories 0.22-0.25)

---

## Executive Summary

### The Problem

Original design had coordinators waiting 2-5 seconds for match calculations every time they loaded the UI. This creates poor UX and doesn't scale.

### The Solution

**Event-driven pre-calculation with cached retrieval:**
1. Matching algorithms calculate scores in the background when data changes
2. Results stored in `user_match_cache` table
3. UI retrieval is instant (simple database SELECT)
4. Multiple algorithms can run simultaneously (A/B testing, gradual rollout)

### Architecture Decision

**ONE interface (`IMatchingEngine`) for calculation, NO interface for retrieval**

**Rationale:**
- Calculation is polymorphic (TagBased vs ML vs Realtime algorithms)
- Retrieval is NOT polymorphic (always same SQL query regardless of algorithm)
- Algorithm version is data (column filter), not behavior

---

## Core Principles from First Principles Analysis

### 1. Two Fundamentally Different Operations

**Operation A: CALCULATE match scores** (polymorphic)
- Input: User A, User B, algorithm logic
- Output: Score (0-100), explanation
- Expensive, logic varies by algorithm
- **Needs interface** ✅

**Operation B: RETRIEVE pre-calculated scores** (NOT polymorphic)
- Input: User ID, optional filters
- Output: Cached MatchResults
- Always cheap (database SELECT)
- Logic identical regardless of which algorithm calculated the data
- **No interface needed** ❌

### 2. When Operations Happen

**Calculation (Background, Asynchronous):**
- User profile updated → Recalculate matches for that user
- User tags changed → Recalculate matches for that user
- Portfolio company tags changed → Recalculate matches for linked mentees
- User reputation tier changed → Recalculate matches for that user
- Initial population (run once for existing users)
- Admin-triggered recalculation

**Retrieval (On-Demand, Synchronous):**
- Coordinator loads matching UI → API call → Query cache table
- Always fast (< 100ms)

### 3. Algorithm Version is Data, Not Behavior

```sql
-- Algorithm version is a COLUMN to filter by
SELECT * FROM user_match_cache
WHERE user_id = $1
  AND algorithm_version = 'tag-based-v1'
ORDER BY match_score DESC;

-- NOT a polymorphic interface method
```

This is the same query whether the algorithm is TagBased, ML, or Realtime. The algorithm that calculated the data is stored as metadata.

---

## Why This Architecture Works

### From First Principles

1. **Calculation is polymorphic** → `IMatchingEngine` interface ✅
2. **Retrieval is NOT polymorphic** → Plain `MatchingService` class ✅
3. **Algorithm version is data (column filter), not behavior** → Stored as string ✅
4. **Event-driven recalculation** → Triggers on data changes ✅
5. **On-demand retrieval** → Fast cache queries ✅

### SOLID Principles

**Single Responsibility:**
- `IMatchingEngine` → Calculation logic
- `MatchingService` → Retrieval logic
- Event handlers → Trigger recalculation

**Open/Closed:**
- Open for extension: Add new `IMatchingEngine` implementations
- Closed for modification: MatchingService doesn't change when algorithms change

**Liskov Substitution:**
- Can swap `TagBasedV1` for `MLV2` without breaking system

**Interface Segregation:**
- No unnecessary abstraction (retrieval doesn't need interface)

**Dependency Inversion:**
- High-level modules depend on `IMatchingEngine` abstraction

---

## Migration Path: Future Algorithms

### Adding MLMatchingEngineV2 (Long-Running ML Algorithms)

**⚠️ Important:** Future ML algorithms that call external APIs (>30s response time) should use **Cloudflare Workflows** instead of standard Workers.

**Why Workflows for ML:**
- ✅ **Wall clock time unlimited** (external API waits don't count as CPU time)
- ✅ **Step-based execution** (each step can run up to 5 minutes CPU)
- ✅ **Automatic retries** (built-in error handling)
- ✅ **Persistent state** (survives Worker restarts)
- ✅ **Cost-effective** (only pay for CPU time, not waiting time)

**Example ML Engine using Workflows:**

```typescript
// apps/api/src/workflows/ml-matching.workflow.ts
import { WorkflowEntrypoint, WorkflowStep } from 'cloudflare:workers'

export class MLMatchingWorkflow extends WorkflowEntrypoint {
  async run(event, step: WorkflowStep) {
    const { userId } = event.params

    // Step 1: Fetch user features (fast, ~200ms CPU)
    const features = await step.do('fetch-features', async () => {
      const db = createSupabaseClient(this.env)
      return await db.from('users').select('*').eq('id', userId).single()
    })

    // Step 2: Call external ML API (slow, 45s+ wall clock time, ~10ms CPU)
    const mlScores = await step.do('ml-inference', async () => {
      const response = await fetch(this.env.ML_API_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.env.ML_API_KEY}` },
        body: JSON.stringify({ user_id: userId, features })
      })

      if (!response.ok) {
        throw new Error('ML API failed')  // Automatic retry!
      }

      return await response.json()
    })

    // Step 3: Write to cache (fast, ~20ms CPU)
    await step.do('write-cache', async () => {
      const db = createSupabaseClient(this.env)
      await db.from('user_match_cache').insert(
        mlScores.matches.map(match => ({
          user_id: userId,
          recommended_user_id: match.candidate_id,
          match_score: match.score,
          match_explanation: match.explanation,
          algorithm_version: 'ml-v2',
          calculated_at: new Date()
        }))
      )
    })

    return { success: true, user_id: userId, match_count: mlScores.matches.length }
  }
}

// Trigger from Queue Consumer
// apps/api/src/queues/match-consumer.ts
export default {
  async queue(batch, env) {
    for (const message of batch.messages) {
      const { user_id, algorithm } = message.body

      if (algorithm === 'tag-based-v1') {
        // Fast: Execute in Worker directly
        const engine = new TagBasedMatchingEngineV1(env.db)
        await engine.recalculateMatches(user_id)
      }
      else if (algorithm === 'ml-v2') {
        // Slow: Trigger Workflow
        await env.ML_WORKFLOW.create({
          id: `ml-${user_id}-${Date.now()}`,
          params: { user_id }
        })
      }

      message.ack()
    }
  }
}
```

**Traditional Worker Engine (for fast algorithms):**

```typescript
// apps/api/src/providers/matching/ml.engine.ts
// ⚠️ Only use for ML algorithms that complete in <30 seconds

export class MLMatchingEngineV2 implements IMatchingEngine {
  async recalculateMatches(userId: string): Promise<void> {
    // 1. Fetch user features
    // 2. Run ML model inference (must complete in <30s!)
    // 3. Write to user_match_cache with algorithm_version='ml-v2'
  }

  async recalculateAllMatches(options?: BulkRecalculationOptions): Promise<void> {
    // Heavy computation - use Cloudflare Queues
  }

  getAlgorithmVersion(): string {
    return 'ml-v2';
  }
}
```

### A/B Testing Multiple Algorithms

```typescript
// Run both algorithms
const tagEngine = new TagBasedMatchingEngineV1(db);
const mlEngine = new MLMatchingEngineV2(db);

await Promise.all([
  tagEngine.recalculateMatches(userId),
  mlEngine.recalculateMatches(userId),
]);

// Cache now contains rows for BOTH algorithms:
// - algorithm_version='tag-based-v1'
// - algorithm_version='ml-v2'

// UI can filter by algorithm:
const tagMatches = await matchingService.getRecommendedMentors(userId, {
  algorithmVersion: 'tag-based-v1'
});

const mlMatches = await matchingService.getRecommendedMentors(userId, {
  algorithmVersion: 'ml-v2'
});
```

**No code changes required in MatchingService or API endpoints!**

---

## Performance & Testing

**Performance targets, optimizations, and scalability roadmap** have been moved to the authoritative testing strategy document:

👉 **See:** [13-testing-strategy.md](13-testing-strategy.md) - Epic 6: Performance Targets (Stories 0.23-0.24)

Key targets:
- Cache Write (single user): < 500ms
- Cache Write (100 users): < 1 minute
- Cache Read (coordinator UI): < 100ms

---

## Cloudflare Workers Bulk Processing Architecture (Story 0.23 v1.1)

### Architecture Pattern: Single-Tier Edge Computation

**✅ CORRECT Understanding:**

The matching engine runs entirely on **Cloudflare Workers** and implements a **bulk worker pattern** optimized for edge computing:

```
Cloudflare Worker (tag-based.engine.ts)
  ├─ Bulk Fetch (3-4 HTTP requests via Supabase-js)
  ├─ Parallel Calculate (in-memory, Promise.all)
  └─ Bulk Write (single INSERT via Supabase-js)
```

**Key Points:**

1. **All code executes on the Worker** - No separate calculation service needed
2. **Supabase-js uses HTTP (PostgREST)** - No database connection limits
3. **In-memory calculations are optimal** - Workers are designed for edge computation
4. **Promise.all is fully supported** - Parallel processing within Worker invocation
5. **This IS a bulk pattern** - Batch processing, bulk fetching, bulk writing

### Why This is Optimal for Cloudflare Workers

**✅ Bulk Fetching:**
- `fetchMultipleUsersWithTags()` reduces 501 queries → 3-4 HTTP requests
- Supabase-js over HTTP has no connection pooling concerns
- Unlimited concurrent queries (HTTP-based, not persistent connections)

**✅ Parallel Processing:**
- `Promise.all()` for batch calculations (50 users at a time)
- CPU time only counts active processing, not I/O wait
- In-memory scoring is fast (<1ms per calculation)

**✅ Bulk Writing:**
- `writeToCacheAtomic()` writes all scores in single INSERT
- Minimizes database round-trips
- HTTP-based, no transaction overhead

### What NOT to Do

**❌ INCORRECT Pattern (Multi-Tier):**

```
API Worker → Queue → Calculation Worker → Database
```

This adds unnecessary complexity:
- Extra network hops (latency)
- Queue infrastructure (cost)
- Serialization overhead
- No performance benefit on Workers

**❌ External Service for Calculations:**

Sending simple math operations to another service is anti-pattern on Workers:
- Tag overlap calculation: Simple set intersection
- Stage matching: Lookup in ordered array
- Reputation matching: Numeric comparison
- All calculations: <1ms in-memory

### Cloudflare Workers Limits (2025)

**Connection Limits:**
- 6 concurrent TCP connections per invocation
- **Does NOT apply to Supabase-js** (uses HTTP fetch, not TCP)
- No practical limit for database queries

**CPU Time:**
- 50ms per request (Free/Pro)
- Database I/O doesn't count toward CPU time
- Parallel Promise.all for sync code is unlimited

**Memory:**
- 128MB per invocation
- Chunked processing prevents exhaustion
- Default chunk size: 100 matches

### Performance Improvements (v1.1)

**Database Queries:**
- Before: 501 queries (N+1 problem)
- After: 3-4 queries (99% reduction)

**Processing Speed:**
- Before: Sequential processing
- After: Parallel chunks (10-50x faster)

**Memory Usage:**
- Before: Load all matches at once
- After: Chunked (100 matches per chunk)

**Reliability:**
- Before: All-or-nothing (one failure blocks all)
- After: Individual error isolation (partial success)

### Reference Implementation

See `apps/api/src/providers/matching/tag-based.engine.ts`:
- `fetchMultipleUsersWithTags()` - Bulk fetch with 3-4 queries
- `recalculateMatches()` - Chunked parallel processing
- `recalculateAllMatches()` - Batch processing with error isolation
- `writeToCacheAtomic()` - Bulk INSERT operation

**Tests:** 39 unit tests covering bulk operations in `__tests__/tag-based.engine.test.ts`

---

## References to SoT Documents

**PRD Documents:**
- [2-requirements.md](../prd/2-requirements.md) - FR13, FR13a, FR13b (event-driven cache requirements)
- [4-technical-constraints-and-integration.md](../prd/4-technical-constraints-and-integration.md) - IMatchingEngine interface definition
- [5-epic-and-story-structure.md](../prd/5-epic-and-story-structure.md) - Stories 0.22-0.25 acceptance criteria

**Architecture Documents:**
- [4-data-models.md](4-data-models.md) - Section 4.8: user_match_cache table schema
- [5-api-specification.md](5-api-specification.md) - Section 8: POST /matching/find-matches, POST /matching/explain
- [8-backend-architecture.md](8-backend-architecture.md) - Section 8.8: IMatchingEngine interface & TagBasedMatchingEngineV1 implementation
- [13-testing-strategy.md](13-testing-strategy.md) - Epic 6: Matching test strategy with examples

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-07 | 1.0 | Initial architecture plan created after first principles analysis | Scrum Master (Bob) |
| 2025-10-07 | 2.0 | Migrated content to SoT documents, streamlined to core decisions only | Winston (Architect) |
| 2025-10-07 | 2.1 | Added Cloudflare Workers bulk processing architecture section (Story 0.23 v1.1) | James (Developer) |
