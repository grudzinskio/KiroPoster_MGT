import { ImageModel } from '../../models/Image.js';
import { CreateImageData, UpdateImageData } from '../../types/image.js';
import db from '../../database/connection.js';

// Mock the database connection
jest.mock('../../database/connection.js', () => ({
  __esModule: true,
  default: jest.fn()
}));

const mockDb = db as jest.MockedFunction<any>;

describe('ImageModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock chain
    mockDb.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      first: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      del: jest.fn(),
      orderBy: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis()
    });
  });

  describe('findById', () => {
    it('should find image by ID successfully', async () => {
      const mockImage = {
        id: 1,
        campaignId: 1,
        uploadedBy: 1,
        filename: 'test-image.jpg',
        originalFilename: 'original.jpg',
        filePath: '/uploads/test-image.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        status: 'pending',
        uploadedAt: new Date()
      };

      mockDb().where().first.mockResolvedValue(mockImage);

      const result = await ImageModel.findById(1);

      expect(result).toEqual(mockImage);
      expect(mockDb).toHaveBeenCalledWith('images');
      expect(mockDb().where).toHaveBeenCalledWith({ id: 1 });
    });

    it('should return null when image not found', async () => {
      mockDb().where().first.mockResolvedValue(undefined);

      const result = await ImageModel.findById(999);

      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      mockDb().where().first.mockRejectedValue(new Error('Database error'));

      await expect(ImageModel.findById(1)).rejects.toThrow('Failed to find image by ID: Database error');
    });
  });

  describe('findByIdWithRelations', () => {
    it('should find image with relations successfully', async () => {
      const mockImageWithRelations = {
        id: 1,
        campaign_id: 1,
        uploaded_by: 1,
        filename: 'test-image.jpg',
        originalFilename: 'original.jpg',
        filePath: '/uploads/test-image.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        status: 'pending',
        uploadedAt: new Date(),
        campaign_name: 'Test Campaign',
        campaign_company_id: 1,
        uploader_first_name: 'John',
        uploader_last_name: 'Doe',
        uploader_email: 'john@example.com',
        reviewed_by: null,
        reviewer_first_name: null,
        reviewer_last_name: null,
        reviewer_email: null
      };

      mockDb().leftJoin().leftJoin().select().where().first.mockResolvedValue(mockImageWithRelations);

      const result = await ImageModel.findByIdWithRelations(1);

      expect(result).toBeDefined();
      expect(result?.campaign).toEqual({
        id: 1,
        name: 'Test Campaign',
        companyId: 1
      });
      expect(result?.uploader).toEqual({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      });
      expect(result?.reviewer).toBeUndefined();
    });

    it('should return null when image not found', async () => {
      mockDb().leftJoin().leftJoin().select().where().first.mockResolvedValue(undefined);

      const result = await ImageModel.findByIdWithRelations(999);

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should find all images without filters', async () => {
      const mockImages = [
        { id: 1, campaignId: 1, status: 'pending' },
        { id: 2, campaignId: 2, status: 'approved' }
      ];

      mockDb().orderBy.mockResolvedValue(mockImages);

      const result = await ImageModel.findAll();

      expect(result).toEqual(mockImages);
      expect(mockDb().orderBy).toHaveBeenCalledWith('uploaded_at', 'desc');
    });

    it('should apply filters correctly', async () => {
      const mockImages = [{ id: 1, campaignId: 1, status: 'pending' }];
      const filters = {
        campaignId: 1,
        status: 'pending' as const,
        uploadedBy: 1
      };

      mockDb().where.mockReturnThis();
      mockDb().orderBy.mockResolvedValue(mockImages);

      const result = await ImageModel.findAll(filters);

      expect(result).toEqual(mockImages);
      expect(mockDb().where).toHaveBeenCalledWith('campaign_id', 1);
      expect(mockDb().where).toHaveBeenCalledWith('status', 'pending');
      expect(mockDb().where).toHaveBeenCalledWith('uploaded_by', 1);
    });
  });

  describe('create', () => {
    it('should create image successfully', async () => {
      const imageData: CreateImageData = {
        campaignId: 1,
        uploadedBy: 1,
        filename: 'test-image.jpg',
        originalFilename: 'original.jpg',
        filePath: '/uploads/test-image.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg'
      };

      const mockCreatedImage = {
        id: 1,
        ...imageData,
        status: 'pending',
        uploadedAt: new Date()
      };

      mockDb().insert.mockResolvedValue([1]);
      mockDb().where().first.mockResolvedValue(mockCreatedImage);

      const result = await ImageModel.create(imageData);

      expect(result).toEqual(mockCreatedImage);
      expect(mockDb().insert).toHaveBeenCalledWith({
        campaign_id: imageData.campaignId,
        uploaded_by: imageData.uploadedBy,
        filename: imageData.filename,
        original_filename: imageData.originalFilename,
        file_path: imageData.filePath,
        file_size: imageData.fileSize,
        mime_type: imageData.mimeType,
        status: 'pending',
        uploaded_at: expect.any(Date)
      });
    });

    it('should throw error when created image cannot be retrieved', async () => {
      const imageData: CreateImageData = {
        campaignId: 1,
        uploadedBy: 1,
        filename: 'test-image.jpg',
        originalFilename: 'original.jpg',
        filePath: '/uploads/test-image.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg'
      };

      mockDb().insert.mockResolvedValue([1]);
      mockDb().where().first.mockResolvedValue(null);

      await expect(ImageModel.create(imageData)).rejects.toThrow('Failed to retrieve created image');
    });
  });

  describe('update', () => {
    it('should update image successfully', async () => {
      const updateData: UpdateImageData = {
        status: 'approved',
        reviewedBy: 2,
        reviewedAt: new Date()
      };

      const mockUpdatedImage = {
        id: 1,
        status: 'approved',
        reviewedBy: 2,
        reviewedAt: updateData.reviewedAt
      };

      mockDb().where().update.mockResolvedValue(1);
      mockDb().where().first.mockResolvedValue(mockUpdatedImage);

      const result = await ImageModel.update(1, updateData);

      expect(result).toEqual(mockUpdatedImage);
      expect(mockDb().where).toHaveBeenCalledWith({ id: 1 });
      expect(mockDb().update).toHaveBeenCalledWith({
        status: 'approved',
        reviewed_by: 2,
        reviewed_at: updateData.reviewedAt
      });
    });

    it('should return null when no rows affected', async () => {
      mockDb().where().update.mockResolvedValue(0);

      const result = await ImageModel.update(999, { status: 'approved' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete image successfully', async () => {
      mockDb().where().del.mockResolvedValue(1);

      const result = await ImageModel.delete(1);

      expect(result).toBe(true);
      expect(mockDb().where).toHaveBeenCalledWith({ id: 1 });
    });

    it('should return false when no rows affected', async () => {
      mockDb().where().del.mockResolvedValue(0);

      const result = await ImageModel.delete(999);

      expect(result).toBe(false);
    });
  });

  describe('updateApprovalStatus', () => {
    it('should approve image successfully', async () => {
      const mockApprovedImage = {
        id: 1,
        status: 'approved',
        reviewedBy: 2,
        reviewedAt: new Date(),
        rejectionReason: null
      };

      mockDb().where().update.mockResolvedValue(1);
      mockDb().where().first.mockResolvedValue(mockApprovedImage);

      const result = await ImageModel.updateApprovalStatus(1, 'approved', 2);

      expect(result).toEqual(mockApprovedImage);
      expect(mockDb().update).toHaveBeenCalledWith({
        status: 'approved',
        reviewed_by: 2,
        reviewed_at: expect.any(Date),
        rejection_reason: null
      });
    });

    it('should reject image with reason successfully', async () => {
      const rejectionReason = 'Poor image quality';
      const mockRejectedImage = {
        id: 1,
        status: 'rejected',
        reviewedBy: 2,
        reviewedAt: new Date(),
        rejectionReason
      };

      mockDb().where().update.mockResolvedValue(1);
      mockDb().where().first.mockResolvedValue(mockRejectedImage);

      const result = await ImageModel.updateApprovalStatus(1, 'rejected', 2, rejectionReason);

      expect(result).toEqual(mockRejectedImage);
      expect(mockDb().update).toHaveBeenCalledWith({
        status: 'rejected',
        reviewed_by: 2,
        reviewed_at: expect.any(Date),
        rejection_reason: rejectionReason
      });
    });
  });

  describe('findByCampaignId', () => {
    it('should find images by campaign ID', async () => {
      const mockImages = [
        { id: 1, campaignId: 1 },
        { id: 2, campaignId: 1 }
      ];

      mockDb().where().orderBy.mockResolvedValue(mockImages);

      const result = await ImageModel.findByCampaignId(1);

      expect(result).toEqual(mockImages);
      expect(mockDb().where).toHaveBeenCalledWith({ campaign_id: 1 });
      expect(mockDb().orderBy).toHaveBeenCalledWith('uploaded_at', 'desc');
    });
  });

  describe('countByStatus', () => {
    it('should count images by status', async () => {
      const mockCounts = [
        { status: 'pending', count: '5' },
        { status: 'approved', count: '10' },
        { status: 'rejected', count: '2' }
      ];

      mockDb().select().count().groupBy.mockResolvedValue(mockCounts);

      const result = await ImageModel.countByStatus();

      expect(result).toEqual({
        pending: 5,
        approved: 10,
        rejected: 2
      });
    });
  });

  describe('countByCampaign', () => {
    it('should count images by campaign', async () => {
      const mockCounts = [
        { status: 'pending', count: '3' },
        { status: 'approved', count: '7' }
      ];

      mockDb().select().count().where().groupBy.mockResolvedValue(mockCounts);

      const result = await ImageModel.countByCampaign(1);

      expect(result).toEqual({
        total: 10,
        pending: 3,
        approved: 7,
        rejected: 0
      });
    });
  });

  describe('findPendingImages', () => {
    it('should find pending images', async () => {
      const mockPendingImages = [
        { id: 1, status: 'pending' },
        { id: 2, status: 'pending' }
      ];

      mockDb().where().orderBy.mockResolvedValue(mockPendingImages);

      const result = await ImageModel.findPendingImages();

      expect(result).toEqual(mockPendingImages);
      expect(mockDb().where).toHaveBeenCalledWith({ status: 'pending' });
      expect(mockDb().orderBy).toHaveBeenCalledWith('uploaded_at', 'asc');
    });
  });
});