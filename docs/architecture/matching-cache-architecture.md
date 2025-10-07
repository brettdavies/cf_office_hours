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

### Adding MLMatchingEngineV2

```typescript
// apps/api/src/providers/matching/ml.engine.ts

export class MLMatchingEngineV2 implements IMatchingEngine {
  async recalculateMatches(userId: string): Promise<void> {
    // 1. Fetch user features
    // 2. Run ML model inference
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
