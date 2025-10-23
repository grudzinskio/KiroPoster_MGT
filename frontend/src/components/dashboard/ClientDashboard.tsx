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

interface ClientStats {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalImages: number;
  approvedImages: number;
  pendingImages: number;
}

export const ClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ClientStats>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    completedCampaigns: 0,
    totalImages: 0,
    approvedImages: 0,
    pendingImages: 0,
  });
  const [currentCampaigns, setCurrentCampaigns] = useState<Campaign[]>([]);
  const [completedCampaigns, setCompletedCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClientData = async () => {
      if (!user?.companyId) {
        setError('No company associated with user');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch campaigns for the client's company
        const campaigns = await campaignService.getCampaignsByCompany(user.companyId);

        // Filter campaigns based on requirements (completed campaigns within last month)
        const now = new Date();
        const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

        const activeCampaigns = campaigns.filter(c => 
          c.status === 'new' || c.status === 'in_progress'
        );

        const recentlyCompletedCampaigns = campaigns.filter(c => {
          if (c.status !== 'completed' || !c.completedAt) return false;
          const completedDate = new Date(c.completedAt);
          return completedDate >= oneMonthAgo;
        });

        // Calculate image stats
        const allImages = campaigns.flatMap(c => c.images || []);
        const approvedImages = allImages.filter(img => img.status === 'approved');
        const pendingImages = allImages.filter(img => img.status === 'pending');

        setStats({
          totalCampaigns: campaigns.length,
          activeCampaigns: activeCampaigns.length,
          completedCampaigns: recentlyCompletedCampaigns.length,
          totalImages: allImages.length,
          approvedImages: approvedImages.length,
          pendingImages: pendingImages.length,
        });

        setCurrentCampaigns(activeCampaigns);
        setCompletedCampaigns(recentlyCompletedCampaigns);

      } catch (err) {
        console.error('Error fetching client dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientData();
  }, [user?.companyId]);

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
      title: 'Active Campaigns',
      value: stats.activeCampaigns,
      icon: '🚀',
      color: 'green' as const,
      description: 'Currently running campaigns'
    },
    {
      title: 'Completed This Month',
      value: stats.completedCampaigns,
      icon: '✅',
      color: 'purple' as const,
      description: 'Recently completed campaigns'
    },
    {
      title: 'Total Images',
      value: stats.totalImages,
      icon: '📸',
      color: 'blue' as const,
      description: 'Images uploaded for your campaigns'
    },
    {
      title: 'Approved Images',
      value: stats.approvedImages,
      icon: '👍',
      color: 'indigo' as const,
      description: 'Images approved by our team'
    },
  ];

  const getProgressPercentage = (campaign: Campaign): number => {
    if (!campaign.images || campaign.images.length === 0) return 0;
    const approvedCount = campaign.images.filter(img => img.status === 'approved').length;
    return Math.round((approvedCount / campaign.images.length) * 100);
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

      {/* Current Campaigns */}
      <Card>
        <CardHeader
          title="Current Campaigns"
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
        
        {currentCampaigns.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No active campaigns</h3>
            <p className="text-gray-500">
              New campaigns will appear here when they are created for your company
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentCampaigns.map((campaign) => {
              const progress = getProgressPercentage(campaign);
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
                    </div>
                    <StatusBadge status={campaign.status} className="ml-4" />
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                    <span className="flex items-center">
                      <span className="mr-1">📸</span>
                      {campaign.images?.length || 0} images uploaded
                    </span>
                    <span className="flex items-center">
                      <span className="mr-1">✅</span>
                      {campaign.images?.filter(img => img.status === 'approved').length || 0} approved
                    </span>
                    {campaign.images && campaign.images.length > 0 && (
                      <span className="text-primary-600 font-medium">
                        {progress}% complete
                      </span>
                    )}
                    <span className="ml-auto text-xs">
                      Started {new Date(campaign.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {campaign.images && campaign.images.length > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
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
            {completedCampaigns.map((campaign) => (
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
                    Completed {campaign.completedAt ? new Date(campaign.completedAt).toLocaleDateString() : 'Recently'}
                  </p>
                </div>
                <div className="flex items-center space-x-3 ml-4">
                  <StatusBadge status="completed" />
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {campaign.images?.filter(img => img.status === 'approved').length || 0} images
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};