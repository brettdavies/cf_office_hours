/**
 * Tier Override Service Tests
 *
 * Tests business logic layer for tier override operations.
 * Covers filtering expired requests, error wrapping, and service orchestration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TierOverrideService } from './tier-override.service';
import { AppError } from '../lib/errors';

// Mock repository
vi.mock('../repositories/tier-override.repository', () => ({
  TierOverrideRepository: vi.fn().mockImplementation(() => ({
    getPendingWithUsers: vi.fn(),
  })),
}));

describe('TierOverrideService', () => {
  let service: TierOverrideService;
  let mockRepo: any;

  beforeEach(() => {
    const mockEnv = { SUPABASE: {} };
    // @ts-expect-error - Mocking environment
    service = new TierOverrideService(mockEnv);
    mockRepo = (service as any).tierOverrideRepo;
  });

  describe('getPendingRequests', () => {
    it('should return active (non-expired) requests', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 day
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // -1 day

      const mockRequests = [
        {
          id: 'req-1',
          mentee_id: 'mentee-1',
          mentor_id: 'mentor-1',
          expires_at: futureDate.toISOString(), // Active
          status: 'pending',
        },
        {
          id: 'req-2',
          mentee_id: 'mentee-2',
          mentor_id: 'mentor-2',
          expires_at: pastDate.toISOString(), // Expired
          status: 'pending',
        },
        {
          id: 'req-3',
          mentee_id: 'mentee-3',
          mentor_id: 'mentor-3',
          expires_at: futureDate.toISOString(), // Active
          status: 'pending',
        },
      ];

      mockRepo.getPendingWithUsers.mockResolvedValue(mockRequests);

      const result = await service.getPendingRequests();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('req-1');
      expect(result[1].id).toBe('req-3');
      // Expired request should be filtered out
      expect(result.find((r) => r.id === 'req-2')).toBeUndefined();
    });

    it('should return empty array when all requests are expired', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const mockRequests = [
        {
          id: 'req-1',
          expires_at: pastDate,
        },
        {
          id: 'req-2',
          expires_at: pastDate,
        },
      ];

      mockRepo.getPendingWithUsers.mockResolvedValue(mockRequests);

      const result = await service.getPendingRequests();

      expect(result).toEqual([]);
    });

    it('should return empty array when repository returns no requests', async () => {
      mockRepo.getPendingWithUsers.mockResolvedValue([]);

      const result = await service.getPendingRequests();

      expect(result).toEqual([]);
    });

    it('should wrap repository errors in AppError', async () => {
      mockRepo.getPendingWithUsers.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.getPendingRequests()).rejects.toThrow(AppError);

      try {
        await service.getPendingRequests();
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(500);
        expect((error as AppError).code).toBe('TIER_OVERRIDE_FETCH_FAILED');
        expect((error as AppError).message).toBe('Failed to fetch tier override requests');
      }
    });

    it('should include original error details in AppError', async () => {
      const originalError = new Error('Network timeout');
      mockRepo.getPendingWithUsers.mockRejectedValue(originalError);

      try {
        await service.getPendingRequests();
      } catch (error) {
        expect((error as AppError).details).toEqual({
          originalError: 'Network timeout',
        });
      }
    });

    it('should filter requests with expires_at exactly at current time', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 1000); // +1 second

      const mockRequests = [
        {
          id: 'req-1',
          expires_at: now.toISOString(), // Exactly now (should be expired)
        },
        {
          id: 'req-2',
          expires_at: futureDate.toISOString(), // Future (should be active)
        },
      ];

      mockRepo.getPendingWithUsers.mockResolvedValue(mockRequests);

      const result = await service.getPendingRequests();

      // Only future request should be included
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('req-2');
    });
  });
});
