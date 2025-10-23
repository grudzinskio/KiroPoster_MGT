import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { CompanyForm } from '../CompanyForm';
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

describe('CompanyForm', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useAuth to return company employee
    (useAuth as any).mockReturnValue({
      user: { id: 1, role: 'company_employee' },
    });

    // Mock companyService
    (companyService.createCompany as any).mockResolvedValue(mockCompany);
    (companyService.updateCompany as any).mockResolvedValue(mockCompany);
  });

  it('renders create form correctly', () => {
    render(
      <CompanyForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Create New Company')).toBeInTheDocument();
    expect(screen.getByLabelText('Company Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Contact Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Contact Phone')).toBeInTheDocument();
    expect(screen.getByLabelText('Address')).toBeInTheDocument();
    expect(screen.getByText('Create Company')).toBeInTheDocument();
  });

  it('renders edit form correctly', () => {
    render(
      <CompanyForm
        company={mockCompany}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Edit Company')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Company')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123-456-7890')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123 Test St')).toBeInTheDocument();
    expect(screen.getByText('Update Company')).toBeInTheDocument();
    expect(screen.getByLabelText('Active Company')).toBeChecked();
  });

  it('validates required fields', async () => {
    render(
      <CompanyForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Try to submit without required fields
    fireEvent.click(screen.getByText('Create Company'));

    // The form should prevent submission and show error
    expect(mockOnSave).not.toHaveBeenCalled();
    
    // Check that the required field is highlighted (HTML5 validation)
    const nameInput = screen.getByLabelText('Company Name *');
    expect(nameInput).toBeRequired();
  });

  it('validates email format', async () => {
    render(
      <CompanyForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Fill in required field
    fireEvent.change(screen.getByLabelText('Company Name *'), {
      target: { value: 'Test Company' }
    });

    // Enter invalid email
    fireEvent.change(screen.getByLabelText('Contact Email'), {
      target: { value: 'invalid-email' }
    });

    fireEvent.click(screen.getByText('Create Company'));

    // Wait for validation to occur
    await waitFor(() => {
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    // The email input should be invalid (HTML5 validation)
    const emailInput = screen.getByLabelText('Contact Email');
    expect(emailInput).toHaveValue('invalid-email');
  });

  it('creates new company successfully', async () => {
    render(
      <CompanyForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Fill in form
    fireEvent.change(screen.getByLabelText('Company Name *'), {
      target: { value: 'New Company' }
    });
    fireEvent.change(screen.getByLabelText('Contact Email'), {
      target: { value: 'new@example.com' }
    });
    fireEvent.change(screen.getByLabelText('Contact Phone'), {
      target: { value: '555-0123' }
    });
    fireEvent.change(screen.getByLabelText('Address'), {
      target: { value: '456 New St' }
    });

    fireEvent.click(screen.getByText('Create Company'));

    await waitFor(() => {
      expect(companyService.createCompany).toHaveBeenCalledWith({
        name: 'New Company',
        contactEmail: 'new@example.com',
        contactPhone: '555-0123',
        address: '456 New St',
      });
    });

    expect(mockOnSave).toHaveBeenCalledWith(mockCompany);
  });

  it('updates existing company successfully', async () => {
    render(
      <CompanyForm
        company={mockCompany}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Update form
    fireEvent.change(screen.getByDisplayValue('Test Company'), {
      target: { value: 'Updated Company' }
    });

    fireEvent.click(screen.getByText('Update Company'));

    await waitFor(() => {
      expect(companyService.updateCompany).toHaveBeenCalledWith(1, {
        name: 'Updated Company',
        contactEmail: 'test@example.com',
        contactPhone: '123-456-7890',
        address: '123 Test St',
        isActive: true,
      });
    });

    expect(mockOnSave).toHaveBeenCalledWith(mockCompany);
  });

  it('handles empty optional fields correctly', async () => {
    render(
      <CompanyForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Fill in only required field
    fireEvent.change(screen.getByLabelText('Company Name *'), {
      target: { value: 'Minimal Company' }
    });

    fireEvent.click(screen.getByText('Create Company'));

    await waitFor(() => {
      expect(companyService.createCompany).toHaveBeenCalledWith({
        name: 'Minimal Company',
        contactEmail: undefined,
        contactPhone: undefined,
        address: undefined,
      });
    });

    expect(mockOnSave).toHaveBeenCalledWith(mockCompany);
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <CompanyForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('shows loading state during submission', async () => {
    // Mock a delayed response
    (companyService.createCompany as any).mockReturnValue(
      new Promise(resolve => setTimeout(() => resolve(mockCompany), 100))
    );

    render(
      <CompanyForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Fill in required field
    fireEvent.change(screen.getByLabelText('Company Name *'), {
      target: { value: 'Test Company' }
    });

    fireEvent.click(screen.getByText('Create Company'));

    // Check loading state
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.getByText('Saving...')).toBeDisabled();

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it('shows error message on API failure', async () => {
    const errorMessage = 'Company name already exists';
    (companyService.createCompany as any).mockRejectedValue({
      response: { data: { error: { message: errorMessage } } }
    });

    render(
      <CompanyForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Fill in required field
    fireEvent.change(screen.getByLabelText('Company Name *'), {
      target: { value: 'Test Company' }
    });

    fireEvent.click(screen.getByText('Create Company'));

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('shows permission error for non-company employees', () => {
    (useAuth as unknown).mockReturnValue({
      user: { id: 1, role: 'client' },
    });

    render(
      <CompanyForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText("You don't have permission to manage companies.")).toBeInTheDocument();
  });
});