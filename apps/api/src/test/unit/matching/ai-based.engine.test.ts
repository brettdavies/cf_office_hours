/**
 * AI-Based Matching Engine V1 Tests
 *
 * Tests the AI-based matching engine using OpenAI for scoring mentor-mentee matches.
 */

// External dependencies
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

// Internal modules
import { AiBasedMatchingEngineV1 } from '../../../providers/matching/ai-based.engine';

// Centralized fixtures (REQUIRED per Section 14.11.2)
import {
  createMockUserWithBio,
  createMockMenteeWithCompany,
  mockAiMatchData,
} from '../../fixtures/matching-ai';

// Mock Supabase client
const createMockSupabaseClient = (): SupabaseClient => {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  } as unknown as SupabaseClient;
};

describe('AiBasedMatchingEngineV1', () => {
  let db: SupabaseClient;
  let engine: AiBasedMatchingEngineV1;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    db = createMockSupabaseClient();
    engine = new AiBasedMatchingEngineV1(db, mockApiKey);
  });

  describe('getAlgorithmVersion', () => {
    it('should return correct algorithm version', () => {
      expect(engine.getAlgorithmVersion()).toBe('ai-based-v1');
    });
  });

  describe('fetchUserWithTags', () => {
    it('should fetch mentor with bio', async () => {
      const mockMentor = createMockUserWithBio();

      db.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockMentor.id,
                email: mockMentor.email,
                role: mockMentor.role,
                is_active: mockMentor.is_active,
                last_activity_at: mockMentor.last_activity_at?.toISOString(),
                deleted_at: mockMentor.deleted_at,
                user_profiles: mockMentor.user_profiles,
              },
              error: null,
            }),
          })),
        })),
      })) as any;

      const result = await (engine as any).fetchUserWithTags(mockMentor.id);

      expect(result).toMatchObject({
        id: mockMentor.id,
        email: mockMentor.email,
        role: 'mentor',
        user_profiles: {
          bio: mockMentor.user_profiles.bio,
          portfolio_company_id: null,
        },
        portfolio_company: null,
      });
    });

    it('should fetch mentee with portfolio company', async () => {
      const mockMentee = createMockMenteeWithCompany();

      db.from = vi.fn((table) => {
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: mockMentee.id,
                    email: mockMentee.email,
                    role: mockMentee.role,
                    is_active: mockMentee.is_active,
                    last_activity_at: mockMentee.last_activity_at?.toISOString(),
                    deleted_at: mockMentee.deleted_at,
                    user_profiles: mockMentee.user_profiles,
                  },
                  error: null,
                }),
              })),
            })),
          };
        } else if (table === 'portfolio_companies') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: mockMentee.portfolio_company,
                  error: null,
                }),
              })),
            })),
          };
        }
        return {} as any;
      }) as any;

      const result = await (engine as any).fetchUserWithTags(mockMentee.id);

      expect(result).toMatchObject({
        id: mockMentee.id,
        role: 'mentee',
        portfolio_company: {
          description: mockMentee.portfolio_company?.description,
        },
      });
    });

    it('should return null if user not found', async () => {
      db.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          })),
        })),
      })) as any;

      const result = await (engine as any).fetchUserWithTags('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('generateExplanation', () => {
    it('should generate explanation for valid match (Excellent)', () => {
      const mentor = mockAiMatchData.mentorWithBio;
      const mentee = mockAiMatchData.menteeWithCompany;
      const score = 85;

      const explanation = (engine as any).generateExplanation(mentor, mentee, score);

      expect(explanation).toMatchObject({
        tagOverlap: [], // AI-based matching doesn't use tags
        summary: 'Excellent AI match: Mentor expertise aligns with company needs',
      });
    });

    it('should generate explanation for Good match (50-69)', () => {
      const mentor = mockAiMatchData.mentorWithBio;
      const mentee = mockAiMatchData.menteeWithCompany;
      const score = 60;

      const explanation = (engine as any).generateExplanation(mentor, mentee, score);

      expect(explanation.summary).toContain('Good AI match');
    });

    it('should generate explanation for Fair match (30-49)', () => {
      const mentor = mockAiMatchData.mentorWithBio;
      const mentee = mockAiMatchData.menteeWithCompany;
      const score = 40;

      const explanation = (engine as any).generateExplanation(mentor, mentee, score);

      expect(explanation.summary).toContain('Fair AI match');
    });

    it('should generate explanation for Weak match (<30)', () => {
      const mentor = mockAiMatchData.mentorWithBio;
      const mentee = mockAiMatchData.menteeWithCompany;
      const score = 20;

      const explanation = (engine as any).generateExplanation(mentor, mentee, score);

      expect(explanation.summary).toContain('Weak AI match');
    });

    it('should generate explanation for missing bio', () => {
      const mentor = mockAiMatchData.missingBio;
      const mentee = mockAiMatchData.menteeWithCompany;
      const score = 0;

      const explanation = (engine as any).generateExplanation(mentor, mentee, score);

      expect(explanation.summary).toContain('AI matching unavailable');
      expect(explanation.tagOverlap).toEqual([]);
    });

    it('should generate explanation for missing company description', () => {
      const mentor = mockAiMatchData.mentorWithBio;
      const mentee = mockAiMatchData.missingCompany;
      const score = 0;

      const explanation = (engine as any).generateExplanation(mentor, mentee, score);

      expect(explanation.summary).toContain('AI matching unavailable');
    });

    it('should categorize scores correctly across all ranges', () => {
      const mentor = mockAiMatchData.devOpsMentor;
      const mentee = mockAiMatchData.fintechMentee;

      // Excellent (70+)
      let explanation = (engine as any).generateExplanation(mentor, mentee, 85);
      expect(explanation.summary).toContain('Excellent');

      // Good (50-69)
      explanation = (engine as any).generateExplanation(mentor, mentee, 60);
      expect(explanation.summary).toContain('Good');

      // Fair (30-49)
      explanation = (engine as any).generateExplanation(mentor, mentee, 40);
      expect(explanation.summary).toContain('Fair');

      // Weak (<30)
      explanation = (engine as any).generateExplanation(mentor, mentee, 20);
      expect(explanation.summary).toContain('Weak');
    });
  });
});
