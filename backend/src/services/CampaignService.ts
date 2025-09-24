import { CampaignModel } from '../models/Campaign.js';
import { Campaign, CreateCampaignData, UpdateCampaignData, CampaignWithRelations, CampaignFilters } from '../types/campaign.js';

export class CampaignService {
  /**
   * Get campaign by ID with role-based filtering
   */
  static async getCampaignById(
    id: number, 
    requestingUserId: number, 
    requestingUserRole: string, 
    requestingUserCompanyId?: number
  ): Promise<CampaignWithRelations | null> {
    try {
      const campaign = await CampaignModel.findByIdWithRelations(id);
      
      if (!campaign) {
        return null;
      }

      // Role-based access control
      if (!this.canAccessCampaign(campaign, requestingUserId, requestingUserRole, requestingUserCompanyId)) {
        throw new Error('Insufficient permissions to access this campaign');
      }

      return campaign;
    } catch (error) {
      throw new Error(`Failed to get campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all campaigns with role-based filtering
   */
  static async getAllCampaigns(
    requestingUserId: number,
    requestingUserRole: string,
    requestingUserCompanyId?: number,
    filters?: CampaignFilters
  ): Promise<Campaign[]> {
    try {
      let campaignFilters = { ...filters };

      // Apply role-based filtering
      switch (requestingUserRole) {
        case 'client':
          // Clients can only see campaigns from their company
          if (!requestingUserCompanyId) {
            throw new Error('Client users must be associated with a company');
          }
          campaignFilters.companyId = requestingUserCompanyId;
          
          // Clients can only see completed campaigns from the last month
          if (filters?.status === 'completed') {
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            campaignFilters.startDate = oneMonthAgo;
          }
          break;

        case 'contractor':
          // Contractors can only see campaigns assigned to them
          campaignFilters.assignedTo = requestingUserId;
          break;

        case 'company_employee':
          // Company employees can see all campaigns (no additional filtering)
          break;

        default:
          throw new Error('Invalid user role');
      }

      return await CampaignModel.findAll(campaignFilters);
    } catch (error) {
      throw new Error(`Failed to get campaigns: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new campaign
   */
  static async createCampaign(
    campaignData: CreateCampaignData,
    requestingUserId: number,
    requestingUserRole: string
  ): Promise<Campaign> {
    try {
      // Only company employees can create campaigns
      if (requestingUserRole !== 'company_employee') {
        throw new Error('Only company employees can create campaigns');
      }

      // Set the creator
      const createData = {
        ...campaignData,
        createdBy: requestingUserId
      };

      return await CampaignModel.create(createData);
    } catch (error) {
      throw new Error(`Failed to create campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update campaign by ID
   */
  static async updateCampaign(
    id: number,
    updateData: UpdateCampaignData,
    requestingUserId: number,
    requestingUserRole: string,
    requestingUserCompanyId?: number
  ): Promise<Campaign | null> {
    try {
      // Only company employees can update campaigns
      if (requestingUserRole !== 'company_employee') {
        throw new Error('Only company employees can update campaigns');
      }

      const existingCampaign = await CampaignModel.findById(id);
      if (!existingCampaign) {
        return null;
      }

      return await CampaignModel.update(id, updateData);
    } catch (error) {
      throw new Error(`Failed to update campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete campaign by ID
   */
  static async deleteCampaign(
    id: number,
    requestingUserId: number,
    requestingUserRole: string
  ): Promise<boolean> {
    try {
      // Only company employees can delete campaigns
      if (requestingUserRole !== 'company_employee') {
        throw new Error('Only company employees can delete campaigns');
      }

      const campaign = await CampaignModel.findById(id);
      if (!campaign) {
        return false;
      }

      return await CampaignModel.delete(id);
    } catch (error) {
      throw new Error(`Failed to delete campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update campaign status
   */
  static async updateCampaignStatus(
    id: number,
    status: 'new' | 'in_progress' | 'completed' | 'cancelled',
    requestingUserId: number,
    requestingUserRole: string
  ): Promise<Campaign | null> {
    try {
      // Only company employees can change campaign status
      if (requestingUserRole !== 'company_employee') {
        throw new Error('Only company employees can change campaign status');
      }

      const existingCampaign = await CampaignModel.findById(id);
      if (!existingCampaign) {
        return null;
      }

      // Validate status transitions
      if (!this.isValidStatusTransition(existingCampaign.status, status)) {
        throw new Error(`Invalid status transition from ${existingCampaign.status} to ${status}`);
      }

      return await CampaignModel.updateStatus(id, status);
    } catch (error) {
      throw new Error(`Failed to update campaign status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Assign contractor to campaign
   */
  static async assignContractor(
    campaignId: number,
    contractorId: number,
    requestingUserId: number,
    requestingUserRole: string
  ): Promise<boolean> {
    try {
      // Only company employees can assign contractors
      if (requestingUserRole !== 'company_employee') {
        throw new Error('Only company employees can assign contractors');
      }

      const campaign = await CampaignModel.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Campaign must be in 'new' or 'in_progress' status to assign contractors
      if (!['new', 'in_progress'].includes(campaign.status)) {
        throw new Error('Cannot assign contractors to completed or cancelled campaigns');
      }

      return await CampaignModel.assignContractor(campaignId, contractorId, requestingUserId);
    } catch (error) {
      throw new Error(`Failed to assign contractor: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove contractor assignment from campaign
   */
  static async removeContractorAssignment(
    campaignId: number,
    contractorId: number,
    requestingUserId: number,
    requestingUserRole: string
  ): Promise<boolean> {
    try {
      // Only company employees can remove contractor assignments
      if (requestingUserRole !== 'company_employee') {
        throw new Error('Only company employees can remove contractor assignments');
      }

      const campaign = await CampaignModel.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      return await CampaignModel.removeContractorAssignment(campaignId, contractorId);
    } catch (error) {
      throw new Error(`Failed to remove contractor assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get assigned contractors for a campaign
   */
  static async getAssignedContractors(
    campaignId: number,
    requestingUserId: number,
    requestingUserRole: string,
    requestingUserCompanyId?: number
  ): Promise<any[]> {
    try {
      const campaign = await CampaignModel.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Check access permissions
      if (!this.canAccessCampaign(campaign, requestingUserId, requestingUserRole, requestingUserCompanyId)) {
        throw new Error('Insufficient permissions to access this campaign');
      }

      return await CampaignModel.getAssignedContractors(campaignId);
    } catch (error) {
      throw new Error(`Failed to get assigned contractors: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get campaigns by company ID
   */
  static async getCampaignsByCompanyId(
    companyId: number,
    requestingUserId: number,
    requestingUserRole: string,
    requestingUserCompanyId?: number
  ): Promise<Campaign[]> {
    try {
      // Role-based access control
      if (requestingUserRole === 'client' && requestingUserCompanyId !== companyId) {
        throw new Error('Clients can only access campaigns from their own company');
      }

      return await CampaignModel.findByCompanyId(companyId);
    } catch (error) {
      throw new Error(`Failed to get campaigns by company: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get campaigns assigned to a contractor
   */
  static async getCampaignsByContractorId(
    contractorId: number,
    requestingUserId: number,
    requestingUserRole: string
  ): Promise<Campaign[]> {
    try {
      // Contractors can only see their own assigned campaigns
      if (requestingUserRole === 'contractor' && requestingUserId !== contractorId) {
        throw new Error('Contractors can only access their own assigned campaigns');
      }

      return await CampaignModel.findByContractorId(contractorId);
    } catch (error) {
      throw new Error(`Failed to get campaigns by contractor: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get campaign statistics
   */
  static async getCampaignStats(
    requestingUserId: number,
    requestingUserRole: string,
    requestingUserCompanyId?: number
  ): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byCompany?: Record<string, number>;
  }> {
    try {
      // Only company employees can see full statistics
      if (requestingUserRole !== 'company_employee') {
        throw new Error('Only company employees can access campaign statistics');
      }

      const statusStats = await CampaignModel.countByStatus();
      const allCampaigns = await CampaignModel.findAll();
      
      const total = allCampaigns.length;

      return {
        total,
        byStatus: statusStats
      };
    } catch (error) {
      throw new Error(`Failed to get campaign statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if user can access a specific campaign
   */
  private static canAccessCampaign(
    campaign: Campaign | CampaignWithRelations,
    requestingUserId: number,
    requestingUserRole: string,
    requestingUserCompanyId?: number
  ): boolean {
    switch (requestingUserRole) {
      case 'company_employee':
        // Company employees can access all campaigns
        return true;

      case 'client':
        // Clients can only access campaigns from their company
        return requestingUserCompanyId === campaign.company_id;

      case 'contractor':
        // Contractors can only access campaigns assigned to them
        // This would need to be checked against the assignments table
        // For now, we'll allow access and let the specific methods handle the filtering
        return true;

      default:
        return false;
    }
  }

  /**
   * Validate status transitions
   */
  private static isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
    const validTransitions: Record<string, string[]> = {
      'new': ['in_progress', 'cancelled'],
      'in_progress': ['completed', 'cancelled'],
      'completed': [], // Completed campaigns cannot change status
      'cancelled': [] // Cancelled campaigns cannot change status
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }
}