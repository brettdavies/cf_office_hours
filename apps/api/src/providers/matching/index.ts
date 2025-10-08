/**
 * Matching Engine Module
 *
 * Exports all matching engine interfaces, base classes, and implementations.
 *
 * USAGE:
 * ```typescript
 * // Use an existing engine
 * import { TagBasedMatchingEngineV1 } from '@/providers/matching';
 *
 * // Create a new engine
 * import { BaseMatchingEngine, type BaseUserData } from '@/providers/matching';
 *
 * // Use interfaces
 * import type { IMatchingEngine, MatchExplanation } from '@/providers/matching';
 * ```
 */

// Interfaces and types
export type {
  IMatchingEngine,
  MatchExplanation,
  BulkRecalculationOptions,
  UserMatchCache,
} from './interface';

// Base infrastructure
export { BaseMatchingEngine } from './base.engine';
export type { BaseUserData, CacheEntry } from './base.engine';

// Concrete implementations
export { TagBasedMatchingEngineV1 } from './tag-based.engine';
