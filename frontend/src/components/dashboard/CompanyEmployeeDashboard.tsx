import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { campaignService } from '../../services/campaignService';
import { userService } from '../../services/userService';
import { companyService } from '../../services/companyService';
import { Card, CardHeader, StatCard } from '../ui/Card';
import { Button } from '../ui/Button';
import { CardSkeleton } from '../ui/LoadingSpinner';
import { InlineNotification } from '../ui/Notification';
import { StatusBadge } from '../ui/Badge';
import type { Campaign } from '../../types/campaign';

interface DashboardStats {
  totalCampaigns: number;
  newCampaigns: number;
  inProgressCampaigns: number;
  completedCampaigns: number;
  totalUsers: number;
  totalCompanies: number;
  pendingImages: number;
}

export const CompanyEmployeeDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalCampaigns: 0,
    newCampaigns: 0,
    inProgressCampaigns: 0,
    completedCampaigns: 0,
    totalUsers: 0,
    totalCompanies: 0,
    pendingImages: 0,
  });
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch campaigns and calculate stats
        const campaigns = await campaignService.getCampaigns();
        const users = await userService.getUsers();
        const companies = await companyService.getCompanies();

        // Calculate campaign stats
        const newCampaigns = campaigns.filter(c => c.status === 'new').length;
        const inProgressCampaigns = campaigns.filter(c => c.status === 'in_progress').length;
        const completedCampaigns = campaigns.filter(c => c.status === 'completed').length;

        // Calculate pending images
        const pendingImages = campaigns.reduce((total, campaign) => {
          return total + (campaign.images?.filter(img => img.status === 'pending').length || 0);
        }, 0);

        setStats({
          totalCampaigns: campaigns.length,
          newCampaigns,
          inProgressCampaigns,
          completedCampaigns,
          totalUsers: users.length,
          totalCompanies: companies.length,
          pendingImages,
        });

        // Get recent campaigns (last 5)
        const sortedCampaigns = campaigns
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);
        setRecentCampaigns(sortedCampaigns);

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
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
      title: 'Total Campaigns',
      value: stats.totalCampaigns,
      icon: '📊',
      color: 'blue' as const,
      link: '/campaigns'
    },
    {
      title: 'New Campaigns',
      value: stats.newCampaigns,
      icon: '🆕',
      color: 'green' as const,
      link: '/campaigns?status=new'
    },
    {
      title: 'In Progress',
      value: stats.inProgressCampaigns,
      icon: '⏳',
      color: 'yellow' as const,
      link: '/campaigns?status=in_progress'
    },
    {
      title: 'Completed',
      value: stats.completedCampaigns,
      icon: '✅',
      color: 'purple' as const,
      link: '/campaigns?status=completed'
    },
    {
      title: 'Pending Images',
      value: stats.pendingImages,
      icon: '📸',
      color: 'red' as const,
      link: '/campaigns'
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: '👥',
      color: 'indigo' as const,
      link: '/users'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {statCards.map((card, index) => (
          <StatCard
            key={index}
            title={card.title}
            value={card.value}
            icon={card.icon}
            color={card.color}
            onClick={() => window.location.href = card.link}
          />
        ))}
      </div>

      {/* Recent Campaigns */}
      <Card>
        <CardHeader
          title="Recent Campaigns"
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
        
        {recentCampaigns.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
            <p className="text-gray-500 mb-6">Get started by creating your first campaign</p>
            <Button onClick={() => window.location.href = '/campaigns/new'}>
              Create Campaign
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentCampaigns.map((campaign) => (
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
                    {campaign.company?.name} • Created {new Date(campaign.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-3 ml-4">
                  <StatusBadge status={campaign.status} />
                  {campaign.images && campaign.images.length > 0 && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {campaign.images.filter(img => img.status === 'pending').length} pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader title="Quick Actions" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Button
            onClick={() => window.location.href = '/campaigns/new'}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
            fullWidth
          >
            Create Campaign
          </Button>
          <Button
            variant="secondary"
            onClick={() => window.location.href = '/users/new'}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
            fullWidth
          >
            Add User
          </Button>
          <Button
            variant="secondary"
            onClick={() => window.location.href = '/companies/new'}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
            fullWidth
          >
            Add Company
          </Button>
        </div>
      </Card>
    </div>
  );
};