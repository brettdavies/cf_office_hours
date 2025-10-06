import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilePage from './ProfilePage';
import { apiClient } from '@/lib/api-client';

// Mock dependencies
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    getCurrentUser: vi.fn(),
    updateCurrentUser: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(
      public statusCode: number,
      public code: string,
      message: string
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockUserProfile = {
  id: 'user-123',
  airtable_record_id: 'rec123',
  email: 'test@example.com',
  role: 'mentee' as const,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  profile: {
    id: 'profile-123',
    user_id: 'user-123',
    name: 'Test User',
    title: 'Software Engineer',
    company: 'Test Corp',
    bio: 'This is a test bio',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
};

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    vi.mocked(apiClient.getCurrentUser).mockReturnValue(
      new Promise(() => {}) // Never resolves
    );

    render(<ProfilePage />);

    expect(screen.getByText('Loading profile...')).toBeInTheDocument();
  });

  it('should render profile data in view mode', async () => {
    vi.mocked(apiClient.getCurrentUser).mockResolvedValue(mockUserProfile);

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Test Corp')).toBeInTheDocument();
    expect(screen.getByText('This is a test bio')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('mentee')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
  });

  it('should toggle to edit mode when edit button clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.getCurrentUser).mockResolvedValue(mockUserProfile);

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /edit profile/i }));

    // Check that form inputs are now visible
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bio/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('should update form fields in edit mode', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.getCurrentUser).mockResolvedValue(mockUserProfile);

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /edit profile/i }));

    const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
    const bioInput = screen.getByLabelText(/bio/i) as HTMLTextAreaElement;

    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Name');

    await user.clear(bioInput);
    await user.type(bioInput, 'Updated bio');

    expect(nameInput.value).toBe('Updated Name');
    expect(bioInput.value).toBe('Updated bio');
  });

  it('should call API on save button click', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.getCurrentUser).mockResolvedValue(mockUserProfile);
    vi.mocked(apiClient.updateCurrentUser).mockResolvedValue({
      ...mockUserProfile,
      profile: {
        ...mockUserProfile.profile,
        name: 'Updated Name',
        bio: 'Updated bio',
      },
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /edit profile/i }));

    const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
    const bioInput = screen.getByLabelText(/bio/i) as HTMLTextAreaElement;

    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Name');

    await user.clear(bioInput);
    await user.type(bioInput, 'Updated bio');

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(apiClient.updateCurrentUser).toHaveBeenCalledWith({
        name: 'Updated Name',
        bio: 'Updated bio',
        title: 'Software Engineer',
        company: 'Test Corp',
      });
    });
  });

  it('should cancel edit mode without saving changes', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.getCurrentUser).mockResolvedValue(mockUserProfile);

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /edit profile/i }));

    const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;

    await user.clear(nameInput);
    await user.type(nameInput, 'Changed Name');

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    // Should be back in view mode
    expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();

    // Original name should be displayed
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('should display error message when profile fetch fails', async () => {
    const ApiError = (await import('@/lib/api-client')).ApiError;
    vi.mocked(apiClient.getCurrentUser).mockRejectedValue(
      new ApiError(404, 'USER_NOT_FOUND', 'User not found')
    );

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Profile not found')).toBeInTheDocument();
    });
  });

  it('should disable save button when name is empty', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.getCurrentUser).mockResolvedValue(mockUserProfile);

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /edit profile/i }));

    const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
    await user.clear(nameInput);

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    expect(saveButton).toBeDisabled();
  });

  it('should render email and role as disabled fields in edit mode', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.getCurrentUser).mockResolvedValue(mockUserProfile);

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /edit profile/i }));

    const emailInput = screen.getByDisplayValue('test@example.com') as HTMLInputElement;
    const roleInput = screen.getByDisplayValue('mentee') as HTMLInputElement;

    expect(emailInput).toBeDisabled();
    expect(roleInput).toBeDisabled();
  });
});
