import apiService from './api';
import type { 
  Campaign, 
  CreateCampaignRequest, 
  UpdateCampaignRequest, 
  CampaignFilters,
  CampaignsResponse,
  CampaignResponse,
  CampaignStatsResponse,
  CampaignProgressResponse,
  AssignContractorRequest
} from '../types/campaign';

class CampaignService {
  async getCampaigns(filters?: CampaignFilters): Promise<{ campaigns: Campaign[]; pagination?: CampaignsResponse['pagination'] }> {
    const params = new URLSearchParams();
    
    if (filters?.status) params.append('status', filters.status);
    if (filters?.companyId && typeof filters.companyId === 'number') params.append('companyId', filters.companyId.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/campaigns?${queryString}` : '/campaigns';
    
    const response = await apiService.get(url);
    const data: CampaignsResponse = response.data;
    return {
      campaigns: data.data,
      pagination: data.pagination
    };
  }

  async getCampaignById(id: number): Promise<Campaign> {
    const response = await apiService.get(`/campaigns/${id}`);
    const data: CampaignResponse = response.data;
    return data.data;
  }

  async createCampaign(campaignData: CreateCampaignRequest): Promise<Campaign> {
    const response = await apiService.post('/campaigns', campaignData);
    const data: CampaignResponse = response.data;
    return data.data;
  }

  async updateCampaign(id: number, campaignData: UpdateCampaignRequest): Promise<Campaign> {
    const response = await apiService.put(`/campaigns/${id}`, campaignData);
    const data: CampaignResponse = response.data;
    return data.data;
  }

  async deleteCampaign(id: number): Promise<void> {
    await apiService.delete(`/campaigns/${id}`);
  }

  async updateCampaignStatus(id: number, status: Campaign['status']): Promise<Campaign> {
    const response = await apiService.put(`/campaigns/${id}/status`, { status });
    const data: CampaignResponse = response.data;
    return data.data;
  }

  async getCampaignStats(): Promise<CampaignStatsResponse['data']> {
    const response = await apiService.get('/campaigns/stats');
    const data: CampaignStatsResponse = response.data;
    return data.data;
  }

  async assignContractor(campaignId: number, contractorId: number): Promise<void> {
    const assignmentData: AssignContractorRequest = { contractorId };
    await apiService.post(`/campaigns/${campaignId}/contractors`, assignmentData);
  }

  async removeContractorAssignment(campaignId: number, contractorId: number): Promise<void> {
    await apiService.delete(`/campaigns/${campaignId}/contractors/${contractorId}`);
  }

  async getAssignedContractors(campaignId: number): Promise<Campaign['assignedContractors']> {
    const response = await apiService.get(`/campaigns/${campaignId}/contractors`);
    return response.data.data;
  }

  async getCampaignsByCompany(companyId: number): Promise<Campaign[]> {
    const response = await apiService.get(`/campaigns/company/${companyId}`);
    const data: CampaignsResponse = response.data;
    return data.data;
  }

  async getCampaignsByContractor(contractorId: number): Promise<Campaign[]> {
    const response = await apiService.get(`/campaigns/contractor/${contractorId}`);
    const data: CampaignsResponse = response.data;
    return data.data;
  }

  async getCampaignProgress(campaignId: number): Promise<CampaignProgressResponse['data']> {
    const response = await apiService.get(`/campaigns/${campaignId}/progress`);
    const data: CampaignProgressResponse = response.data;
    return data.data;
  }
}

export const campaignService = new CampaignService();
export default campaignService;