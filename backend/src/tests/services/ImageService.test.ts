import { ImageService } from '../../services/ImageService.js';
import { ImageModel } from '../../models/Image.js';
import { CampaignModel } from '../../models/Campaign.js';
import { deleteFile, performSecurityScan, getUploadPath } from '../../utils/fileUpload.js';
import { ImageApprovalData } from '../../types/image.js';

// Mock dependencies
jest.mock('../../models/Image.js');
jest.mock('../../models/Campaign.js');
jest.mock('../../utils/fileUpload.js');

const mockImageModel = ImageModel as jest.Mocked<typeof ImageModel>;
const mockCampaignModel = CampaignModel as jest.Mocked<typeof CampaignModel>;
const mockDeleteFile = deleteFile as jest.MockedFunction<typeof deleteFile>;
const mockPerformSecurityScan = performSecurityScan as jest.MockedFunction<typeof performSecurityScan>;
const mockGetUploadPath = getUploadPath as jest.MockedFunction<typeof getUploadPath>;

describe('ImageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getImageById', () => {
    it('should get image by ID for company employee', async () => {
      const mockImage = {
        id: 1,
        campaignId: 1,
        uploadedBy: 2,
        filename: 'test.jpg',
        originalFilename: 'original.jpg',
        filePath: '/uploads/test.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        status: 'pending' as const,
        uploadedAt: new Date(),
        campaign: {
          id: 1,
          name: 'Test Campaign',
          companyId: 1
        }
      };

      mockImageModel.findByIdWithRelations.mockResolvedValue(mockImage);

      const result = await ImageService.getImageById(1, 1, 'company_employee');

      expect(result).toEqual(mockImage);
      expect(mockImageModel.findByIdWithRelations).toHaveBeenCalledWith(1);
    });

    it('should return null when image not found', async () => {
      mockImageModel.findByIdWithRelations.mockResolvedValue(null);

      const result = await ImageService.getImageById(999, 1, 'company_employee');

      expect(result).toBeNull();
    });

    it('should throw error for insufficient permissions', async () => {
      const mockImage = {
        id: 1,
        campaignId: 1,
        uploadedBy: 2,
        filename: 'test.jpg',
        originalFilename: 'original.jpg',
        filePath: '/uploads/test.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        status: 'pending' as const,
        uploadedAt: new Date(),
        campaign: {
          id: 1,
          name: 'Test Campaign',
          companyId: 1
        }
      };

      mockImageModel.findByIdWithRelations.mockResolvedValue(mockImage);
      mockCampaignModel.getAssignedContractors.mockResolvedValue([]);

      await expect(
        ImageService.getImageById(1, 3, 'contractor')
      ).rejects.toThrow('Insufficient permissions to access this image');
    });
  });

  describe('uploadImage', () => {
    const mockFile = {
      filename: 'test-123.jpg',
      originalname: 'original.jpg',
      size: 1024,
      mimetype: 'image/jpeg'
    } as Express.Multer.File;

    it('should upload image successfully for assigned contractor', async () => {
      const mockCampaign = {
        id: 1,
        name: 'Test Campaign',
        status: 'in_progress',
        company_id: 1,
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date()
      } as any;

      const mockAssignedContractors = [{ id: 2, name: 'John Contractor' }];
      const mockCreatedImage = {
        id: 1,
        campaignId: 1,
        uploadedBy: 2,
        filename: 'test-123.jpg',
        originalFilename: 'original.jpg',
        filePath: '/uploads/test-123.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        status: 'pending' as const,
        uploadedAt: new Date()
      };

      mockCampaignModel.findById.mockResolvedValue(mockCampaign);
      mockCampaignModel.getAssignedContractors.mockResolvedValue(mockAssignedContractors);
      mockPerformSecurityScan.mockResolvedValue({ isSafe: true });
      mockGetUploadPath.mockReturnValue('/uploads/test-123.jpg');
      mockImageModel.create.mockResolvedValue(mockCreatedImage);

      const result = await ImageService.uploadImage(mockFile, 1, 2, 'contractor');

      expect(result).toEqual(mockCreatedImage);
      expect(mockPerformSecurityScan).toHaveBeenCalledWith('/uploads/test-123.jpg');
      expect(mockImageModel.create).toHaveBeenCalledWith({
        campaignId: 1,
        uploadedBy: 2,
        filename: 'test-123.jpg',
        originalFilename: 'original.jpg',
        filePath: '/uploads/test-123.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg'
      });
    });

    it('should throw error for non-contractor users', async () => {
      mockDeleteFile.mockResolvedValue();

      await expect(
        ImageService.uploadImage(mockFile, 1, 1, 'client')
      ).rejects.toThrow('Only contractors can upload images');

      expect(mockDeleteFile).toHaveBeenCalledWith('test-123.jpg');
    });

    it('should throw error when campaign not found', async () => {
      mockCampaignModel.findById.mockResolvedValue(null);
      mockDeleteFile.mockResolvedValue();

      await expect(
        ImageService.uploadImage(mockFile, 999, 2, 'contractor')
      ).rejects.toThrow('Campaign not found');

      expect(mockDeleteFile).toHaveBeenCalledWith('test-123.jpg');
    });

    it('should throw error when campaign is not in progress', async () => {
      const mockCampaign = {
        id: 1,
        name: 'Test Campaign',
        status: 'completed',
        company_id: 1,
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date()
      } as any;

      mockCampaignModel.findById.mockResolvedValue(mockCampaign);
      mockDeleteFile.mockResolvedValue();

      await expect(
        ImageService.uploadImage(mockFile, 1, 2, 'contractor')
      ).rejects.toThrow('Images can only be uploaded to campaigns that are in progress');

      expect(mockDeleteFile).toHaveBeenCalledWith('test-123.jpg');
    });

    it('should throw error when contractor not assigned to campaign', async () => {
      const mockCampaign = {
        id: 1,
        name: 'Test Campaign',
        status: 'in_progress',
        company_id: 1,
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date()
      } as any;

      mockCampaignModel.findById.mockResolvedValue(mockCampaign);
      mockCampaignModel.getAssignedContractors.mockResolvedValue([]);
      mockDeleteFile.mockResolvedValue();

      await expect(
        ImageService.uploadImage(mockFile, 1, 2, 'contractor')
      ).rejects.toThrow('You are not assigned to this campaign');

      expect(mockDeleteFile).toHaveBeenCalledWith('test-123.jpg');
    });

    it('should throw error when file fails security scan', async () => {
      const mockCampaign = {
        id: 1,
        name: 'Test Campaign',
        status: 'in_progress',
        company_id: 1,
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date()
      } as any;

      const mockAssignedContractors = [{ id: 2, name: 'John Contractor' }];

      mockCampaignModel.findById.mockResolvedValue(mockCampaign);
      mockCampaignModel.getAssignedContractors.mockResolvedValue(mockAssignedContractors);
      mockPerformSecurityScan.mockResolvedValue({ 
        isSafe: false, 
        reason: 'Suspicious file content' 
      });
      mockGetUploadPath.mockReturnValue('/uploads/test-123.jpg');
      mockDeleteFile.mockResolvedValue();

      await expect(
        ImageService.uploadImage(mockFile, 1, 2, 'contractor')
      ).rejects.toThrow('File failed security scan: Suspicious file content');

      expect(mockDeleteFile).toHaveBeenCalledWith('test-123.jpg');
    });
  });

  describe('updateImageApproval', () => {
    it('should approve image successfully', async () => {
      const approvalData: ImageApprovalData = {
        status: 'approved',
        reviewedBy: 1
      };

      const mockExistingImage = {
        id: 1,
        status: 'pending'
      } as any;

      const mockUpdatedImage = {
        id: 1,
        status: 'approved',
        reviewedBy: 1,
        reviewedAt: new Date()
      } as any;

      mockImageModel.findById.mockResolvedValue(mockExistingImage);
      mockImageModel.updateApprovalStatus.mockResolvedValue(mockUpdatedImage);

      const result = await ImageService.updateImageApproval(1, approvalData, 1, 'company_employee');

      expect(result).toEqual(mockUpdatedImage);
      expect(mockImageModel.updateApprovalStatus).toHaveBeenCalledWith(
        1,
        'approved',
        1,
        undefined
      );
    });

    it('should reject image with reason successfully', async () => {
      const approvalData: ImageApprovalData = {
        status: 'rejected',
        rejectionReason: 'Poor image quality',
        reviewedBy: 1
      };

      const mockExistingImage = {
        id: 1,
        status: 'pending'
      } as any;

      const mockUpdatedImage = {
        id: 1,
        status: 'rejected',
        reviewedBy: 1,
        reviewedAt: new Date(),
        rejectionReason: 'Poor image quality'
      } as any;

      mockImageModel.findById.mockResolvedValue(mockExistingImage);
      mockImageModel.updateApprovalStatus.mockResolvedValue(mockUpdatedImage);

      const result = await ImageService.updateImageApproval(1, approvalData, 1, 'company_employee');

      expect(result).toEqual(mockUpdatedImage);
      expect(mockImageModel.updateApprovalStatus).toHaveBeenCalledWith(
        1,
        'rejected',
        1,
        'Poor image quality'
      );
    });

    it('should throw error for non-company employee', async () => {
      const approvalData: ImageApprovalData = {
        status: 'approved',
        reviewedBy: 2
      };

      await expect(
        ImageService.updateImageApproval(1, approvalData, 2, 'contractor')
      ).rejects.toThrow('Only company employees can approve or reject images');
    });

    it('should throw error when rejection reason missing for rejected image', async () => {
      const approvalData: ImageApprovalData = {
        status: 'rejected',
        reviewedBy: 1
      };

      const mockExistingImage = {
        id: 1,
        status: 'pending'
      } as any;

      mockImageModel.findById.mockResolvedValue(mockExistingImage);

      await expect(
        ImageService.updateImageApproval(1, approvalData, 1, 'company_employee')
      ).rejects.toThrow('Rejection reason is required when rejecting an image');
    });

    it('should return null when image not found', async () => {
      const approvalData: ImageApprovalData = {
        status: 'approved',
        reviewedBy: 1
      };

      mockImageModel.findById.mockResolvedValue(null);

      const result = await ImageService.updateImageApproval(999, approvalData, 1, 'company_employee');

      expect(result).toBeNull();
    });
  });

  describe('deleteImage', () => {
    it('should delete image successfully for company employee', async () => {
      const mockImage = {
        id: 1,
        filename: 'test.jpg',
        uploadedBy: 2,
        status: 'pending'
      } as any;

      mockImageModel.findById.mockResolvedValue(mockImage);
      mockDeleteFile.mockResolvedValue();
      mockImageModel.delete.mockResolvedValue(true);

      const result = await ImageService.deleteImage(1, 1, 'company_employee');

      expect(result).toBe(true);
      expect(mockDeleteFile).toHaveBeenCalledWith('test.jpg');
      expect(mockImageModel.delete).toHaveBeenCalledWith(1);
    });

    it('should delete own pending image for contractor', async () => {
      const mockImage = {
        id: 1,
        filename: 'test.jpg',
        uploadedBy: 2,
        status: 'pending'
      } as any;

      mockImageModel.findById.mockResolvedValue(mockImage);
      mockDeleteFile.mockResolvedValue();
      mockImageModel.delete.mockResolvedValue(true);

      const result = await ImageService.deleteImage(1, 2, 'contractor');

      expect(result).toBe(true);
    });

    it('should throw error when contractor tries to delete others image', async () => {
      const mockImage = {
        id: 1,
        filename: 'test.jpg',
        uploadedBy: 2,
        status: 'pending'
      } as any;

      mockImageModel.findById.mockResolvedValue(mockImage);

      await expect(
        ImageService.deleteImage(1, 3, 'contractor')
      ).rejects.toThrow('You can only delete your own images');
    });

    it('should throw error when contractor tries to delete non-pending image', async () => {
      const mockImage = {
        id: 1,
        filename: 'test.jpg',
        uploadedBy: 2,
        status: 'approved'
      } as any;

      mockImageModel.findById.mockResolvedValue(mockImage);

      await expect(
        ImageService.deleteImage(1, 2, 'contractor')
      ).rejects.toThrow('You can only delete images that are still pending review');
    });

    it('should return false when image not found', async () => {
      mockImageModel.findById.mockResolvedValue(null);

      const result = await ImageService.deleteImage(999, 1, 'company_employee');

      expect(result).toBe(false);
    });
  });

  describe('getImagesByCampaignId', () => {
    it('should get images by campaign ID for company employee', async () => {
      const mockCampaign = {
        id: 1,
        company_id: 1
      } as any;

      const mockImages = [
        { id: 1, campaignId: 1 },
        { id: 2, campaignId: 1 }
      ] as any;

      mockCampaignModel.findById.mockResolvedValue(mockCampaign);
      mockImageModel.findByCampaignId.mockResolvedValue(mockImages);

      const result = await ImageService.getImagesByCampaignId(1, 1, 'company_employee');

      expect(result).toEqual(mockImages);
    });

    it('should get images for client from their company campaign', async () => {
      const mockCampaign = {
        id: 1,
        company_id: 1
      } as any;

      const mockImages = [
        { id: 1, campaignId: 1 }
      ] as any;

      mockCampaignModel.findById.mockResolvedValue(mockCampaign);
      mockImageModel.findByCampaignId.mockResolvedValue(mockImages);

      const result = await ImageService.getImagesByCampaignId(1, 2, 'client', 1);

      expect(result).toEqual(mockImages);
    });

    it('should throw error when client tries to access other company campaign', async () => {
      const mockCampaign = {
        id: 1,
        company_id: 2
      } as any;

      mockCampaignModel.findById.mockResolvedValue(mockCampaign);

      await expect(
        ImageService.getImagesByCampaignId(1, 2, 'client', 1)
      ).rejects.toThrow('You can only access images from your company\'s campaigns');
    });

    it('should throw error when campaign not found', async () => {
      mockCampaignModel.findById.mockResolvedValue(null);

      await expect(
        ImageService.getImagesByCampaignId(999, 1, 'company_employee')
      ).rejects.toThrow('Campaign not found');
    });
  });

  describe('getPendingImages', () => {
    it('should get pending images for company employee', async () => {
      const mockPendingImages = [
        { id: 1, status: 'pending' },
        { id: 2, status: 'pending' }
      ] as any;

      mockImageModel.findPendingImages.mockResolvedValue(mockPendingImages);

      const result = await ImageService.getPendingImages(1, 'company_employee');

      expect(result).toEqual(mockPendingImages);
    });

    it('should throw error for non-company employee', async () => {
      await expect(
        ImageService.getPendingImages(2, 'contractor')
      ).rejects.toThrow('Only company employees can access pending images for review');
    });
  });

  describe('getImageStats', () => {
    it('should get image statistics for company employee', async () => {
      const mockStatusStats = {
        pending: 5,
        approved: 10,
        rejected: 2
      };

      mockImageModel.countByStatus.mockResolvedValue(mockStatusStats);

      const result = await ImageService.getImageStats(1, 'company_employee');

      expect(result).toEqual({
        total: 17,
        pending: 5,
        approved: 10,
        rejected: 2
      });
    });

    it('should get campaign-specific statistics', async () => {
      const mockCampaignStats = {
        total: 8,
        pending: 3,
        approved: 5,
        rejected: 0
      };

      mockImageModel.countByCampaign.mockResolvedValue(mockCampaignStats);

      const result = await ImageService.getImageStats(1, 'company_employee', 1);

      expect(result).toEqual(mockCampaignStats);
      expect(mockImageModel.countByCampaign).toHaveBeenCalledWith(1);
    });

    it('should throw error for non-company employee', async () => {
      await expect(
        ImageService.getImageStats(2, 'contractor')
      ).rejects.toThrow('Only company employees can access image statistics');
    });
  });
});