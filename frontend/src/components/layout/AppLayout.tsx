import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'company_employee':
        return 'Company Employee';
      case 'client':
        return 'Client';
      case 'contractor':
        return 'Contractor';
      default:
        return role;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Poster Campaign Management
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {user && (
                <>
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">{user.firstName} {user.lastName}</span>
                    <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                      {getRoleDisplayName(user.role)}
                    </span>
                  </div>
                  
                  <button
                    onClick={handleLogout}
                    className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700"
                  >
                    Sign out
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};