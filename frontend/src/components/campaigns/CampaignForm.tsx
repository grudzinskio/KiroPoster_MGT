import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { campaignService } from '../../services/campaignService';
import { companyService } from '../../services/companyService';
import type { Campaign, CreateCampaignRequest, UpdateCampaignRequest } from '../../types/campaign';
import type { Company } from '../../types/company';

interface CampaignFormProps {
  campaign?: Campaign;
  onSave: (campaign: Campaign) => void;
  onCancel: () => void;
}

export const CampaignForm: React.FC<CampaignFormProps> = ({
  campaign,
  onSave,
  onCancel,
}) => {
  const { user: currentUser } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: campaign?.name || '',
    description: campaign?.description || '',
    companyId: campaign?.companyId?.toString() || '',
    startDate: campaign?.startDate || '',
    endDate: campaign?.endDate || '',
  });

  const isEditing = !!campaign;
  const isCompanyEmployee = currentUser?.role === 'company_employee';

  useEffect(() => {
    if (isCompanyEmployee) {
      loadCompanies();
    }
  }, [isCompanyEmployee]);

  const loadCompanies = async () => {
    try {
      const companyData = await companyService.getCompanies();
      setCompanies(companyData.filter(company => company.isActive));
    } catch (err) {
      console.error('Error loading companies:', err);
      setError('Failed to load companies');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Campaign name is required');
      return false;
    }

    if (!formData.companyId) {
      setError('Company is required');
      return false;
    }

    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      setError('End date must be after start date');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let savedCampaign: Campaign;

      if (isEditing && campaign) {
        const updateData: UpdateCampaignRequest = {
          name: formData.name,
          description: formData.description || undefined,
          companyId: Number(formData.companyId),
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
        };
        savedCampaign = await campaignService.updateCampaign(campaign.id, updateData);
      } else {
        const createData: CreateCampaignRequest = {
          name: formData.name,
          description: formData.description || undefined,
          companyId: Number(formData.companyId),
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
        };
        savedCampaign = await campaignService.createCampaign(createData);
      }

      onSave(savedCampaign);
    } catch (err: any) {
      console.error('Error saving campaign:', err);
      setError(err.response?.data?.error?.message || 'Failed to save campaign');
    } finally {
      setLoading(false);
    }
  };

  if (!isCompanyEmployee) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        You don't have permission to create or edit campaigns.
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          {isEditing ? 'Edit Campaign' : 'Create New Campaign'}
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Campaign Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Campaign Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={formData.name}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter campaign name"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            value={formData.description}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter campaign description"
          />
        </div>

        {/* Company Selection */}
        <div>
          <label htmlFor="companyId" className="block text-sm font-medium text-gray-700 mb-1">
            Company *
          </label>
          <select
            id="companyId"
            name="companyId"
            required
            value={formData.companyId}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={formData.endDate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : isEditing ? 'Update Campaign' : 'Create Campaign'}
          </button>
        </div>
      </form>
    </div>
  );
};