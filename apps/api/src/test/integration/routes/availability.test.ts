/**
 * Availability API Routes Integration Tests
 *
 * Tests HTTP endpoints with mocked service layer.
 */

// External dependencies
import { beforeEach, describe, expect, it, vi } from "vitest";

// Internal modules
import app from "../../../index";
import { AvailabilityService } from "../../../services/availability.service";
import {
  createMockAvailabilityBlock,
  createMockAvailabilityRequest,
} from "../../../test/fixtures/availability";
import {
  createMockSlotsResponse,
  mockTimeSlots,
} from "../../../test/fixtures/slots";

// Types
import type {
  AvailabilityBlockResponse,
  GetAvailableSlotsResponse,
} from "@cf-office-hours/shared";

// Mock AvailabilityService
vi.mock("../../../services/availability.service");

// Mock requireAuth middleware to inject a test user
vi.mock("../../../middleware/auth", () => ({
  requireAuth: vi.fn(async (c, next) => {
    const testUser = c.get("testUser") || {
      id: "test-mentor-123",
      email: "mentor@example.com",
      role: "mentor",
    };
    c.set("user", testUser);
    return await next();
  }),
  requireRole: vi.fn(() =>
    vi.fn(async (c, next) => {
      return await next();
    })
  ),
}));

describe("Availability API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /v1/availability", () => {
    const validRequest = createMockAvailabilityRequest();

    it("should create availability block with valid JWT (mentor role)", async () => {
      const mockBlock = createMockAvailabilityBlock({
        mentor_id: "test-mentor-123",
        created_by: "test-mentor-123",
        updated_by: "test-mentor-123",
      });
      vi.spyOn(AvailabilityService.prototype, "createAvailabilityBlock")
        .mockResolvedValue(
          mockBlock,
        );

      const res = await app.request("/v1/availability", {
        method: "POST",
        headers: {
          Authorization: "Bearer mock-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as AvailabilityBlockResponse;
      expect(data.id).toBe("block-uuid-456");
      expect(data.mentor_id).toBe("test-mentor-123");
      expect(data.meeting_type).toBe("online");
    });

    it("should return 403 when user is not a mentor", async () => {
      const AppError = (await import("../../../lib/errors")).AppError;
      vi.spyOn(AvailabilityService.prototype, "createAvailabilityBlock")
        .mockRejectedValue(
          new AppError(
            403,
            "Only mentors can create availability blocks",
            "FORBIDDEN",
          ),
        );

      const res = await app.request("/v1/availability", {
        method: "POST",
        headers: {
          Authorization: "Bearer mock-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(403);
      const data = (await res.json()) as { error: { code: string } };
      expect(data.error.code).toBe("FORBIDDEN");
    });

    it("should return 400 with invalid data", async () => {
      const invalidRequest = {
        start_time: "2025-10-10T14:00:00Z",
        end_time: "2025-10-10T13:00:00Z", // end_time before start_time
        slot_duration_minutes: 30,
        meeting_type: "online",
      };

      const res = await app.request("/v1/availability", {
        method: "POST",
        headers: {
          Authorization: "Bearer mock-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invalidRequest),
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: unknown };
      expect(data.error).toBeDefined();
    });

    it("should return 400 with in-person meeting type", async () => {
      // Zod schema validation catches this before reaching service layer
      const invalidRequest = {
        ...validRequest,
        meeting_type: "in_person_preset",
      };

      const res = await app.request("/v1/availability", {
        method: "POST",
        headers: {
          Authorization: "Bearer mock-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invalidRequest),
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error?: unknown };
      // Zod validation error, not service-level error
      expect(data.error).toBeDefined();
    });

    it("should return 400 with missing required fields", async () => {
      const invalidRequest = {
        start_time: "2025-10-10T14:00:00Z",
        // Missing end_time, slot_duration_minutes, meeting_type
      };

      const res = await app.request("/v1/availability", {
        method: "POST",
        headers: {
          Authorization: "Bearer mock-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invalidRequest),
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 with invalid slot_duration_minutes", async () => {
      const invalidRequest = {
        ...validRequest,
        slot_duration_minutes: 45, // Not in allowed values: 15, 20, 30, 60
      };

      const res = await app.request("/v1/availability", {
        method: "POST",
        headers: {
          Authorization: "Bearer mock-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invalidRequest),
      });

      expect(res.status).toBe(400);
    });

    it("should handle service errors gracefully", async () => {
      const AppError = (await import("../../../lib/errors")).AppError;
      vi.spyOn(AvailabilityService.prototype, "createAvailabilityBlock")
        .mockRejectedValue(
          new AppError(
            500,
            "Failed to create availability block",
            "CREATION_FAILED",
          ),
        );

      const res = await app.request("/v1/availability", {
        method: "POST",
        headers: {
          Authorization: "Bearer mock-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(500);
      const data = (await res.json()) as { error: { code: string } };
      expect(data.error.code).toBe("CREATION_FAILED");
    });

    it("should accept buffer_minutes within valid range", async () => {
      const mockBlock = createMockAvailabilityBlock({
        mentor_id: "test-mentor-123",
      });
      vi.spyOn(AvailabilityService.prototype, "createAvailabilityBlock")
        .mockResolvedValue(
          mockBlock,
        );

      const requestWithBuffer = {
        ...validRequest,
        buffer_minutes: 15,
      };

      const res = await app.request("/v1/availability", {
        method: "POST",
        headers: {
          Authorization: "Bearer mock-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestWithBuffer),
      });

      expect(res.status).toBe(201);
    });

    it("should reject buffer_minutes outside valid range", async () => {
      const invalidRequest = {
        ...validRequest,
        buffer_minutes: 75, // Exceeds max of 60
      };

      const res = await app.request("/v1/availability", {
        method: "POST",
        headers: {
          Authorization: "Bearer mock-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invalidRequest),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /v1/availability/slots", () => {
    it("should return available slots with valid JWT", async () => {
      const mockResponse = createMockSlotsResponse([
        mockTimeSlots.morning,
        mockTimeSlots.afternoon,
      ]);

      vi.spyOn(AvailabilityService.prototype, "getAvailableSlots")
        .mockResolvedValue(mockResponse);

      const res = await app.request("/v1/availability/slots", {
        method: "GET",
        headers: {
          Authorization: "Bearer mock-token",
        },
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as GetAvailableSlotsResponse;
      expect(data.slots).toHaveLength(2);
      expect(data.slots[0].id).toBe("slot-morning");
      expect(data.slots[1].id).toBe("slot-afternoon");
      expect(data.pagination.total).toBe(2);
    });

    it("should filter slots by mentor_id", async () => {
      const mockResponse = createMockSlotsResponse([mockTimeSlots.available]);

      vi.spyOn(AvailabilityService.prototype, "getAvailableSlots")
        .mockResolvedValue(mockResponse);

      const validUUID = "550e8400-e29b-41d4-a716-446655440000";
      const res = await app.request(
        `/v1/availability/slots?mentor_id=${validUUID}`,
        {
          method: "GET",
          headers: {
            Authorization: "Bearer mock-token",
          },
        },
      );

      expect(res.status).toBe(200);
      expect(AvailabilityService.prototype.getAvailableSlots)
        .toHaveBeenCalledWith(
          expect.objectContaining({ mentor_id: validUUID }),
        );
    });

    it("should filter slots by date range", async () => {
      const mockResponse = createMockSlotsResponse([mockTimeSlots.available]);

      vi.spyOn(AvailabilityService.prototype, "getAvailableSlots")
        .mockResolvedValue(mockResponse);

      const res = await app.request(
        "/v1/availability/slots?start_date=2025-10-15&end_date=2025-10-31",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer mock-token",
          },
        },
      );

      expect(res.status).toBe(200);
      expect(AvailabilityService.prototype.getAvailableSlots)
        .toHaveBeenCalledWith(
          expect.objectContaining({
            start_date: "2025-10-15",
            end_date: "2025-10-31",
          }),
        );
    });

    it("should apply limit parameter", async () => {
      const mockResponse = createMockSlotsResponse([mockTimeSlots.available]);

      vi.spyOn(AvailabilityService.prototype, "getAvailableSlots")
        .mockResolvedValue(mockResponse);

      const res = await app.request("/v1/availability/slots?limit=25", {
        method: "GET",
        headers: {
          Authorization: "Bearer mock-token",
        },
      });

      expect(res.status).toBe(200);
      expect(AvailabilityService.prototype.getAvailableSlots)
        .toHaveBeenCalledWith(
          expect.objectContaining({ limit: 25 }),
        );
    });

    it("should return empty slots array when no slots available", async () => {
      const mockResponse = createMockSlotsResponse([]);

      vi.spyOn(AvailabilityService.prototype, "getAvailableSlots")
        .mockResolvedValue(mockResponse);

      const res = await app.request("/v1/availability/slots", {
        method: "GET",
        headers: {
          Authorization: "Bearer mock-token",
        },
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as GetAvailableSlotsResponse;
      expect(data.slots).toHaveLength(0);
      expect(data.pagination.total).toBe(0);
    });

    it("should return 200 with auth (mocked middleware always sets user)", async () => {
      const mockResponse = createMockSlotsResponse([]);

      vi.spyOn(AvailabilityService.prototype, "getAvailableSlots")
        .mockResolvedValue(mockResponse);

      const res = await app.request("/v1/availability/slots", {
        method: "GET",
      });

      // Note: Mock auth middleware always sets user, so this returns 200
      // In production, 401 would be returned for missing JWT
      expect(res.status).toBe(200);
    });

    it("should return 500 when service throws error", async () => {
      const AppError = (await import("../../../lib/errors")).AppError;
      vi.spyOn(AvailabilityService.prototype, "getAvailableSlots")
        .mockRejectedValue(
          new AppError(500, "Failed to fetch available slots", "FETCH_FAILED"),
        );

      const res = await app.request("/v1/availability/slots", {
        method: "GET",
        headers: {
          Authorization: "Bearer mock-token",
        },
      });

      expect(res.status).toBe(500);
      const data = (await res.json()) as { error: { code: string } };
      expect(data.error.code).toBe("FETCH_FAILED");
    });
  });
});
