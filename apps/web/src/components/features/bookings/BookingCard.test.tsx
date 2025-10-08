/**
 * Tests for BookingCard Component
 */

// External dependencies
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Internal modules
import { BookingCard } from './BookingCard';
import { createMockMyBooking } from '@/test/fixtures/bookings';

describe('BookingCard', () => {
  it('should render mentor details when current user is mentee', () => {
    const booking = createMockMyBooking({
      mentee_id: 'current-user-id',
      mentor_id: 'mentor-123',
    });

    render(<BookingCard booking={booking} currentUserId="current-user-id" />);

    expect(screen.getByText('John Mentor')).toBeInTheDocument();
    expect(screen.getByText('Mentor')).toBeInTheDocument();
  });

  it('should render mentee details when current user is mentor', () => {
    const booking = createMockMyBooking({
      mentor_id: 'current-user-id',
      mentee_id: 'mentee-123',
    });

    render(<BookingCard booking={booking} currentUserId="current-user-id" />);

    expect(screen.getByText('Jane Mentee')).toBeInTheDocument();
    expect(screen.getByText('Mentee')).toBeInTheDocument();
  });

  it('should format date and time correctly', () => {
    const booking = createMockMyBooking({
      mentee_id: 'current-user-id',
      time_slot: {
        start_time: '2025-10-15T19:00:00Z',
        end_time: '2025-10-15T19:30:00Z',
        mentor_id: 'mentor-123',
      },
    });

    render(<BookingCard booking={booking} currentUserId="current-user-id" />);

    expect(screen.getByText('Oct 15, 2025')).toBeInTheDocument();
    // Time shown depends on local timezone, just check it's present
    expect(screen.getByText(/\d{1,2}:\d{2} (AM|PM)/i)).toBeInTheDocument();
  });

  it('should show correct status badge for pending booking', () => {
    const booking = createMockMyBooking({ status: 'pending' });

    render(<BookingCard booking={booking} currentUserId="current-user-id" />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('should show correct status badge for confirmed booking', () => {
    const booking = createMockMyBooking({ status: 'confirmed' });

    render(<BookingCard booking={booking} currentUserId="current-user-id" />);

    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('should show correct status badge for canceled booking', () => {
    const booking = createMockMyBooking({ status: 'canceled' });

    render(<BookingCard booking={booking} currentUserId="current-user-id" />);

    expect(screen.getByText('Canceled')).toBeInTheDocument();
  });

  it('should truncate long meeting goals', () => {
    const longGoal =
      'This is a very long meeting goal that should be truncated because it exceeds the maximum length allowed for display in the card component';
    const booking = createMockMyBooking({ meeting_goal: longGoal });

    render(<BookingCard booking={booking} currentUserId="current-user-id" />);

    const goalElement = screen.getByTitle(longGoal);
    expect(goalElement).toBeInTheDocument();
    expect(goalElement.textContent).toContain('...');
  });

  it('should display full meeting goal when short', () => {
    const shortGoal = 'Quick chat about product strategy';
    const booking = createMockMyBooking({ meeting_goal: shortGoal });

    render(<BookingCard booking={booking} currentUserId="current-user-id" />);

    expect(screen.getByText(shortGoal)).toBeInTheDocument();
  });

  it('should call onClick handler when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    const booking = createMockMyBooking({ id: 'booking-123' });

    render(<BookingCard booking={booking} currentUserId="current-user-id" onClick={handleClick} />);

    const card = screen.getByRole('button');
    await user.click(card);

    expect(handleClick).toHaveBeenCalledWith('booking-123');
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    const booking = createMockMyBooking({ id: 'booking-123' });

    render(<BookingCard booking={booking} currentUserId="current-user-id" onClick={handleClick} />);

    const card = screen.getByRole('button');
    card.focus();
    await user.keyboard('{Enter}');

    expect(handleClick).toHaveBeenCalledWith('booking-123');
  });

  it('should display user initials when no avatar URL', () => {
    const booking = createMockMyBooking({
      mentee_id: 'current-user-id',
      mentor: {
        id: 'mentor-123',
        profile: {
          name: 'John Mentor',
          avatar_url: null,
        },
      },
    });

    render(<BookingCard booking={booking} currentUserId="current-user-id" />);

    expect(screen.getByText('JM')).toBeInTheDocument();
  });

  it('should display avatar image when avatar URL provided', () => {
    const booking = createMockMyBooking({
      mentee_id: 'current-user-id',
      mentor: {
        id: 'mentor-123',
        profile: {
          name: 'John Mentor',
          avatar_url: 'https://example.com/avatar.jpg',
        },
      },
    });

    render(<BookingCard booking={booking} currentUserId="current-user-id" />);

    const avatar = screen.getByAltText('John Mentor');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('should have appropriate ARIA label', () => {
    const booking = createMockMyBooking({
      mentee_id: 'current-user-id',
      mentor: {
        id: 'mentor-123',
        profile: {
          name: 'John Mentor',
          avatar_url: null,
        },
      },
      time_slot: {
        start_time: '2025-10-15T19:00:00Z',
        end_time: '2025-10-15T19:30:00Z',
        mentor_id: 'mentor-123',
      },
    });

    render(<BookingCard booking={booking} currentUserId="current-user-id" />);

    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('aria-label');
    expect(card.getAttribute('aria-label')).toContain('John Mentor');
    expect(card.getAttribute('aria-label')).toContain('Oct 15, 2025');
  });
});
