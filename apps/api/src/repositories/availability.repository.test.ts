/**
 * Unit tests for AvailabilityRepository.
 *
 * Tests database operations for availability_blocks table.
 */

// External dependencies
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Internal modules
import { AvailabilityRepository } from './availability.repository';

// Types
import type { Env } from '../types/bindings';
import type { AvailabilityBlockResponse } from '@cf-office-hours/shared';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
};

vi.mock('../lib/db', () => ({
  createSupabaseClient: vi.fn(() => mockSupabase),
}));

describe('AvailabilityRepository', () => {
  let repository: AvailabilityRepository;
  let mockEnv: Env;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = {
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-key',
    } as Env;
    repository = new AvailabilityRepository(mockEnv);
  });

  describe('create', () => {
    it('should create availability block with valid data', async () => {
      const mentorId = 'mentor-uuid-123';
      const mockBlock: AvailabilityBlockResponse = {
        id: 'block-uuid-456',
        mentor_id: mentorId,
        recurrence_pattern: 'one_time',
        start_date: null,
        end_date: null,
        start_time: '2025-10-10T14:00:00Z',
        end_time: '2025-10-10T16:00:00Z',
        slot_duration_minutes: 30,
        buffer_minutes: 0,
        meeting_type: 'online',
        location_preset_id: null,
        location_custom: null,
        description: 'Test block',
        created_at: '2025-10-05T12:00:00Z',
        updated_at: '2025-10-05T12:00:00Z',
        created_by: mentorId,
        updated_by: mentorId,
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockBlock,
              error: null,
            }),
          }),
        }),
      });

      const result = await repository.create(mentorId, {
        start_time: '2025-10-10T14:00:00Z',
        end_time: '2025-10-10T16:00:00Z',
        slot_duration_minutes: 30,
        buffer_minutes: 0,
        meeting_type: 'online',
        description: 'Test block',
      });

      expect(result).toEqual(mockBlock);
      expect(mockSupabase.from).toHaveBeenCalledWith('availability_blocks');
    });

    it('should throw error when database insert fails', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      await expect(
        repository.create('mentor-uuid-123', {
          start_time: '2025-10-10T14:00:00Z',
          end_time: '2025-10-10T16:00:00Z',
          slot_duration_minutes: 30,
          buffer_minutes: 0,
          meeting_type: 'online',
        })
      ).rejects.toThrow('Database error');
    });

    it('should set recurrence_pattern to one_time', async () => {
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'block-id',
              recurrence_pattern: 'one_time',
            },
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        insert: insertMock,
      });

      await repository.create('mentor-uuid-123', {
        start_time: '2025-10-10T14:00:00Z',
        end_time: '2025-10-10T16:00:00Z',
        slot_duration_minutes: 30,
        buffer_minutes: 0,
        meeting_type: 'online',
      });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          recurrence_pattern: 'one_time',
        })
      );
    });
  });

  describe('findByMentor', () => {
    it('should return mentor availability blocks', async () => {
      const mentorId = 'mentor-uuid-123';
      const mockBlocks: AvailabilityBlockResponse[] = [
        {
          id: 'block-1',
          mentor_id: mentorId,
          recurrence_pattern: 'one_time',
          start_date: null,
          end_date: null,
          start_time: '2025-10-10T14:00:00Z',
          end_time: '2025-10-10T16:00:00Z',
          slot_duration_minutes: 30,
          buffer_minutes: 0,
          meeting_type: 'online',
          location_preset_id: null,
          location_custom: null,
          description: null,
          created_at: '2025-10-05T12:00:00Z',
          updated_at: '2025-10-05T12:00:00Z',
          created_by: mentorId,
          updated_by: mentorId,
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockBlocks,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await repository.findByMentor(mentorId);

      expect(result).toEqual(mockBlocks);
      expect(mockSupabase.from).toHaveBeenCalledWith('availability_blocks');
    });

    it('should return empty array when no blocks found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await repository.findByMentor('mentor-uuid-123');

      expect(result).toEqual([]);
    });

    it('should return empty array on database error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          }),
        }),
      });

      const result = await repository.findByMentor('mentor-uuid-123');

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return availability block by ID', async () => {
      const mockBlock: AvailabilityBlockResponse = {
        id: 'block-uuid-456',
        mentor_id: 'mentor-uuid-123',
        recurrence_pattern: 'one_time',
        start_date: null,
        end_date: null,
        start_time: '2025-10-10T14:00:00Z',
        end_time: '2025-10-10T16:00:00Z',
        slot_duration_minutes: 30,
        buffer_minutes: 0,
        meeting_type: 'online',
        location_preset_id: null,
        location_custom: null,
        description: null,
        created_at: '2025-10-05T12:00:00Z',
        updated_at: '2025-10-05T12:00:00Z',
        created_by: 'mentor-uuid-123',
        updated_by: 'mentor-uuid-123',
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockBlock,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await repository.findById('block-uuid-456');

      expect(result).toEqual(mockBlock);
    });

    it('should return null when block not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
              }),
            }),
          }),
        }),
      });

      const result = await repository.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });
});
