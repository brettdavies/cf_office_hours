/**
 * OverridesPageHeader Component Tests
 *
 * Tests page header component with title, count badge, and shortcuts button.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverridesPageHeader } from './OverridesPageHeader';

describe('OverridesPageHeader', () => {
  const defaultProps = {
    count: 5,
    totalDisplayed: 5,
    showShortcuts: false,
    onToggleShortcuts: vi.fn(),
  };

  it('should render title and count badge', () => {
    render(<OverridesPageHeader {...defaultProps} />);

    expect(screen.getByText('Pending Override Requests')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should render shortcuts button', () => {
    render(<OverridesPageHeader {...defaultProps} />);

    expect(screen.getByText('Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('should call onToggleShortcuts when button is clicked', async () => {
    const user = userEvent.setup();
    const onToggleShortcuts = vi.fn();

    render(<OverridesPageHeader {...defaultProps} onToggleShortcuts={onToggleShortcuts} />);

    const button = screen.getByRole('button', { name: /shortcuts/i });
    await user.click(button);

    expect(onToggleShortcuts).toHaveBeenCalledTimes(1);
  });

  it('should show filtered count indicator when count < totalDisplayed', () => {
    render(<OverridesPageHeader {...defaultProps} count={3} totalDisplayed={10} />);

    expect(screen.getByText(/Showing 3 of 10 requests/)).toBeInTheDocument();
  });

  it('should not show filtered count indicator when all requests are displayed', () => {
    render(<OverridesPageHeader {...defaultProps} count={10} totalDisplayed={10} />);

    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  it('should show zero count', () => {
    render(<OverridesPageHeader {...defaultProps} count={0} totalDisplayed={0} />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should render description text', () => {
    render(<OverridesPageHeader {...defaultProps} />);

    expect(
      screen.getByText(/Review and manage mentee requests to book higher-tier mentors/)
    ).toBeInTheDocument();
  });
});
