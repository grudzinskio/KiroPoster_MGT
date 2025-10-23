import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { UserForm } from '../UserForm';
import { useAuth } from '../../../contexts/AuthContext';
import { userService } from '../../../services/userService';
import type { User } from '../../../types/user';

// Mock dependencies
vi.mock('../../../contexts/AuthContext');
vi.mock('../../../services/userService');

const mockUseAuth = vi.mocked(useAuth);
const mockUserService = vi.mocked(userService);

const mockCompanyEmployee: User = {
    id: 1,
    email: 'admin@company.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'company_employee',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
};

const mockExistingUser: User = {
    id: 2,
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'contractor',
    companyId: 1,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
};

describe('UserForm', () => {
    const mockOnSave = vi.fn();
    const mockOnCancel = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseAuth.mockReturnValue({
            user: mockCompanyEmployee,
            token: 'mock-token',
            isAuthenticated: true,
            isLoading: false,
            login: vi.fn(),
            logout: vi.fn(),
            refreshToken: vi.fn(),
        });
    });

    describe('Create Mode', () => {
        it('renders create user form', () => {
            render(
                <UserForm
                    user={null}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            expect(screen.getByText('Create New User')).toBeInTheDocument();
            expect(screen.getByText('Create User')).toBeInTheDocument();
        });

        it('has empty form fields initially', () => {
            render(
                <UserForm
                    user={null}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            expect(screen.getByRole('textbox', { name: /first name/i })).toHaveValue('');
            expect(screen.getByRole('textbox', { name: /last name/i })).toHaveValue('');
            expect(screen.getByRole('textbox', { name: /email/i })).toHaveValue('');
        });

        it('requires password for new users', () => {
            render(
                <UserForm
                    user={null}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            const passwordInput = screen.getByLabelText(/password \*/i);
            expect(passwordInput).toBeRequired();
        });

        it('creates user with valid data', async () => {
            const newUser = {
                id: 3,
                email: 'new@example.com',
                firstName: 'New',
                lastName: 'User',
                role: 'contractor' as const,
                isActive: true,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            };

            mockUserService.createUser.mockResolvedValue(newUser);

            render(
                <UserForm
                    user={null}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            // Fill form
            fireEvent.change(screen.getByRole('textbox', { name: /first name/i }), {
                target: { value: 'New' }
            });
            fireEvent.change(screen.getByRole('textbox', { name: /last name/i }), {
                target: { value: 'User' }
            });
            fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
                target: { value: 'new@example.com' }
            });
            fireEvent.change(screen.getByLabelText(/password \*/i), {
                target: { value: 'password123' }
            });

            // Submit form
            fireEvent.click(screen.getByText('Create User'));

            await waitFor(() => {
                expect(mockUserService.createUser).toHaveBeenCalledWith({
                    email: 'new@example.com',
                    password: 'password123',
                    firstName: 'New',
                    lastName: 'User',
                    role: 'contractor',
                });
                expect(mockOnSave).toHaveBeenCalledWith(newUser);
            });
        });
    });

    describe('Edit Mode', () => {
        it('renders edit user form with existing data', () => {
            render(
                <UserForm
                    user={mockExistingUser}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            expect(screen.getByText('Edit User')).toBeInTheDocument();
            expect(screen.getByText('Update User')).toBeInTheDocument();

            expect(screen.getByDisplayValue('John')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
            expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
            expect(screen.getByRole('combobox', { name: /role/i })).toHaveValue('contractor');
        });

        it('does not require password for existing users', () => {
            render(
                <UserForm
                    user={mockExistingUser}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            const passwordInput = screen.getByLabelText(/password/i);
            expect(passwordInput).not.toBeRequired();
        });

        it('shows active status checkbox for existing users', () => {
            render(
                <UserForm
                    user={mockExistingUser}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            expect(screen.getByLabelText(/active user/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/active user/i)).toBeChecked();
        });

        it('updates user with valid data', async () => {
            const updatedUser = {
                ...mockExistingUser,
                firstName: 'Updated',
            };

            mockUserService.updateUser.mockResolvedValue(updatedUser);

            render(
                <UserForm
                    user={mockExistingUser}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            // Update first name
            fireEvent.change(screen.getByDisplayValue('John'), {
                target: { value: 'Updated' }
            });

            // Submit form
            fireEvent.click(screen.getByText('Update User'));

            await waitFor(() => {
                expect(mockUserService.updateUser).toHaveBeenCalledWith(2, {
                    email: 'john@example.com',
                    firstName: 'Updated',
                    lastName: 'Doe',
                    role: 'contractor',
                    companyId: 1,
                    isActive: true,
                });
                expect(mockOnSave).toHaveBeenCalledWith(updatedUser);
            });
        });
    });

    describe('Form Validation', () => {
        it('shows form fields correctly', () => {
            render(
                <UserForm
                    user={null}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            expect(screen.getByRole('textbox', { name: /first name/i })).toBeInTheDocument();
            expect(screen.getByRole('textbox', { name: /last name/i })).toBeInTheDocument();
            expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
            expect(screen.getByLabelText(/password \*/i)).toBeInTheDocument();
        });

        it('has required fields marked correctly', () => {
            render(
                <UserForm
                    user={null}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            expect(screen.getByRole('textbox', { name: /first name/i })).toBeRequired();
            expect(screen.getByRole('textbox', { name: /last name/i })).toBeRequired();
            expect(screen.getByRole('textbox', { name: /email/i })).toBeRequired();
            expect(screen.getByLabelText(/password \*/i)).toBeRequired();
        });
    });

    describe('Role Selection', () => {
        it('allows role selection for company employees', () => {
            render(
                <UserForm
                    user={null}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            const roleSelect = screen.getByRole('combobox', { name: /role/i });
            expect(roleSelect).not.toBeDisabled();

            fireEvent.change(roleSelect, { target: { value: 'client' } });
            expect(roleSelect).toHaveValue('client');
        });

        it('disables role selection for non-company employees', () => {
            mockUseAuth.mockReturnValue({
                user: { ...mockCompanyEmployee, role: 'client' },
                token: 'mock-token',
                isAuthenticated: true,
                isLoading: false,
                login: vi.fn(),
                logout: vi.fn(),
                refreshToken: vi.fn(),
            });

            render(
                <UserForm
                    user={null}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            const roleSelect = screen.getByRole('combobox', { name: /role/i });
            expect(roleSelect).toBeDisabled();
        });
    });

    describe('Form Actions', () => {
        it('calls onCancel when cancel button is clicked', () => {
            render(
                <UserForm
                    user={null}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            fireEvent.click(screen.getByText('Cancel'));
            expect(mockOnCancel).toHaveBeenCalledTimes(1);
        });

        it('shows loading state during form submission', async () => {
            mockUserService.createUser.mockImplementation(
                () => new Promise(() => { }) // Never resolves
            );

            render(
                <UserForm
                    user={null}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            // Fill required fields
            fireEvent.change(screen.getByRole('textbox', { name: /first name/i }), {
                target: { value: 'Test' }
            });
            fireEvent.change(screen.getByRole('textbox', { name: /last name/i }), {
                target: { value: 'User' }
            });
            fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
                target: { value: 'test@example.com' }
            });
            fireEvent.change(screen.getByLabelText(/password \*/i), {
                target: { value: 'password123' }
            });

            fireEvent.click(screen.getByText('Create User'));

            await waitFor(() => {
                expect(screen.getByText('Saving...')).toBeInTheDocument();
                expect(screen.getByText('Saving...')).toBeDisabled();
            });
        });
    });

    describe('Error Handling', () => {
        it('displays API error messages', async () => {
            const errorMessage = 'Email already exists';
            mockUserService.createUser.mockRejectedValue({
                response: {
                    data: {
                        error: {
                            message: errorMessage
                        }
                    }
                }
            });

            render(
                <UserForm
                    user={null}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            // Fill and submit form
            fireEvent.change(screen.getByRole('textbox', { name: /first name/i }), {
                target: { value: 'Test' }
            });
            fireEvent.change(screen.getByRole('textbox', { name: /last name/i }), {
                target: { value: 'User' }
            });
            fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
                target: { value: 'test@example.com' }
            });
            fireEvent.change(screen.getByLabelText(/password \*/i), {
                target: { value: 'password123' }
            });

            fireEvent.click(screen.getByText('Create User'));

            await waitFor(() => {
                expect(screen.getByText(errorMessage)).toBeInTheDocument();
            });
        });

        it('displays generic error message for unknown errors', async () => {
            mockUserService.createUser.mockRejectedValue(new Error('Network error'));

            render(
                <UserForm
                    user={null}
                    onSave={mockOnSave}
                    onCancel={mockOnCancel}
                />
            );

            // Fill and submit form
            fireEvent.change(screen.getByRole('textbox', { name: /first name/i }), {
                target: { value: 'Test' }
            });
            fireEvent.change(screen.getByRole('textbox', { name: /last name/i }), {
                target: { value: 'User' }
            });
            fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
                target: { value: 'test@example.com' }
            });
            fireEvent.change(screen.getByLabelText(/password \*/i), {
                target: { value: 'password123' }
            });

            fireEvent.click(screen.getByText('Create User'));

            await waitFor(() => {
                expect(screen.getByText('Failed to save user')).toBeInTheDocument();
            });
        });
    });
});