import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CampaignList } from '../CampaignList';
import { useAuth } from '../../../contexts/AuthContext';
import { campaignService } from '../../../services/campaignService';
import type { Campaign } from '../../../types/campaign';

// Mock the dependencies
vi.mock('../../../contexts/AuthContext');
vi.mock('../../../services/campaignService');

const mockUseAuth = vi.mocked(useAuth);
const mockCampaignService = vi.mocked(campaignService);

const mockCampaigns: Campaign[] = [
  {
    id: 1,
    name: 'Test Campaign 1',
    description: 'Test description 1',
    companyId: 1,
    status: 'new',
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    completedAt: null,
    createdBy: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    company: { id: 1, name: 'Test Company 1', contactEmail: 'test1@example.com' },
    assignedContractors: [],
    images: [],
  },
  {
    id: 2,
    name: 'Test Campaign 2',
    description: 'Test description 2',
    companyId: 2,
    status: 'in_progress',
    startDate: '2024-02-01',
    endDate: '2024-02-28',
    completedAt: null,
    createdBy: 1,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
    company: { id: 2, name: 'Test Company 2', contactEmail: 'test2@example.com' },
    assignedContractors: [
      {
        id: 3,
        email: 'contractor@example.com',
        firstName: 'John',
        lastName: 'Contractor',
        role: 'contractor',
        assignedAt: '2024-02-01T00:00:00Z',
      },
    ],
    images: [],
  },
];

