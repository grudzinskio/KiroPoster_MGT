import React, { useState } from 'react';
import { CampaignList } from '../components/campaigns/CampaignList';
import { CampaignForm } from '../components/campaigns/CampaignForm';
import { CampaignDetail } from '../components/campaigns/CampaignDetail';
import { ContractorAssignment } from '../components/campaigns/ContractorAssignment';
import type { Campaign } from '../types/campaign';

type ViewMode = 'list' | 'create' | 'edit' | 'detail' | 'assign';

export const CampaignsPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateCampaign = () => {
    setSelectedCampaign(null);
    setViewMode('create');
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setViewMode('edit');
  };

  const handleViewCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setViewMode('detail');
  };

  const handleAssignContractors = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setViewMode('assign');
  };

  const handleSaveCampaign = (_campaign: Campaign) => {
    setViewMode('list');
    setSelectedCampaign(null);
    // Trigger refresh of campaign list
    setRefreshKey(prev => prev + 1);
  };

  const handleCancelForm = () => {
    setViewMode('list');
    setSelectedCampaign(null);
  };

  const handleCloseDetail = () => {
    setViewMode('list');
    setSelectedCampaign(null);
  };

  const handleUpdateCampaign = (updatedCampaign: Campaign) => {
    setSelectedCampaign(updatedCampaign);
    // Trigger refresh of campaign list
    setRefreshKey(prev => prev + 1);
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'create':
        return (
          <CampaignForm
            onSave={handleSaveCampaign}
            onCancel={handleCancelForm}
          />
        );

      case 'edit':
        return selectedCampaign ? (
          <CampaignForm
            campaign={selectedCampaign}
            onSave={handleSaveCampaign}
            onCancel={handleCancelForm}
          />
        ) : null;

      case 'detail':
        return selectedCampaign ? (
          <CampaignDetail
            campaignId={selectedCampaign.id}
            onEdit={handleEditCampaign}
            onClose={handleCloseDetail}
          />
        ) : null;

      case 'assign':
        return selectedCampaign ? (
          <ContractorAssignment
            campaign={selectedCampaign}
            onUpdate={handleUpdateCampaign}
            onClose={handleCloseDetail}
          />
        ) : null;

      case 'list':
      default:
        return (
          <CampaignList
            key={refreshKey}
            onCreateCampaign={handleCreateCampaign}
            onEditCampaign={handleEditCampaign}
            onViewCampaign={handleViewCampaign}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        {viewMode !== 'list' && (
          <div className="mb-6">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-4">
                <li>
                  <button
                    onClick={() => setViewMode('list')}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Campaigns</span>
                    Campaigns
                  </button>
                </li>
                <li>
                  <div className="flex items-center">
                    <svg
                      className="flex-shrink-0 h-5 w-5 text-gray-300"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                    </svg>
                    <span className="ml-4 text-sm font-medium text-gray-500">
                      {viewMode === 'create' && 'Create Campaign'}
                      {viewMode === 'edit' && 'Edit Campaign'}
                      {viewMode === 'detail' && selectedCampaign?.name}
                      {viewMode === 'assign' && 'Assign Contractors'}
                    </span>
                  </div>
                </li>
              </ol>
            </nav>
          </div>
        )}

        {/* Additional Actions for Detail View */}
        {viewMode === 'detail' && selectedCampaign && (
          <div className="mb-6 flex justify-end space-x-3">
            <button
              onClick={() => handleAssignContractors(selectedCampaign)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Manage Contractors
            </button>
          </div>
        )}

        {/* Main Content */}
        {renderContent()}
      </div>
    </div>
  );
};