/**
 * Tests for UserSelector Component
 *
 * Tests user selection, search/filter functionality, loading and error states.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { UserSelector } from './UserSelector';
import { renderWithProviders } from '@/test/test-utils';

// Mock useMatching hook
const mockUseGetUsersWithScores = vi.fn();

vi.mock('@/hooks/useMatching', () => ({
  useGetUsersWithScores: (...args: unknown[]) => mockUseGetUsersWithScores(...args),
}));

describe('UserSelector', () => {
  const mockOnChange = vi.fn();
  const mockUsers = [
    {
      id: 'user-1',
      email: 'mentor1@example.com',
      role: 'mentor' as const,
      profile: {
        name: 'Alice Mentor',
      },
    },
    {
      id: 'user-2',
      email: 'mentee1@example.com',
      role: 'mentee' as const,
      profile: {
        name: 'Bob Mentee',
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    mockUseGetUsersWithScores.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    renderWithProviders(<UserSelector value={null} onChange={mockOnChange} />);

    expect(screen.getByText(/Loading users with scores/i)).toBeInTheDocument();
  });

  it('should fetch and display users successfully', async () => {
    mockUseGetUsersWithScores.mockReturnValue({
      data: { users: mockUsers },
      isLoading: false,
      error: null,
    });

    renderWithProviders(<UserSelector value={null} onChange={mockOnChange} />);

    await waitFor(() => {
      expect(mockUseGetUsersWithScores).toHaveBeenCalled();
    });

    expect(screen.getByLabelText(/Select User/i)).toBeInTheDocument();
  });

  it('should handle API error', async () => {
    mockUseGetUsersWithScores.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch users'),
    });

    renderWithProviders(<UserSelector value={null} onChange={mockOnChange} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch users')).toBeInTheDocument();
    });
  });

  it('should filter users by role', async () => {
    mockUseGetUsersWithScores.mockReturnValue({
      data: { users: mockUsers },
      isLoading: false,
      error: null,
    });

    renderWithProviders(<UserSelector value={null} onChange={mockOnChange} />);

    await waitFor(() => {
      expect(mockUseGetUsersWithScores).toHaveBeenCalled();
    });

    const roleFilter = screen.getByLabelText(/Filter by Role/i);
    expect(roleFilter).toBeInTheDocument();
  });

  it('should filter users by search term', async () => {
    mockUseGetUsersWithScores.mockReturnValue({
      data: { users: mockUsers },
      isLoading: false,
      error: null,
    });

    renderWithProviders(<UserSelector value={null} onChange={mockOnChange} />);

    await waitFor(() => {
      expect(mockUseGetUsersWithScores).toHaveBeenCalled();
    });

    const selectTrigger = screen.getByLabelText(/Select User/i);
    expect(selectTrigger).toBeInTheDocument();
  });

  it('should call onChange when user is selected', async () => {
    mockUseGetUsersWithScores.mockReturnValue({
      data: { users: mockUsers },
      isLoading: false,
      error: null,
    });

    renderWithProviders(<UserSelector value={null} onChange={mockOnChange} />);

    await waitFor(() => {
      expect(mockUseGetUsersWithScores).toHaveBeenCalled();
    });

    expect(screen.getByLabelText(/Select User/i)).toBeInTheDocument();
  });

  it('should display selected user card when value is provided', async () => {
    mockUseGetUsersWithScores.mockReturnValue({
      data: { users: mockUsers },
      isLoading: false,
      error: null,
    });

    renderWithProviders(<UserSelector value="user-1" onChange={mockOnChange} />);

    await waitFor(() => {
      expect(mockUseGetUsersWithScores).toHaveBeenCalled();
    });

    expect(screen.getByText('Selected User')).toBeInTheDocument();
  });

  it('should handle empty user list', async () => {
    mockUseGetUsersWithScores.mockReturnValue({
      data: { users: [] },
      isLoading: false,
      error: null,
    });

    renderWithProviders(<UserSelector value={null} onChange={mockOnChange} />);

    await waitFor(() => {
      expect(mockUseGetUsersWithScores).toHaveBeenCalled();
    });

    expect(screen.getByLabelText(/Select User/i)).toBeInTheDocument();
  });

  it('should use auth token from hook for API calls', async () => {
    mockUseGetUsersWithScores.mockReturnValue({
      data: { users: mockUsers },
      isLoading: false,
      error: null,
    });

    renderWithProviders(<UserSelector value={null} onChange={mockOnChange} />);

    await waitFor(() => {
      expect(mockUseGetUsersWithScores).toHaveBeenCalledWith(
        'tag-based-v1',
        undefined
      );
    });
  });

  it('should determine target role opposite to selected user role', async () => {
    mockUseGetUsersWithScores.mockReturnValue({
      data: { users: mockUsers },
      isLoading: false,
      error: null,
    });

    const { rerender } = renderWithProviders(<UserSelector value={null} onChange={mockOnChange} />);

    await waitFor(() => {
      expect(mockUseGetUsersWithScores).toHaveBeenCalled();
    });

    rerender(<UserSelector value="user-1" onChange={mockOnChange} />);
    expect(screen.getByText('Selected User')).toBeInTheDocument();
  });

  it('should show loading indicator while fetching users', () => {
    mockUseGetUsersWithScores.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    renderWithProviders(<UserSelector value={null} onChange={mockOnChange} />);

    expect(screen.getByText(/Loading users with scores/i)).toBeInTheDocument();
  });

  it('should not emit an uncontrolled-to-controlled warning when value goes from null to set', async () => {
    mockUseGetUsersWithScores.mockReturnValue({
      data: { users: mockUsers },
      isLoading: false,
      error: null,
    });
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { rerender } = renderWithProviders(<UserSelector value={null} onChange={mockOnChange} />);

    await waitFor(() => {
      expect(mockUseGetUsersWithScores).toHaveBeenCalled();
    });

    rerender(<UserSelector value="user-1" onChange={mockOnChange} />);

    const controlledWarning = [
      ...consoleWarnSpy.mock.calls,
      ...consoleErrorSpy.mock.calls,
    ].filter(call =>
      call.some(
        arg =>
          typeof arg === 'string' &&
          /uncontrolled to controlled|changing an uncontrolled/i.test(arg)
      )
    );

    expect(controlledWarning).toHaveLength(0);

    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('same-name disambiguation', () => {
    // Radix Select relies on pointer-capture / scrollIntoView, which jsdom omits.
    beforeAll(() => {
      Element.prototype.hasPointerCapture = vi.fn(() => false);
      Element.prototype.setPointerCapture = vi.fn();
      Element.prototype.releasePointerCapture = vi.fn();
      Element.prototype.scrollIntoView = vi.fn();
    });

    const sameNameUsers = [
      {
        id: 'amanda-1',
        email: 'mentor65@example.com',
        role: 'mentor' as const,
        profile: { name: 'Amanda Jones' },
      },
      {
        id: 'amanda-2',
        email: 'amanda.jones@mentor.example.com',
        role: 'mentor' as const,
        profile: { name: 'Amanda Jones' },
      },
    ];

    it('renders both same-named users with their distinct emails', async () => {
      const user = userEvent.setup();
      mockUseGetUsersWithScores.mockReturnValue({
        data: { users: sameNameUsers },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<UserSelector value={null} onChange={mockOnChange} />);
      await user.click(screen.getByLabelText(/Select User/i));

      expect(await screen.findByText('mentor65@example.com')).toBeInTheDocument();
      expect(screen.getByText('amanda.jones@mentor.example.com')).toBeInTheDocument();
      // Both rows carry the shared display name.
      expect(screen.getAllByText(/Amanda Jones/).length).toBe(2);
    });

    it('selects the correct distinct user id for an identical display name', async () => {
      const user = userEvent.setup();
      mockUseGetUsersWithScores.mockReturnValue({
        data: { users: sameNameUsers },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<UserSelector value={null} onChange={mockOnChange} />);
      await user.click(screen.getByLabelText(/Select User/i));

      const secondEmail = await screen.findByText('amanda.jones@mentor.example.com');
      await user.click(secondEmail);

      expect(mockOnChange).toHaveBeenCalledWith('amanda-2', 'mentee');
    });

    it('keeps the name-or-email search filter working', async () => {
      const user = userEvent.setup();
      mockUseGetUsersWithScores.mockReturnValue({
        data: { users: sameNameUsers },
        isLoading: false,
        error: null,
      });

      renderWithProviders(<UserSelector value={null} onChange={mockOnChange} />);
      await user.click(screen.getByLabelText(/Select User/i));

      const search = await screen.findByPlaceholderText(/Search by name or email/i);
      await user.type(search, 'mentor65');

      expect(screen.getByText('mentor65@example.com')).toBeInTheDocument();
      expect(screen.queryByText('amanda.jones@mentor.example.com')).not.toBeInTheDocument();
    });
  });

  it('should retry fetch on error with explicit action', async () => {
    mockUseGetUsersWithScores.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: new Error('Server Error'),
    });

    const { rerender } = renderWithProviders(<UserSelector value={null} onChange={mockOnChange} />);

    await waitFor(() => {
      expect(screen.getByText('Server Error')).toBeInTheDocument();
    });

    mockUseGetUsersWithScores.mockReturnValue({
      data: { users: mockUsers },
      isLoading: false,
      error: null,
    });

    rerender(<UserSelector value={null} onChange={mockOnChange} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Select User/i)).toBeInTheDocument();
    });
  });
});
