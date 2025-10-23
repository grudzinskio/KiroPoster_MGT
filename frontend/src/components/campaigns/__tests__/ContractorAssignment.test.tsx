import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ContractorAssignment } from '../ContractorAssignment';
import { useAuth } from '../../../contexts/AuthContext';
import { campaignService } from '../../../services/campaignService';
import { userService } from '../../../services/userService';
import type { Campaign } from '../../../types/campaign';
import type { User } from '../../../types/user';

// Mock the dependencies
vi.mock('../../../contexts/AuthContext');
vi.mock('../../../services/campaignService');
vi.mock('../../../services/userService');

const mockUseAuth = vi.mocked(useAuth);
const mockCampaignService = vi.mocked(campaignService);
const mockUserService = vi.mocked(userService);

const mockCampaign: Campaign = {
  id: 1,
  name: 'Test Campaign',
  description: 'Test description',
  companyId: 1,
  status: 'in_progress',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  completedAt: null,
  createdBy: 1,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  company: { id: 1, name: 'Test Company', contactEmail: 'test@example.com' },
  assignedContractors: [
    {
      id: 3,
      email: 'assigned@example.com',
      firstName: 'John',
      lastName: 'Assigned',
      role: 'contractor',
      assignedAt: '2024-01-02T00:00:00Z',
    },
  ],
  images: [],
};

