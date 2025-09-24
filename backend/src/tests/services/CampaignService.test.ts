import { CampaignService } from '../../services/CampaignService.js';
import { CampaignModel } from '../../models/Campaign.js';
import { Campaign, CreateCampaignData, UpdateCampaignData, CampaignWithRelations } from '../../types/campaign.js';

// Mock the CampaignModel
jest.mock('../../models/Campaign.js', () => ({
  CampaignModel: {
    findById: jest.fn(),
    findByIdWithRelations: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateStatus: jest.fn(),
    assignContractor: jest.fn(),
    removeContractorAssignment: jest.fn(),
    getAssignedContractors: jest.fn(),
    findByCompanyId: jest.fn(),
    findByContractorId: jest.fn(),
    countByStatus: jest.fn()
  }
}));

const mockCampaignModel = CampaignModel as jest.Mocked<typeof CampaignModel>;

describe('CampaignService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  const mockCampaignWithRelations: CampaignWithRelations = {
    ...mockCampaign,
    company: {
      id: 1,
      name: 'Test Company',
      contact_email: 'test@company.com'
    },
    created_by_user: {
      id: 1,
      first_name: 'John',
      last_name: 'Doe'
    },
    assigned_contractors: []
  };

  describe('getCampaignById', () => {
    it('should return campaign for company employee', async () => {
      mockCampaignModel.findByIdWithRelations.mockResolvedValue(mockCampaignWithRelations);

      const result = await CampaignService.getCampaignById(1, 1, 'company_employee');

      expect(result).toEqual(mockCampaignWithRelations);
      expect(mockCampaignModel.findByIdWithRelations).toHaveBeenCalledWith(1);
    });

    it('should return campaign for client from same company', async () => {
      mockCampaignModel.findByIdWithRelations.mockResolvedValue(mockCampaignWithRelations);

      const result = await CampaignService.getCampaignById(1, 2, 'client', 1);

      expect(result).toEqual(mockCampaignWithRelations);
    });

    it('should throw error for client from different company', async () => {
      mockCampaignModel.findByIdWithRelations.mockResolvedValue(mockCampaignWithRelations);

      await expect(
        CampaignService.getCampaignById(1, 2, 'client', 2)
      ).rejects.toThrow('Insufficient permissions to access this campaign');
    });

    it('should return null when campaign not found', async () => {
      mockCampaignModel.findByIdWithRelations.mockResolvedValue(null);

      const result = await CampaignService.getCampaignById(999, 1, 'company_employee');

      expect(result).toBeNull();
    });

    it('should throw error when database operation fails', async () => {
      mockCampaignModel.findByIdWithRelations.mockRejectedValue(new Error('Database error'));

      await expect(
        CampaignService.getCampaignById(1, 1, 'company_employee')
      ).rejects.toThrow('Failed to get campaign: Database error');
    });
  });

  describe('getAllCampaigns', () => {
    it('should return all campaigns for company employee', async () => {
      const mockCampaigns = [mockCampaign];
      mockCampaignModel.findAll.mockResolvedValue(mockCampaigns);

      const result = await CampaignService.getAllCampaigns(1, 'company_employee');

      expect(result).toEqual(mockCampaigns);
      expect(mockCampaignModel.findAll).toHaveBeenCalledWith({});
    });

    it('should filter campaigns by company for client users', async () => {
      const mockCampaigns = [mockCampaign];
      mockCampaignModel.findAll.mockResolvedValue(mockCampaigns);

      const result = await CampaignService.getAllCampaigns(2, 'client', 1);

      expect(result).toEqual(mockCampaigns);
      expect(mockCampaignModel.findAll).toHaveBeenCalledWith({
        companyId: 1
      });
    });

    it('should filter campaigns by contractor assignment', async () => {
      const mockCampaigns = [mockCampaign];
      mockCampaignModel.findAll.mockResolvedValue(mockCampaigns);

      const result = await CampaignService.getAllCampaigns(3, 'contractor');

      expect(result).toEqual(mockCampaigns);
      expect(mockCampaignModel.findAll).toHaveBeenCalledWith({
        assignedTo: 3
      });
    });

    it('should throw error for client without company', async () => {
      await expect(
        CampaignService.getAllCampaigns(2, 'client')
      ).rejects.toThrow('Client users must be associated with a company');
    });

    it('should throw error for invalid role', async () => {
      await expect(
        CampaignService.getAllCampaigns(1, 'invalid_role' as any)
      ).rejects.toThrow('Invalid user role');
    });
  });

  describe('createCampaign', () => {
    const createData: CreateCampaignData = {
      name: 'New Campaign',
      description: 'New Description',
      companyId: 1,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      createdBy: 1
    };

    it('should create campaign for company employee', async () => {
      mockCampaignModel.create.mockResolvedValue(mockCampaign);

      const result = await CampaignService.createCampaign(createData, 1, 'company_employee');

      expect(result).toEqual(mockCampaign);
      expect(mockCampaignModel.create).toHaveBeenCalledWith({
        ...createData,
        createdBy: 1
      });
    });

    it('should throw error for non-company employee', async () => {
      await expect(
        CampaignService.createCampaign(createData, 2, 'client')
      ).rejects.toThrow('Only company employees can create campaigns');
    });

    it('should throw error when creation fails', async () => {
      mockCampaignModel.create.mockRejectedValue(new Error('Database error'));

      await expect(
        CampaignService.createCampaign(createData, 1, 'company_employee')
      ).rejects.toThrow('Failed to create campaign: Database error');
    });
  });

  describe('updateCampaign', () => {
    const updateData: UpdateCampaignData = {
      name: 'Updated Campaign',
      status: 'in_progress'
    };

    it('should update campaign for company employee', async () => {
      mockCampaignModel.findById.mockResolvedValue(mockCampaign);
      mockCampaignModel.update.mockResolvedValue({ ...mockCampaign, ...updateData });

      const result = await CampaignService.updateCampaign(1, updateData, 1, 'company_employee');

      expect(result).toEqual({ ...mockCampaign, ...updateData });
      expect(mockCampaignModel.update).toHaveBeenCalledWith(1, updateData);
    });

    it('should throw error for non-company employee', async () => {
      await expect(
        CampaignService.updateCampaign(1, updateData, 2, 'client')
      ).rejects.toThrow('Only company employees can update campaigns');
    });

    it('should return null when campaign not found', async () => {
      mockCampaignModel.findById.mockResolvedValue(null);

      const result = await CampaignService.updateCampaign(999, updateData, 1, 'company_employee');

      expect(result).toBeNull();
    });
  });

  describe('updateCampaignStatus', () => {
    it('should update campaign status with valid transition', async () => {
      mockCampaignModel.findById.mockResolvedValue(mockCampaign);
      mockCampaignModel.updateStatus.mockResolvedValue({ ...mockCampaign, status: 'in_progress' });

      const result = await CampaignService.updateCampaignStatus(1, 'in_progress', 1, 'company_employee');

      expect(result).toEqual({ ...mockCampaign, status: 'in_progress' });
      expect(mockCampaignModel.updateStatus).toHaveBeenCalledWith(1, 'in_progress');
    });

    it('should throw error for invalid status transition', async () => {
      const completedCampaign = { ...mockCampaign, status: 'completed' as const };
      mockCampaignModel.findById.mockResolvedValue(completedCampaign);

      await expect(
        CampaignService.updateCampaignStatus(1, 'new', 1, 'company_employee')
      ).rejects.toThrow('Invalid status transition from completed to new');
    });

    it('should throw error for non-company employee', async () => {
      await expect(
        CampaignService.updateCampaignStatus(1, 'in_progress', 2, 'client')
      ).rejects.toThrow('Only company employees can change campaign status');
    });
  });

  describe('assignContractor', () => {
    it('should assign contractor to new campaign', async () => {
      mockCampaignModel.findById.mockResolvedValue(mockCampaign);
      mockCampaignModel.assignContractor.mockResolvedValue(true);

      const result = await CampaignService.assignContractor(1, 2, 1, 'company_employee');

      expect(result).toBe(true);
      expect(mockCampaignModel.assignContractor).toHaveBeenCalledWith(1, 2, 1);
    });

    it('should assign contractor to in_progress campaign', async () => {
      const inProgressCampaign = { ...mockCampaign, status: 'in_progress' as const };
      mockCampaignModel.findById.mockResolvedValue(inProgressCampaign);
      mockCampaignModel.assignContractor.mockResolvedValue(true);

      const result = await CampaignService.assignContractor(1, 2, 1, 'company_employee');

      expect(result).toBe(true);
    });

    it('should throw error for completed campaign', async () => {
      const completedCampaign = { ...mockCampaign, status: 'completed' as const };
      mockCampaignModel.findById.mockResolvedValue(completedCampaign);

      await expect(
        CampaignService.assignContractor(1, 2, 1, 'company_employee')
      ).rejects.toThrow('Cannot assign contractors to completed or cancelled campaigns');
    });

    it('should throw error for non-company employee', async () => {
      await expect(
        CampaignService.assignContractor(1, 2, 2, 'client')
      ).rejects.toThrow('Only company employees can assign contractors');
    });

    it('should throw error when campaign not found', async () => {
      mockCampaignModel.findById.mockResolvedValue(null);

      await expect(
        CampaignService.assignContractor(999, 2, 1, 'company_employee')
      ).rejects.toThrow('Campaign not found');
    });
  });

  describe('removeContractorAssignment', () => {
    it('should remove contractor assignment', async () => {
      mockCampaignModel.findById.mockResolvedValue(mockCampaign);
      mockCampaignModel.removeContractorAssignment.mockResolvedValue(true);

      const result = await CampaignService.removeContractorAssignment(1, 2, 1, 'company_employee');

      expect(result).toBe(true);
      expect(mockCampaignModel.removeContractorAssignment).toHaveBeenCalledWith(1, 2);
    });

    it('should throw error for non-company employee', async () => {
      await expect(
        CampaignService.removeContractorAssignment(1, 2, 2, 'client')
      ).rejects.toThrow('Only company employees can remove contractor assignments');
    });
  });

  describe('getCampaignStats', () => {
    it('should return campaign statistics for company employee', async () => {
      const mockStatusStats = { new: 5, in_progress: 3, completed: 10 };
      const mockCampaigns = new Array(18).fill(mockCampaign);

      mockCampaignModel.countByStatus.mockResolvedValue(mockStatusStats);
      mockCampaignModel.findAll.mockResolvedValue(mockCampaigns);

      const result = await CampaignService.getCampaignStats(1, 'company_employee');

      expect(result).toEqual({
        total: 18,
        byStatus: mockStatusStats
      });
    });

    it('should throw error for non-company employee', async () => {
      await expect(
        CampaignService.getCampaignStats(2, 'client')
      ).rejects.toThrow('Only company employees can access campaign statistics');
    });
  });

  describe('getCampaignsByCompanyId', () => {
    it('should return campaigns for company employee', async () => {
      const mockCampaigns = [mockCampaign];
      mockCampaignModel.findByCompanyId.mockResolvedValue(mockCampaigns);

      const result = await CampaignService.getCampaignsByCompanyId(1, 1, 'company_employee');

      expect(result).toEqual(mockCampaigns);
      expect(mockCampaignModel.findByCompanyId).toHaveBeenCalledWith(1);
    });

    it('should return campaigns for client from same company', async () => {
      const mockCampaigns = [mockCampaign];
      mockCampaignModel.findByCompanyId.mockResolvedValue(mockCampaigns);

      const result = await CampaignService.getCampaignsByCompanyId(1, 2, 'client', 1);

      expect(result).toEqual(mockCampaigns);
    });

    it('should throw error for client from different company', async () => {
      await expect(
        CampaignService.getCampaignsByCompanyId(1, 2, 'client', 2)
      ).rejects.toThrow('Clients can only access campaigns from their own company');
    });
  });

  describe('getCampaignsByContractorId', () => {
    it('should return campaigns for contractor accessing own campaigns', async () => {
      const mockCampaigns = [mockCampaign];
      mockCampaignModel.findByContractorId.mockResolvedValue(mockCampaigns);

      const result = await CampaignService.getCampaignsByContractorId(3, 3, 'contractor');

      expect(result).toEqual(mockCampaigns);
      expect(mockCampaignModel.findByContractorId).toHaveBeenCalledWith(3);
    });

    it('should return campaigns for company employee', async () => {
      const mockCampaigns = [mockCampaign];
      mockCampaignModel.findByContractorId.mockResolvedValue(mockCampaigns);

      const result = await CampaignService.getCampaignsByContractorId(3, 1, 'company_employee');

      expect(result).toEqual(mockCampaigns);
    });

    it('should throw error for contractor accessing other contractor campaigns', async () => {
      await expect(
        CampaignService.getCampaignsByContractorId(3, 4, 'contractor')
      ).rejects.toThrow('Contractors can only access their own assigned campaigns');
    });
  });
});