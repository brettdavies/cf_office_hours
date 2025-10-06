/**
 * Booking Schema Validation Unit Tests
 *
 * Tests Zod schema validation logic directly (without HTTP layer).
 * These tests ensure that the CreateBookingSchema properly validates input data.
 */

// External dependencies
import { describe, it, expect } from 'vitest';

// Internal modules
import { CreateBookingSchema } from '@cf-office-hours/shared/schemas/booking';

describe('Booking Schema Validation', () => {
  describe('CreateBookingSchema', () => {
    it('should reject meeting_goal shorter than 10 characters', () => {
      const result = CreateBookingSchema.safeParse({
        time_slot_id: 'a1b2c3d4-e5f6-4789-a012-345678901234',
        meeting_goal: 'Short',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['meeting_goal']);
        expect(result.error.errors[0].message).toContain('at least 10 characters');
      }
    });

    it('should reject invalid UUID for time_slot_id', () => {
      const result = CreateBookingSchema.safeParse({
        time_slot_id: 'not-a-uuid',
        meeting_goal: 'This is a valid meeting goal with more than 10 characters',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['time_slot_id']);
        expect(result.error.errors[0].message).toContain('uuid');
      }
    });

    it('should accept valid booking data', () => {
      const result = CreateBookingSchema.safeParse({
        time_slot_id: 'a1b2c3d4-e5f6-4789-a012-345678901234',
        meeting_goal: 'Valid meeting goal with sufficient length',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.time_slot_id).toBe('a1b2c3d4-e5f6-4789-a012-345678901234');
        expect(result.data.meeting_goal).toBe('Valid meeting goal with sufficient length');
      }
    });

    it('should reject empty meeting_goal', () => {
      const result = CreateBookingSchema.safeParse({
        time_slot_id: 'a1b2c3d4-e5f6-4789-a012-345678901234',
        meeting_goal: '',
      });

      expect(result.success).toBe(false);
    });

    it('should reject missing time_slot_id', () => {
      const result = CreateBookingSchema.safeParse({
        meeting_goal: 'Valid meeting goal with sufficient length',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['time_slot_id']);
      }
    });

    it('should reject missing meeting_goal', () => {
      const result = CreateBookingSchema.safeParse({
        time_slot_id: 'a1b2c3d4-e5f6-4789-a012-345678901234',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['meeting_goal']);
      }
    });
  });
});
