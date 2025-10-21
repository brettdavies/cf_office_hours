/**
 * OverridesLoadingState Component Tests
 *
 * Tests loading skeleton component.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { OverridesLoadingState } from './OverridesLoadingState';

describe('OverridesLoadingState', () => {
  it('should render header section', () => {
    const { container } = render(<OverridesLoadingState />);

    // Check for header section with mb-6 class
    const header = container.querySelector('.mb-6');
    expect(header).toBeInTheDocument();
  });

  it('should render 8 card skeletons in grid', () => {
    const { container } = render(<OverridesLoadingState />);

    // Check for grid with gap-6 class
    const grid = container.querySelector('.grid.gap-6');
    expect(grid).toBeInTheDocument();

    // Grid should contain 8 children (skeleton cards)
    const gridChildren = grid?.children;
    expect(gridChildren?.length).toBe(8);
  });

  it('should render with grid layout', () => {
    const { container } = render(<OverridesLoadingState />);

    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
  });

  it('should render in container with padding', () => {
    const { container } = render(<OverridesLoadingState />);

    const wrapper = container.querySelector('.container');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveClass('mx-auto', 'px-4', 'py-8');
  });
});