describe('CampaignList', () => {
  const mockOnEditCampaign = vi.fn();
  const mockOnCreateCampaign = vi.fn();
  const mockOnViewCampaign = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCampaignService.getCampaigns.mockResolvedValue(mockCampaigns);
    mockCampaignService.getCampaignsByCompany.mockResolvedValue(mockCampaigns);
    mockCampaignService.getCampaignsByContractor.mockResolvedValue(mockCampaigns);
    mockCampaignService.updateCampaignStatus.mockResolvedValue(mockCampaigns[0]);
  });

  describe('Company Employee View', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 1,
          email: 'employee@example.com',
          firstName: 'John',
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

    it('renders campaign list for company employee', async () => {
      render(
        <CampaignList
          onEditCampaign={mockOnEditCampaign}
          onCreateCampaign={mockOnCreateCampaign}
          onViewCampaign={mockOnViewCampaign}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Campaign Management')).toBeInTheDocument();
      });

      expect(screen.getByText('Create Campaign')).toBeInTheDocument();
      expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
      expect(screen.getByText('Test Campaign 2')).toBeInTheDocument();
      expect(mockCampaignService.getCampaigns).toHaveBeenCalled();
    });

    it('allows company employee to change campaign status', async () => {
      render(
        <CampaignList
          onEditCampaign={mockOnEditCampaign}
          onCreateCampaign={mockOnCreateCampaign}
          onViewCampaign={mockOnViewCampaign}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
      });

      const statusSelect = screen.getAllByDisplayValue('new')[0];
      fireEvent.change(statusSelect, { target: { value: 'in_progress' } });

      await waitFor(() => {
        expect(mockCampaignService.updateCampaignStatus).toHaveBeenCalledWith(1, 'in_progress');
      });
    });

    it('shows company column for company employees', async () => {
      render(
        <CampaignList
          onEditCampaign={mockOnEditCampaign}
          onCreateCampaign={mockOnCreateCampaign}
          onViewCampaign={mockOnViewCampaign}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Company')).toBeInTheDocument();
      });

      expect(screen.getByText('Test Company 1')).toBeInTheDocument();
      expect(screen.getByText('Test Company 2')).toBeInTheDocument();
    });

    it('calls onCreateCampaign when create button is clicked', async () => {
      render(
        <CampaignList
          onEditCampaign={mockOnEditCampaign}
          onCreateCampaign={mockOnCreateCampaign}
          onViewCampaign={mockOnViewCampaign}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Create Campaign')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Create Campaign'));
      expect(mockOnCreateCampaign).toHaveBeenCalled();
    });
  });

  describe('Client View', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 2,
          email: 'client@example.com',
          firstName: 'Jane',
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

    it('renders campaign list for client with limited view', async () => {
      render(
        <CampaignList
          onEditCampaign={mockOnEditCampaign}
          onCreateCampaign={mockOnCreateCampaign}
          onViewCampaign={mockOnViewCampaign}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('My Campaigns')).toBeInTheDocument();
      });

      expect(screen.queryByText('Create Campaign')).not.toBeInTheDocument();
      expect(mockCampaignService.getCampaignsByCompany).toHaveBeenCalledWith(1);
    });

    it('does not show company column for clients', async () => {
      render(
        <CampaignList
          onEditCampaign={mockOnEditCampaign}
          onCreateCampaign={mockOnCreateCampaign}
          onViewCampaign={mockOnViewCampaign}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('My Campaigns')).toBeInTheDocument();
      });

      expect(screen.queryByText('Company')).not.toBeInTheDocument();
    });

    it('shows status as read-only for clients', async () => {
      render(
        <CampaignList
          onEditCampaign={mockOnEditCampaign}
          onCreateCampaign={mockOnCreateCampaign}
          onViewCampaign={mockOnViewCampaign}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
      });

      const statusElements = screen.getAllByText('New');
      expect(statusElements[0]).toBeInTheDocument();
      expect(statusElements[0].tagName).toBe('SPAN');
    });
  });

  describe('Contractor View', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 3,
          email: 'contractor@example.com',
          firstName: 'Bob',
          lastName: 'Contractor',
          role: 'contractor',
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

    it('renders assigned campaigns for contractor', async () => {
      render(
        <CampaignList
          onEditCampaign={mockOnEditCampaign}
          onCreateCampaign={mockOnCreateCampaign}
          onViewCampaign={mockOnViewCampaign}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Assigned Campaigns')).toBeInTheDocument();
      });

      expect(screen.queryByText('Create Campaign')).not.toBeInTheDocument();
      expect(mockCampaignService.getCampaignsByContractor).toHaveBeenCalledWith(3);
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 1,
          email: 'employee@example.com',
          firstName: 'John',
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

    it('filters campaigns by search term', async () => {
      render(
        <CampaignList
          onEditCampaign={mockOnEditCampaign}
          onCreateCampaign={mockOnCreateCampaign}
          onViewCampaign={mockOnViewCampaign}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
        expect(screen.getByText('Test Campaign 2')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search campaigns...');
      fireEvent.change(searchInput, { target: { value: 'Campaign 1' } });

      await waitFor(() => {
        expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Campaign 2')).not.toBeInTheDocument();
      });
    });

    it('filters campaigns by status', async () => {
      render(
        <CampaignList
          onEditCampaign={mockOnEditCampaign}
          onCreateCampaign={mockOnCreateCampaign}
          onViewCampaign={mockOnViewCampaign}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
        expect(screen.getByText('Test Campaign 2')).toBeInTheDocument();
      });

      const statusFilter = screen.getByDisplayValue('All Status');
      fireEvent.change(statusFilter, { target: { value: 'new' } });

      await waitFor(() => {
        expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Campaign 2')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 1,
          email: 'employee@example.com',
          firstName: 'John',
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

    it('displays error message when campaigns fail to load', async () => {
      mockCampaignService.getCampaigns.mockRejectedValue(new Error('Network error'));

      render(
        <CampaignList
          onEditCampaign={mockOnEditCampaign}
          onCreateCampaign={mockOnCreateCampaign}
          onViewCampaign={mockOnViewCampaign}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load campaigns')).toBeInTheDocument();
      });
    });

    it('displays error message when status update fails', async () => {
      mockCampaignService.updateCampaignStatus.mockRejectedValue(new Error('Update failed'));

      render(
        <CampaignList
          onEditCampaign={mockOnEditCampaign}
          onCreateCampaign={mockOnCreateCampaign}
          onViewCampaign={mockOnViewCampaign}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
      });

      const statusSelect = screen.getAllByDisplayValue('new')[0];
      fireEvent.change(statusSelect, { target: { value: 'in_progress' } });

      await waitFor(() => {
        expect(screen.getByText('Failed to update campaign status')).toBeInTheDocument();
      });
    });
  });
});