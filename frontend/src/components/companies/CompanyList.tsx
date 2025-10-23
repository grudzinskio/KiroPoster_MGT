import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { companyService } from '../../services/companyService';
import type { Company, CompanyFilters } from '../../types/company';

interface CompanyListProps {
  onEditCompany?: (company: Company) => void;
  onCreateCompany?: () => void;
  onViewCompany?: (company: Company) => void;
}

export const CompanyList: React.FC<CompanyListProps> = ({ 
  onEditCompany, 
  onCreateCompany, 
  onViewCompany 
}) => {
  const { user: currentUser } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CompanyFilters>({
    search: '',
    isActive: '',
  });

  const isCompanyEmployee = currentUser?.role === 'company_employee';

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      const companyData = await companyService.getCompanies();
      setCompanies(companyData);
    } catch (err) {
      setError('Failed to load companies');
      console.error('Error loading companies:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = React.useCallback(() => {
    let filtered = [...companies];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(company =>
        company.name.toLowerCase().includes(searchLower) ||
        company.contactEmail?.toLowerCase().includes(searchLower) ||
        company.contactPhone?.toLowerCase().includes(searchLower)
      );
    }

    // Active status filter
    if (filters.isActive !== '' && filters.isActive !== undefined) {
      filtered = filtered.filter(company => company.isActive === filters.isActive);
    }

    setFilteredCompanies(filtered);
  }, [companies, filters]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleToggleCompanyStatus = async (company: Company) => {
    if (!isCompanyEmployee) return;

    try {
      const updatedCompany = await companyService.toggleCompanyStatus(company.id, !company.isActive);
      setCompanies(companies.map(c => c.id === company.id ? updatedCompany : c));
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Company Management</h2>
        {isCompanyEmployee && onCreateCompany && (
          <button
            type="button"
            onClick={onCreateCompany}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Create Company
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search by name, email, or phone..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              value={filters.isActive?.toString() || ''}
              onChange={(e) => setFilters({ ...filters, isActive: e.target.value === '' ? '' : e.target.value === 'true' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Companies Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                {isCompanyEmployee && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCompanies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {company.name}
                      </div>
                      {company.address && (
                        <div className="text-sm text-gray-500">{company.address}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      {company.contactEmail && (
                        <div className="text-sm text-gray-900">{company.contactEmail}</div>
                      )}
                      {company.contactPhone && (
                        <div className="text-sm text-gray-500">{company.contactPhone}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      company.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {company.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(company.createdAt).toLocaleDateString()}
                  </td>
                  {isCompanyEmployee && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      {onViewCompany && (
                        <button
                          type="button"
                          onClick={() => onViewCompany(company)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          View
                        </button>
                      )}
                      {onEditCompany && (
                        <button
                          type="button"
                          onClick={() => onEditCompany(company)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggleCompanyStatus(company)}
                        className={`${
                          company.isActive 
                            ? 'text-red-600 hover:text-red-900' 
                            : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        {company.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCompanies.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            No companies found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
};