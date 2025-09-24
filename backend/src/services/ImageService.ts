import { ImageModel } from '../models/Image.js';
import { CampaignModel } from '../models/Campaign.js';
import { Image, CreateImageData, ImageWithRelations, ImageFilters, ImageApprovalData } from '../types/image.js';
import { deleteFile, performSecurityScan, getUploadPath } from '../utils/fileUpload.js';
import path from 'path';

export class ImageService {
  /**
   * Get image by ID with role-based access control
   */
  static async getImageById(
    id: number,
    requestingUserId: number,
    requestingUserRole: string,
    requestingUserCompanyId?: number
  ): Promise<ImageWithRelations | null> {
    try {
      const image = await ImageModel.findByIdWithRelations(id);
      
      if (!image) {
        return null;
      }

      // Check access permissions
      if (!await this.canAccessImage(image, requestingUserId, requestingUserRole, requestingUserCompanyId)) {
        throw new Error('Insufficient permissions to access this image');
      }

      return image;
    } catch (error) {
      throw new Error(`Failed to get image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all images with role-based filtering
   */
  static async getAllImages(
    requestingUserId: number,
    requestingUserRole: string,
    requestingUserCompanyId?: number,
    filters?: ImageFilters
  ): Promise<Image[]> {
    try {
      let imageFilters = { ...filters };

      // Apply role-based filtering
      switch (requestingUserRole) {
        case 'contractor':
          // Contractors can only see images they uploaded
          imageFilters.uploadedBy = requestingUserId;
          break;

        case 'client':
          // Clients can only see images from campaigns of their company
          if (!requestingUserCompanyId) {
            throw new Error('Client users must be associated with a company');
          }
          // We need to filter by campaigns from their company
          // This will be handled by getting campaign IDs first
          const clientCampaigns = await CampaignModel.findByCompanyId(requestingUserCompanyId);
          const campaignIds = clientCampaigns.map(c => c.id);
          
          if (campaignIds.length === 0) {
            return []; // No campaigns, no images
          }
          
          // If a specific campaign filter is provided, validate it belongs to their company
          if (imageFilters.campaignId && !campaignIds.includes(imageFilters.campaignId)) {
            throw new Error('Access denied to images from this campaign');
          }
          
          // If no specific campaign filter, we'll need to filter by all their campaigns
          // This requires a custom query in the model, for now we'll get all and filter
          break;

        case 'company_employee':
          // Company employees can see all images (no additional filtering)
          break;

        default:
          throw new Error('Invalid user role');
      }

      const images = await ImageModel.findAll(imageFilters);

      // Additional filtering for clients if no specific campaign was requested
      if (requestingUserRole === 'client' && !imageFilters.campaignId && requestingUserCompanyId) {
        const clientCampaigns = await CampaignModel.findByCompanyId(requestingUserCompanyId);
        const campaignIds = clientCampaigns.map(c => c.id);
        return images.filter(image => campaignIds.includes(image.campaignId));
      }

      return images;
    } catch (error) {
      throw new Error(`Failed to get images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload image for a campaign
   */
  static async uploadImage(
    file: Express.Multer.File,
    campaignId: number,
    requestingUserId: number,
    requestingUserRole: string
  ): Promise<Image> {
    try {
      // Only contractors can upload images
      if (requestingUserRole !== 'contractor') {
        // Clean up uploaded file
        await deleteFile(file.filename);
        throw new Error('Only contractors can upload images');
      }

      // Verify campaign exists and is accessible
      const campaign = await CampaignModel.findById(campaignId);
      if (!campaign) {
        await deleteFile(file.filename);
        throw new Error('Campaign not found');
      }

      // Check if campaign is in progress (contractors can only upload to in-progress campaigns)
      if (campaign.status !== 'in_progress') {
        await deleteFile(file.filename);
        throw new Error('Images can only be uploaded to campaigns that are in progress');
      }

      // Verify contractor is assigned to this campaign
      const assignedContractors = await CampaignModel.getAssignedContractors(campaignId);
      const isAssigned = assignedContractors.some(contractor => contractor.id === requestingUserId);
      
      if (!isAssigned) {
        await deleteFile(file.filename);
        throw new Error('You are not assigned to this campaign');
      }

      // Perform security scan on uploaded file
      const securityResult = await performSecurityScan(getUploadPath(file.filename));
      if (!securityResult.isSafe) {
        await deleteFile(file.filename);
        throw new Error(`File failed security scan: ${securityResult.reason}`);
      }

      // Create image record
      const imageData: CreateImageData = {
        campaignId,
        uploadedBy: requestingUserId,
        filename: file.filename,
        originalFilename: file.originalname,
        filePath: getUploadPath(file.filename),
        fileSize: file.size,
        mimeType: file.mimetype
      };

      return await ImageModel.create(imageData);
    } catch (error) {
      // Clean up file if there was an error
      if (file?.filename) {
        try {
          await deleteFile(file.filename);
        } catch (deleteError) {
          // Log delete error but don't throw
          console.error('Failed to clean up uploaded file:', deleteError);
        }
      }
      throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Approve or reject an image
   */
  static async updateImageApproval(
    id: number,
    approvalData: ImageApprovalData,
    requestingUserId: number,
    requestingUserRole: string
  ): Promise<Image | null> {
    try {
      // Only company employees can approve/reject images
      if (requestingUserRole !== 'company_employee') {
        throw new Error('Only company employees can approve or reject images');
      }

      const existingImage = await ImageModel.findById(id);
      if (!existingImage) {
        return null;
      }

      // Validate rejection reason is provided for rejected images
      if (approvalData.status === 'rejected' && !approvalData.rejectionReason?.trim()) {
        throw new Error('Rejection reason is required when rejecting an image');
      }

      return await ImageModel.updateApprovalStatus(
        id,
        approvalData.status,
        approvalData.reviewedBy,
        approvalData.rejectionReason
      );
    } catch (error) {
      throw new Error(`Failed to update image approval: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete image
   */
  static async deleteImage(
    id: number,
    requestingUserId: number,
    requestingUserRole: string
  ): Promise<boolean> {
    try {
      const image = await ImageModel.findById(id);
      if (!image) {
        return false;
      }

      // Authorization checks
      if (requestingUserRole === 'contractor') {
        // Contractors can only delete their own images that are still pending
        if (image.uploadedBy !== requestingUserId) {
          throw new Error('You can only delete your own images');
        }
        if (image.status !== 'pending') {
          throw new Error('You can only delete images that are still pending review');
        }
      } else if (requestingUserRole !== 'company_employee') {
        throw new Error('Insufficient permissions to delete images');
      }

      // Delete the physical file
      try {
        await deleteFile(image.filename);
      } catch (fileError) {
        console.error('Failed to delete physical file:', fileError);
        // Continue with database deletion even if file deletion fails
      }

      // Delete the database record
      return await ImageModel.delete(id);
    } catch (error) {
      throw new Error(`Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get images by campaign ID
   */
  static async getImagesByCampaignId(
    campaignId: number,
    requestingUserId: number,
    requestingUserRole: string,
    requestingUserCompanyId?: number
  ): Promise<Image[]> {
    try {
      // Verify access to campaign
      const campaign = await CampaignModel.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Role-based access control
      switch (requestingUserRole) {
        case 'client':
          if (!requestingUserCompanyId || campaign.company_id !== requestingUserCompanyId) {
            throw new Error('You can only access images from your company\'s campaigns');
          }
          break;

        case 'contractor':
          // Verify contractor is assigned to this campaign
          const assignedContractors = await CampaignModel.getAssignedContractors(campaignId);
          const isAssigned = assignedContractors.some(contractor => contractor.id === requestingUserId);
          
          if (!isAssigned) {
            throw new Error('You can only access images from campaigns you are assigned to');
          }
          break;

        case 'company_employee':
          // Company employees can access all campaign images
          break;

        default:
          throw new Error('Invalid user role');
      }

      return await ImageModel.findByCampaignId(campaignId);
    } catch (error) {
      throw new Error(`Failed to get images by campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get images uploaded by a specific user
   */
  static async getImagesByUploaderId(
    uploaderId: number,
    requestingUserId: number,
    requestingUserRole: string
  ): Promise<Image[]> {
    try {
      // Authorization checks
      if (requestingUserRole === 'contractor' && requestingUserId !== uploaderId) {
        throw new Error('Contractors can only access their own uploaded images');
      }

      if (requestingUserRole === 'client') {
        throw new Error('Clients cannot access images by uploader');
      }

      return await ImageModel.findByUploaderId(uploaderId);
    } catch (error) {
      throw new Error(`Failed to get images by uploader: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get pending images for review
   */
  static async getPendingImages(
    requestingUserId: number,
    requestingUserRole: string
  ): Promise<Image[]> {
    try {
      // Only company employees can access pending images for review
      if (requestingUserRole !== 'company_employee') {
        throw new Error('Only company employees can access pending images for review');
      }

      return await ImageModel.findPendingImages();
    } catch (error) {
      throw new Error(`Failed to get pending images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get image statistics
   */
  static async getImageStats(
    requestingUserId: number,
    requestingUserRole: string,
    campaignId?: number
  ): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    try {
      // Only company employees can access full statistics
      if (requestingUserRole !== 'company_employee') {
        throw new Error('Only company employees can access image statistics');
      }

      if (campaignId) {
        return await ImageModel.countByCampaign(campaignId);
      } else {
        const statusStats = await ImageModel.countByStatus();
        const total = Object.values(statusStats).reduce((sum, count) => sum + count, 0);
        
        return {
          total,
          pending: statusStats.pending || 0,
          approved: statusStats.approved || 0,
          rejected: statusStats.rejected || 0
        };
      }
    } catch (error) {
      throw new Error(`Failed to get image statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get file path for serving images
   */
  static async getImageFilePath(
    id: number,
    requestingUserId: number,
    requestingUserRole: string,
    requestingUserCompanyId?: number
  ): Promise<string | null> {
    try {
      const image = await ImageModel.findByIdWithRelations(id);
      
      if (!image) {
        return null;
      }

      // Check access permissions
      if (!await this.canAccessImage(image, requestingUserId, requestingUserRole, requestingUserCompanyId)) {
        throw new Error('Insufficient permissions to access this image');
      }

      return image.filePath;
    } catch (error) {
      throw new Error(`Failed to get image file path: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if user can access a specific image
   */
  private static async canAccessImage(
    image: ImageWithRelations,
    requestingUserId: number,
    requestingUserRole: string,
    requestingUserCompanyId?: number
  ): Promise<boolean> {
    switch (requestingUserRole) {
      case 'company_employee':
        // Company employees can access all images
        return true;

      case 'client':
        // Clients can only access images from campaigns of their company
        if (!requestingUserCompanyId || !image.campaign) {
          return false;
        }
        return image.campaign.companyId === requestingUserCompanyId;

      case 'contractor':
        // Contractors can access images they uploaded or from campaigns they're assigned to
        if (image.uploadedBy === requestingUserId) {
          return true;
        }
        
        // Check if contractor is assigned to the campaign
        const assignedContractors = await CampaignModel.getAssignedContractors(image.campaignId);
        return assignedContractors.some(contractor => contractor.id === requestingUserId);

      default:
        return false;
    }
  }
}