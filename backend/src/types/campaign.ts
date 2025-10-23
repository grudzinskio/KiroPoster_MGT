export interface Campaign {
  id: number;
  name: string;
  description?: string;
  company_id: number;
  status: 'new' | 'in_progress' | 'completed' | 'cancelled';
  start_date?: Date;
  end_date?: Date;
  completed_at?: Date | null;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCampaignData {
  name: string;
  description?: string;
  companyId: number;
  startDate?: Date;
  endDate?: Date;
  createdBy: number;
}

export interface UpdateCampaignData {
  name?: string;
  description?: string;
  companyId?: number;
  status?: 'new' | 'in_progress' | 'completed' | 'cancelled';
  startDate?: Date;
  endDate?: Date;
  completedAt?: Date | null;
}

export interface CampaignWithRelations extends Campaign {
  company?: {
    id: number;
    name: string;
    contact_email?: string;
  };
  created_by_user?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  assigned_contractors?: Array<{
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    assigned_at: Date;
  }>;
  images?: any[];
}

export interface CampaignAssignment {
  id: number;
  campaign_id: number;
  contractor_id: number;
  assigned_at: Date;
  assigned_by: number;
}

export interface CampaignFilters {
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
}

export interface CampaignProgress {
  totalImages: number;
  approvedImages: number;
  rejectedImages: number;
  pendingImages: number;
  progressPercentage: number;
  assignedContractors: number;
}

export interface PaginatedCampaignsResponse {
  campaigns: Campaign[];
  total: number;
  page: number;
  totalPages: number;
}