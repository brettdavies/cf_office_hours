/**
 * Integration tests for Matching Event Triggers
 *
 * Coverage target: ≥85%
 * Test framework: Vitest 3.x
 *
 * MANDATORY: Uses centralized fixtures from @/test/fixtures/matching
 * (Section 14.11.2, Section 13.7)
 */

// External dependencies
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

// Internal modules
import {
  handleUserProfileUpdate,
  handleUserTagsChange,
  handlePortfolioCompanyTagsChange,
  handleReputationTierChange,
} from '../../../events/matching-triggers';
import { TagBasedMatchingEngineV1 } from '../../../providers/matching/tag-based.engine';

/**
 * Mock Supabase client for testing
 */
const createMockSupabaseClient = (): SupabaseClient => {
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockIs = vi.fn();

  // Chain mock methods
  mockIs.mockReturnValue({
    data: [],
    error: null,
  });

  mockEq.mockReturnValue({
    is: mockIs,
  });

  mockSelect.mockReturnValue({
    eq: mockEq,
  });

  const mockClient = {
    from: vi.fn().mockReturnValue({
      select: mockSelect,
    }),
  } as any;

  return mockClient;
};

describe('Matching Event Triggers', () => {
  let mockDb: SupabaseClient;
  let engineSpy: any;

  beforeEach(() => {
    mockDb = createMockSupabaseClient();
    engineSpy = vi.spyOn(TagBasedMatchingEngineV1.prototype, 'recalculateMatches');
    vi.clearAllMocks();
  });

  // ============================================================================
  // handleUserProfileUpdate
  // ============================================================================

  describe('handleUserProfileUpdate', () => {
    it('should trigger recalculation for user', async () => {
      // Arrange
      const userId = 'user-123';
      engineSpy.mockResolvedValue(undefined);

      // Act
      await handleUserProfileUpdate(userId, mockDb);

      // Assert
      expect(engineSpy).toHaveBeenCalledWith(userId);
      expect(engineSpy).toHaveBeenCalledTimes(1);
    });

    it('should pass correct userId to engine', async () => {
      // Arrange
      const userId = 'user-456';
      engineSpy.mockResolvedValue(undefined);

      // Act
      await handleUserProfileUpdate(userId, mockDb);

      // Assert
      expect(engineSpy).toHaveBeenCalledWith('user-456');
    });

    it('should not throw error if recalculation fails', async () => {
      // Arrange
      const userId = 'user-123';
      engineSpy.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(handleUserProfileUpdate(userId, mockDb)).resolves.not.toThrow();
    });

    it('should handle Error instances gracefully', async () => {
      // Arrange
      const userId = 'user-123';
      engineSpy.mockRejectedValue(new Error('Connection timeout'));

      // Act
      await handleUserProfileUpdate(userId, mockDb);

      // Assert - should not throw
      expect(engineSpy).toHaveBeenCalledWith(userId);
    });

    it('should handle non-Error exceptions gracefully', async () => {
      // Arrange
      const userId = 'user-123';
      engineSpy.mockRejectedValue('String error');

      // Act & Assert
      await expect(handleUserProfileUpdate(userId, mockDb)).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // handleUserTagsChange
  // ============================================================================

  describe('handleUserTagsChange', () => {
    it('should trigger recalculation for user', async () => {
      // Arrange
      const userId = 'user-123';
      engineSpy.mockResolvedValue(undefined);

      // Act
      await handleUserTagsChange(userId, mockDb);

      // Assert
      expect(engineSpy).toHaveBeenCalledWith(userId);
      expect(engineSpy).toHaveBeenCalledTimes(1);
    });

    it('should pass correct userId to engine', async () => {
      // Arrange
      const userId = 'user-789';
      engineSpy.mockResolvedValue(undefined);

      // Act
      await handleUserTagsChange(userId, mockDb);

      // Assert
      expect(engineSpy).toHaveBeenCalledWith('user-789');
    });

    it('should not throw error if recalculation fails', async () => {
      // Arrange
      const userId = 'user-123';
      engineSpy.mockRejectedValue(new Error('Tag service error'));

      // Act & Assert
      await expect(handleUserTagsChange(userId, mockDb)).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // handlePortfolioCompanyTagsChange
  // ============================================================================

  describe('handlePortfolioCompanyTagsChange', () => {
    it('should recalculate matches for all linked mentees', async () => {
      // Arrange
      const companyId = 'company-123';
      const mentees = [
        { user_id: 'mentee-1' },
        { user_id: 'mentee-2' },
        { user_id: 'mentee-3' },
      ];

      const mockIs = vi.fn().mockReturnValue({
        data: mentees,
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        is: mockIs,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      mockDb.from = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      engineSpy.mockResolvedValue(undefined);

      // Act
      await handlePortfolioCompanyTagsChange(companyId, mockDb);

      // Assert
      expect(mockDb.from).toHaveBeenCalledWith('user_profiles');
      expect(mockSelect).toHaveBeenCalledWith('user_id');
      expect(mockEq).toHaveBeenCalledWith('portfolio_company_id', companyId);
      expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
      expect(engineSpy).toHaveBeenCalledTimes(3);
      expect(engineSpy).toHaveBeenCalledWith('mentee-1');
      expect(engineSpy).toHaveBeenCalledWith('mentee-2');
      expect(engineSpy).toHaveBeenCalledWith('mentee-3');
    });

    it('should handle no linked mentees gracefully', async () => {
      // Arrange
      const companyId = 'company-123';

      const mockIs = vi.fn().mockReturnValue({
        data: [],
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        is: mockIs,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      mockDb.from = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      // Act
      await handlePortfolioCompanyTagsChange(companyId, mockDb);

      // Assert
      expect(engineSpy).not.toHaveBeenCalled();
    });

    it('should handle null mentees data gracefully', async () => {
      // Arrange
      const companyId = 'company-123';

      const mockIs = vi.fn().mockReturnValue({
        data: null,
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        is: mockIs,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      mockDb.from = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      // Act
      await handlePortfolioCompanyTagsChange(companyId, mockDb);

      // Assert
      expect(engineSpy).not.toHaveBeenCalled();
    });

    it('should continue processing if one mentee fails', async () => {
      // Arrange
      const companyId = 'company-123';
      const mentees = [
        { user_id: 'mentee-1' },
        { user_id: 'mentee-2' },
        { user_id: 'mentee-3' },
      ];

      const mockIs = vi.fn().mockReturnValue({
        data: mentees,
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        is: mockIs,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      mockDb.from = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      // Fail on second mentee
      engineSpy
        .mockResolvedValueOnce(undefined) // mentee-1 succeeds
        .mockRejectedValueOnce(new Error('DB error')) // mentee-2 fails
        .mockResolvedValueOnce(undefined); // mentee-3 succeeds

      // Act
      await handlePortfolioCompanyTagsChange(companyId, mockDb);

      // Assert
      expect(engineSpy).toHaveBeenCalledTimes(3);
      expect(engineSpy).toHaveBeenNthCalledWith(1, 'mentee-1');
      expect(engineSpy).toHaveBeenNthCalledWith(2, 'mentee-2');
      expect(engineSpy).toHaveBeenNthCalledWith(3, 'mentee-3');
    });

    it('should handle database query errors gracefully', async () => {
      // Arrange
      const companyId = 'company-123';

      const mockIs = vi.fn().mockReturnValue({
        data: null,
        error: { message: 'Connection failed' },
      });

      const mockEq = vi.fn().mockReturnValue({
        is: mockIs,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      mockDb.from = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      // Act & Assert
      await expect(
        handlePortfolioCompanyTagsChange(companyId, mockDb)
      ).resolves.not.toThrow();
      expect(engineSpy).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // handleReputationTierChange
  // ============================================================================

  describe('handleReputationTierChange', () => {
    it('should trigger recalculation for user', async () => {
      // Arrange
      const userId = 'user-123';
      engineSpy.mockResolvedValue(undefined);

      // Act
      await handleReputationTierChange(userId, mockDb);

      // Assert
      expect(engineSpy).toHaveBeenCalledWith(userId);
      expect(engineSpy).toHaveBeenCalledTimes(1);
    });

    it('should pass correct userId to engine', async () => {
      // Arrange
      const userId = 'user-999';
      engineSpy.mockResolvedValue(undefined);

      // Act
      await handleReputationTierChange(userId, mockDb);

      // Assert
      expect(engineSpy).toHaveBeenCalledWith('user-999');
    });

    it('should not throw error if recalculation fails', async () => {
      // Arrange
      const userId = 'user-123';
      engineSpy.mockRejectedValue(new Error('Reputation calculation error'));

      // Act & Assert
      await expect(handleReputationTierChange(userId, mockDb)).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe('Error Handling', () => {
    it('should log errors in development mode for profile updates', async () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const userId = 'user-123';
      engineSpy.mockRejectedValue(new Error('Test error'));

      // Act
      await handleUserProfileUpdate(userId, mockDb);

      // Assert
      expect(consoleSpy).toHaveBeenCalled();

      // Cleanup
      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });

    it('should not throw errors for any handler', async () => {
      // Arrange
      const userId = 'user-123';
      const companyId = 'company-123';
      engineSpy.mockRejectedValue(new Error('Critical error'));

      // Act & Assert
      await expect(handleUserProfileUpdate(userId, mockDb)).resolves.not.toThrow();
      await expect(handleUserTagsChange(userId, mockDb)).resolves.not.toThrow();
      await expect(handleReputationTierChange(userId, mockDb)).resolves.not.toThrow();
      await expect(
        handlePortfolioCompanyTagsChange(companyId, mockDb)
      ).resolves.not.toThrow();
    });
  });
});
