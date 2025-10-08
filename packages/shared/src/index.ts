/**
 * CF Office Hours - Shared Package
 *
 * This package exports shared types, schemas, constants, and utilities
 * used across both frontend and backend applications.
 */

// Export generated API types (auto-generated from OpenAPI spec, DO NOT EDIT MANUALLY)
// Note: api.generated.ts is excluded from TS compilation but can be imported directly
// export * from './types/api.generated';

// Export schemas (single source of truth for types via z.infer)
export * from "./schemas/user";
export * from "./schemas/availability";
export * from "./schemas/booking";
export * from "./schemas/matching";
export * from "./schemas/common";

// Export constants
export * from "./constants/errors";

// Export utilities when they are created
// export * from './utils';