const mockUsers: User[] = [
  {
    id: 1,
    email: 'employee@example.com',
    firstName: 'Jane',
    lastName: 'Employee',
    role: 'company_employee',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    email: 'client@example.com',
    firstName: 'Bob',
    lastName: 'Client',
    role: 'client',
    companyId: 1,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 3,
    email: 'assigned@example.com',
    firstName: 'John',
    lastName: 'Assigned',
    role: 'contractor',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 4,
    email: 'available@example.com',
    firstName: 'Sarah',
    lastName: 'Available',
    role: 'contractor',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 5,
    email: 'inactive@example.com',
    firstName: 'Mike',
    lastName: 'Inactive',
    role: 'contractor',
    isActive: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

describe('ContractorAssignment', () => {
  const mockOnUpdate = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserService.getUsers.mockResolvedValue(mockUsers);
    mockCampaignService.getAssignedContractors.mockResolvedValue(mockCampaign.assignedContractors);
    mockCampaignService.assignContractor.mockResolvedValue();
    mockCampaignService.removeContractorAssignment.mockResolvedValue();
    mockCampaignService.getCampaignById.mockResolvedValue(mockCampaign);
  });

  describe('Company Employee Access', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 1,
          email: 'employee@example.com',
          firstName: 'Jane',
          lastName: 'Employee',
          role: 'company_employee',
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      });
    });

    it('renders contractor assignment interface for company employee', async () => {
      render(
        <ContractorAssignment
          campaign={mockCampaign}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Manage Contractors - Test Campaign')).toBeInTheDocument();
      });

      expect(screen.getByText('Assigned Contractors (1)')).toBeInTheDocument();
      expect(screen.getByText('Available Contractors')).toBeInTheDocument();
      expect(mockUserService.getUsers).toHaveBeenCalled();
      expect(mockCampaignService.getAssignedContractors).toHaveBeenCalledWith(1);
    });

    it('displays assigned contractors correctly', async () => {
      render(
        <ContractorAssignment
          campaign={mockCampaign}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('John Assigned')).toBeInTheDocument();
      });

      expect(screen.getByText('assigned@example.com')).toBeInTheDocument();
      expect(screen.getByText(/Assigned:/)).toBeInTheDocument();
    });

    it('displays available contractors (active contractors not assigned)', async () => {
      render(
        <ContractorAssignment
          campaign={mockCampaign}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Sarah Available')).toBeInTheDocument();
      });

      expect(screen.getByText('available@example.com')).toBeInTheDocument();
      // Should not show inactive contractor
      expect(screen.queryByText('Mike Inactive')).not.toBeInTheDocument();
      // Should not show already assigned contractor in available list
      expect(screen.queryByText('John Assigned')).toBeInTheDocument(); // Only in assigned section
    });

    it('assigns contractor when assign button is clicked', async () => {
      render(
        <ContractorAssignment
          campaign={mockCampaign}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Sarah Available')).toBeInTheDocument();
      });

      const assignButton = screen.getByRole('button', { name: 'Assign' });
      fireEvent.click(assignButton);

      await waitFor(() => {
        expect(mockCampaignService.assignContractor).toHaveBeenCalledWith(1, 4);
      });

      expect(mockCampaignService.getAssignedContractors).toHaveBeenCalledWith(1);
      expect(mockCampaignService.getCampaignById).toHaveBeenCalledWith(1);
      expect(mockOnUpdate).toHaveBeenCalledWith(mockCampaign);
    });

    it('removes contractor when remove button is clicked', async () => {
      render(
        <ContractorAssignment
          campaign={mockCampaign}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('John Assigned')).toBeInTheDocument();
      });

      const removeButton = screen.getByRole('button', { name: 'Remove' });
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(mockCampaignService.removeContractorAssignment).toHaveBeenCalledWith(1, 3);
      });

      expect(mockCampaignService.getAssignedContractors).toHaveBeenCalledWith(1);
      expect(mockCampaignService.getCampaignById).toHaveBeenCalledWith(1);
      expect(mockOnUpdate).toHaveBeenCalledWith(mockCampaign);
    });

    it('shows loading state when assigning contractor', async () => {
      render(
        <ContractorAssignment
          campaign={mockCampaign}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Sarah Available')).toBeInTheDocument();
      });

      const assignButton = screen.getByRole('button', { name: 'Assign' });
      fireEvent.click(assignButton);

      expect(screen.getByText('Assigning...')).toBeInTheDocument();
    });

    it('shows loading state when removing contractor', async () => {
      render(
        <ContractorAssignment
          campaign={mockCampaign}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('John Assigned')).toBeInTheDocument();
      });

      const removeButton = screen.getByRole('button', { name: 'Remove' });
      fireEvent.click(removeButton);

      expect(screen.getByText('Removing...')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', async () => {
      render(
        <ContractorAssignment
          campaign={mockCampaign}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Manage Contractors - Test Campaign')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when done button is clicked', async () => {
      render(
        <ContractorAssignment
          campaign={mockCampaign}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Done')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Done'));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Non-Company Employee Access', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 2,
          email: 'client@example.com',
          firstName: 'Bob',
          lastName: 'Client',
          role: 'client',
          companyId: 1,
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      });
    });

    it('shows permission denied message for non-company employees', () => {
      render(
        <ContractorAssignment
          campaign={mockCampaign}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText("You don't have permission to manage contractor assignments.")).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 1,
          email: 'employee@example.com',
          firstName: 'Jane',
          lastName: 'Employee',
          role: 'company_employee',
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      });
    });

    it('shows message when no contractors are assigned', async () => {
      const campaignWithoutContractors = { ...mockCampaign, assignedContractors: [] };
      mockCampaignService.getAssignedContractors.mockResolvedValue([]);

      render(
        <ContractorAssignment
          campaign={campaignWithoutContractors}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No contractors assigned to this campaign.')).toBeInTheDocument();
      });
    });

    it('shows message when no contractors are available', async () => {
      // Mock only non-contractor users
      const nonContractorUsers = mockUsers.filter(user => user.role !== 'contractor');
      mockUserService.getUsers.mockResolvedValue(nonContractorUsers);

      render(
        <ContractorAssignment
          campaign={mockCampaign}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No contractors available in the system.')).toBeInTheDocument();
      });
    });

    it('shows message when all contractors are assigned', async () => {
      // Mock scenario where all active contractors are assigned
      const allAssignedContractors = mockUsers
        .filter(user => user.role === 'contractor' && user.isActive)
        .map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          assignedAt: '2024-01-02T00:00:00Z',
        }));

      mockCampaignService.getAssignedContractors.mockResolvedValue(allAssignedContractors);

      render(
        <ContractorAssignment
          campaign={mockCampaign}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('All available contractors are already assigned to this campaign.')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 1,
          email: 'employee@example.com',
          firstName: 'Jane',
          lastName: 'Employee',
          role: 'company_employee',
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
      });
    });

    it('displays error message when data fails to load', async () => {
      mockUserService.getUsers.mockRejectedValue(new Error('Network error'));

      render(
        <ContractorAssignment
          campaign={mockCampaign}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load contractor data')).toBeInTheDocument();
      });
    });

    it('displays error message when contractor assignment fails', async () => {
      mockCampaignService.assignContractor.mockRejectedValue({
        response: {
          data: {
            error: {
              message: 'Assignment failed',
            },
          },
        },
      });

      render(
        <ContractorAssignment
          campaign={mockCampaign}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Sarah Available')).toBeInTheDocument();
      });

      const assignButton = screen.getByRole('button', { name: 'Assign' });
      fireEvent.click(assignButton);

      await waitFor(() => {
        expect(screen.getByText('Assignment failed')).toBeInTheDocument();
      });
    });

    it('displays error message when contractor removal fails', async () => {
      mockCampaignService.removeContractorAssignment.mockRejectedValue({
        response: {
          data: {
            error: {
              message: 'Removal failed',
            },
          },
        },
      });

      render(
        <ContractorAssignment
          campaign={mockCampaign}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('John Assigned')).toBeInTheDocument();
      });

      const removeButton = screen.getByRole('button', { name: 'Remove' });
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(screen.getByText('Removal failed')).toBeInTheDocument();
      });
    });
  });
});