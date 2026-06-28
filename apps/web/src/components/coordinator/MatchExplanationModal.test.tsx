/**
 * Tests for MatchExplanationModal.
 *
 * Verifies AI-insights rendering, neutral "not evaluated" states for factors no
 * algorithm computes, and that tag-based explanations still render real chips.
 */

import { screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MatchExplanationModal } from './MatchExplanationModal';
import { renderWithProviders } from '@/test/test-utils';
import {
  createMockMatchExplanation,
  createMockAiMatchExplanation,
} from '@/test/fixtures/matching';

type ExplainState = {
  data: { explanation: unknown } | undefined;
  isPending: boolean;
};

const state: ExplainState = { data: undefined, isPending: false };

vi.mock('@/hooks/useMatching', () => ({
  useExplainMatch: () => ({
    mutate: vi.fn(),
    data: state.data,
    isPending: state.isPending,
    reset: vi.fn(),
  }),
}));

const renderModal = (algorithmVersion: string) =>
  renderWithProviders(
    <MatchExplanationModal
      isOpen
      onClose={vi.fn()}
      userId1="user-1"
      userId2="user-2"
      algorithmVersion={algorithmVersion}
    />
  );

describe('MatchExplanationModal', () => {
  beforeEach(() => {
    state.data = undefined;
    state.isPending = false;
  });

  it('renders AI insights and neutral factor states for an ai-based explanation', () => {
    state.data = { explanation: createMockAiMatchExplanation() };

    renderModal('ai-based-v1');

    expect(screen.getByText('AI Insights')).toBeInTheDocument();
    expect(
      screen.getByText(/AI-generated match based on mentor expertise/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Apex Dynamics focuses on innovation/i)
    ).toBeInTheDocument();

    // Stage and Reputation are not computed by any algorithm: neutral, never a red ✗.
    expect(screen.getAllByText(/Not evaluated by this algorithm/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/may not be compatible/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/different stages/i)).not.toBeInTheDocument();
    expect(screen.queryByText('✗')).not.toBeInTheDocument();
    // Empty tag overlap under ai-based reads neutral, not "No shared tags".
    expect(screen.queryByText(/No shared tags/i)).not.toBeInTheDocument();
  });

  it('renders real tag chips for a tag-based explanation and keeps factors neutral', () => {
    state.data = {
      explanation: createMockMatchExplanation({
        tagOverlap: [
          { category: 'industry', tag: 'FinTech' },
          { category: 'technology', tag: 'React' },
        ],
        summary: 'Strong tag-based overlap',
      }),
    };

    renderModal('tag-based-v1');

    expect(screen.getByText('FinTech')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText(/2 shared tags/i)).toBeInTheDocument();
    expect(screen.getByText('Strong tag-based overlap')).toBeInTheDocument();
    // Stage and Reputation still neutral; no red ✗.
    expect(screen.getAllByText(/Not evaluated by this algorithm/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('✗')).not.toBeInTheDocument();
  });

  it('shows "No shared tags" for an empty tag-based overlap (evaluated, zero result)', () => {
    state.data = {
      explanation: createMockMatchExplanation({ tagOverlap: [], summary: 'Weak match' }),
    };

    renderModal('tag-based-v1');

    expect(screen.getByText(/No shared tags/i)).toBeInTheDocument();
  });

  it('shows the not-available message when there is no explanation', () => {
    state.data = { explanation: null };

    renderModal('ai-based-v1');

    expect(screen.getByText(/Match explanation not available/i)).toBeInTheDocument();
  });
});
