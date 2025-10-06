/**
 * MentorGrid Component Tests
 */

// External dependencies
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

// Internal modules
import { MentorGrid } from './MentorGrid';
import { createMockUserProfile } from '@/test/fixtures/user';

// Test wrapper with Router
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

describe('MentorGrid', () => {
  it('renders correct number of mentor cards', () => {
    const mentors = [
      createMockUserProfile({ id: 'mentor-1', role: 'mentor' }),
      createMockUserProfile({ id: 'mentor-2', role: 'mentor' }),
      createMockUserProfile({ id: 'mentor-3', role: 'mentor' }),
    ];

    render(<MentorGrid mentors={mentors} onViewProfile={vi.fn()} />, {
      wrapper: TestWrapper,
    });

    expect(screen.getAllByTestId('mentor-card')).toHaveLength(3);
  });

  it('applies responsive grid classes', () => {
    const { container } = render(<MentorGrid mentors={[]} onViewProfile={vi.fn()} />, {
      wrapper: TestWrapper,
    });

    const grid = container.firstChild as HTMLElement;
    expect(grid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
  });

  it('renders empty grid when no mentors', () => {
    const { container } = render(<MentorGrid mentors={[]} onViewProfile={vi.fn()} />, {
      wrapper: TestWrapper,
    });

    const grid = container.firstChild as HTMLElement;
    expect(grid.children).toHaveLength(0);
  });

  it('calls onViewProfile with correct user ID', () => {
    const mockOnViewProfile = vi.fn();
    const mentor = createMockUserProfile({ id: 'mentor-123', role: 'mentor' });

    render(<MentorGrid mentors={[mentor]} onViewProfile={mockOnViewProfile} />, {
      wrapper: TestWrapper,
    });

    const viewButton = screen.getByTestId('view-profile-button');
    viewButton.click();

    expect(mockOnViewProfile).toHaveBeenCalledWith('mentor-123');
  });
});
