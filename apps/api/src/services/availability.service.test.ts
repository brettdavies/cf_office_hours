/**
 * Unit tests for AvailabilityService.
 *
 * Tests business logic for availability operations.
 */

// External dependencies
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Internal modules
import { AvailabilityService } from './availability.service';
import { AppError } from '../lib/errors';
import {
  createMockAvailabilityBlock,
  createMockAvailabilityRequest,
} from '../test/fixtures/availability';

// Types
import type { Env } from '../types/bindings';

// Mock repository
const mockRepository = {
  create: vi.fn(),
  findByMentor: vi.fn(),
  findById: vi.fn(),
};

vi.mock('../repositories/availability.repository', () => ({
  AvailabilityRepository: vi.fn().mockImplementation(() => mockRepository),
}));

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let mockEnv: Env;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = {
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-key',
    } as Env;
    service = new AvailabilityService(mockEnv);
  });

  describe('createAvailabilityBlock', () => {
    const validData = createMockAvailabilityRequest();

    it('should create availability block for mentor', async () => {
      const mockBlock = createMockAvailabilityBlock();

      mockRepository.create.mockResolvedValue(mockBlock);

      const result = await service.createAvailabilityBlock('mentor-uuid-123', 'mentor', validData);

      expect(result).toEqual(mockBlock);
      expect(mockRepository.create).toHaveBeenCalledWith('mentor-uuid-123', validData);
    });

    it('should reject non-mentor users', async () => {
      await expect(
        service.createAvailabilityBlock('mentee-uuid-123', 'mentee', validData)
      ).rejects.toThrow(AppError);

      await expect(
        service.createAvailabilityBlock('mentee-uuid-123', 'mentee', validData)
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Only mentors can create availability blocks',
      });

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject non-online meeting types', async () => {
      const invalidData = {
        ...validData,
        meeting_type: 'in_person_preset' as any,
      };

      await expect(
        service.createAvailabilityBlock('mentor-uuid-123', 'mentor', invalidData)
      ).rejects.toThrow(AppError);

      await expect(
        service.createAvailabilityBlock('mentor-uuid-123', 'mentor', invalidData)
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_MEETING_TYPE',
        message: 'Only "online" meeting type is supported in this version',
      });

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should handle repository errors', async () => {
      mockRepository.create.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        service.createAvailabilityBlock('mentor-uuid-123', 'mentor', validData)
      ).rejects.toThrow(AppError);

      await expect(
        service.createAvailabilityBlock('mentor-uuid-123', 'mentor', validData)
      ).rejects.toMatchObject({
        statusCode: 500,
        code: 'CREATION_FAILED',
        message: 'Failed to create availability block',
      });
    });

    it('should allow coordinators to create availability blocks', async () => {
      const mockBlock = createMockAvailabilityBlock({
        id: 'block-uuid-789',
        mentor_id: 'coordinator-uuid-456',
        description: 'Coordinator block',
        created_by: 'coordinator-uuid-456',
        updated_by: 'coordinator-uuid-456',
      });

      mockRepository.create.mockResolvedValue(mockBlock);

      // Coordinators should be rejected (only mentors allowed per AC)
      await expect(
        service.createAvailabilityBlock('coordinator-uuid-456', 'coordinator', validData)
      ).rejects.toThrow(AppError);
    });
  });

  describe('getAvailabilityBlocksByMentor', () => {
    it('should return availability blocks for mentor', async () => {
      const mockBlocks = [createMockAvailabilityBlock({ id: 'block-1', description: null })];

      mockRepository.findByMentor.mockResolvedValue(mockBlocks);

      const result = await service.getAvailabilityBlocksByMentor('mentor-uuid-123');

      expect(result).toEqual(mockBlocks);
      expect(mockRepository.findByMentor).toHaveBeenCalledWith('mentor-uuid-123');
    });

    it('should return empty array when no blocks found', async () => {
      mockRepository.findByMentor.mockResolvedValue([]);

      const result = await service.getAvailabilityBlocksByMentor('mentor-uuid-123');

      expect(result).toEqual([]);
    });
  });

  describe('getAvailabilityBlockById', () => {
    it('should return availability block by ID', async () => {
      const mockBlock = createMockAvailabilityBlock({ description: null });

      mockRepository.findById.mockResolvedValue(mockBlock);

      const result = await service.getAvailabilityBlockById('block-uuid-456');

      expect(result).toEqual(mockBlock);
      expect(mockRepository.findById).toHaveBeenCalledWith('block-uuid-456');
    });

    it('should throw 404 when block not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getAvailabilityBlockById('nonexistent-id')).rejects.toThrow(AppError);

      await expect(service.getAvailabilityBlockById('nonexistent-id')).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Availability block not found',
      });
    });
  });
});
