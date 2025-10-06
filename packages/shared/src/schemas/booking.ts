import { z } from 'zod';

/**
 * Schema for creating a new booking.
 * Epic 0: Simple booking - no materials URLs, no calendar integration.
 */
export const CreateBookingSchema = z.object({
  time_slot_id: z.string().uuid(),
  meeting_goal: z.string().min(10, 'Meeting goal must be at least 10 characters'),
});

/**
 * Schema for booking response.
 * Returns complete booking details including metadata.
 */
export const BookingResponseSchema = z.object({
  id: z.string().uuid(),
  time_slot_id: z.string().uuid(),
  mentor_id: z.string().uuid(),
  mentee_id: z.string().uuid(),
  meeting_goal: z.string(),
  status: z.enum(['pending', 'confirmed', 'completed', 'canceled', 'expired']),
  meeting_start_time: z.string().datetime(),
  meeting_end_time: z.string().datetime(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

/**
 * TypeScript type for create booking request.
 * Backend: Use this type for input validation.
 */
export type CreateBookingRequest = z.infer<typeof CreateBookingSchema>;

/**
 * TypeScript type for booking response.
 * Backend: Use this type for repository/service return values.
 * Frontend: Use OpenAPI-generated types from @shared/types/api.generated.ts
 */
export type BookingResponse = z.infer<typeof BookingResponseSchema>;
