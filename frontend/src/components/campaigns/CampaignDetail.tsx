import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { campaignService } from '../../services/campaignService';
import type { Campaign } from '../../types/campaign';

interface CampaignDetailProps {
  campaignId: number;
  onEdit?: (campaign: Campaign) => void;
  onClose?: () => void;
}

export const CampaignDetail: React.FC<CampaignDetailProps> = ({
  campaignId,
  onEdit,
  onClose,
}) => {
  const { user: currentUser } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isCompanyEmployee = currentUser?.role === 'company_employee';
  const isClient = currentUser?.role === 'client';
  const isContractor = currentUser?.role === 'contractor';

  useEffect(() => {
    loadCampaign();
  }, [campaignId]);

  const loadCampaign = async () => {
    try {
      setLoading(true);
      setError(null);
      const campaignData = await campaignService.getCampaignById(campaignId);
      setCampaign(campaignData);
    } catch (err) {
      setError('Failed to load campaign details');
      console.error('Error loading campaign:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: Campaign['status']) => {
    if (!campaign || !isCompanyEmployee) return;

    try {
      const updatedCampaign = await campaignService.updateCampaignStatus(campaign.id, newStatus);
      setCampaign(updatedCampaign);
    } catch (err) {
      setError('Failed to update campaign status');
      console.error('Error updating campaign status:', err);
    }
  };

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: Campaign['status']) => {
    switch (status) {
      case 'new':
        return 'New';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">Loading campaign details...</div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        {error || 'Campaign not found'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{campaign.name}</h2>
              {campaign.description && (
                <p className="mt-2 text-gray-600">{campaign.description}</p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {isCompanyEmployee && onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(campaign)}
                  className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                >
                  Edit Campaign
                </button>
              )}
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Company */}
            <div>
              <dt className="text-sm font-medium text-gray-500">Company</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {campaign.company?.name || 'Unknown'}
              </dd>
            </div>

            {/* Status */}
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                {isCompanyEmployee ? (
                  <select
                    value={campaign.status}
                    onChange={(e) => handleStatusChange(e.target.value as Campaign['status'])}
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 ${getStatusColor(campaign.status)}`}
                  >
                    <option value="new">New</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                ) : (
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.status)}`}>
                    {formatStatus(campaign.status)}
                  </span>
                )}
              </dd>
            </div>

            {/* Start Date */}
            <div>
              <dt className="text-sm font-medium text-gray-500">Start Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : 'Not set'}
              </dd>
            </div>

            {/* End Date */}
            <div>
              <dt className="text-sm font-medium text-gray-500">End Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : 'Not set'}
              </dd>
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Contractors */}
      {(isCompanyEmployee || isClient) && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Assigned Contractors ({campaign.assignedContractors?.length || 0})
            </h3>
          </div>
          <div className="px-6 py-4">
            {campaign.assignedContractors && campaign.assignedContractors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {campaign.assignedContractors.map((contractor) => (
                  <div key={contractor.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-900">
                      {contractor.firstName} {contractor.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{contractor.email}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Assigned: {new Date(contractor.assignedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No contractors assigned to this campaign.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Gallery */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Campaign Images ({campaign.images?.length || 0})
          </h3>
        </div>
        <div className="px-6 py-4">
          {campaign.images && campaign.images.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {campaign.images.map((image: any) => (
                <div key={image.id} className="relative group">
                  <div className="aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={`/api/images/${image.id}/file`}
                      alt={image.originalFilename}
                      className="w-full h-48 object-cover group-hover:opacity-75 transition-opacity"
                    />
                  </div>
                  <div className="mt-2">
                    <div className="text-xs text-gray-500 truncate">
                      {image.originalFilename}
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        image.status === 'approved' 
                          ? 'bg-green-100 text-green-800'
                          : image.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {image.status}
                      </span>
                      <div className="text-xs text-gray-400">
                        {new Date(image.uploadedAt).toLocaleDateString()}
                      </div>
                    </div>
                    {image.rejectionReason && (
                      <div className="text-xs text-red-600 mt-1">
                        Reason: {image.rejectionReason}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No images uploaded for this campaign yet.
              {isContractor && campaign.status === 'in_progress' && (
                <div className="mt-2">
                  <span className="text-blue-600">You can upload images when assigned to this campaign.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Campaign Timeline */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Campaign Timeline</h3>
        </div>
        <div className="px-6 py-4">
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full"></div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-900">Campaign Created</div>
                <div className="text-sm text-gray-500">
                  {new Date(campaign.createdAt).toLocaleDateString()} by {campaign.createdByUser?.firstName} {campaign.createdByUser?.lastName}
                </div>
              </div>
            </div>
            
            {campaign.completedAt && (
              <div className="flex items-center">
                <div className="flex-shrink-0 w-2 h-2 bg-green-600 rounded-full"></div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-900">Campaign Completed</div>
                  <div className="text-sm text-gray-500">
                    {new Date(campaign.completedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};