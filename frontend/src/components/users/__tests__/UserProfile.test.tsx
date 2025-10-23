import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { UserProfile } from '../UserProfile';
import { useAuth } from '../../../contexts/AuthContext';
import { userService } from '../../../services/userService';
import type { User } from '../../../types/user';

// Mock dependencies
vi.mock('../../../contexts/AuthContext');
vi.mock('../../../services/userService');

const mockUseAuth = vi.mocked(useAuth);
const mockUserService = vi.mocked(userService);

const mockUser: User = {
  id: 1,
  email: 'john@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'contractor',
  companyId: 1,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('UserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
    });
  });

  describe('View Mode', () => {
    it('renders user profile information', () => {
      render(<UserProfile />);

      expect(screen.getByText('My Profile')).toBeInTheDocument();
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.getByText('Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Contractor')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('shows edit profile button', () => {
      render(<UserProfile />);

      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    });

    it('displays formatted creation date', () => {
      render(<UserProfile />);

      expect(screen.getByText('December 31, 2023')).toBeInTheDocument();
    });

    it('shows role badge with correct styling', () => {
      render(<UserProfile />);

      const roleBadge = screen.getByText('Contractor');
      expect(roleBadge).toHaveClass('bg-purple-100', 'text-purple-800');
    });

    it('shows status badge with correct styling', () => {
      render(<UserProfile />);

      const statusBadge = screen.getByText('Active');
      expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800');
    });
  });

  describe('Edit Mode', () => {
    it('switches to edit mode when edit button is clicked', () => {
      render(<UserProfile />);

      fireEvent.click(screen.getByText('Edit Profile'));

      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('shows password change section in edit mode', () => {
      render(<UserProfile />);

      fireEvent.click(screen.getByText('Edit Profile'));

      expect(screen.getByText('Change Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
      expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
    });

    it('updates profile with valid data', async () => {
      const updatedUser = {
        ...mockUser,
        firstName: 'Updated',
      };

      mockUserService.updateUser.mockResolvedValue(updatedUser);

      render(<UserProfile />);

      fireEvent.click(screen.getByText('Edit Profile'));

      // Update first name
      fireEvent.change(screen.getByDisplayValue('John'), {
        target: { value: 'Updated' }
      });

      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(mockUserService.updateUser).toHaveBeenCalledWith(1, {
          firstName: 'Updated',
          lastName: 'Doe',
          email: 'john@example.com',
        });
        expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
      });
    });

    it('cancels edit mode when cancel button is clicked', () => {
      render(<UserProfile />);

      fireEvent.click(screen.getByText('Edit Profile'));
      
      // Make a change
      fireEvent.change(screen.getByDisplayValue('John'), {
        target: { value: 'Changed' }
      });

      fireEvent.click(screen.getByText('Cancel'));

      // Should be back in view mode with original data
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      render(<UserProfile />);
      fireEvent.click(screen.getByText('Edit Profile'));
    });

    it('shows form fields in edit mode', () => {
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    });

    it('has password fields available', () => {
      expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
      expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('shows loading state during form submission', async () => {
      mockUserService.updateUser.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<UserProfile />);

      fireEvent.click(screen.getByText('Edit Profile'));
      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
        expect(screen.getByText('Saving...')).toBeDisabled();
      });
    });

    it('displays API error messages', async () => {
      const errorMessage = 'Email already exists';
      mockUserService.updateUser.mockRejectedValue({
        response: {
          data: {
            error: {
              message: errorMessage
            }
          }
        }
      });

      render(<UserProfile />);

      fireEvent.click(screen.getByText('Edit Profile'));
      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('displays generic error message for unknown errors', async () => {
      mockUserService.updateUser.mockRejectedValue(new Error('Network error'));

      render(<UserProfile />);

      fireEvent.click(screen.getByText('Edit Profile'));
      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(screen.getByText('Failed to update profile')).toBeInTheDocument();
      });
    });
  });

  describe('No User State', () => {
    it('shows message when no user is available', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      });

      render(<UserProfile />);

      expect(screen.getByText('No user information available.')).toBeInTheDocument();
    });
  });

  describe('Role-specific Display', () => {
    it('displays company employee role correctly', () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, role: 'company_employee' },
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      });

      render(<UserProfile />);

      const roleBadge = screen.getByText('Company Employee');
      expect(roleBadge).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    it('displays client role correctly', () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, role: 'client' },
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      });

      render(<UserProfile />);

      const roleBadge = screen.getByText('Client');
      expect(roleBadge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('displays inactive status correctly', () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, isActive: false },
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      });

      render(<UserProfile />);

      const statusBadge = screen.getByText('Inactive');
      expect(statusBadge).toHaveClass('bg-red-100', 'text-red-800');
    });
  });

  describe('Success Messages', () => {
    it('shows success message after profile update', async () => {
      mockUserService.updateUser.mockResolvedValue(mockUser);

      render(<UserProfile />);

      fireEvent.click(screen.getByText('Edit Profile'));
      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
      });
    });

    it('shows special message when email is changed', async () => {
      mockUserService.updateUser.mockResolvedValue({
        ...mockUser,
        email: 'newemail@example.com'
      });

      render(<UserProfile />);

      fireEvent.click(screen.getByText('Edit Profile'));
      
      fireEvent.change(screen.getByDisplayValue('john@example.com'), {
        target: { value: 'newemail@example.com' }
      });

      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(screen.getByText('Profile updated successfully. Please log in again if you changed your email.')).toBeInTheDocument();
      });
    });

    it('clears password fields after successful update', async () => {
      mockUserService.updateUser.mockResolvedValue(mockUser);

      render(<UserProfile />);

      fireEvent.click(screen.getByText('Edit Profile'));
      
      // Fill password fields
      fireEvent.change(screen.getByLabelText('Current Password'), {
        target: { value: 'currentpass' }
      });
      fireEvent.change(screen.getByLabelText('New Password'), {
        target: { value: 'newpass123' }
      });
      fireEvent.change(screen.getByLabelText('Confirm New Password'), {
        target: { value: 'newpass123' }
      });

      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
      });

      // Switch back to edit mode to check if password fields are cleared
      fireEvent.click(screen.getByText('Edit Profile'));
      
      expect(screen.getByLabelText('Current Password')).toHaveValue('');
      expect(screen.getByLabelText('New Password')).toHaveValue('');
      expect(screen.getByLabelText('Confirm New Password')).toHaveValue('');
    });
  });
});