import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { CompanyDetail } from '../CompanyDetail';
import { companyService } from '../../../services/companyService';
import { useAuth } from '../../../contexts/AuthContext';

// Mock the services and contexts
vi.mock('../../../services/companyService');
vi.mock('../../../contexts/AuthContext');

const mockCompany = {
  id: 1,
  name: 'Test Company',
  contactEmail: 'test@example.com',
  contactPhone: '123-456-7890',
  address: '123 Test St',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('CompanyDetail', () => {
  const mockOnEdit = vi.fn();
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useAuth to return company employee
    (useAuth as any).mockReturnValue({
      user: { id: 1, role: 'company_employee' },
    });

    // Mock companyService
    (companyService.getCompany as any).mockResolvedValue(mockCompany);
    (companyService.toggleCompanyStatus as any).mockResolvedValue({
      ...mockCompany,
      isActive: false,
    });
  });

  it('renders company details correctly', async () => {
    render(
      <CompanyDetail
        companyId={1}
        onEdit={mockOnEdit}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('Test Company')).toHaveLength(2); // Header and details
    });

    // Check company information
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('123-456-7890')).toBeInTheDocument();
    expect(screen.getByText('123 Test St')).toBeInTheDocument();
    expect(screen.getAllByText('Active')).toHaveLength(2); // Header and details
    expect(screen.getAllByText('12/31/2023')).toHaveLength(2); // Created and updated dates
  });

  it('shows edit and deactivate buttons for company employees', async () => {
    render(
      <CompanyDetail
        companyId={1}
        onEdit={mockOnEdit}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Edit Company')).toBeInTheDocument();
    });

    expect(screen.getByText('Edit Company')).toBeInTheDocument();
    expect(screen.getByText('Deactivate')).toBeInTheDocument();
  });

  it('hides action buttons for non-company employees', async () => {
    (useAuth as any).mockReturnValue({
      user: { id: 1, role: 'client' },
    });

    render(
      <CompanyDetail
        companyId={1}
        onEdit={mockOnEdit}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('Test Company')).toHaveLength(2);
    });

    expect(screen.queryByText('Edit Company')).not.toBeInTheDocument();
    expect(screen.queryByText('Deactivate')).not.toBeInTheDocument();
  });

  it('shows back button when onBack is provided', async () => {
    render(
      <CompanyDetail
        companyId={1}
        onEdit={mockOnEdit}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('← Back')).toBeInTheDocument();
    });
  });

  it('calls onEdit when edit button is clicked', async () => {
    render(
      <CompanyDetail
        companyId={1}
        onEdit={mockOnEdit}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Edit Company')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit Company'));
    expect(mockOnEdit).toHaveBeenCalledWith(mockCompany);
  });

  it('calls onBack when back button is clicked', async () => {
    render(
      <CompanyDetail
        companyId={1}
        onEdit={mockOnEdit}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('← Back')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('← Back'));
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('toggles company status when activate/deactivate is clicked', async () => {
    render(
      <CompanyDetail
        companyId={1}
        onEdit={mockOnEdit}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Deactivate')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Deactivate'));

    await waitFor(() => {
      expect(companyService.toggleCompanyStatus).toHaveBeenCalledWith(1, false);
    });
  });

  it('shows activate button for inactive companies', async () => {
    const inactiveCompany = { ...mockCompany, isActive: false };
    (companyService.getCompany as any).mockResolvedValue(inactiveCompany);

    render(
      <CompanyDetail
        companyId={1}
        onEdit={mockOnEdit}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Activate')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Inactive')).toHaveLength(2); // One in header, one in details
  });

  it('handles missing optional fields gracefully', async () => {
    const minimalCompany = {
      id: 1,
      name: 'Minimal Company',
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    (companyService.getCompany as any).mockResolvedValue(minimalCompany);

    render(
      <CompanyDetail
        companyId={1}
        onEdit={mockOnEdit}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('Minimal Company')).toHaveLength(2); // One in header, one in details
    });

    // Should not show contact information sections
    expect(screen.queryByText('Contact Email')).not.toBeInTheDocument();
    expect(screen.queryByText('Contact Phone')).not.toBeInTheDocument();
    expect(screen.queryByText('Address')).not.toBeInTheDocument();
  });

  it('shows loading state', () => {
    (companyService.getCompany as any).mockReturnValue(new Promise(() => {}));
    
    render(
      <CompanyDetail
        companyId={1}
        onEdit={mockOnEdit}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows error state', async () => {
    (companyService.getCompany as unknown).mockRejectedValue(new Error('Failed to load'));
    
    render(
      <CompanyDetail
        companyId={1}
        onEdit={mockOnEdit}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load company details')).toBeInTheDocument();
    });
  });

  it('shows campaigns section placeholder', async () => {
    render(
      <CompanyDetail
        companyId={1}
        onEdit={mockOnEdit}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Associated Campaigns')).toBeInTheDocument();
    });

    expect(screen.getByText(/Campaign integration will be implemented/)).toBeInTheDocument();
  });

  it('makes contact email and phone clickable', async () => {
    render(
      <CompanyDetail
        companyId={1}
        onEdit={mockOnEdit}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    const emailLink = screen.getByText('test@example.com');
    const phoneLink = screen.getByText('123-456-7890');

    expect(emailLink.closest('a')).toHaveAttribute('href', 'mailto:test@example.com');
    expect(phoneLink.closest('a')).toHaveAttribute('href', 'tel:123-456-7890');
  });
});