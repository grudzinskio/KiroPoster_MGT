import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import { AuthProvider } from '../../../contexts/AuthContext';
import { apiService } from '../../../services/api';

// Mock the API service
vi.mock('../../../services/api', () => ({
  apiService: {
    login: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    getCurrentUser: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const TestComponent = () => <div>Protected Content</div>;

const renderProtectedRoute = (
  allowedRoles?: any[],
  requireAuth = true,
  initialUser?: unknown
) => {
  // Mock localStorage for initial user state
  if (initialUser) {
    localStorage.setItem('token', 'mock-token');
    localStorage.setItem('user', JSON.stringify(initialUser));
    mockApiService.getCurrentUser.mockResolvedValue({
      data: { success: true, data: initialUser }
    });
  }

  return render(
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={allowedRoles} requireAuth={requireAuth}>
                <TestComponent />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows loading spinner while checking authentication', () => {
    renderProtectedRoute();
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', async () => {
    mockApiService.getCurrentUser.mockRejectedValue(new Error('Not authenticated'));
    
    renderProtectedRoute();
    
    // Wait for auth check to complete
    await screen.findByText('Login Page');
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders protected content when user is authenticated', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'company_employee',
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    renderProtectedRoute(undefined, true, mockUser);
    
    await screen.findByText('Protected Content');
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('shows access denied when user role is not allowed', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'client',
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    renderProtectedRoute(['company_employee'], true, mockUser);
    
    await screen.findByText('Access Denied');
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText(/you don't have permission/i)).toBeInTheDocument();
  });

  it('renders content when user role is allowed', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'company_employee',
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    renderProtectedRoute(['company_employee', 'client'], true, mockUser);
    
    await screen.findByText('Protected Content');
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders content when requireAuth is false', async () => {
    renderProtectedRoute(undefined, false);
    
    await screen.findByText('Protected Content');
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});