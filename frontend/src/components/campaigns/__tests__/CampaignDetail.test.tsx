import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CampaignDetail } from '../CampaignDetail';
import { useAuth } from '../../../contexts/AuthContext';
import { campaignService } from '../../../services/campaignService';
import type { Campaign } from '../../../types/campaign';

// Mock the dependencies
vi.mock('../../../contexts/AuthContext');
vi.mock('../../../services/campaignService');

const mockUseAuth = vi.mocked(useAuth);
const mockCampaignService = vi.mocked(campaignService);

const mockCampaign: Campaign = {
  id: 1,
  name: 'Test Campaign',
  description: 'Test campaign description',
  companyId: 1,
  status: 'in_progress',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  completedAt: null,
  createdBy: 1,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  company: {
    id: 1,
    name: 'Test Company',
    contactEmail: 'test@example.com',
  },
  createdByUser: {
    id: 1,
    firstName: 'John',
    lastName: 'Creator',
  },
  assignedContractors: [
    {
      id: 3,
      email: 'contractor@example.com',
      firstName: 'Jane',
      lastName: 'Contractor',
      role: 'contractor',
      assignedAt: '2024-01-02T00:00:00Z',
    },
  ],
  images: [
    {
      id: 1,
      originalFilename: 'test-image.jpg',
      status: 'approved',
      uploadedAt: '2024-01-03T00:00:00Z',
    },
    {
      id: 2,
      originalFilename: 'rejected-image.jpg',
      status: 'rejected',
      rejectionReason: 'Poor quality',
      uploadedAt: '2024-01-04T00:00:00Z',
    },
  ],
};

describe('CampaignDetail', () => {
  const mockOnEdit = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCampaignService.getCampaignById.mockResolvedValue(mockCampaign);
    mockCampaignService.updateCampaignStatus.mockResolvedValue({
      ...mockCampaign,
      status: 'completed',
    });
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

    it('renders campaign details for company employee', async () => {
      render(
        <CampaignDetail
          campaignId={1}
          onEdit={mockOnEdit}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Campaign')).toBeInTheDocument();
      });

      expect(screen.getByText('Test campaign description')).toBeInTheDocument();
      expect(screen.getByText('Test Company')).toBeInTheDocument();
      expect(screen.getByText('Edit Campaign')).toBeInTheDocument();
      expect(mockCampaignService.getCampaignById).toHaveBeenCalledWith(1);
    });

    it('allows company employee to change campaign status', async () => {
      render(
        <CampaignDetail
          campaignId={1}
          onEdit={mockOnEdit}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Campaign')).toBeInTheDocument();
      });

      const statusSelect = screen.getByRole('combobox');
      fireEvent.change(statusSelect, { target: { value: 'completed' } });

      await waitFor(() => {
        expect(mockCampaignService.updateCampaignStatus).toHaveBeenCalledWith(1, 'completed');
      });
    });

    it('shows assigned contractors section', async () => {
      render(
        <CampaignDetail
          campaignId={1}
          onEdit={mockOnEdit}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Assigned Contractors (1)')).toBeInTheDocument();
      });

      expect(screen.getByText('Jane Contractor')).toBeInTheDocument();
      expect(screen.getByText('contractor@example.com')).toBeInTheDocument();
    });

    it('calls onEdit when edit button is clicked', async () => {
      render(
        <CampaignDetail
          campaignId={1}
          onEdit={mockOnEdit}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Edit Campaign')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Edit Campaign'));
      expect(mockOnEdit).toHaveBeenCalledWith(mockCampaign);
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

    it('renders campaign details for client with read-only status', async () => {
      render(
        <CampaignDetail
          campaignId={1}
          onEdit={mockOnEdit}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Campaign')).toBeInTheDocument();
      });

      expect(screen.queryByText('Edit Campaign')).not.toBeInTheDocument();
      
      const statusElement = screen.getByText('In Progress');
      expect(statusElement.tagName).toBe('SPAN');
    });

    it('shows assigned contractors section for client', async () => {
      render(
        <CampaignDetail
          campaignId={1}
          onEdit={mockOnEdit}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Assigned Contractors (1)')).toBeInTheDocument();
      });

      expect(screen.getByText('Jane Contractor')).toBeInTheDocument();
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

    it('renders campaign details for contractor with limited view', async () => {
      render(
        <CampaignDetail
          campaignId={1}
          onEdit={mockOnEdit}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Campaign')).toBeInTheDocument();
      });

      expect(screen.queryByText('Edit Campaign')).not.toBeInTheDocument();
      expect(screen.queryByText('Assigned Contractors')).not.toBeInTheDocument();
    });
  });

  describe('Image Gallery', () => {
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

    it('displays campaign images with status', async () => {
      render(
        <CampaignDetail
          campaignId={1}
          onEdit={mockOnEdit}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Campaign Images (2)')).toBeInTheDocument();
      });

      expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
      expect(screen.getByText('rejected-image.jpg')).toBeInTheDocument();
      expect(screen.getByText('approved')).toBeInTheDocument();
      expect(screen.getByText('rejected')).toBeInTheDocument();
      expect(screen.getByText('Reason: Poor quality')).toBeInTheDocument();
    });

    it('shows message when no images are uploaded', async () => {
      const campaignWithoutImages = { ...mockCampaign, images: [] };
      mockCampaignService.getCampaignById.mockResolvedValue(campaignWithoutImages);

      render(
        <CampaignDetail
          campaignId={1}
          onEdit={mockOnEdit}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Campaign Images (0)')).toBeInTheDocument();
      });

      expect(screen.getByText('No images uploaded for this campaign yet.')).toBeInTheDocument();
    });
  });

  describe('Campaign Timeline', () => {
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

    it('displays campaign timeline with creation info', async () => {
      render(
        <CampaignDetail
          campaignId={1}
          onEdit={mockOnEdit}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Campaign Timeline')).toBeInTheDocument();
      });

      expect(screen.getByText('Campaign Created')).toBeInTheDocument();
      expect(screen.getByText(/by John Creator/)).toBeInTheDocument();
    });

    it('displays completion date when campaign is completed', async () => {
      const completedCampaign = {
        ...mockCampaign,
        status: 'completed' as const,
        completedAt: '2024-01-31T00:00:00Z',
      };
      mockCampaignService.getCampaignById.mockResolvedValue(completedCampaign);

      render(
        <CampaignDetail
          campaignId={1}
          onEdit={mockOnEdit}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Campaign Completed')).toBeInTheDocument();
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

    it('displays error message when campaign fails to load', async () => {
      mockCampaignService.getCampaignById.mockRejectedValue(new Error('Network error'));

      render(
        <CampaignDetail
          campaignId={1}
          onEdit={mockOnEdit}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load campaign details')).toBeInTheDocument();
      });
    });

    it('displays error message when status update fails', async () => {
      mockCampaignService.updateCampaignStatus.mockRejectedValue(new Error('Update failed'));

      render(
        <CampaignDetail
          campaignId={1}
          onEdit={mockOnEdit}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Campaign')).toBeInTheDocument();
      });

      const statusSelect = screen.getByRole('combobox');
      fireEvent.change(statusSelect, { target: { value: 'completed' } });

      await waitFor(() => {
        expect(screen.getByText('Failed to update campaign status')).toBeInTheDocument();
      });
    });
  });

  describe('Close Functionality', () => {
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

    it('calls onClose when close button is clicked', async () => {
      render(
        <CampaignDetail
          campaignId={1}
          onEdit={mockOnEdit}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Campaign')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});