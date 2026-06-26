/**
 * AI-Based Matching Engine V1 Tests
 *
 * Tests the AI-based matching engine using OpenAI for scoring mentor-mentee matches.
 */

// External dependencies
import { describe, it, expect, beforeEach } from 'vitest';

// Internal modules
import { AiBasedMatchingEngineV1 } from '../../../providers/matching/ai-based.engine';
import { createTestDb, insertRow } from '../../helpers/d1';

// Centralized fixtures (REQUIRED per Section 14.11.2)
import { mockAiMatchData } from '../../fixtures/matching-ai';

describe('AiBasedMatchingEngineV1', () => {
  let engine: AiBasedMatchingEngineV1;
  let raw: ReturnType<typeof createTestDb>['raw'];
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    const db = createTestDb();
    raw = db.raw;
    engine = new AiBasedMatchingEngineV1(db.DB as unknown as D1Database, mockApiKey);
  });

  describe('getAlgorithmVersion', () => {
    it('should return correct algorithm version', () => {
      expect(engine.getAlgorithmVersion()).toBe('ai-based-v1');
    });
  });

  describe('fetchUserWithTags', () => {
    it('should fetch mentor with bio', async () => {
      insertRow(raw, 'users', {
        id: 'mentor-1',
        airtable_record_id: 'air-1',
        email: 'mentor1@test.com',
        role: 'mentor',
      });
      insertRow(raw, 'user_profiles', {
        id: 'p1',
        user_id: 'mentor-1',
        name: 'Mentor One',
        bio: 'Expert in DevOps and cloud infrastructure',
      });

      const result = await (engine as any).fetchUserWithTags('mentor-1');

      expect(result).toMatchObject({
        id: 'mentor-1',
        email: 'mentor1@test.com',
        role: 'mentor',
        user_profiles: {
          bio: 'Expert in DevOps and cloud infrastructure',
          portfolio_company_id: null,
        },
        portfolio_company: null,
      });
    });

    it('should fetch mentee with portfolio company', async () => {
      insertRow(raw, 'users', {
        id: 'mentee-1',
        airtable_record_id: 'air-2',
        email: 'mentee1@test.com',
        role: 'mentee',
      });
      insertRow(raw, 'user_profiles', {
        id: 'p2',
        user_id: 'mentee-1',
        name: 'Mentee One',
        portfolio_company_id: 'company-1',
      });
      insertRow(raw, 'portfolio_companies', {
        id: 'company-1',
        name: 'Acme Health',
        description: 'Healthcare analytics startup',
      });

      const result = await (engine as any).fetchUserWithTags('mentee-1');

      expect(result).toMatchObject({
        id: 'mentee-1',
        role: 'mentee',
        portfolio_company: { description: 'Healthcare analytics startup' },
      });
    });

    it('should return null if user not found', async () => {
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
