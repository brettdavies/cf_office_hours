/**
 * Tests for OverrideRequestCard Component
 *
 * Tests both 'full' and 'summary' variants of the override request card.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { OverrideRequestCard } from './OverrideRequestCard';
import type { TierOverrideRequest } from '@/services/api/bookings';

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

// Helper to create mock override request
function createMockRequest(overrides?: Partial<TierOverrideRequest>): TierOverrideRequest {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

  return {
    id: 'request-1',
    mentee: {
      id: 'mentee-1',
      profile: {
        name: 'John Mentee',
        title: null,
        company: null,
        bio: null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      reputation_tier: 'bronze',
    },
    mentor: {
      id: 'mentor-1',
      profile: {
        name: 'Jane Mentor',
        title: null,
        company: null,
        bio: null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      reputation_tier: 'gold',
    },
    match_score: 85,
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    ...overrides,
  } as TierOverrideRequest;
}

describe('OverrideRequestCard', () => {
  describe('Full Variant (default)', () => {
    it('should render with full variant by default', () => {
      const request = createMockRequest();
      const onToggleSelect = vi.fn();
      const onApprove = vi.fn();
      const onDecline = vi.fn();

      renderWithRouter(
        <OverrideRequestCard
          request={request}
          isSelected={false}
          isFadingOut={false}
          onToggleSelect={onToggleSelect}
          onApprove={onApprove}
          onDecline={onDecline}
        />
      );

      // Should show mentee and mentor names
      expect(screen.getByText('John Mentee')).toBeInTheDocument();
      expect(screen.getByText('Jane Mentor')).toBeInTheDocument();
    });

    it('should show checkbox when variant is full', () => {
      const request = createMockRequest();
      const onToggleSelect = vi.fn();
      const onApprove = vi.fn();
      const onDecline = vi.fn();

      renderWithRouter(
        <OverrideRequestCard
          request={request}
          variant="full"
          isSelected={false}
          isFadingOut={false}
          onToggleSelect={onToggleSelect}
          onApprove={onApprove}
          onDecline={onDecline}
        />
      );

      expect(screen.getByLabelText('Select request')).toBeInTheDocument();
    });

    it('should show approve and decline buttons when variant is full', () => {
      const request = createMockRequest();
      const onToggleSelect = vi.fn();
      const onApprove = vi.fn();
      const onDecline = vi.fn();

      renderWithRouter(
        <OverrideRequestCard
          request={request}
          variant="full"
          isSelected={false}
          isFadingOut={false}
          onToggleSelect={onToggleSelect}
          onApprove={onApprove}
          onDecline={onDecline}
        />
      );

      expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /decline/i })).toBeInTheDocument();
    });

    it('should call onApprove when approve button clicked', () => {
      const request = createMockRequest();
      const onToggleSelect = vi.fn();
      const onApprove = vi.fn();
      const onDecline = vi.fn();

      renderWithRouter(
        <OverrideRequestCard
          request={request}
          variant="full"
          isSelected={false}
          isFadingOut={false}
          onToggleSelect={onToggleSelect}
          onApprove={onApprove}
          onDecline={onDecline}
        />
      );

      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);

      expect(onApprove).toHaveBeenCalledWith('request-1');
    });

    it('should call onDecline when decline button clicked', () => {
      const request = createMockRequest();
      const onToggleSelect = vi.fn();
      const onApprove = vi.fn();
      const onDecline = vi.fn();

      renderWithRouter(
        <OverrideRequestCard
          request={request}
          variant="full"
          isSelected={false}
          isFadingOut={false}
          onToggleSelect={onToggleSelect}
          onApprove={onApprove}
          onDecline={onDecline}
        />
      );

      const declineButton = screen.getByRole('button', { name: /decline/i });
      fireEvent.click(declineButton);

      expect(onDecline).toHaveBeenCalledWith('request-1');
    });

    it('should apply selection ring when isSelected is true', () => {
      const request = createMockRequest();
      const onToggleSelect = vi.fn();
      const onApprove = vi.fn();
      const onDecline = vi.fn();

      const { container } = renderWithRouter(
        <OverrideRequestCard
          request={request}
          variant="full"
          isSelected={true}
          isFadingOut={false}
          onToggleSelect={onToggleSelect}
          onApprove={onApprove}
          onDecline={onDecline}
        />
      );

      const card = container.querySelector('[class*="ring-2"]');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Summary Variant', () => {
    it('should hide checkbox when variant is summary', () => {
      const request = createMockRequest();
      const onClick = vi.fn();

      renderWithRouter(
        <OverrideRequestCard
          request={request}
          variant="summary"
          onClick={onClick}
        />
      );

      expect(screen.queryByLabelText('Select request')).not.toBeInTheDocument();
    });

    it('should hide approve and decline buttons when variant is summary', () => {
      const request = createMockRequest();
      const onClick = vi.fn();

      renderWithRouter(
        <OverrideRequestCard
          request={request}
          variant="summary"
          onClick={onClick}
        />
      );

      expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /decline/i })).not.toBeInTheDocument();
    });

    it('should call onClick when card clicked in summary variant', () => {
      const request = createMockRequest();
      const onClick = vi.fn();

      const { container } = renderWithRouter(
        <OverrideRequestCard
          request={request}
          variant="summary"
          onClick={onClick}
        />
      );

      const card = container.firstChild as HTMLElement;
      fireEvent.click(card);

      expect(onClick).toHaveBeenCalled();
    });

    it('should not show selection ring in summary variant', () => {
      const request = createMockRequest();
      const onClick = vi.fn();

      const { container } = renderWithRouter(
        <OverrideRequestCard
          request={request}
          variant="summary"
          isSelected={true}
          onClick={onClick}
        />
      );

      // Selection ring should not be applied in summary variant even if isSelected=true
      const card = container.querySelector('[class*="ring-2"][class*="ring-primary"]');
      expect(card).not.toBeInTheDocument();
    });

    it('should have cursor pointer styling in summary variant', () => {
      const request = createMockRequest();
      const onClick = vi.fn();

      const { container } = renderWithRouter(
        <OverrideRequestCard
          request={request}
          variant="summary"
          onClick={onClick}
        />
      );

      const card = container.querySelector('[class*="cursor-pointer"]');
      expect(card).toBeInTheDocument();
    });

    it('should still show urgency indicators in summary variant', () => {
      const now = new Date();
      const urgentExpiry = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours (urgent)

      const request = createMockRequest({
        expires_at: urgentExpiry.toISOString(),
      });
      const onClick = vi.fn();

      renderWithRouter(
        <OverrideRequestCard
          request={request}
          variant="summary"
          onClick={onClick}
        />
      );

      // Should show expiration badge
      expect(screen.getByText(/Expires in/)).toBeInTheDocument();
    });
  });

  describe('Common Behavior', () => {
    it('should display match score', () => {
      const request = createMockRequest({ match_score: 92.5 });

      renderWithRouter(
        <OverrideRequestCard
          request={request}
          variant="summary"
          onClick={vi.fn()}
        />
      );

      expect(screen.getByText('92.50')).toBeInTheDocument();
    });

    it('should handle null match score', () => {
      const request = createMockRequest({ match_score: null });

      renderWithRouter(
        <OverrideRequestCard
          request={request}
          variant="summary"
          onClick={vi.fn()}
        />
      );

      expect(screen.getByText('N/A')).toBeInTheDocument();
    });

    it('should show request time information', () => {
      const request = createMockRequest();

      renderWithRouter(
        <OverrideRequestCard
          request={request}
          variant="summary"
          onClick={vi.fn()}
        />
      );

      expect(screen.getByText(/Requested less than a minute ago/)).toBeInTheDocument();
    });
  });
});
