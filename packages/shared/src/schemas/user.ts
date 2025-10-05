/**
 * Zod validation schemas for user-related API requests and responses.
 *
 * These schemas serve three purposes:
 * 1. Runtime validation of API requests/responses
 * 2. TypeScript type generation
 * 3. OpenAPI specification generation
 */

// External dependencies
import { z } from 'zod';

/**
 * Schema for updating user profile via PUT /v1/users/me.
 *
 * All fields are optional to support partial updates.
 * Validation rules:
 * - name: 2-100 characters
 * - bio: max 500 characters
 * - title: max 100 characters
 * - company: max 100 characters
 */
export const UpdateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  bio: z.string().max(500, 'Bio cannot exceed 500 characters').optional(),
  title: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
});

/**
 * Schema for user profile data.
 */
export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  title: z.string().nullable(),
  company: z.string().nullable(),
  bio: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

/**
 * Schema for user response with embedded profile.
 *
 * Returned by:
 * - GET /v1/users/me
 * - PUT /v1/users/me
 * - GET /v1/users/:id
 */
export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  airtable_record_id: z.string().nullable(),
  email: z.string().email(),
  role: z.enum(['mentee', 'mentor', 'coordinator']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  profile: UserProfileSchema,
});

/**
 * TypeScript types inferred from Zod schemas.
 *
 * These provide compile-time type safety while the schemas
 * provide runtime validation.
 */
export type UpdateProfileRequest = z.infer<typeof UpdateProfileSchema>;
export type UserProfileResponse = z.infer<typeof UserProfileSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
