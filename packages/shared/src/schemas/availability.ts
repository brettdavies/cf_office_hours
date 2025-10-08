/**
 * Zod validation schemas for availability-related API requests and responses.
 *
 * These schemas serve three purposes:
 * 1. Runtime validation of API requests/responses
 * 2. TypeScript type generation
 * 3. OpenAPI specification generation
 */

// External dependencies
import { z } from 'zod';

/**
 * Schema for creating an availability block via POST /v1/availability.
 *
 * This story (0.8) supports ONLY one-time availability blocks:
 * - No recurrence patterns (deferred to later stories)
 * - Online meetings only (in-person deferred)
 *
 * Validation rules:
 * - start_time: ISO 8601 datetime string
 * - end_time: ISO 8601 datetime string (must be after start_time)
 * - slot_duration_minutes: must be 15, 20, 30, or 60
 * - buffer_minutes: 0-60 range (default: 0)
 * - meeting_type: must be "online" only
 */
export const CreateAvailabilityBlockSchema = z
  .object({
    start_time: z.string().datetime({ message: 'start_time must be a valid ISO 8601 datetime' }),
    end_time: z.string().datetime({ message: 'end_time must be a valid ISO 8601 datetime' }),
    slot_duration_minutes: z
      .enum(['15', '30', '60'])
      .or(
        z
          .number()
          .int()
          .refine(val => [15, 30, 60].includes(val), {
            message: 'slot_duration_minutes must be 15, 30, or 60',
          })
      )
      .transform(val => (typeof val === 'string' ? parseInt(val, 10) : val)),
    buffer_minutes: z
      .number()
      .int()
      .min(0, 'buffer_minutes must be at least 0')
      .max(60, 'buffer_minutes cannot exceed 60')
      .default(0)
      .optional(),
    meeting_type: z.literal('online', {
      errorMap: () => ({
        message: 'meeting_type must be "online" (in-person meetings not yet supported)',
      }),
    }),
    description: z.string().max(1000, 'description cannot exceed 1000 characters').optional(),
  })
  .refine(data => new Date(data.end_time) > new Date(data.start_time), {
    message: 'end_time must be after start_time',
    path: ['end_time'],
  });

/**
 * Schema for availability block response.
 *
 * Returned by:
 * - POST /v1/availability (create)
 * - GET /v1/availability/:id (get by ID)
 * - GET /v1/availability (list)
 */
export const AvailabilityBlockResponseSchema = z.object({
  id: z.string().uuid(),
  mentor_id: z.string().uuid(),
  recurrence_pattern: z.enum(['one_time', 'weekly', 'monthly']),
  start_date: z.string().date().nullable(),
  end_date: z.string().date().nullable(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  slot_duration_minutes: z.number().int(),
  buffer_minutes: z.number().int(),
  meeting_type: z.enum(['online', 'in_person_preset', 'in_person_custom']),
  location_preset_id: z.string().uuid().nullable(),
  location_custom: z.string().nullable(),
  description: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  created_by: z.string().uuid(),
  updated_by: z.string().uuid(),
});

/**
 * Schema for mentor information nested in time slot response.
 */
export const TimeSlotMentorSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  avatar_url: z.string().url().nullable(),
});

/**
 * Schema for time slot response.
 *
 * Time slots are generated from availability blocks and represent
 * individual bookable time intervals.
 */
export const TimeSlotResponseSchema = z.object({
  id: z.string().uuid(),
  availability_id: z.string().uuid(),
  mentor_id: z.string().uuid(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  slot_duration_minutes: z.number().int(),
  is_booked: z.boolean(),
  mentor: TimeSlotMentorSchema,
  created_at: z.string().datetime(),
});

/**
 * Schema for GET /v1/availability/slots query parameters.
 */
export const GetAvailableSlotsQuerySchema = z.object({
  mentor_id: z.string().uuid().optional(),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
  meeting_type: z.enum(['online', 'in_person']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
});

/**
 * Schema for GET /v1/availability/slots response.
 */
export const GetAvailableSlotsResponseSchema = z.object({
  slots: z.array(TimeSlotResponseSchema),
  pagination: z.object({
    total: z.number().int(),
    limit: z.number().int(),
    has_more: z.boolean(),
  }),
});

/**
 * TypeScript types inferred from Zod schemas.
 *
 * These provide compile-time type safety while the schemas
 * provide runtime validation.
 */
export type CreateAvailabilityBlockRequest = z.infer<typeof CreateAvailabilityBlockSchema>;
export type AvailabilityBlockResponse = z.infer<typeof AvailabilityBlockResponseSchema>;
export type TimeSlotMentor = z.infer<typeof TimeSlotMentorSchema>;
export type TimeSlotResponse = z.infer<typeof TimeSlotResponseSchema>;
export type GetAvailableSlotsQuery = z.infer<typeof GetAvailableSlotsQuerySchema>;
export type GetAvailableSlotsResponse = z.infer<typeof GetAvailableSlotsResponseSchema>;
