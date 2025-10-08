# Matching Engine Architecture

This directory contains the matching engine infrastructure for calculating and caching user compatibility scores.

## Files

- **`interface.ts`** - TypeScript interfaces and types for matching engines
- **`base.engine.ts`** - Abstract base class providing common infrastructure
- **`tag-based.engine.ts`** - Tag-based matching algorithm (V1)

## Creating a New Matching Engine

To create a new matching algorithm, extend the `BaseMatchingEngine` class:

### Step 1: Define Your User Data Structure

```typescript
import { BaseUserData } from './base.engine';

interface MyUserData extends BaseUserData {
  // Add fields specific to your algorithm
  skillLevel: number;
  interests: string[];
  availability: number;
}
```

### Step 2: Create Your Engine Class

```typescript
import { BaseMatchingEngine } from './base.engine';
import type { MatchExplanation } from './interface';

export class MyMatchingEngineV1 extends BaseMatchingEngine<MyUserData> {
  // 1. Define algorithm version (REQUIRED)
  protected readonly ALGORITHM_VERSION = 'my-algorithm-v1';

  // 2. Implement score calculation (REQUIRED)
  protected calculateScore(user1: MyUserData, user2: MyUserData): number {
    // Your scoring logic here
    // Return a number (typically 0-100)
    const skillDiff = Math.abs(user1.skillLevel - user2.skillLevel);
    const skillScore = Math.max(0, 100 - skillDiff * 10);

    const interestOverlap = user1.interests.filter(
      i => user2.interests.includes(i)
    ).length;
    const interestScore = interestOverlap * 20;

    return Math.min(100, skillScore * 0.6 + interestScore * 0.4);
  }

  // 3. Implement explanation generation (REQUIRED)
  protected generateExplanation(
    user1: MyUserData,
    user2: MyUserData,
    score: number
  ): MatchExplanation {
    // Generate human-readable explanation
    const sharedInterests = user1.interests.filter(
      i => user2.interests.includes(i)
    );

    return {
      summary: `${score >= 70 ? 'Strong' : score >= 40 ? 'Moderate' : 'Weak'} match: ${sharedInterests.length} shared interests`,
      tagOverlap: sharedInterests.map(i => ({ tag: i, category: 'interest' })),
    };
  }

  // 4. Implement user fetching (REQUIRED)
  protected async fetchUserWithTags(userId: string): Promise<MyUserData | null> {
    const { data: user, error } = await this.db
      .from('users')
      .select('*, user_profiles(*)')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return null;
    }

    // Transform database result into MyUserData format
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      last_activity_at: user.last_activity_at,
      deleted_at: user.deleted_at,
      skillLevel: user.user_profiles?.skill_level ?? 1,
      interests: user.user_profiles?.interests ?? [],
      availability: user.user_profiles?.availability ?? 0,
    };
  }

  // 5. (OPTIONAL) Override bulk fetching for performance
  protected async fetchMultipleUsersWithTags(
    userIds: string[]
  ): Promise<MyUserData[]> {
    // Implement efficient bulk fetching
    // Default implementation fetches one-by-one (slow)
    const BATCH_SIZE = 100;
    const allUsers: MyUserData[] = [];

    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);
      const { data: users, error } = await this.db
        .from('users')
        .select('*, user_profiles(*)')
        .in('id', batch);

      if (!error && users) {
        allUsers.push(...users.map(u => ({
          id: u.id,
          email: u.email,
          role: u.role,
          is_active: u.is_active,
          last_activity_at: u.last_activity_at,
          deleted_at: u.deleted_at,
          skillLevel: u.user_profiles?.skill_level ?? 1,
          interests: u.user_profiles?.interests ?? [],
          availability: u.user_profiles?.availability ?? 0,
        })));
      }
    }

    return allUsers;
  }
}
```

### Step 3: Use Your Engine

