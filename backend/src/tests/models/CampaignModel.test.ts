import { CampaignModel } from '../../models/Campaign.js';
import { Campaign, CreateCampaignData, UpdateCampaignData } from '../../types/campaign.js';
import db from '../../database/connection.js';

// Mock the database connection
jest.mock('../../database/connection.js', () => ({
  __esModule: true,
  default: jest.fn()
}));

const mockDb = db as jest.MockedFunction<any>;

describe('CampaignModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockDb.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      first: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      del: jest.fn(),
      select: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis()
    });
  });

  describe('findById', () => {
    it('should return campaign when found', async () => {
      const mockCampaign: Campaign = {
        id: 1,
        name: 'Test Campaign',
        description: 'Test Description',
        company_id: 1,
        status: 'new',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-31'),
        completed_at: null,
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb().where().first.mockResolvedValue(mockCampaign);

      const result = await CampaignModel.findById(1);

      expect(result).toEqual(mockCampaign);
      expect(mockDb).toHaveBeenCalledWith('campaigns');
      expect(mockDb().where).toHaveBeenCalledWith({ id: 1 });
    });

    it('should return null when campaign not found', async () => {
      mockDb().where().first.mockResolvedValue(undefined);

      const result = await CampaignModel.findById(999);

      expect(result).toBeNull();
    });

    it('should throw error when database operation fails', async () => {
      mockDb().where().first.mockRejectedValue(new Error('Database error'));

      await expect(CampaignModel.findById(1)).rejects.toThrow('Failed to find campaign by ID: Database error');
    });
  });

  describe('findAll', () => {
    it('should return all campaigns without filters', async () => {
      const mockCampaigns: Campaign[] = [
        {
          id: 1,
          name: 'Campaign 1',
          company_id: 1,
          status: 'new',
          created_by: 1,
          created_at: new Date(),
          updated_at: new Date()
        } as Campaign,
        {
          id: 2,
          name: 'Campaign 2',
          company_id: 2,
          status: 'in_progress',
          created_by: 1,
          created_at: new Date(),
          updated_at: new Date()
        } as Campaign
      ];

      mockDb().select().distinct().orderBy.mockResolvedValue(mockCampaigns);

      const result = await CampaignModel.findAll();

      expect(result).toEqual(mockCampaigns);
      expect(mockDb().select).toHaveBeenCalledWith('campaigns.*');
      expect(mockDb().distinct).toHaveBeenCalled();
      expect(mockDb().orderBy).toHaveBeenCalledWith('campaigns.created_at', 'desc');
    });

    it('should apply status filter', async () => {
      const mockCampaigns: Campaign[] = [];
      mockDb().where().select().distinct().orderBy.mockResolvedValue(mockCampaigns);

      await CampaignModel.findAll({ status: 'completed' });

      expect(mockDb().where).toHaveBeenCalledWith('status', 'completed');
    });

    it('should apply company filter', async () => {
      const mockCampaigns: Campaign[] = [];
      mockDb().where().select().distinct().orderBy.mockResolvedValue(mockCampaigns);

      await CampaignModel.findAll({ companyId: 1 });

      expect(mockDb().where).toHaveBeenCalledWith('company_id', 1);
    });

    it('should apply search filter', async () => {
      const mockCampaigns: Campaign[] = [];
      mockDb().where().select().distinct().orderBy.mockResolvedValue(mockCampaigns);

      await CampaignModel.findAll({ search: 'test' });

      expect(mockDb().where).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should throw error when database operation fails', async () => {
      mockDb().select().distinct().orderBy.mockRejectedValue(new Error('Database error'));

      await expect(CampaignModel.findAll()).rejects.toThrow('Failed to fetch campaigns: Database error');
    });
  });

  describe('create', () => {
    it('should create campaign successfully', async () => {
      const createData: CreateCampaignData = {
        name: 'New Campaign',
        description: 'New Description',
        companyId: 1,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        createdBy: 1
      };

      const mockCampaign: Campaign = {
        id: 1,
        name: createData.name,
        description: createData.description,
        company_id: createData.companyId,
        status: 'new',
        start_date: createData.startDate,
        end_date: createData.endDate,
        completed_at: null,
        created_by: createData.createdBy,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb().insert.mockResolvedValue([1]);
      mockDb().where().first.mockResolvedValue(mockCampaign);

      const result = await CampaignModel.create(createData);

      expect(result).toEqual(mockCampaign);
      expect(mockDb().insert).toHaveBeenCalledWith({
        name: createData.name,
        description: createData.description,
        company_id: createData.companyId,
        status: 'new',
        start_date: createData.startDate,
        end_date: createData.endDate,
        created_by: createData.createdBy,
        created_at: expect.any(Date),
        updated_at: expect.any(Date)
      });
    });

    it('should throw error when campaign creation fails', async () => {
      const createData: CreateCampaignData = {
        name: 'New Campaign',
        companyId: 1,
        createdBy: 1
      };

      mockDb().insert.mockRejectedValue(new Error('Database error'));

      await expect(CampaignModel.create(createData)).rejects.toThrow('Failed to create campaign: Database error');
    });
  });

  describe('update', () => {
    it('should update campaign successfully', async () => {
      const updateData: UpdateCampaignData = {
        name: 'Updated Campaign',
        status: 'in_progress'
      };

      const mockUpdatedCampaign: Campaign = {
        id: 1,
        name: updateData.name!,
        company_id: 1,
        status: updateData.status!,
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date()
      } as Campaign;

      mockDb().where().update.mockResolvedValue(1);
      mockDb().where().first.mockResolvedValue(mockUpdatedCampaign);

      const result = await CampaignModel.update(1, updateData);

      expect(result).toEqual(mockUpdatedCampaign);
      expect(mockDb().where).toHaveBeenCalledWith({ id: 1 });
      expect(mockDb().update).toHaveBeenCalledWith({
        name: updateData.name,
        status: updateData.status,
        updated_at: expect.any(Date)
      });
    });

    it('should return null when campaign not found', async () => {
      mockDb().where().update.mockResolvedValue(0);

      const result = await CampaignModel.update(999, { name: 'Updated' });

      expect(result).toBeNull();
    });

    it('should throw error when update fails', async () => {
      mockDb().where().update.mockRejectedValue(new Error('Database error'));

      await expect(CampaignModel.update(1, { name: 'Updated' })).rejects.toThrow('Failed to update campaign: Database error');
    });
  });

  describe('updateStatus', () => {
    it('should update campaign status to completed with completed_at timestamp', async () => {
      const mockUpdatedCampaign: Campaign = {
        id: 1,
        name: 'Test Campaign',
        company_id: 1,
        status: 'completed',
        completed_at: new Date(),
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date()
      } as Campaign;

      mockDb().where().update.mockResolvedValue(1);
      mockDb().where().first.mockResolvedValue(mockUpdatedCampaign);

      const result = await CampaignModel.updateStatus(1, 'completed');

      expect(result).toEqual(mockUpdatedCampaign);
      expect(mockDb().update).toHaveBeenCalledWith({
        status: 'completed',
        completed_at: expect.any(Date),
        updated_at: expect.any(Date)
      });
    });

    it('should update campaign status without completed_at for non-completed status', async () => {
      const mockUpdatedCampaign: Campaign = {
        id: 1,
        name: 'Test Campaign',
        company_id: 1,
        status: 'in_progress',
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date()
      } as Campaign;

      mockDb().where().update.mockResolvedValue(1);
      mockDb().where().first.mockResolvedValue(mockUpdatedCampaign);

      const result = await CampaignModel.updateStatus(1, 'in_progress');

      expect(result).toEqual(mockUpdatedCampaign);
      expect(mockDb().update).toHaveBeenCalledWith({
        status: 'in_progress',
        updated_at: expect.any(Date)
      });
    });
  });

  describe('assignContractor', () => {
    it('should assign contractor successfully', async () => {
      mockDb().insert.mockResolvedValue([1]);

      const result = await CampaignModel.assignContractor(1, 2, 3);

      expect(result).toBe(true);
      expect(mockDb).toHaveBeenCalledWith('campaign_assignments');
      expect(mockDb().insert).toHaveBeenCalledWith({
        campaign_id: 1,
        contractor_id: 2,
        assigned_by: 3,
        assigned_at: expect.any(Date)
      });
    });

    it('should throw error for duplicate assignment', async () => {
      const duplicateError = new Error('Duplicate entry');
      mockDb().insert.mockRejectedValue(duplicateError);

      await expect(CampaignModel.assignContractor(1, 2, 3)).rejects.toThrow('Contractor is already assigned to this campaign');
    });
  });

  describe('removeContractorAssignment', () => {
    it('should remove contractor assignment successfully', async () => {
      mockDb().where().del.mockResolvedValue(1);

      const result = await CampaignModel.removeContractorAssignment(1, 2);

      expect(result).toBe(true);
      expect(mockDb).toHaveBeenCalledWith('campaign_assignments');
      expect(mockDb().where).toHaveBeenCalledWith({
        campaign_id: 1,
        contractor_id: 2
      });
    });

    it('should return false when assignment not found', async () => {
      mockDb().where().del.mockResolvedValue(0);

      const result = await CampaignModel.removeContractorAssignment(1, 2);

      expect(result).toBe(false);
    });
  });

  describe('countByStatus', () => {
    it('should return status counts', async () => {
      const mockCounts = [
        { status: 'new', count: 5 },
        { status: 'in_progress', count: 3 },
        { status: 'completed', count: 10 }
      ];

      mockDb().select().count().groupBy.mockResolvedValue(mockCounts);

      const result = await CampaignModel.countByStatus();

      expect(result).toEqual({
        new: 5,
        in_progress: 3,
        completed: 10
      });
    });

    it('should throw error when count operation fails', async () => {
      mockDb().select().count().groupBy.mockRejectedValue(new Error('Database error'));

      await expect(CampaignModel.countByStatus()).rejects.toThrow('Failed to count campaigns by status: Database error');
    });
  });
});