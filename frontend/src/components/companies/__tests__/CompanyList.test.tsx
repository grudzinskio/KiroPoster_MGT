import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { CompanyList } from '../CompanyList';
import { companyService } from '../../../services/companyService';
import { useAuth } from '../../../contexts/AuthContext';

// Mock the services and contexts
vi.mock('../../../services/companyService');
vi.mock('../../../contexts/AuthContext');

const mockCompanies = [
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
    isActive: false,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

describe('CompanyList', () => {
  const mockOnEditCompany = vi.fn();
  const mockOnCreateCompany = vi.fn();
  const mockOnViewCompany = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useAuth to return company employee
    (useAuth as any).mockReturnValue({
      user: { id: 1, role: 'company_employee' },
    });

    // Mock companyService
    (companyService.getCompanies as any).mockResolvedValue(mockCompanies);
    (companyService.toggleCompanyStatus as any).mockResolvedValue({
      ...mockCompanies[0],
      isActive: false,
    });
  });

  it('renders company list correctly', async () => {
    render(
      <CompanyList
        onEditCompany={mockOnEditCompany}
        onCreateCompany={mockOnCreateCompany}
        onViewCompany={mockOnViewCompany}
      />
    );

    // Wait for companies to load
    await waitFor(() => {
      expect(screen.getByText('Test Company 1')).toBeInTheDocument();
      expect(screen.getByText('Test Company 2')).toBeInTheDocument();
    });

    // Check if contact information is displayed
    expect(screen.getByText('test1@example.com')).toBeInTheDocument();
    expect(screen.getByText('123-456-7890')).toBeInTheDocument();
  });

  it('shows create button for company employees', async () => {
    render(
      <CompanyList
        onEditCompany={mockOnEditCompany}
        onCreateCompany={mockOnCreateCompany}
        onViewCompany={mockOnViewCompany}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Create Company')).toBeInTheDocument();
    });
  });

  it('filters companies by search term', async () => {
    render(
      <CompanyList
        onEditCompany={mockOnEditCompany}
        onCreateCompany={mockOnCreateCompany}
        onViewCompany={mockOnViewCompany}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Company 1')).toBeInTheDocument();
      expect(screen.getByText('Test Company 2')).toBeInTheDocument();
    });

    // Search for specific company
    const searchInput = screen.getByPlaceholderText('Search by name, email, or phone...');
    fireEvent.change(searchInput, { target: { value: 'Test Company 1' } });

    await waitFor(() => {
      expect(screen.getByText('Test Company 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Company 2')).not.toBeInTheDocument();
    });
  });

  it('filters companies by status', async () => {
    render(
      <CompanyList
        onEditCompany={mockOnEditCompany}
        onCreateCompany={mockOnCreateCompany}
        onViewCompany={mockOnViewCompany}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Company 1')).toBeInTheDocument();
      expect(screen.getByText('Test Company 2')).toBeInTheDocument();
    });

    // Filter by active status
    const statusSelect = screen.getByDisplayValue('All Status');
    fireEvent.change(statusSelect, { target: { value: 'true' } });

    await waitFor(() => {
      expect(screen.getByText('Test Company 1')).toBeInTheDocument();
      expect(screen.queryByText('Test Company 2')).not.toBeInTheDocument();
    });
  });

  it('calls onCreateCompany when create button is clicked', async () => {
    render(
      <CompanyList
        onEditCompany={mockOnEditCompany}
        onCreateCompany={mockOnCreateCompany}
        onViewCompany={mockOnViewCompany}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Create Company')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Company'));
    expect(mockOnCreateCompany).toHaveBeenCalledTimes(1);
  });

  it('calls onEditCompany when edit button is clicked', async () => {
    render(
      <CompanyList
        onEditCompany={mockOnEditCompany}
        onCreateCompany={mockOnCreateCompany}
        onViewCompany={mockOnViewCompany}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Company 1')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);
    
    expect(mockOnEditCompany).toHaveBeenCalledWith(mockCompanies[0]);
  });

  it('calls onViewCompany when view button is clicked', async () => {
    render(
      <CompanyList
        onEditCompany={mockOnEditCompany}
        onCreateCompany={mockOnCreateCompany}
        onViewCompany={mockOnViewCompany}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Company 1')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByText('View');
    fireEvent.click(viewButtons[0]);
    
    expect(mockOnViewCompany).toHaveBeenCalledWith(mockCompanies[0]);
  });

  it('toggles company status when activate/deactivate is clicked', async () => {
    render(
      <CompanyList
        onEditCompany={mockOnEditCompany}
        onCreateCompany={mockOnCreateCompany}
        onViewCompany={mockOnViewCompany}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Company 1')).toBeInTheDocument();
    });

    const deactivateButton = screen.getByText('Deactivate');
    fireEvent.click(deactivateButton);

    await waitFor(() => {
      expect(companyService.toggleCompanyStatus).toHaveBeenCalledWith(1, false);
    });
  });

  it('shows loading state', () => {
    (companyService.getCompanies as any).mockReturnValue(new Promise(() => {}));
    
    render(
      <CompanyList
        onEditCompany={mockOnEditCompany}
        onCreateCompany={mockOnCreateCompany}
        onViewCompany={mockOnViewCompany}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows error state', async () => {
    (companyService.getCompanies as any).mockRejectedValue(new Error('Failed to load'));
    
    render(
      <CompanyList
        onEditCompany={mockOnEditCompany}
        onCreateCompany={mockOnCreateCompany}
        onViewCompany={mockOnViewCompany}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load companies')).toBeInTheDocument();
    });
  });

  it('shows no companies message when list is empty', async () => {
    (companyService.getCompanies as any).mockResolvedValue([]);
    
    render(
      <CompanyList
        onEditCompany={mockOnEditCompany}
        onCreateCompany={mockOnCreateCompany}
        onViewCompany={mockOnViewCompany}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No companies found matching your criteria.')).toBeInTheDocument();
    });
  });
});