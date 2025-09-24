import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginForm } from '../LoginForm';
import { AuthProvider } from '../../../contexts/AuthContext';

// Mock the API service
vi.mock('../../../services/api', () => ({
  apiService: {
    login: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    getCurrentUser: vi.fn().mockRejectedValue(new Error('Not authenticated')),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const renderLoginForm = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('LoginForm', () => {
  it('renders login form with all required fields', async () => {
    renderLoginForm();
    
    // Wait for auth initialization
    await screen.findByLabelText(/email address/i);
    
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows the correct heading', async () => {
    renderLoginForm();
    
    await screen.findByText(/sign in to your account/i);
    expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();
  });
});