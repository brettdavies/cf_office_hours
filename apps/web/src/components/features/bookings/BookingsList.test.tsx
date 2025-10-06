/**
 * Tests for BookingsList Component
 */

// External dependencies
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Internal modules
import { BookingsList } from './BookingsList';
import { createMockMyBookingsList, createMockMyBooking } from '@/test/fixtures/bookings';

describe('BookingsList', () => {
  it('should filter bookings into upcoming and past tabs correctly', () => {
    const bookings = createMockMyBookingsList({
      upcomingCount: 2,
      pastCount: 1,
    });

    render(
      <BookingsList
        bookings={bookings}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        currentUserId="current-user-id"
      />
    );

    // Check tab counts
    expect(screen.getByText(/Upcoming \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Past \(1\)/i)).toBeInTheDocument();
  });

  it('should show upcoming bookings by default', () => {
    const bookings = createMockMyBookingsList({
      upcomingCount: 2,
      pastCount: 1,
    });

    render(
      <BookingsList
        bookings={bookings}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        currentUserId="current-user-id"
      />
    );

    // Should show upcoming bookings
    expect(screen.getByText('Mentor 1')).toBeInTheDocument();
    expect(screen.getByText('Mentor 2')).toBeInTheDocument();
    expect(screen.queryByText('Past Mentor 1')).not.toBeInTheDocument();
  });

  it('should switch to past bookings tab when clicked', async () => {
    const user = userEvent.setup();
    const bookings = createMockMyBookingsList({
      upcomingCount: 1,
      pastCount: 2,
    });

    render(
      <BookingsList
        bookings={bookings}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        currentUserId="current-user-id"
      />
    );

    // Click past tab
    await user.click(screen.getByText(/Past \(2\)/i));

    // Should show past bookings
    expect(screen.getByText('Past Mentor 1')).toBeInTheDocument();
    expect(screen.getByText('Past Mentor 2')).toBeInTheDocument();
    expect(screen.queryByText('Mentor 1')).not.toBeInTheDocument();
  });

  it('should show empty state when no upcoming bookings', () => {
    render(
      <BookingsList
        bookings={[]}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        currentUserId="current-user-id"
      />
    );

    expect(screen.getByText('No upcoming bookings')).toBeInTheDocument();
    expect(
      screen.getByText(/You don't have any scheduled meetings yet/i)
    ).toBeInTheDocument();
  });

  it('should show empty state when no past bookings', async () => {
    const user = userEvent.setup();
    const bookings = createMockMyBookingsList({
      upcomingCount: 1,
      pastCount: 0,
    });

    render(
      <BookingsList
        bookings={bookings}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        currentUserId="current-user-id"
      />
    );

    // Switch to past tab
    await user.click(screen.getByText(/Past \(0\)/i));

    expect(screen.getByText('No past bookings')).toBeInTheDocument();
  });

  it('should display skeleton loaders while loading', () => {
    render(
      <BookingsList
        bookings={[]}
        isLoading={true}
        error={null}
        onRetry={vi.fn()}
        currentUserId="current-user-id"
      />
    );

    // Check that we have skeleton cards (they have animate-pulse class)
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should show error message when error occurs', () => {
    const error = new Error('Failed to fetch bookings');
    const onRetry = vi.fn();

    render(
      <BookingsList
        bookings={[]}
        isLoading={false}
        error={error}
        onRetry={onRetry}
        currentUserId="current-user-id"
      />
    );

    expect(screen.getByText('Failed to load bookings')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch bookings')).toBeInTheDocument();
  });

  it('should call onRetry when retry button clicked', async () => {
    const user = userEvent.setup();
    const error = new Error('Network error');
    const onRetry = vi.fn();

    render(
      <BookingsList
        bookings={[]}
        isLoading={false}
        error={error}
        onRetry={onRetry}
        currentUserId="current-user-id"
      />
    );

    await user.click(screen.getByText('Try Again'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should sort upcoming bookings chronologically (earliest first)', () => {
    const booking1 = createMockMyBooking({
      id: 'booking-1',
      mentee_id: 'current-user-id',
      time_slot: {
        start_time: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days
        end_time: new Date(Date.now() + 86400000 * 3 + 1800000).toISOString(),
        mentor_id: 'mentor-1',
      },
      mentor: {
        id: 'mentor-1',
        profile: { name: 'Later Mentor', avatar_url: null },
      },
    });

    const booking2 = createMockMyBooking({
      id: 'booking-2',
      mentee_id: 'current-user-id',
      time_slot: {
        start_time: new Date(Date.now() + 86400000).toISOString(), // 1 day
        end_time: new Date(Date.now() + 86400000 + 1800000).toISOString(),
        mentor_id: 'mentor-2',
      },
      mentor: {
        id: 'mentor-2',
        profile: { name: 'Earlier Mentor', avatar_url: null },
      },
    });

    render(
      <BookingsList
        bookings={[booking1, booking2]}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        currentUserId="current-user-id"
      />
    );

    const cards = screen.getAllByRole('button').filter(card => card.getAttribute('aria-label')?.startsWith('Booking'));
    // First card should be Earlier Mentor (soonest date)
    expect(cards[0]).toHaveTextContent('Earlier Mentor');
    expect(cards[1]).toHaveTextContent('Later Mentor');
  });

  it('should sort past bookings reverse chronologically (most recent first)', async () => {
    const user = userEvent.setup();
    const booking1 = createMockMyBooking({
      id: 'booking-1',
      mentee_id: 'current-user-id',
      status: 'completed',
      time_slot: {
        start_time: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
        end_time: new Date(Date.now() - 86400000 * 3 + 1800000).toISOString(),
        mentor_id: 'mentor-1',
      },
      mentor: {
        id: 'mentor-1',
        profile: { name: 'Older Mentor', avatar_url: null },
      },
    });

    const booking2 = createMockMyBooking({
      id: 'booking-2',
      mentee_id: 'current-user-id',
      status: 'completed',
      time_slot: {
        start_time: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        end_time: new Date(Date.now() - 86400000 + 1800000).toISOString(),
        mentor_id: 'mentor-2',
      },
      mentor: {
        id: 'mentor-2',
        profile: { name: 'Recent Mentor', avatar_url: null },
      },
    });

    render(
      <BookingsList
        bookings={[booking1, booking2]}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        currentUserId="current-user-id"
      />
    );

    // Switch to past tab
    await user.click(screen.getByText(/Past/i));

    const cards = screen.getAllByRole('button').filter(card => card.getAttribute('aria-label')?.startsWith('Booking'));
    // First card should be Recent Mentor (most recent past date)
    expect(cards[0]).toHaveTextContent('Recent Mentor');
    expect(cards[1]).toHaveTextContent('Older Mentor');
  });

  it('should exclude canceled bookings from upcoming tab', () => {
    const bookings = createMockMyBookingsList({
      upcomingCount: 2,
      pastCount: 0,
      canceledCount: 1,
    });

    render(
      <BookingsList
        bookings={bookings}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        currentUserId="current-user-id"
      />
    );

    // Upcoming tab should show 2 (not 3, excluding canceled)
    expect(screen.getByText(/Upcoming \(2\)/i)).toBeInTheDocument();
  });

  it('should include canceled bookings in past tab', async () => {
    const user = userEvent.setup();
    const bookings = createMockMyBookingsList({
      upcomingCount: 0,
      pastCount: 1,
      canceledCount: 1,
    });

    render(
      <BookingsList
        bookings={bookings}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        currentUserId="current-user-id"
      />
    );

    // Past tab should show 2 (1 completed + 1 canceled)
    expect(screen.getByText(/Past \(2\)/i)).toBeInTheDocument();

    await user.click(screen.getByText(/Past \(2\)/i));

    // Should show both past and canceled bookings
    const cards = screen.getAllByRole('button').filter(card => card.getAttribute('aria-label')?.startsWith('Booking'));
    expect(cards).toHaveLength(2);
  });
});
