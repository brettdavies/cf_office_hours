/**
 * Integration tests for matching event triggers against an in-memory D1 database.
 */

// External dependencies
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Internal modules
import {
  handleUserProfileUpdate,
  handleUserTagsChange,
  handlePortfolioCompanyTagsChange,
  handleReputationTierChange,
} from '../../../events/matching-triggers';
import { TagBasedMatchingEngineV1 } from '../../../providers/matching/tag-based.engine';
import { createTestDb, insertRow } from '../../helpers/d1';

describe('Matching Event Triggers', () => {
  let db: D1Database;
  let raw: ReturnType<typeof createTestDb>['raw'];
  let engineSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    const created = createTestDb();
    db = created.DB as unknown as D1Database;
    raw = created.raw;
    engineSpy = vi.spyOn(TagBasedMatchingEngineV1.prototype, 'recalculateMatches');
    engineSpy.mockResolvedValue(undefined);
  });

  describe('handleUserProfileUpdate', () => {
    it('triggers recalculation for the user', async () => {
      await handleUserProfileUpdate('user-123', db);
      expect(engineSpy).toHaveBeenCalledWith('user-123');
      expect(engineSpy).toHaveBeenCalledTimes(1);
    });

    it('does not throw when recalculation fails', async () => {
      engineSpy.mockRejectedValue(new Error('Database error'));
      await expect(handleUserProfileUpdate('user-123', db)).resolves.not.toThrow();
    });

    it('does not throw on non-Error exceptions', async () => {
      engineSpy.mockRejectedValue('String error');
      await expect(handleUserProfileUpdate('user-123', db)).resolves.not.toThrow();
    });
  });

  describe('handleUserTagsChange', () => {
    it('triggers recalculation for the user', async () => {
      await handleUserTagsChange('user-789', db);
      expect(engineSpy).toHaveBeenCalledWith('user-789');
      expect(engineSpy).toHaveBeenCalledTimes(1);
    });

    it('does not throw when recalculation fails', async () => {
      engineSpy.mockRejectedValue(new Error('Tag service error'));
      await expect(handleUserTagsChange('user-123', db)).resolves.not.toThrow();
    });
  });

  describe('handlePortfolioCompanyTagsChange', () => {
    const seedMentee = (userId: string, companyId: string): void =>
      insertRow(raw, 'user_profiles', {
        id: `p-${userId}`,
        user_id: userId,
        name: userId,
        portfolio_company_id: companyId,
      });

    it('recalculates matches for all linked mentees', async () => {
      seedMentee('mentee-1', 'company-123');
      seedMentee('mentee-2', 'company-123');
      seedMentee('mentee-3', 'company-123');
      seedMentee('other', 'company-999');

      await handlePortfolioCompanyTagsChange('company-123', db);

      expect(engineSpy).toHaveBeenCalledTimes(3);
      expect(engineSpy).toHaveBeenCalledWith('mentee-1');
      expect(engineSpy).toHaveBeenCalledWith('mentee-2');
      expect(engineSpy).toHaveBeenCalledWith('mentee-3');
    });

    it('does nothing when there are no linked mentees', async () => {
      await handlePortfolioCompanyTagsChange('company-123', db);
      expect(engineSpy).not.toHaveBeenCalled();
    });

    it('continues processing when one mentee fails', async () => {
      seedMentee('mentee-1', 'company-123');
      seedMentee('mentee-2', 'company-123');
      seedMentee('mentee-3', 'company-123');

      engineSpy
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce(undefined);

      await handlePortfolioCompanyTagsChange('company-123', db);

      expect(engineSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('handleReputationTierChange', () => {
    it('triggers recalculation for the user', async () => {
      await handleReputationTierChange('user-999', db);
      expect(engineSpy).toHaveBeenCalledWith('user-999');
      expect(engineSpy).toHaveBeenCalledTimes(1);
    });

    it('does not throw when recalculation fails', async () => {
      engineSpy.mockRejectedValue(new Error('Reputation calculation error'));
      await expect(handleReputationTierChange('user-123', db)).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('does not throw for any handler', async () => {
      engineSpy.mockRejectedValue(new Error('Critical error'));
      await expect(handleUserProfileUpdate('user-123', db)).resolves.not.toThrow();
      await expect(handleUserTagsChange('user-123', db)).resolves.not.toThrow();
      await expect(handleReputationTierChange('user-123', db)).resolves.not.toThrow();
      await expect(handlePortfolioCompanyTagsChange('company-123', db)).resolves.not.toThrow();
    });
  });
});
