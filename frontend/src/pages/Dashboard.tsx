import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  CompanyEmployeeDashboard, 
  ClientDashboard, 
  ContractorDashboard 
} from '../components/dashboard';
import { Card } from '../components/ui/Card';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const getRoleSpecificContent = () => {
    switch (user?.role) {
      case 'company_employee':
        return <CompanyEmployeeDashboard />;
      case 'client':
        return <ClientDashboard />;
      case 'contractor':
        return <ContractorDashboard />;
      default:
        return (
          <Card className="text-center py-12">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to the Dashboard</h3>
            <p className="text-gray-500">Your personalized dashboard will appear here once your role is configured.</p>
          </Card>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-600 to-indigo-600 rounded-xl shadow-soft text-white p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Welcome back, {user?.firstName}! 👋
            </h1>
            <p className="mt-2 text-primary-100 text-sm sm:text-base">
              Here's what's happening with your campaigns today.
            </p>
          </div>
          <div className="hidden sm:block">
            <div className="text-6xl opacity-20">
              {user?.role === 'company_employee' ? '👨‍💼' : 
               user?.role === 'client' ? '🏢' : '👷‍♂️'}
            </div>
          </div>
        </div>
      </div>

      {/* Role-specific Content */}
      <div className="animate-fade-in">
        {getRoleSpecificContent()}
      </div>
    </div>
  );
};