/**
 * OverridesEmptyStates Component Tests
 *
 * Tests empty state component with 3 variants: no-data, filtered, all-processed.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverridesEmptyStates } from './OverridesEmptyStates';

describe('OverridesEmptyStates', () => {
  describe('no-data variant', () => {
    it('should render no data message', () => {
      render(<OverridesEmptyStates variant="no-data" />);

      expect(screen.getByText('No pending override requests')).toBeInTheDocument();
      expect(
        screen.getByText('There are no tier override requests at this time.')
      ).toBeInTheDocument();
    });

    it('should show checkmark icon', () => {
      const { container } = render(<OverridesEmptyStates variant="no-data" />);

      const icon = container.querySelector('.lucide-check-circle');
      expect(icon).toBeInTheDocument();
    });

    it('should not render clear filters button', () => {
      render(<OverridesEmptyStates variant="no-data" />);

      expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
    });
  });

  describe('filtered variant', () => {
    it('should render filtered message', () => {
      render(<OverridesEmptyStates variant="filtered" />);

      expect(screen.getByText('No requests match your filters')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your filter criteria.')).toBeInTheDocument();
    });

    it('should show filter icon', () => {
      const { container } = render(<OverridesEmptyStates variant="filtered" />);

      const icon = container.querySelector('.lucide-filter');
      expect(icon).toBeInTheDocument();
    });

    it('should render clear filters button when callback provided', () => {
      const onClearFilters = vi.fn();

      render(<OverridesEmptyStates variant="filtered" onClearFilters={onClearFilters} />);

      expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
    });

    it('should call onClearFilters when button is clicked', async () => {
      const user = userEvent.setup();
      const onClearFilters = vi.fn();

      render(<OverridesEmptyStates variant="filtered" onClearFilters={onClearFilters} />);

      const button = screen.getByRole('button', { name: /clear filters/i });
      await user.click(button);

      expect(onClearFilters).toHaveBeenCalledTimes(1);
    });

    it('should not crash when onClearFilters is not provided', () => {
      expect(() => {
        render(<OverridesEmptyStates variant="filtered" />);
      }).not.toThrow();
    });
  });

  describe('all-processed variant', () => {
    it('should render all processed message', () => {
      render(<OverridesEmptyStates variant="all-processed" />);

      expect(screen.getByText('No pending override requests')).toBeInTheDocument();
      expect(screen.getByText('Great work! All requests have been processed.')).toBeInTheDocument();
    });

    it('should show checkmark icon', () => {
      const { container } = render(<OverridesEmptyStates variant="all-processed" />);

      const icon = container.querySelector('.lucide-check-circle');
      expect(icon).toBeInTheDocument();
    });

    it('should not render clear filters button', () => {
      render(<OverridesEmptyStates variant="all-processed" />);

      expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
    });
  });
});
