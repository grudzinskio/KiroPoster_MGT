import api from './api';
import type { Image } from '../types/image';

export const imageService = {
  // Get images for a campaign
  getCampaignImages: async (campaignId: number): Promise<Image[]> => {
    const response = await api.get(`/campaigns/${campaignId}/images`);
    return response.data.data;
  },

  // Upload image for a campaign
  uploadImage: async (campaignId: number, file: File): Promise<Image> => {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await api.post(`/campaigns/${campaignId}/images`, formData);
    return response.data.data;
  },

  // Approve an image
  approveImage: async (imageId: number): Promise<Image> => {
    const response = await api.put(`/images/${imageId}/approve`);
    return response.data.data;
  },

  // Reject an image
  rejectImage: async (imageId: number, rejectionReason: string): Promise<Image> => {
    const response = await api.put(`/images/${imageId}/reject`, {
      status: 'rejected',
      rejectionReason,
    });
    return response.data.data;
  },

  // Delete an image
  deleteImage: async (imageId: number): Promise<void> => {
    await api.delete(`/images/${imageId}`);
  },

  // Get image file URL
  getImageUrl: (imageId: number): string => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    return `${API_BASE_URL}/images/${imageId}/file`;
  },
};

export default imageService;