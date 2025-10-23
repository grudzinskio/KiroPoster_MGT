import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CampaignForm } from '../CampaignForm';
import { useAuth } from '../../../contexts/AuthContext';
import { campaignService } from '../../../services/campaignService';
import { companyService } from '../../../services/companyService';
import type { Campaign } from '../../../types/campaign';
import type { Company } from '../../../types/company';

// Mock the dependencies
vi.mock('../../../contexts/AuthContext');
vi.mock('../../../services/campaignService');
vi.mock('../../../services/companyService');

const mockUseAuth = vi.mocked(useAuth);
const mockCampaignService = vi.mocked(campaignService);
const mockCompanyService = vi.mocked(companyService);

const mockCompanies: Company[] = [
  {
    id: 1,
    name: 'Test Company 1',
    contactEmail: 'test1@example.com',
    contactPhone: '123-456-7890',
    address: '123 Test St',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Test Company 2',
    contactEmail: 'test2@example.com',
    contactPhone: '098-765-4321',
    address: '456 Test Ave',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

const mockCampaign: Campaign = {
  id: 1,
  name: 'Test Campaign',
  description: 'Test description',
  companyId: 1,
  status: 'new',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  completedAt: null,
  createdBy: 1,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  company: mockCompanies[0],
  assignedContractors: [],
  images: [],
};

describe('CampaignForm', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCompanyService.getCompanies.mockResolvedValue(mockCompanies);
    mockCampaignService.createCampaign.mockResolvedValue(mockCampaign);
    mockCampaignService.updateCampaign.mockResolvedValue(mockCampaign);
  });

  describe('Company Employee Access', () => {
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

    it('renders create form for company employee', async () => {
      render(
        <CampaignForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Create New Campaign')).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/Campaign Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Company/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Start Date/)).toBeInTheDocument();
      expect(screen.getByLabelText(/End Date/)).toBeInTheDocument();
    });

    it('renders edit form with pre-filled data', async () => {
      render(
        <CampaignForm
          campaign={mockCampaign}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Edit Campaign')).toBeInTheDocument();
      });

      expect(screen.getByDisplayValue('Test Campaign')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
      // Check if the company is selected (value should be "1")
      const companySelect = screen.getByLabelText(/Company/);
      expect(companySelect).toHaveValue('1');
      expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-01-31')).toBeInTheDocument();
    });

    it('loads and displays companies in dropdown', async () => {
      render(
        <CampaignForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(mockCompanyService.getCompanies).toHaveBeenCalled();
      });

      const companySelect = screen.getByLabelText(/Company/);
      expect(companySelect).toBeInTheDocument();
      
      // Check if companies are loaded in the select
      expect(screen.getByText('Test Company 1')).toBeInTheDocument();
      expect(screen.getByText('Test Company 2')).toBeInTheDocument();
    });

    it('creates new campaign when form is submitted', async () => {
      render(
        <CampaignForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Create New Campaign')).toBeInTheDocument();
      });

      // Fill out the form
      fireEvent.change(screen.getByLabelText(/Campaign Name/), {
        target: { value: 'New Test Campaign' },
      });
      fireEvent.change(screen.getByLabelText(/Description/), {
        target: { value: 'New test description' },
      });
      fireEvent.change(screen.getByLabelText(/Company/), {
        target: { value: '1' },
      });
      fireEvent.change(screen.getByLabelText(/Start Date/), {
        target: { value: '2024-03-01' },
      });
      fireEvent.change(screen.getByLabelText(/End Date/), {
        target: { value: '2024-03-31' },
      });

      // Submit the form
      fireEvent.click(screen.getByText('Create Campaign'));

      await waitFor(() => {
        expect(mockCampaignService.createCampaign).toHaveBeenCalledWith({
          name: 'New Test Campaign',
          description: 'New test description',
          companyId: 1,
          startDate: '2024-03-01',
          endDate: '2024-03-31',
        });
      });

      expect(mockOnSave).toHaveBeenCalledWith(mockCampaign);
    });

    it('updates existing campaign when form is submitted', async () => {
      render(
        <CampaignForm
          campaign={mockCampaign}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Edit Campaign')).toBeInTheDocument();
      });

      // Update the campaign name
      const nameInput = screen.getByDisplayValue('Test Campaign');
      fireEvent.change(nameInput, {
        target: { value: 'Updated Test Campaign' },
      });

      // Submit the form
      fireEvent.click(screen.getByText('Update Campaign'));

      await waitFor(() => {
        expect(mockCampaignService.updateCampaign).toHaveBeenCalledWith(1, {
          name: 'Updated Test Campaign',
          description: 'Test description',
          companyId: 1,
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });
      });

      expect(mockOnSave).toHaveBeenCalledWith(mockCampaign);
    });

    it('calls onCancel when cancel button is clicked', async () => {
      render(
        <CampaignForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cancel'));
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Non-Company Employee Access', () => {
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

    it('shows permission denied message for non-company employees', () => {
      render(
        <CampaignForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText("You don't have permission to create or edit campaigns.")).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
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

    it('shows error when campaign name is empty', async () => {
      render(
        <CampaignForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Create New Campaign')).toBeInTheDocument();
      });

      // Try to submit without filling required fields
      fireEvent.click(screen.getByText('Create Campaign'));

      // The form should prevent submission and show validation error
      expect(mockCampaignService.createCampaign).not.toHaveBeenCalled();
    });

    it('shows error when company is not selected', async () => {
      render(
        <CampaignForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Create New Campaign')).toBeInTheDocument();
      });

      // Fill name but not company
      fireEvent.change(screen.getByLabelText(/Campaign Name/), {
        target: { value: 'Test Campaign' },
      });

      fireEvent.click(screen.getByText('Create Campaign'));

      // The form should prevent submission
      expect(mockCampaignService.createCampaign).not.toHaveBeenCalled();
    });

    it('shows error when end date is before start date', async () => {
      render(
        <CampaignForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Create New Campaign')).toBeInTheDocument();
      });

      // Fill required fields with invalid date range
      fireEvent.change(screen.getByLabelText(/Campaign Name/), {
        target: { value: 'Test Campaign' },
      });
      fireEvent.change(screen.getByLabelText(/Company/), {
        target: { value: '1' },
      });
      fireEvent.change(screen.getByLabelText(/Start Date/), {
        target: { value: '2024-03-31' },
      });
      fireEvent.change(screen.getByLabelText(/End Date/), {
        target: { value: '2024-03-01' },
      });

      fireEvent.click(screen.getByText('Create Campaign'));

      await waitFor(() => {
        expect(screen.getByText('End date must be after start date')).toBeInTheDocument();
      });

      expect(mockCampaignService.createCampaign).not.toHaveBeenCalled();
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

    it('displays error message when campaign creation fails', async () => {
      mockCampaignService.createCampaign.mockRejectedValue({
        response: {
          data: {
            error: {
              message: 'Campaign creation failed',
            },
          },
        },
      });

      render(
        <CampaignForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Create New Campaign')).toBeInTheDocument();
      });

      // Fill out valid form
      fireEvent.change(screen.getByLabelText(/Campaign Name/), {
        target: { value: 'Test Campaign' },
      });
      fireEvent.change(screen.getByLabelText(/Company/), {
        target: { value: '1' },
      });

      fireEvent.click(screen.getByText('Create Campaign'));

      await waitFor(() => {
        expect(screen.getByText('Campaign creation failed')).toBeInTheDocument();
      });

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('displays generic error message when companies fail to load', async () => {
      mockCompanyService.getCompanies.mockRejectedValue(new Error('Network error'));

      render(
        <CampaignForm
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load companies')).toBeInTheDocument();
      });
    });
  });
});