import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { ContractorDashboard } from '../ContractorDashboard';
import { campaignService } from '../../../services/campaignService';
import { useAuth } from '../../../contexts/AuthContext';

// Mock the services and context
vi.mock('../../../services/campaignService');
vi.mock('../../../contexts/AuthContext');

const mockCampaignService = campaignService as any;
const mockUseAuth = useAuth as unknown;

const mockUser = {
  id: 2,
  email: 'contractor@example.com',
  firstName: 'Contractor',
  lastName: 'User',
  role: 'contractor' as const,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

const mockCampaigns = [
  {
    id: 1,
    name: 'Active Assignment',
    description: 'Test assignment',
    companyId: 1,
    status: 'in_progress' as const,
    createdBy: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    company: { id: 1, name: 'Test Company' },
    images: [
      { id: 1, status: 'approved' as const, campaignId: 1, uploadedBy: 2, filename: 'test1.jpg', originalFilename: 'test1.jpg', filePath: '/test1.jpg', fileSize: 1000, mimeType: 'image/jpeg', uploadedAt: '2024-01-01T00:00:00Z' },
      { id: 2, status: 'rejected' as const, campaignId: 1, uploadedBy: 2, filename: 'test2.jpg', originalFilename: 'test2.jpg', filePath: '/test2.jpg', fileSize: 1000, mimeType: 'image/jpeg', uploadedAt: '2024-01-01T00:00:00Z', rejectionReason: 'Poor quality' },
      { id: 3, status: 'pending' as const, campaignId: 1, uploadedBy: 2, filename: 'test3.jpg', originalFilename: 'test3.jpg', filePath: '/test3.jpg', fileSize: 1000, mimeType: 'image/jpeg', uploadedAt: '2024-01-01T00:00:00Z' }
    ]
  },
  {
    id: 2,
    name: 'Completed Assignment',
    description: 'Completed work',
    companyId: 1,
    status: 'completed' as const,
    completedAt: new Date().toISOString(),
    createdBy: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    company: { id: 1, name: 'Test Company' },
    images: [
      { id: 4, status: 'approved' as const, campaignId: 2, uploadedBy: 2, filename: 'test4.jpg', originalFilename: 'test4.jpg', filePath: '/test4.jpg', fileSize: 1000, mimeType: 'image/jpeg', uploadedAt: '2024-01-01T00:00:00Z' }
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

describe('ContractorDashboard', () => {
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
    mockCampaignService.getCampaignsByContractor = vi.fn().mockResolvedValue(mockCampaigns);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    renderWithRouter(<ContractorDashboard />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays contractor dashboard stats', async () => {
    renderWithRouter(<ContractorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Active Assignments')).toBeInTheDocument();
      expect(screen.getByText('Images Uploaded')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument(); // Total images uploaded by contractor
      expect(screen.getByText('Approval Rate')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument(); // 2 approved out of 4 images
    });
  });

  it('displays performance overview', async () => {
    renderWithRouter(<ContractorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Performance Overview')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('Pending Review')).toBeInTheDocument();
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });
  });

  it('displays assigned campaigns with image counts', async () => {
    renderWithRouter(<ContractorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Your Assigned Campaigns')).toBeInTheDocument();
      expect(screen.getByText('Active Assignment')).toBeInTheDocument();
      expect(screen.getByText('✅ 1 approved')).toBeInTheDocument();
      expect(screen.getByText('⏳ 1 pending')).toBeInTheDocument();
      expect(screen.getByText('❌ 1 rejected')).toBeInTheDocument();
    });
  });

  it('displays recently completed campaigns', async () => {
    renderWithRouter(<ContractorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Recently Completed Campaigns')).toBeInTheDocument();
      expect(screen.getByText('Completed Assignment')).toBeInTheDocument();
      expect(screen.getByText('1/1 approved')).toBeInTheDocument();
    });
  });

  it('shows tip when there are rejected images', async () => {
    renderWithRouter(<ContractorDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Check rejection reasons in your campaign details/)).toBeInTheDocument();
    });
  });

  it('handles error when user not found', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn()
    });

    renderWithRouter(<ContractorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('User not found')).toBeInTheDocument();
    });
  });

  it('handles API error', async () => {
    mockCampaignService.getCampaignsByContractor = vi.fn().mockRejectedValue(new Error('API Error'));

    renderWithRouter(<ContractorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
    });
  });

  it('shows empty state when no assignments', async () => {
    mockCampaignService.getCampaignsByContractor = vi.fn().mockResolvedValue([]);

    renderWithRouter(<ContractorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('No active assignments at the moment')).toBeInTheDocument();
    });
  });
});