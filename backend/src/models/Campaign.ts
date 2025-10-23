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
   * Get all campaigns with optional filtering, sorting, and pagination
   */
  static async findAll(filters?: {
    status?: string;
    companyId?: number;
    createdBy?: number;
    assignedTo?: number;
    search?: string;
    startDate?: Date;
    endDate?: Date;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{ campaigns: Campaign[]; total: number; page: number; totalPages: number }> {
    try {
      let query = db(this.TABLE_NAME)
        .leftJoin('companies', 'campaigns.company_id', 'companies.id');

      // Apply filters
      if (filters?.status) {
        query = query.where('campaigns.status', filters.status);
      }

      if (filters?.companyId) {
        query = query.where('campaigns.company_id', filters.companyId);
      }

      if (filters?.createdBy) {
        query = query.where('campaigns.created_by', filters.createdBy);
      }

      if (filters?.assignedTo) {
        query = query
          .join(this.ASSIGNMENTS_TABLE, 'campaigns.id', 'campaign_assignments.campaign_id')
          .where('campaign_assignments.contractor_id', filters.assignedTo);
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.where(function() {
          this.where('campaigns.name', 'like', searchTerm)
            .orWhere('campaigns.description', 'like', searchTerm)
            .orWhere('companies.name', 'like', searchTerm);
        });
      }

      if (filters?.startDate) {
        query = query.where('campaigns.start_date', '>=', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.where('campaigns.end_date', '<=', filters.endDate);
      }

      // Get total count for pagination
      const countQuery = query.clone().clearSelect().count('campaigns.id as total').first();
      const { total } = await countQuery as any;

      // Apply sorting
      const sortBy = filters?.sortBy || 'created_at';
      const sortOrder = filters?.sortOrder || 'desc';
      const validSortFields = ['name', 'status', 'start_date', 'end_date', 'created_at', 'updated_at'];
      const sortField = validSortFields.includes(sortBy) ? `campaigns.${sortBy}` : 'campaigns.created_at';
      
      query = query.orderBy(sortField, sortOrder);

      // Apply pagination
      const page = Math.max(1, filters?.page || 1);
      const limit = Math.min(100, Math.max(1, filters?.limit || 20)); // Max 100 items per page
      const offset = (page - 1) * limit;

      const campaigns = await query
        .select('campaigns.*', 'companies.name as company_name')
        .distinct()
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(total / limit);

      return {
        campaigns: campaigns.map(campaign => ({
          ...campaign,
          company: campaign.company_name ? {
            id: campaign.company_id,
            name: campaign.company_name
          } : undefined
        })),
        total: Number(total),
        page,
        totalPages
      };
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

  /**
   * Get campaign progress statistics
   */
  static async getCampaignProgress(campaignId: number): Promise<{
    totalImages: number;
    approvedImages: number;
    rejectedImages: number;
    pendingImages: number;
    progressPercentage: number;
    assignedContractors: number;
  }> {
    try {
      // Get image statistics
      const imageStats = await db('images')
        .select('status')
        .count('* as count')
        .where('campaign_id', campaignId)
        .groupBy('status');

      const stats = {
        totalImages: 0,
        approvedImages: 0,
        rejectedImages: 0,
        pendingImages: 0,
        progressPercentage: 0,
        assignedContractors: 0
      };

      imageStats.forEach((stat: any) => {
        const count = Number(stat.count);
        stats.totalImages += count;
        
        switch (stat.status) {
          case 'approved':
            stats.approvedImages = count;
            break;
          case 'rejected':
            stats.rejectedImages = count;
            break;
          case 'pending':
            stats.pendingImages = count;
            break;
        }
      });

      // Calculate progress percentage (approved images / total images)
      if (stats.totalImages > 0) {
        stats.progressPercentage = Math.round((stats.approvedImages / stats.totalImages) * 100);
      }

      // Get assigned contractors count
      const contractorCount = await db(this.ASSIGNMENTS_TABLE)
        .count('* as count')
        .where('campaign_id', campaignId)
        .first();

      stats.assignedContractors = Number(contractorCount?.count || 0);

      return stats;
    } catch (error) {
      throw new Error(`Failed to get campaign progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get campaigns that should be hidden from clients (completed > 1 month ago)
   */
  static async getExpiredCampaignsForClients(): Promise<Campaign[]> {
    try {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      return await db(this.TABLE_NAME)
        .where('status', 'completed')
        .where('completed_at', '<', oneMonthAgo)
        .orderBy('completed_at', 'desc');
    } catch (error) {
      throw new Error(`Failed to get expired campaigns: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get campaigns visible to clients (not completed or completed within last month)
   */
  static async findVisibleToClients(companyId: number, filters?: {
    status?: string;
    search?: string;
    startDate?: Date;
    endDate?: Date;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{ campaigns: Campaign[]; total: number; page: number; totalPages: number }> {
    try {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      let query = db(this.TABLE_NAME)
        .leftJoin('companies', 'campaigns.company_id', 'companies.id')
        .where('campaigns.company_id', companyId)
        .where(function() {
          // Show campaigns that are not completed OR completed within the last month
          this.where('campaigns.status', '!=', 'completed')
            .orWhere(function() {
              this.where('campaigns.status', 'completed')
                .where('campaigns.completed_at', '>=', oneMonthAgo);
            });
        });

      // Apply additional filters
      if (filters?.status && filters.status !== 'completed') {
        query = query.where('campaigns.status', filters.status);
      } else if (filters?.status === 'completed') {
        // For completed filter, only show those within the last month
        query = query.where('campaigns.status', 'completed')
          .where('campaigns.completed_at', '>=', oneMonthAgo);
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.where(function() {
          this.where('campaigns.name', 'like', searchTerm)
            .orWhere('campaigns.description', 'like', searchTerm);
        });
      }

      if (filters?.startDate) {
        query = query.where('campaigns.start_date', '>=', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.where('campaigns.end_date', '<=', filters.endDate);
      }

      // Get total count
      const countQuery = query.clone().clearSelect().count('campaigns.id as total').first();
      const { total } = await countQuery as any;

      // Apply sorting
      const sortBy = filters?.sortBy || 'created_at';
      const sortOrder = filters?.sortOrder || 'desc';
      const validSortFields = ['name', 'status', 'start_date', 'end_date', 'created_at', 'updated_at'];
      const sortField = validSortFields.includes(sortBy) ? `campaigns.${sortBy}` : 'campaigns.created_at';
      
      query = query.orderBy(sortField, sortOrder);

      // Apply pagination
      const page = Math.max(1, filters?.page || 1);
      const limit = Math.min(100, Math.max(1, filters?.limit || 20));
      const offset = (page - 1) * limit;

      const campaigns = await query
        .select('campaigns.*', 'companies.name as company_name')
        .distinct()
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(total / limit);

      return {
        campaigns: campaigns.map(campaign => ({
          ...campaign,
          company: campaign.company_name ? {
            id: campaign.company_id,
            name: campaign.company_name
          } : undefined
        })),
        total: Number(total),
        page,
        totalPages
      };
    } catch (error) {
      throw new Error(`Failed to fetch client-visible campaigns: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}