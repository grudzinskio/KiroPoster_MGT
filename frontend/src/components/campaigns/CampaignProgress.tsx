import React, { useState, useEffect } from 'react';
import { campaignService } from '../../services/campaignService';
import type { CampaignProgressResponse } from '../../types/campaign';

interface CampaignProgressProps {
  campaignId: number;
  className?: string;
}

export const CampaignProgress: React.FC<CampaignProgressProps> = ({ 
  campaignId, 
  className = '' 
}) => {
  const [progress, setProgress] = useState<CampaignProgressResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProgress();
  }, [campaignId]);

  const loadProgress = async () => {
    try {
      setLoading(true);
      setError(null);
      const progressData = await campaignService.getCampaignProgress(campaignId);
      setProgress(progressData);
    } catch (err) {
      setError('Failed to load campaign progress');
      console.error('Error loading campaign progress:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-2 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error || !progress) {
    return (
      <div className={`text-red-500 text-sm ${className}`}>
        {error || 'Unable to load progress'}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-3">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{progress.progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-gray-500">Total Images</div>
            <div className="text-lg font-semibold text-gray-900">
              {progress.totalImages}
            </div>
          </div>
          
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-green-600">Approved</div>
            <div className="text-lg font-semibold text-green-700">
              {progress.approvedImages}
            </div>
          </div>
          
          <div className="bg-yellow-50 p-3 rounded-lg">
            <div className="text-yellow-600">Pending</div>
            <div className="text-lg font-semibold text-yellow-700">
              {progress.pendingImages}
            </div>
          </div>
          
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-red-600">Rejected</div>
            <div className="text-lg font-semibold text-red-700">
              {progress.rejectedImages}
            </div>
          </div>
        </div>

        {/* Contractors */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="text-blue-600 text-sm">Assigned Contractors</div>
          <div className="text-lg font-semibold text-blue-700">
            {progress.assignedContractors}
          </div>
        </div>
      </div>
    </div>
  );
};