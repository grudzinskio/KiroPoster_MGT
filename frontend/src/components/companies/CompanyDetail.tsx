import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { companyService } from '../../services/companyService';
import type { Company } from '../../types/company';

interface CompanyDetailProps {
  companyId: number;
  onEdit?: (company: Company) => void;
  onBack?: () => void;
}

export const CompanyDetail: React.FC<CompanyDetailProps> = ({ 
  companyId, 
  onEdit, 
  onBack 
}) => {
  const { user: currentUser } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isCompanyEmployee = currentUser?.role === 'company_employee';

  useEffect(() => {
    loadCompany();
  }, [companyId]);

  const loadCompany = async () => {
    try {
      setLoading(true);
      setError(null);
      const companyData = await companyService.getCompany(companyId);
      setCompany(companyData);
    } catch (err) {
      setError('Failed to load company details');
      console.error('Error loading company:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!company || !isCompanyEmployee) return;

    try {
      const updatedCompany = await companyService.toggleCompanyStatus(company.id, !company.isActive);
      setCompany(updatedCompany);
    } catch (err) {
      setError('Failed to update company status');
      console.error('Error updating company status:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="text-center py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md inline-block">
          {error || 'Company not found'}
        </div>
        {onBack && (
          <div className="mt-4">
            <button
              type="button"
              onClick={onBack}
              className="text-blue-600 hover:text-blue-900"
            >
              ← Back to Companies
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{company.name}</h2>
            <div className="mt-1">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                company.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {company.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {isCompanyEmployee && (
          <div className="flex space-x-3">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(company)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Edit Company
              </button>
            )}
            <button
              type="button"
              onClick={handleToggleStatus}
              className={`px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                company.isActive
                  ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
                  : 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
              }`}
            >
              {company.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        )}
      </div>

      {/* Company Information */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Company Information</h3>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Company Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{company.name}</dd>
            </div>

            {company.contactEmail && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Contact Email</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <a 
                    href={`mailto:${company.contactEmail}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    {company.contactEmail}
                  </a>
                </dd>
              </div>
            )}

            {company.contactPhone && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Contact Phone</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <a 
                    href={`tel:${company.contactPhone}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    {company.contactPhone}
                  </a>
                </dd>
              </div>
            )}

            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  company.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {company.isActive ? 'Active' : 'Inactive'}
                </span>
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(company.createdAt).toLocaleDateString()}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(company.updatedAt).toLocaleDateString()}
              </dd>
            </div>

            {company.address && (
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="mt-1 text-sm text-gray-900">{company.address}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Associated Campaigns Section */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Associated Campaigns</h3>
        </div>
        <div className="p-6">
          <div className="text-center py-8 text-gray-500">
            Campaign integration will be implemented in future tasks.
            <br />
            This section will show campaigns associated with this company.
          </div>
        </div>
      </div>
    </div>
  );
};