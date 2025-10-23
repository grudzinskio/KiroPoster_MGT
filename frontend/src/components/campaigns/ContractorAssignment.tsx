import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { campaignService } from '../../services/campaignService';
import { userService } from '../../services/userService';
import type { Campaign } from '../../types/campaign';
import type { User } from '../../types/user';

interface ContractorAssignmentProps {
  campaign: Campaign;
  onUpdate: (updatedCampaign: Campaign) => void;
  onClose: () => void;
}

export const ContractorAssignment: React.FC<ContractorAssignmentProps> = ({
  campaign,
  onUpdate,
  onClose,
}) => {
  const { user: currentUser } = useAuth();
  const [contractors, setContractors] = useState<User[]>([]);
  const [assignedContractors, setAssignedContractors] = useState<Campaign['assignedContractors']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningContractor, setAssigningContractor] = useState<number | null>(null);
  const [removingContractor, setRemovingContractor] = useState<number | null>(null);

  const isCompanyEmployee = currentUser?.role === 'company_employee';

  useEffect(() => {
    loadData();
  }, [campaign.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load all contractors and assigned contractors
      const [allUsers, assignedData] = await Promise.all([
        userService.getUsers(),
        campaignService.getAssignedContractors(campaign.id),
      ]);

      const contractorUsers = allUsers.filter(user => 
        user.role === 'contractor' && user.isActive
      );
      
      setContractors(contractorUsers);
      setAssignedContractors(assignedData || []);
    } catch (err) {
      setError('Failed to load contractor data');
      console.error('Error loading contractor data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignContractor = async (contractorId: number) => {
    if (!isCompanyEmployee) return;

    setAssigningContractor(contractorId);
    setError(null);

    try {
      await campaignService.assignContractor(campaign.id, contractorId);
      
      // Reload assigned contractors
      const updatedAssigned = await campaignService.getAssignedContractors(campaign.id);
      setAssignedContractors(updatedAssigned || []);
      
      // Update parent component
      const updatedCampaign = await campaignService.getCampaignById(campaign.id);
      onUpdate(updatedCampaign);
    } catch (err: any) {
      console.error('Error assigning contractor:', err);
      setError(err.response?.data?.error?.message || 'Failed to assign contractor');
    } finally {
      setAssigningContractor(null);
    }
  };

  const handleRemoveContractor = async (contractorId: number) => {
    if (!isCompanyEmployee) return;

    setRemovingContractor(contractorId);
    setError(null);

    try {
      await campaignService.removeContractorAssignment(campaign.id, contractorId);
      
      // Reload assigned contractors
      const updatedAssigned = await campaignService.getAssignedContractors(campaign.id);
      setAssignedContractors(updatedAssigned || []);
      
      // Update parent component
      const updatedCampaign = await campaignService.getCampaignById(campaign.id);
      onUpdate(updatedCampaign);
    } catch (err: any) {
      console.error('Error removing contractor:', err);
      setError(err.response?.data?.error?.message || 'Failed to remove contractor');
    } finally {
      setRemovingContractor(null);
    }
  };

  const isContractorAssigned = (contractorId: number): boolean => {
    return assignedContractors?.some(assigned => assigned.id === contractorId) || false;
  };

  if (!isCompanyEmployee) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        You don't have permission to manage contractor assignments.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">Loading contractors...</div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            Manage Contractors - {campaign.name}
          </h3>
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
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Currently Assigned Contractors */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">
            Assigned Contractors ({assignedContractors?.length || 0})
          </h4>
          {assignedContractors && assignedContractors.length > 0 ? (
            <div className="space-y-2">
              {assignedContractors.map((contractor) => (
                <div key={contractor.id} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-2 h-2 bg-green-600 rounded-full mr-3"></div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {contractor.firstName} {contractor.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{contractor.email}</div>
                      <div className="text-xs text-gray-400">
                        Assigned: {new Date(contractor.assignedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveContractor(contractor.id)}
                    disabled={removingContractor === contractor.id}
                    className="text-red-600 hover:text-red-900 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {removingContractor === contractor.id ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
              No contractors assigned to this campaign.
            </div>
          )}
        </div>

        {/* Available Contractors */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">
            Available Contractors
          </h4>
          {contractors.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {contractors
                .filter(contractor => !isContractorAssigned(contractor.id))
                .map((contractor) => (
                  <div key={contractor.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {contractor.firstName} {contractor.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{contractor.email}</div>
                        {contractor.companyId && (
                          <div className="text-xs text-gray-400">
                            Company ID: {contractor.companyId}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAssignContractor(contractor.id)}
                      disabled={assigningContractor === contractor.id}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {assigningContractor === contractor.id ? 'Assigning...' : 'Assign'}
                    </button>
                  </div>
                ))}
              {contractors.filter(contractor => !isContractorAssigned(contractor.id)).length === 0 && (
                <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                  All available contractors are already assigned to this campaign.
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
              No contractors available in the system.
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};