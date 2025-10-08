import { describe, expect, it } from "vitest";
import { CreateBookingSchema } from "./booking";

describe("Booking Schema Validation", () => {
  describe("CreateBookingSchema", () => {
    it("should reject meeting_goal shorter than 10 characters", () => {
      const result = CreateBookingSchema.safeParse({
        time_slot_id: "a1b2c3d4-e5f6-4789-a012-345678901234",
        meeting_goal: "Short",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain(
          "at least 10 characters",
        );
      }
    });

    it("should reject invalid UUID for time_slot_id", () => {
      const result = CreateBookingSchema.safeParse({
        time_slot_id: "not-a-uuid",
        meeting_goal:
          "This is a valid meeting goal with more than 10 characters",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("uuid");
      }
    });

    it("should accept valid booking data", () => {
      const result = CreateBookingSchema.safeParse({
        time_slot_id: "a1b2c3d4-e5f6-4789-a012-345678901234",
        meeting_goal: "Valid meeting goal with sufficient length",
      });

      expect(result.success).toBe(true);
    });
  });
});
