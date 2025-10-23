export interface Campaign {
  id: number;
  name: string;
  description?: string;
  companyId: number;
  status: 'new' | 'in_progress' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
  completedAt?: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  company?: {
    id: number;
    name: string;
    contactEmail?: string;
  };
  createdByUser?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  assignedContractors?: Array<{
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    assignedAt: string;
  }>;
  images?: Array<{
    id: number;
    campaignId: number;
    uploadedBy: number;
    filename: string;
    originalFilename: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
    reviewedBy?: number;
    reviewedAt?: string;
    uploadedAt: string;
    uploader?: {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
    };
    reviewer?: {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  companyId: number;
  startDate?: string;
  endDate?: string;
}

export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  companyId?: number;
  status?: 'new' | 'in_progress' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
}

export interface CampaignFilters {
  status?: string;
  companyId?: number | '';
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CampaignAssignment {
  id: number;
  campaignId: number;
  contractorId: number;
  assignedAt: string;
  assignedBy: number;
}

export interface CampaignsResponse {
  success: boolean;
  data: Campaign[];
  pagination?: {
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  };
}

export interface CampaignResponse {
  success: boolean;
  data: Campaign;
}

export interface CampaignStatsResponse {
  success: boolean;
  data: {
    total: number;
    new: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
}

export interface CampaignProgressResponse {
  success: boolean;
  data: {
    totalImages: number;
    approvedImages: number;
    rejectedImages: number;
    pendingImages: number;
    progressPercentage: number;
    assignedContractors: number;
  };
}

export interface AssignContractorRequest {
  contractorId: number;
}