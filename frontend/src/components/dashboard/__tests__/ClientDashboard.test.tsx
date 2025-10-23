import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { ClientDashboard } from '../ClientDashboard';
import { campaignService } from '../../../services/campaignService';
import { useAuth } from '../../../contexts/AuthContext';

// Mock the services and context
vi.mock('../../../services/campaignService');
vi.mock('../../../contexts/AuthContext');

const mockCampaignService = campaignService as any;
const mockUseAuth = useAuth as unknown;

const mockUser = {
  id: 1,
  email: 'client@example.com',
  firstName: 'Client',
  lastName: 'User',
  role: 'client' as const,
  companyId: 1,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

const mockCampaigns = [
  {
    id: 1,
    name: 'Active Campaign',
    description: 'Test description',
    companyId: 1,
    status: 'in_progress' as const,
    createdBy: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    company: { id: 1, name: 'Test Company' },
    images: [
      { id: 1, status: 'approved' as const, campaignId: 1, uploadedBy: 2, filename: 'test1.jpg', originalFilename: 'test1.jpg', filePath: '/test1.jpg', fileSize: 1000, mimeType: 'image/jpeg', uploadedAt: '2024-01-01T00:00:00Z' },
      { id: 2, status: 'pending' as const, campaignId: 1, uploadedBy: 2, filename: 'test2.jpg', originalFilename: 'test2.jpg', filePath: '/test2.jpg', fileSize: 1000, mimeType: 'image/jpeg', uploadedAt: '2024-01-01T00:00:00Z' }
    ]
  },
  {
    id: 2,
    name: 'Completed Campaign',
    description: 'Completed test',
    companyId: 1,
    status: 'completed' as const,
    completedAt: new Date().toISOString(), // Recently completed
    createdBy: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    company: { id: 1, name: 'Test Company' },
    images: [
      { id: 3, status: 'approved' as const, campaignId: 2, uploadedBy: 2, filename: 'test3.jpg', originalFilename: 'test3.jpg', filePath: '/test3.jpg', fileSize: 1000, mimeType: 'image/jpeg', uploadedAt: '2024-01-01T00:00:00Z' }
    ]
  }
];

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('ClientDashboard', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn()
    });
    mockCampaignService.getCampaignsByCompany = vi.fn().mockResolvedValue(mockCampaigns);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    renderWithRouter(<ClientDashboard />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays client dashboard stats', async () => {
    renderWithRouter(<ClientDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Active Campaigns')).toBeInTheDocument();
      expect(screen.getByText('Completed This Month')).toBeInTheDocument();
      expect(screen.getByText('Total Images')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Total images count
    });
  });

  it('displays current campaigns with progress', async () => {
    renderWithRouter(<ClientDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Current Campaigns')).toBeInTheDocument();
      expect(screen.getByText('Active Campaign')).toBeInTheDocument();
      expect(screen.getByText('50% complete')).toBeInTheDocument(); // 1 approved out of 2 images
    });
  });

  it('displays completed campaigns section when there are completed campaigns', async () => {
    renderWithRouter(<ClientDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Recently Completed Campaigns')).toBeInTheDocument();
      expect(screen.getByText('Completed Campaign')).toBeInTheDocument();
    });
  });

  it('handles error when user has no company', async () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockUser, companyId: undefined },
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn()
    });

    renderWithRouter(<ClientDashboard />);

    await waitFor(() => {
      expect(screen.getByText('No company associated with user')).toBeInTheDocument();
    });
  });

  it('handles API error', async () => {
    mockCampaignService.getCampaignsByCompany = vi.fn().mockRejectedValue(new Error('API Error'));

    renderWithRouter(<ClientDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
    });
  });

  it('shows empty state when no active campaigns', async () => {
    mockCampaignService.getCampaignsByCompany = vi.fn().mockResolvedValue([]);

    renderWithRouter(<ClientDashboard />);

    await waitFor(() => {
      expect(screen.getByText('No active campaigns at the moment')).toBeInTheDocument();
    });
  });
});