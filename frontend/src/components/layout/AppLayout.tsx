import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button, IconButton } from '../ui/Button';
import { Badge } from '../ui/Badge';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'company_employee':
        return 'primary';
      case 'client':
        return 'success';
      case 'contractor':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getNavigationItems = () => {
    if (!user) return [];

    const baseItems = [
      { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
    ];

    switch (user.role) {
      case 'company_employee':
        return [
          ...baseItems,
          { name: 'Campaigns', href: '/campaigns', icon: '📊' },
          { name: 'Users', href: '/users', icon: '👥' },
          { name: 'Companies', href: '/companies', icon: '🏢' },
          { name: 'Images', href: '/images', icon: '📸' },
        ];
      case 'client':
        return [
          ...baseItems,
          { name: 'Campaigns', href: '/campaigns', icon: '📊' },
        ];
      case 'contractor':
        return [
          ...baseItems,
          { name: 'Campaigns', href: '/campaigns', icon: '📊' },
          { name: 'Images', href: '/images', icon: '📸' },
        ];
      default:
        return baseItems;
    }
  };

  const navigationItems = getNavigationItems();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-soft border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and Desktop Navigation */}
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center">
                <div className="flex-shrink-0 flex items-center">
                  <span className="text-2xl mr-3">📋</span>
                  <h1 className="text-xl font-bold text-gray-900 hidden sm:block">
                    Poster Campaign Management
                  </h1>
                  <h1 className="text-lg font-bold text-gray-900 sm:hidden">
                    PCM
                  </h1>
                </div>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:ml-8 md:flex md:space-x-1">
                {navigationItems.map((item) => {
                  const isActive = location.pathname === item.href || 
                    (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`
                        inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200
                        ${isActive
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      <span className="mr-2">{item.icon}</span>
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
            
            {/* User Menu and Mobile Menu Button */}
            <div className="flex items-center space-x-4">
              {user && (
                <>
                  {/* Desktop User Info */}
                  <div className="hidden sm:flex sm:items-center sm:space-x-3">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {user.email}
                      </div>
                    </div>
                    <Badge variant={getRoleBadgeVariant(user.role) as any} size="sm">
                      {getRoleDisplayName(user.role)}
                    </Badge>
                  </div>

                  {/* Mobile User Badge */}
                  <div className="sm:hidden">
                    <Badge variant={getRoleBadgeVariant(user.role) as any} size="sm">
                      {user.firstName}
                    </Badge>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="hidden sm:inline-flex"
                  >
                    Sign out
                  </Button>

                  {/* Mobile Menu Button */}
                  <IconButton
                    icon={
                      isMobileMenuOpen ? (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      )
                    }
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="md:hidden"
                    aria-label="Toggle mobile menu"
                  />
                </>
              )}
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-3 space-y-1 animate-slide-up">
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`
                      flex items-center px-4 py-3 text-base font-medium rounded-md transition-colors duration-200
                      ${isActive
                        ? 'bg-primary-100 text-primary-700 border-l-4 border-primary-500'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    {item.name}
                  </Link>
                );
              })}
              
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="px-4 py-2">
                  <div className="text-sm font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {user?.email}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    fullWidth
                    className="justify-start"
                  >
                    Sign out
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
        <div className="animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
};