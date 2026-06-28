/**
 * Unit tests for AvailabilityRepository against an in-memory D1 database.
 */

// External dependencies
import { describe, it, expect, beforeEach } from 'vitest';

// Internal modules
import { AvailabilityRepository } from './availability.repository';
import { createMockAvailabilityRequest } from '../test/fixtures/availability';
import { createTestDb, insertRow } from '../test/helpers/d1';

// Types
import type { Env } from '../types/bindings';

const MENTOR_ID = 'mentor-uuid-123';

describe('AvailabilityRepository', () => {
  let repository: AvailabilityRepository;
  let raw: ReturnType<typeof createTestDb>['raw'];

  beforeEach(() => {
    const db = createTestDb();
    raw = db.raw;
    repository = new AvailabilityRepository({ DB: db.DB } as unknown as Env);
  });

  describe('create', () => {
    it('creates an availability block and generates its time slots', async () => {
      const request = createMockAvailabilityRequest();
      const result = await repository.create(MENTOR_ID, request);

      expect(result.mentor_id).toBe(MENTOR_ID);
      expect(result.slot_duration_minutes).toBe(30);
      expect(result.start_time).toBe(request.start_time);

      // The persisted block stores its meeting kind in the `location` column,
      // which the API response schema does not surface; assert it on the row.
      const { location } = raw
        .prepare('SELECT location FROM availability WHERE id = ?')
        .get(result.id) as { location: string };
      expect(location).toBe('online');

      // A 2-hour window at 30-minute slots yields 4 slots.
      const { n } = raw
        .prepare('SELECT COUNT(*) AS n FROM time_slots WHERE availability_id = ?')
        .get(result.id) as { n: number };
      expect(n).toBe(4);
    });

    it('throws when the insert violates a constraint', async () => {
      await expect(
        repository.create(
          MENTOR_ID,
          createMockAvailabilityRequest({
            slot_duration_minutes: 17 as unknown as 30,
          })
        )
      ).rejects.toThrow();
    });
  });

  describe('findByMentor', () => {
    beforeEach(() => {
      insertRow(raw, 'availability', {
        id: 'a-late',
        mentor_id: MENTOR_ID,
        start_time: '2025-10-10T14:00:00Z',
        end_time: '2025-10-10T15:00:00Z',
        slot_duration_minutes: 30,
        location: 'online',
      });
      insertRow(raw, 'availability', {
        id: 'a-early',
        mentor_id: MENTOR_ID,
        start_time: '2025-10-09T14:00:00Z',
        end_time: '2025-10-09T15:00:00Z',
        slot_duration_minutes: 30,
        location: 'online',
      });
      insertRow(raw, 'availability', {
        id: 'a-deleted',
        mentor_id: MENTOR_ID,
        start_time: '2025-10-08T14:00:00Z',
        end_time: '2025-10-08T15:00:00Z',
        slot_duration_minutes: 30,
        location: 'online',
        deleted_at: '2025-10-08T00:00:00Z',
      });
    });

    it('returns non-deleted blocks ordered by start_time', async () => {
      const result = await repository.findByMentor(MENTOR_ID);
      expect(result.map(b => b.id)).toEqual(['a-early', 'a-late']);
    });

    it('returns an empty array for an unknown mentor', async () => {
      expect(await repository.findByMentor('nobody')).toEqual([]);
    });
  });

  describe('findById', () => {
    it('returns the block, or null when deleted or missing', async () => {
      insertRow(raw, 'availability', {
        id: 'a-active',
        mentor_id: MENTOR_ID,
        start_time: '2025-10-10T14:00:00Z',
        end_time: '2025-10-10T15:00:00Z',
        slot_duration_minutes: 30,
        location: 'online',
      });
      insertRow(raw, 'availability', {
        id: 'a-removed',
        mentor_id: MENTOR_ID,
        start_time: '2025-10-10T14:00:00Z',
        end_time: '2025-10-10T15:00:00Z',
        slot_duration_minutes: 30,
        location: 'online',
        deleted_at: '2025-10-10T00:00:00Z',
      });

      expect((await repository.findById('a-active'))?.id).toBe('a-active');
      expect(await repository.findById('a-removed')).toBeNull();
      expect(await repository.findById('missing')).toBeNull();
    });
  });
});
