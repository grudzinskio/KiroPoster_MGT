import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { CompanyEmployeeDashboard } from '../CompanyEmployeeDashboard';
import { campaignService } from '../../../services/campaignService';
import { userService } from '../../../services/userService';
import { companyService } from '../../../services/companyService';

// Mock the services
vi.mock('../../../services/campaignService');
vi.mock('../../../services/userService');
vi.mock('../../../services/companyService');

const mockCampaignService = campaignService as any;
const mockUserService = userService as any;
const mockCompanyService = companyService as unknown;

const mockCampaigns = [
  {
    id: 1,
    name: 'Test Campaign 1',
    description: 'Test description',
    companyId: 1,
    status: 'new' as const,
    createdBy: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    company: { id: 1, name: 'Test Company' },
    images: [
      { id: 1, status: 'pending' as const, campaignId: 1, uploadedBy: 1, filename: 'test.jpg', originalFilename: 'test.jpg', filePath: '/test.jpg', fileSize: 1000, mimeType: 'image/jpeg', uploadedAt: '2024-01-01T00:00:00Z' }
    ]
  },
  {
    id: 2,
    name: 'Test Campaign 2',
    description: 'Test description 2',
    companyId: 1,
    status: 'in_progress' as const,
    createdBy: 1,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    company: { id: 1, name: 'Test Company' },
    images: []
  }
];

const mockUsers = [
  { id: 1, email: 'test@example.com', firstName: 'Test', lastName: 'User', role: 'company_employee' as const, isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }
];

const mockCompanies = [
  { id: 1, name: 'Test Company', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }
];

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('CompanyEmployeeDashboard', () => {
  beforeEach(() => {
    mockCampaignService.getCampaigns = vi.fn().mockResolvedValue(mockCampaigns);
    mockUserService.getUsers = vi.fn().mockResolvedValue(mockUsers);
    mockCompanyService.getCompanies = vi.fn().mockResolvedValue(mockCompanies);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    renderWithRouter(<CompanyEmployeeDashboard />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays dashboard stats after loading', async () => {
    renderWithRouter(<CompanyEmployeeDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Total Campaigns')).toBeInTheDocument();
      expect(screen.getByText('New Campaigns')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });

  it('displays recent campaigns', async () => {
    renderWithRouter(<CompanyEmployeeDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Recent Campaigns')).toBeInTheDocument();
      expect(screen.getByText('Test Campaign 1')).toBeInTheDocument();
      expect(screen.getByText('Test Campaign 2')).toBeInTheDocument();
    });
  });

  it('displays quick actions', async () => {
    renderWithRouter(<CompanyEmployeeDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Create Campaign')).toBeInTheDocument();
      expect(screen.getByText('Add User')).toBeInTheDocument();
      expect(screen.getByText('Add Company')).toBeInTheDocument();
    });
  });

  it('handles error state', async () => {
    mockCampaignService.getCampaigns = vi.fn().mockRejectedValue(new Error('API Error'));

    renderWithRouter(<CompanyEmployeeDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
    });
  });

  it('calculates pending images correctly', async () => {
    renderWithRouter(<CompanyEmployeeDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Pending Images')).toBeInTheDocument();
    });
  });
});