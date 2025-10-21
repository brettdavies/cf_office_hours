/**
 * OverridesErrorState Component Tests
 *
 * Tests error state component with retry functionality.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverridesErrorState } from './OverridesErrorState';

describe('OverridesErrorState', () => {
  it('should render error message', () => {
    const onRetry = vi.fn();

    render(<OverridesErrorState onRetry={onRetry} />);

    expect(screen.getByText(/Failed to load override requests/)).toBeInTheDocument();
  });

  it('should render retry button', () => {
    const onRetry = vi.fn();

    render(<OverridesErrorState onRetry={onRetry} />);

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('should call onRetry when button is clicked', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(<OverridesErrorState onRetry={onRetry} />);

    const button = screen.getByRole('button', { name: /retry/i });
    await user.click(button);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should render alert circle icon', () => {
    const onRetry = vi.fn();
    const { container } = render(<OverridesErrorState onRetry={onRetry} />);

    const icon = container.querySelector('.lucide-alert-circle');
    expect(icon).toBeInTheDocument();
  });

  it('should render destructive alert variant', () => {
    const onRetry = vi.fn();
    const { container } = render(<OverridesErrorState onRetry={onRetry} />);

    const alert = container.querySelector('[role="alert"]');
    expect(alert).toBeInTheDocument();
  });

  it('should render in container with padding', () => {
    const onRetry = vi.fn();
    const { container } = render(<OverridesErrorState onRetry={onRetry} />);

    const wrapper = container.querySelector('.container');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveClass('mx-auto', 'px-4', 'py-8');
  });
});
