import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CompanyList, CompanyForm, CompanyDetail } from '../components/companies';
import type { Company } from '../types/company';

type ViewMode = 'list' | 'form' | 'detail';

export const CompaniesPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [viewingCompanyId, setViewingCompanyId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const isCompanyEmployee = currentUser?.role === 'company_employee';

  // Redirect if not authorized
  if (!isCompanyEmployee) {
    return (
      <div className="text-center py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md inline-block">
          You don't have permission to access company management.
        </div>
      </div>
    );
  }

  const handleCreateCompany = () => {
    setEditingCompany(null);
    setViewMode('form');
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setViewMode('form');
  };

  const handleViewCompany = (company: Company) => {
    setViewingCompanyId(company.id);
    setViewMode('detail');
  };

  const handleSaveCompany = () => {
    setViewMode('list');
    setEditingCompany(null);
    // Trigger refresh of company list
    setRefreshKey(prev => prev + 1);
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingCompany(null);
    setViewingCompanyId(null);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setViewingCompanyId(null);
    setEditingCompany(null);
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'form':
        return (
          <CompanyForm
            company={editingCompany}
            onSave={handleSaveCompany}
            onCancel={handleCancel}
          />
        );
      
      case 'detail':
        return viewingCompanyId ? (
          <CompanyDetail
            companyId={viewingCompanyId}
            onEdit={handleEditCompany}
            onBack={handleBackToList}
          />
        ) : null;
      
      case 'list':
      default:
        return (
          <CompanyList
            key={refreshKey}
            onCreateCompany={handleCreateCompany}
            onEditCompany={handleEditCompany}
            onViewCompany={handleViewCompany}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {renderContent()}
    </div>
  );
};