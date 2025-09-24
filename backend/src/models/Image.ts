import db from '../database/connection.js';
import { Image, CreateImageData, UpdateImageData, ImageWithRelations, ImageFilters } from '../types/image.js';

export class ImageModel {
  private static readonly TABLE_NAME = 'images';

  /**
   * Find image by ID
   */
  static async findById(id: number): Promise<Image | null> {
    try {
      const image = await db(this.TABLE_NAME)
        .where({ id })
        .first();
      
      return image || null;
    } catch (error) {
      throw new Error(`Failed to find image by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find image by ID with relationships
   */
  static async findByIdWithRelations(id: number): Promise<ImageWithRelations | null> {
    try {
      const image = await db(this.TABLE_NAME)
        .leftJoin('campaigns', 'images.campaign_id', 'campaigns.id')
        .leftJoin('users as uploader', 'images.uploaded_by', 'uploader.id')
        .leftJoin('users as reviewer', 'images.reviewed_by', 'reviewer.id')
        .select(
          'images.*',
          'campaigns.name as campaign_name',
          'campaigns.company_id as campaign_company_id',
          'uploader.first_name as uploader_first_name',
          'uploader.last_name as uploader_last_name',
          'uploader.email as uploader_email',
          'reviewer.first_name as reviewer_first_name',
          'reviewer.last_name as reviewer_last_name',
          'reviewer.email as reviewer_email'
        )
        .where('images.id', id)
        .first();

      if (!image) {
        return null;
      }

      return {
        ...image,
        campaign: image.campaign_name ? {
          id: image.campaign_id,
          name: image.campaign_name,
          companyId: image.campaign_company_id
        } : undefined,
        uploader: {
          id: image.uploaded_by,
          firstName: image.uploader_first_name,
          lastName: image.uploader_last_name,
          email: image.uploader_email
        },
        reviewer: image.reviewed_by ? {
          id: image.reviewed_by,
          firstName: image.reviewer_first_name,
          lastName: image.reviewer_last_name,
          email: image.reviewer_email
        } : undefined
      } as ImageWithRelations;
    } catch (error) {
      throw new Error(`Failed to find image with relations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all images with optional filtering
   */
  static async findAll(filters?: ImageFilters): Promise<Image[]> {
    try {
      let query = db(this.TABLE_NAME);

      if (filters?.campaignId) {
        query = query.where('campaign_id', filters.campaignId);
      }

      if (filters?.uploadedBy) {
        query = query.where('uploaded_by', filters.uploadedBy);
      }

      if (filters?.status) {
        query = query.where('status', filters.status);
      }

      if (filters?.reviewedBy) {
        query = query.where('reviewed_by', filters.reviewedBy);
      }

      if (filters?.startDate) {
        query = query.where('uploaded_at', '>=', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.where('uploaded_at', '<=', filters.endDate);
      }

      return await query.orderBy('uploaded_at', 'desc');
    } catch (error) {
      throw new Error(`Failed to fetch images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new image record
   */
  static async create(imageData: CreateImageData): Promise<Image> {
    try {
      const [imageId] = await db(this.TABLE_NAME)
        .insert({
          campaign_id: imageData.campaignId,
          uploaded_by: imageData.uploadedBy,
          filename: imageData.filename,
          original_filename: imageData.originalFilename,
          file_path: imageData.filePath,
          file_size: imageData.fileSize,
          mime_type: imageData.mimeType,
          status: 'pending',
          uploaded_at: new Date()
        });

      const newImage = await this.findById(imageId);
      if (!newImage) {
        throw new Error('Failed to retrieve created image');
      }

      return newImage;
    } catch (error) {
      throw new Error(`Failed to create image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update image by ID
   */
  static async update(id: number, updateData: UpdateImageData): Promise<Image | null> {
    try {
      const updateFields: any = { ...updateData };

      // Convert camelCase to snake_case for database
      if (updateFields.reviewedBy !== undefined) {
        updateFields.reviewed_by = updateFields.reviewedBy;
        delete updateFields.reviewedBy;
      }
      if (updateFields.reviewedAt !== undefined) {
        updateFields.reviewed_at = updateFields.reviewedAt;
        delete updateFields.reviewedAt;
      }
      if (updateFields.rejectionReason !== undefined) {
        updateFields.rejection_reason = updateFields.rejectionReason;
        delete updateFields.rejectionReason;
      }

      const affectedRows = await db(this.TABLE_NAME)
        .where({ id })
        .update(updateFields);

      if (affectedRows === 0) {
        return null;
      }

      return await this.findById(id);
    } catch (error) {
      throw new Error(`Failed to update image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete image by ID
   */
  static async delete(id: number): Promise<boolean> {
    try {
      const affectedRows = await db(this.TABLE_NAME)
        .where({ id })
        .del();

      return affectedRows > 0;
    } catch (error) {
      throw new Error(`Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Approve or reject image
   */
  static async updateApprovalStatus(
    id: number, 
    status: 'approved' | 'rejected', 
    reviewedBy: number, 
    rejectionReason?: string
  ): Promise<Image | null> {
    try {
      const updateData: any = {
        status,
        reviewed_by: reviewedBy,
        reviewed_at: new Date()
      };

      if (status === 'rejected' && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      } else if (status === 'approved') {
        updateData.rejection_reason = null;
      }

      const affectedRows = await db(this.TABLE_NAME)
        .where({ id })
        .update(updateData);

      if (affectedRows === 0) {
        return null;
      }

      return await this.findById(id);
    } catch (error) {
      throw new Error(`Failed to update approval status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get images by campaign ID
   */
  static async findByCampaignId(campaignId: number): Promise<Image[]> {
    try {
      return await db(this.TABLE_NAME)
        .where({ campaign_id: campaignId })
        .orderBy('uploaded_at', 'desc');
    } catch (error) {
      throw new Error(`Failed to find images by campaign ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get images by uploader ID
   */
  static async findByUploaderId(uploaderId: number): Promise<Image[]> {
    try {
      return await db(this.TABLE_NAME)
        .where({ uploaded_by: uploaderId })
        .orderBy('uploaded_at', 'desc');
    } catch (error) {
      throw new Error(`Failed to find images by uploader ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Count images by status
   */
  static async countByStatus(): Promise<Record<string, number>> {
    try {
      const counts = await db(this.TABLE_NAME)
        .select('status')
        .count('* as count')
        .groupBy('status');

      const result = counts.reduce((acc, item: any) => {
        acc[item.status] = Number(item.count);
        return acc;
      }, {} as any);
      
      return result as Record<string, number>;
    } catch (error) {
      throw new Error(`Failed to count images by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Count images by campaign
   */
  static async countByCampaign(campaignId: number): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    try {
      const counts = await db(this.TABLE_NAME)
        .select('status')
        .count('* as count')
        .where({ campaign_id: campaignId })
        .groupBy('status');

      const result = {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0
      };

      counts.forEach((item: any) => {
        const count = Number(item.count);
        result.total += count;
        result[item.status as keyof typeof result] = count;
      });
      
      return result;
    } catch (error) {
      throw new Error(`Failed to count images by campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get pending images for review
   */
  static async findPendingImages(): Promise<Image[]> {
    try {
      return await db(this.TABLE_NAME)
        .where({ status: 'pending' })
        .orderBy('uploaded_at', 'asc');
    } catch (error) {
      throw new Error(`Failed to find pending images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}