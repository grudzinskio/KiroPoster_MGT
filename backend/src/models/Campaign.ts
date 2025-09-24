import db from '../database/connection.js';
import { Campaign, CreateCampaignData, UpdateCampaignData, CampaignWithRelations } from '../types/campaign.js';

export class CampaignModel {
  private static readonly TABLE_NAME = 'campaigns';
  private static readonly ASSIGNMENTS_TABLE = 'campaign_assignments';

  /**
   * Find campaign by ID
   */
  static async findById(id: number): Promise<Campaign | null> {
    try {
      const campaign = await db(this.TABLE_NAME)
        .where({ id })
        .first();
      
      return campaign || null;
    } catch (error) {
      throw new Error(`Failed to find campaign by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find campaign by ID with relationships
   */
  static async findByIdWithRelations(id: number): Promise<CampaignWithRelations | null> {
    try {
      const campaign = await db(this.TABLE_NAME)
        .leftJoin('companies', 'campaigns.company_id', 'companies.id')
        .leftJoin('users as creator', 'campaigns.created_by', 'creator.id')
        .select(
          'campaigns.*',
          'companies.name as company_name',
          'companies.contact_email as company_contact_email',
          'creator.first_name as creator_first_name',
          'creator.last_name as creator_last_name'
        )
        .where('campaigns.id', id)
        .first();

      if (!campaign) {
        return null;
      }

      // Get assigned contractors
      const contractors = await db(this.ASSIGNMENTS_TABLE)
        .join('users', 'campaign_assignments.contractor_id', 'users.id')
        .select(
          'users.id',
          'users.email',
          'users.first_name',
          'users.last_name',
          'users.role',
          'campaign_assignments.assigned_at'
        )
        .where('campaign_assignments.campaign_id', id);

      return {
        ...campaign,
        company: campaign.company_name ? {
          id: campaign.company_id,
          name: campaign.company_name,
          contact_email: campaign.company_contact_email
        } : undefined,
        created_by_user: {
          id: campaign.created_by,
          first_name: campaign.creator_first_name,
          last_name: campaign.creator_last_name
        },
        assigned_contractors: contractors
      } as CampaignWithRelations;
    } catch (error) {
      throw new Error(`Failed to find campaign with relations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all campaigns with optional filtering
   */
  static async findAll(filters?: {
    status?: string;
    companyId?: number;
    createdBy?: number;
    assignedTo?: number;
    search?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Campaign[]> {
    try {
      let query = db(this.TABLE_NAME);

      if (filters?.status) {
        query = query.where('status', filters.status);
      }

      if (filters?.companyId) {
        query = query.where('company_id', filters.companyId);
      }

      if (filters?.createdBy) {
        query = query.where('created_by', filters.createdBy);
      }

      if (filters?.assignedTo) {
        query = query
          .join(this.ASSIGNMENTS_TABLE, 'campaigns.id', 'campaign_assignments.campaign_id')
          .where('campaign_assignments.contractor_id', filters.assignedTo);
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.where(function() {
          this.where('name', 'like', searchTerm)
            .orWhere('description', 'like', searchTerm);
        });
      }

      if (filters?.startDate) {
        query = query.where('start_date', '>=', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.where('end_date', '<=', filters.endDate);
      }

      return await query
        .select('campaigns.*')
        .distinct()
        .orderBy('campaigns.created_at', 'desc');
    } catch (error) {
      throw new Error(`Failed to fetch campaigns: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new campaign
   */
  static async create(campaignData: CreateCampaignData): Promise<Campaign> {
    try {
      const [campaignId] = await db(this.TABLE_NAME)
        .insert({
          name: campaignData.name,
          description: campaignData.description || null,
          company_id: campaignData.companyId,
          status: 'new',
          start_date: campaignData.startDate || null,
          end_date: campaignData.endDate || null,
          created_by: campaignData.createdBy,
          created_at: new Date(),
          updated_at: new Date()
        });

      const newCampaign = await this.findById(campaignId);
      if (!newCampaign) {
        throw new Error('Failed to retrieve created campaign');
      }

      return newCampaign;
    } catch (error) {
      throw new Error(`Failed to create campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update campaign by ID
   */
  static async update(id: number, updateData: UpdateCampaignData): Promise<Campaign | null> {
    try {
      const updateFields: any = {
        ...updateData,
        updated_at: new Date()
      };

      // Convert camelCase to snake_case for database
      if (updateFields.companyId !== undefined) {
        updateFields.company_id = updateFields.companyId;
        delete updateFields.companyId;
      }
      if (updateFields.startDate !== undefined) {
        updateFields.start_date = updateFields.startDate;
        delete updateFields.startDate;
      }
      if (updateFields.endDate !== undefined) {
        updateFields.end_date = updateFields.endDate;
        delete updateFields.endDate;
      }
      if (updateFields.completedAt !== undefined) {
        updateFields.completed_at = updateFields.completedAt;
        delete updateFields.completedAt;
      }

      const affectedRows = await db(this.TABLE_NAME)
        .where({ id })
        .update(updateFields);

      if (affectedRows === 0) {
        return null;
      }

      return await this.findById(id);
    } catch (error) {
      throw new Error(`Failed to update campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete campaign by ID
   */
  static async delete(id: number): Promise<boolean> {
    try {
      const affectedRows = await db(this.TABLE_NAME)
        .where({ id })
        .del();

      return affectedRows > 0;
    } catch (error) {
      throw new Error(`Failed to delete campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update campaign status
   */
  static async updateStatus(id: number, status: 'new' | 'in_progress' | 'completed' | 'cancelled'): Promise<Campaign | null> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date()
      };

      // Set completed_at when status changes to completed
      if (status === 'completed') {
        updateData.completed_at = new Date();
      }

      const affectedRows = await db(this.TABLE_NAME)
        .where({ id })
        .update(updateData);

      if (affectedRows === 0) {
        return null;
      }

      return await this.findById(id);
    } catch (error) {
      throw new Error(`Failed to update campaign status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Assign contractor to campaign
   */
  static async assignContractor(campaignId: number, contractorId: number, assignedBy: number): Promise<boolean> {
    try {
      await db(this.ASSIGNMENTS_TABLE)
        .insert({
          campaign_id: campaignId,
          contractor_id: contractorId,
          assigned_by: assignedBy,
          assigned_at: new Date()
        });

      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Duplicate entry')) {
        throw new Error('Contractor is already assigned to this campaign');
      }
      throw new Error(`Failed to assign contractor: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove contractor assignment from campaign
   */
  static async removeContractorAssignment(campaignId: number, contractorId: number): Promise<boolean> {
    try {
      const affectedRows = await db(this.ASSIGNMENTS_TABLE)
        .where({
          campaign_id: campaignId,
          contractor_id: contractorId
        })
        .del();

      return affectedRows > 0;
    } catch (error) {
      throw new Error(`Failed to remove contractor assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get assigned contractors for a campaign
   */
  static async getAssignedContractors(campaignId: number): Promise<any[]> {
    try {
      return await db(this.ASSIGNMENTS_TABLE)
        .join('users', 'campaign_assignments.contractor_id', 'users.id')
        .select(
          'users.id',
          'users.email',
          'users.first_name',
          'users.last_name',
          'campaign_assignments.assigned_at',
          'campaign_assignments.assigned_by'
        )
        .where('campaign_assignments.campaign_id', campaignId);
    } catch (error) {
      throw new Error(`Failed to get assigned contractors: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get campaigns by company ID
   */
  static async findByCompanyId(companyId: number): Promise<Campaign[]> {
    try {
      return await db(this.TABLE_NAME)
        .where({ company_id: companyId })
        .orderBy('created_at', 'desc');
    } catch (error) {
      throw new Error(`Failed to find campaigns by company ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get campaigns assigned to a contractor
   */
  static async findByContractorId(contractorId: number): Promise<Campaign[]> {
    try {
      return await db(this.TABLE_NAME)
        .join(this.ASSIGNMENTS_TABLE, 'campaigns.id', 'campaign_assignments.campaign_id')
        .where('campaign_assignments.contractor_id', contractorId)
        .select('campaigns.*')
        .orderBy('campaigns.created_at', 'desc');
    } catch (error) {
      throw new Error(`Failed to find campaigns by contractor ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Count campaigns by status
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
      throw new Error(`Failed to count campaigns by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}