```typescript
import { MyMatchingEngineV1 } from './my-matching.engine';
import { createClient } from '@supabase/supabase-js';

const db = createClient(SUPABASE_URL, SUPABASE_KEY);
const engine = new MyMatchingEngineV1(db);

// Recalculate matches for one user
await engine.recalculateMatches('user-123');

// Recalculate matches for all users
await engine.recalculateAllMatches({
  batchSize: 50,
  delayBetweenBatches: 100,
});
```

## What the Base Class Provides

The `BaseMatchingEngine` handles:

### ✅ Infrastructure
- Database connection management
- Batch processing with configurable delays
- Atomic cache write operations
- User fetching infrastructure
- Logging patterns

### ✅ Configuration
All customizable via protected properties:
- `DORMANCY_DAYS` - Days before user considered inactive (default: 90)
- `DEFAULT_BATCH_SIZE` - Users per batch (default: 50)
- `DEFAULT_CHUNK_SIZE` - Matches per chunk (default: 100)
- `DEFAULT_CHUNK_DELAY_MS` - Delay between chunks (default: 10ms)
- `DEFAULT_BATCH_DELAY_MS` - Delay between batches (default: 100ms)

### ✅ Public Methods (IMatchingEngine)
- `getAlgorithmVersion()` - Returns algorithm version string
- `recalculateMatches(userId)` - Recalculate for one user
- `recalculateAllMatches(options)` - Recalculate for all users

### ✅ Utility Methods
- `chunkArray()` - Split arrays into chunks
- `delay()` - Async delay helper
- `fetchPotentialMatches()` - Get users to match with
- `writeToCacheAtomic()` - Write results to cache

## What You Must Implement

### 🔴 Required Abstract Methods

1. **`ALGORITHM_VERSION`** (property)
   - Unique identifier for your algorithm
   - Used to version cache entries
   - Example: `'skill-based-v1'`

2. **`calculateScore(user1, user2)`**
   - Calculate match score between two users
   - Returns: number (your choice of range, e.g., 0-100)

3. **`generateExplanation(user1, user2, score)`**
   - Generate human-readable explanation
   - Returns: `MatchExplanation` object
   - Must include `summary` field (string)
   - Can include custom fields

4. **`fetchUserWithTags(userId)`**
   - Fetch user data needed for matching
   - Returns: your custom user data type or null
   - Should check for inactive/deleted users

### 🟡 Optional Overrides

5. **`fetchMultipleUsersWithTags(userIds)`**
   - Bulk fetch users efficiently (reduces N+1 queries)
   - Default: fetches one-by-one (works but slow)
   - Recommended: implement batch fetching for performance

## Best Practices

### Performance
- ✅ Override `fetchMultipleUsersWithTags()` for bulk fetching
- ✅ Use batching (100-200 users per query)
- ✅ Cache expensive calculations
- ✅ Use indexes on frequently queried fields

### Scoring
- ✅ Document your score range (0-60, 0-100, etc.)
- ✅ Use consistent scale across all matches
- ✅ Provide meaningful explanations
- ✅ Consider edge cases (null values, empty arrays)

### Testing
- ✅ Test with real-world data distributions
- ✅ Verify score ranges and edge cases
- ✅ Test bulk processing with large datasets
- ✅ Monitor cache write performance

## Example: Tag-Based Engine V1

See `tag-based.engine.ts` for a complete reference implementation that:
- Uses weighted tag overlap with rarity scoring
- Handles tag inheritance (mentees from companies)
- Implements efficient bulk tag fetching
- Caches tag usage statistics
- Returns 0-60 point scores

## Migration Strategy

When deploying a new algorithm version:

1. **Deploy new code** with new engine class
2. **Run migration** to populate cache with new algorithm
3. **Update API** to use new algorithm version
4. **(Optional) Keep old cache** for comparison/rollback

Cache entries are versioned by `algorithm_version`, so multiple algorithms can coexist.
