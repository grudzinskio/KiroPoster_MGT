import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { campaignService } from '../../services/campaignService';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, StatCard } from '../ui/Card';
import { Button } from '../ui/Button';
import { CardSkeleton } from '../ui/LoadingSpinner';
import { InlineNotification } from '../ui/Notification';
import { StatusBadge } from '../ui/Badge';
import type { Campaign } from '../../types/campaign';

interface ContractorStats {
  assignedCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalImagesUploaded: number;
  approvedImages: number;
  rejectedImages: number;
  pendingImages: number;
  approvalRate: number;
}

export const ContractorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ContractorStats>({
    assignedCampaigns: 0,
    activeCampaigns: 0,
    completedCampaigns: 0,
    totalImagesUploaded: 0,
    approvedImages: 0,
    rejectedImages: 0,
    pendingImages: 0,
    approvalRate: 0,
  });
  const [assignedCampaigns, setAssignedCampaigns] = useState<Campaign[]>([]);
  const [completedCampaigns, setCompletedCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContractorData = async () => {
      if (!user?.id) {
        setError('User not found');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch campaigns assigned to this contractor
        const campaigns = await campaignService.getCampaignsByContractor(user.id);

        // Separate active and completed campaigns
        const activeCampaigns = campaigns.filter(c => 
          c.status === 'new' || c.status === 'in_progress'
        );
        const completedCampaigns = campaigns.filter(c => c.status === 'completed');

        // Calculate image stats for this contractor
        const contractorImages = campaigns.flatMap(c => 
          (c.images || []).filter(img => img.uploadedBy === user.id)
        );

        const approvedImages = contractorImages.filter(img => img.status === 'approved');
        const rejectedImages = contractorImages.filter(img => img.status === 'rejected');
        const pendingImages = contractorImages.filter(img => img.status === 'pending');

        const approvalRate = contractorImages.length > 0 
          ? Math.round((approvedImages.length / contractorImages.length) * 100)
          : 0;

        setStats({
          assignedCampaigns: campaigns.length,
          activeCampaigns: activeCampaigns.length,
          completedCampaigns: completedCampaigns.length,
          totalImagesUploaded: contractorImages.length,
          approvedImages: approvedImages.length,
          rejectedImages: rejectedImages.length,
          pendingImages: pendingImages.length,
          approvalRate,
        });

        setAssignedCampaigns(activeCampaigns);
        setCompletedCampaigns(completedCampaigns.slice(0, 5)); // Show last 5 completed

      } catch (err) {
        console.error('Error fetching contractor dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContractorData();
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <CardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <InlineNotification
        type="error"
        title="Failed to load dashboard"
        message={error}
      />
    );
  }

  const statCards = [
    {
      title: 'Active Assignments',
      value: stats.activeCampaigns,
      icon: '📋',
      color: 'blue' as const,
      description: 'Campaigns currently assigned to you'
    },
    {
      title: 'Images Uploaded',
      value: stats.totalImagesUploaded,
      icon: '📸',
      color: 'green' as const,
      description: 'Total images you have uploaded'
    },
    {
      title: 'Approved Images',
      value: stats.approvedImages,
      icon: '✅',
      color: 'purple' as const,
      description: 'Images approved by reviewers'
    },
    {
      title: 'Approval Rate',
      value: `${stats.approvalRate}%`,
      icon: '📊',
      color: 'indigo' as const,
      description: 'Percentage of approved images'
    },
  ];

  const getMyImagesForCampaign = (campaign: Campaign) => {
    return (campaign.images || []).filter(img => img.uploadedBy === user?.id);
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((card, index) => (
          <StatCard
            key={index}
            title={card.title}
            value={card.value}
            icon={card.icon}
            color={card.color}
          />
        ))}
      </div>

      {/* Performance Overview */}
      {stats.totalImagesUploaded > 0 && (
        <Card>
          <CardHeader title="Performance Overview" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-success-600 mb-1">{stats.approvedImages}</div>
              <div className="text-sm text-gray-500">Approved</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-warning-600 mb-1">{stats.pendingImages}</div>
              <div className="text-sm text-gray-500">Pending Review</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-error-600 mb-1">{stats.rejectedImages}</div>
              <div className="text-sm text-gray-500">Rejected</div>
            </div>
          </div>
          
          {stats.rejectedImages > 0 && (
            <InlineNotification
              type="warning"
              title="Improve Your Success Rate"
              message="Check rejection reasons in your campaign details to improve future uploads."
            />
          )}
        </Card>
      )}

      {/* Assigned Campaigns */}
      <Card>
        <CardHeader
          title="Your Assigned Campaigns"
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/campaigns'}
            >
              View all →
            </Button>
          }
        />
        
        {assignedCampaigns.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No active assignments</h3>
            <p className="text-gray-500">
              New campaign assignments will appear here when they are created
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignedCampaigns.map((campaign) => {
              const myImages = getMyImagesForCampaign(campaign);
              const approvedCount = myImages.filter(img => img.status === 'approved').length;
              const pendingCount = myImages.filter(img => img.status === 'pending').length;
              const rejectedCount = myImages.filter(img => img.status === 'rejected').length;

              return (
                <div
                  key={campaign.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/campaigns/${campaign.id}`}
                        className="text-lg font-medium text-gray-900 hover:text-primary-600 transition-colors duration-200"
                      >
                        {campaign.name}
                      </Link>
                      {campaign.description && (
                        <p className="text-sm text-gray-600 mt-1">{campaign.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        🏢 {campaign.company?.name}
                      </p>
                    </div>
                    <StatusBadge status={campaign.status} className="ml-4" />
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 text-sm mb-3">
                    <span className="flex items-center text-success-600">
                      <span className="mr-1">✅</span>
                      {approvedCount} approved
                    </span>
                    {pendingCount > 0 && (
                      <span className="flex items-center text-warning-600">
                        <span className="mr-1">⏳</span>
                        {pendingCount} pending
                      </span>
                    )}
                    {rejectedCount > 0 && (
                      <span className="flex items-center text-error-600">
                        <span className="mr-1">❌</span>
                        {rejectedCount} rejected
                      </span>
                    )}
                  </div>
                  
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => window.location.href = `/campaigns/${campaign.id}`}
                      rightIcon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                      }
                    >
                      Upload Images
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Recently Completed Campaigns */}
      {completedCampaigns.length > 0 && (
        <Card>
          <CardHeader title="Recently Completed Campaigns" />
          <div className="space-y-3">
            {completedCampaigns.map((campaign) => {
              const myImages = getMyImagesForCampaign(campaign);
              const approvedCount = myImages.filter(img => img.status === 'approved').length;
              
              return (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/campaigns/${campaign.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-primary-600 transition-colors duration-200"
                    >
                      {campaign.name}
                    </Link>
                    <p className="text-xs text-gray-500 mt-1">
                      {campaign.company?.name} • Completed {campaign.completedAt ? new Date(campaign.completedAt).toLocaleDateString() : 'Recently'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3 ml-4">
                    <StatusBadge status="completed" />
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {approvedCount}/{myImages.length} approved
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};