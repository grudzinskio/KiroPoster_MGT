import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingScreen } from '../ui/LoadingSpinner';
import { Button } from '../ui/Button';
import type { User } from '../../types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: User['role'][];
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requireAuth = true,
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // Redirect to login if authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-medium p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-error-100 mb-6">
              <svg
                className="h-8 w-8 text-error-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Access Denied
            </h3>
            
            <p className="text-sm text-gray-600 mb-6">
              You don't have permission to access this page. Your role ({user.role}) 
              is not authorized for this resource.
            </p>
            
            <div className="space-y-3">
              <Button
                onClick={() => window.history.back()}
                variant="primary"
                fullWidth
              >
                Go Back
              </Button>
              
              <Button
                onClick={() => window.location.href = '/dashboard'}
                variant="ghost"
                fullWidth
              >
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render children if all checks pass
  return <>{children}</>;
};

// Higher-order component for role-based route protection
export const withRoleProtection = <P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: User['role'][]
) => {
  return (props: P) => (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <Component {...props} />
    </ProtectedRoute>
  );
};

// Specific role-based route components
export const CompanyEmployeeRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute allowedRoles={['company_employee']}>
    {children}
  </ProtectedRoute>
);

export const ClientRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute allowedRoles={['client']}>
    {children}
  </ProtectedRoute>
);

export const ContractorRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute allowedRoles={['contractor']}>
    {children}
  </ProtectedRoute>
);

export const ClientOrEmployeeRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute allowedRoles={['client', 'company_employee']}>
    {children}
  </ProtectedRoute>
);

export const EmployeeOrContractorRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute allowedRoles={['company_employee', 'contractor']}>
    {children}
  </ProtectedRoute>
);