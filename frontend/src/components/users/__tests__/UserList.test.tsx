import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { UserList } from '../UserList';
import { useAuth } from '../../../contexts/AuthContext';
import { userService } from '../../../services/userService';
import type { User } from '../../../types/user';

// Mock dependencies
vi.mock('../../../contexts/AuthContext');
vi.mock('../../../services/userService');

const mockUseAuth = vi.mocked(useAuth);
const mockUserService = vi.mocked(userService);

const mockUsers: User[] = [
  {
    id: 1,
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'company_employee',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    email: 'jane@client.com',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'client',
    companyId: 1,
    isActive: true,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 3,
    email: 'bob@contractor.com',
    firstName: 'Bob',
    lastName: 'Johnson',
    role: 'contractor',
    isActive: false,
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  },
];

const mockCompanyEmployee: User = {
  id: 1,
  email: 'admin@company.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'company_employee',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockClient: User = {
  id: 2,
  email: 'client@company.com',
  firstName: 'Client',
  lastName: 'User',
  role: 'client',
  companyId: 1,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('UserList', () => {
  const mockOnEditUser = vi.fn();
  const mockOnCreateUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserService.getUsers.mockResolvedValue(mockUsers);
  });

  describe('Company Employee Access', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockCompanyEmployee,
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      });
    });

    it('renders user list with all users for company employee', async () => {
      render(
        <UserList onEditUser={mockOnEditUser} onCreateUser={mockOnCreateUser} />
      );

      // Wait for the data to load and users to be displayed
      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      // Check if all users are displayed by email (which is unique)
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane@client.com')).toBeInTheDocument();
      expect(screen.getByText('bob@contractor.com')).toBeInTheDocument();
    });

    it('shows create user button for company employee', async () => {
      render(
        <UserList onEditUser={mockOnEditUser} onCreateUser={mockOnCreateUser} />
      );

      await waitFor(() => {
        expect(screen.getByText('Create User')).toBeInTheDocument();
      });
    });

    it('shows edit and activate/deactivate actions for company employee', async () => {
      render(
        <UserList onEditUser={mockOnEditUser} onCreateUser={mockOnCreateUser} />
      );

      await waitFor(() => {
        expect(screen.getAllByText('Edit')).toHaveLength(3);
        expect(screen.getAllByText('Deactivate')).toHaveLength(2); // 2 active users
        expect(screen.getByText('Activate')).toBeInTheDocument(); // 1 inactive user
      });
    });

    it('calls onCreateUser when create button is clicked', async () => {
      render(
        <UserList onEditUser={mockOnEditUser} onCreateUser={mockOnCreateUser} />
      );

      await waitFor(() => {
        const createButton = screen.getByText('Create User');
        fireEvent.click(createButton);
      });

      expect(mockOnCreateUser).toHaveBeenCalledTimes(1);
    });

    it('calls onEditUser when edit button is clicked', async () => {
      render(
        <UserList onEditUser={mockOnEditUser} onCreateUser={mockOnCreateUser} />
      );

      await waitFor(() => {
        const editButtons = screen.getAllByText('Edit');
        fireEvent.click(editButtons[0]);
      });

      expect(mockOnEditUser).toHaveBeenCalledWith(mockUsers[0]);
    });

    it('toggles user status when activate/deactivate is clicked', async () => {
      mockUserService.toggleUserStatus.mockResolvedValue({
        ...mockUsers[0],
        isActive: false,
      });

      render(
        <UserList onEditUser={mockOnEditUser} onCreateUser={mockOnCreateUser} />
      );

      await waitFor(() => {
        const deactivateButtons = screen.getAllByText('Deactivate');
        fireEvent.click(deactivateButtons[0]);
      });

      expect(mockUserService.toggleUserStatus).toHaveBeenCalledWith(1, false);
    });
  });

  describe('Client Access', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockClient,
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      });
    });

    it('does not show create user button for non-company employee', async () => {
      render(
        <UserList onEditUser={mockOnEditUser} onCreateUser={mockOnCreateUser} />
      );

      await waitFor(() => {
        expect(screen.queryByText('Create User')).not.toBeInTheDocument();
      });
    });

    it('does not show action buttons for non-company employee', async () => {
      render(
        <UserList onEditUser={mockOnEditUser} onCreateUser={mockOnCreateUser} />
      );

      await waitFor(() => {
        expect(screen.queryByText('Edit')).not.toBeInTheDocument();
        expect(screen.queryByText('Deactivate')).not.toBeInTheDocument();
        expect(screen.queryByText('Activate')).not.toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockCompanyEmployee,
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      });
    });

    it('filters users by search term', async () => {
      render(
        <UserList onEditUser={mockOnEditUser} onCreateUser={mockOnCreateUser} />
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search by name or email...');
        fireEvent.change(searchInput, { target: { value: 'john' } });
      });

      // Should show John Doe and Bob Johnson (contains 'john')
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('bob@contractor.com')).toBeInTheDocument();
      expect(screen.queryByText('jane@client.com')).not.toBeInTheDocument();
    });

    it('filters users by role', async () => {
      render(
        <UserList onEditUser={mockOnEditUser} onCreateUser={mockOnCreateUser} />
      );

      await waitFor(() => {
        const roleSelect = screen.getByDisplayValue('All Roles');
        fireEvent.change(roleSelect, { target: { value: 'client' } });
      });

      // Should only show Jane Smith (client)
      expect(screen.getByText('jane@client.com')).toBeInTheDocument();
      expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();
      expect(screen.queryByText('bob@contractor.com')).not.toBeInTheDocument();
    });

    it('filters users by active status', async () => {
      render(
        <UserList onEditUser={mockOnEditUser} onCreateUser={mockOnCreateUser} />
      );

      await waitFor(() => {
        const statusSelect = screen.getByDisplayValue('All Status');
        fireEvent.change(statusSelect, { target: { value: 'false' } });
      });

      // Should only show Bob Johnson (inactive)
      expect(screen.getByText('bob@contractor.com')).toBeInTheDocument();
      expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();
      expect(screen.queryByText('jane@client.com')).not.toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockCompanyEmployee,
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      });
    });

    it('shows loading spinner while fetching users', () => {
      mockUserService.getUsers.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <UserList onEditUser={mockOnEditUser} onCreateUser={mockOnCreateUser} />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument(); // Loading text
    });

    it('shows error message when fetching users fails', async () => {
      mockUserService.getUsers.mockRejectedValue(new Error('API Error'));

      render(
        <UserList onEditUser={mockOnEditUser} onCreateUser={mockOnCreateUser} />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load users')).toBeInTheDocument();
      });
    });

    it('shows empty state when no users match filters', async () => {
      render(
        <UserList onEditUser={mockOnEditUser} onCreateUser={mockOnCreateUser} />
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search by name or email...');
        fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      });

      expect(screen.getByText('No users found matching your criteria.')).toBeInTheDocument();
    });
  });

  describe('Role Display', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockCompanyEmployee,
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      });
    });

    it('displays role badges with correct colors', async () => {
      render(
        <UserList onEditUser={mockOnEditUser} onCreateUser={mockOnCreateUser} />
      );

      await waitFor(() => {
        expect(screen.getByText('Company Employee')).toBeInTheDocument();
        expect(screen.getByText('Client')).toBeInTheDocument();
        expect(screen.getByText('Contractor')).toBeInTheDocument();
      });
    });

    it('displays status badges correctly', async () => {
      render(
        <UserList onEditUser={mockOnEditUser} onCreateUser={mockOnCreateUser} />
      );

      await waitFor(() => {
        // Check for status badges in the table (excluding filter dropdown)
        const statusBadges = screen.getAllByText('Active').filter(el => 
          el.closest('tbody') !== null
        );
        expect(statusBadges).toHaveLength(2);
        // Check for inactive status badge in the table (excluding filter dropdown)
        const inactiveBadges = screen.getAllByText('Inactive').filter(el => 
          el.closest('tbody') !== null
        );
        expect(inactiveBadges).toHaveLength(1);
      });
    });
  });
});