import { apiService } from './api';
import type { Company, CreateCompanyRequest, UpdateCompanyRequest } from '../types/company';

export class CompanyService {
  async getCompanies(filters?: { search?: string; limit?: number }): Promise<Company[]> {
    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/companies?${queryString}` : '/companies';
    
    const response = await apiService.get(url);
    return response.data.data;
  }

  async getCompany(id: number): Promise<Company> {
    const response = await apiService.get(`/companies/${id}`);
    return response.data.data;
  }

  async createCompany(companyData: CreateCompanyRequest): Promise<Company> {
    const response = await apiService.post('/companies', companyData);
    return response.data.data;
  }

  async updateCompany(id: number, companyData: UpdateCompanyRequest): Promise<Company> {
    const response = await apiService.put(`/companies/${id}`, companyData);
    return response.data.data;
  }

  async deleteCompany(id: number): Promise<void> {
    await apiService.delete(`/companies/${id}`);
  }

  async toggleCompanyStatus(id: number, isActive: boolean): Promise<Company> {
    const response = await apiService.put(`/companies/${id}`, { isActive });
    return response.data.data;
  }
}

export const companyService = new CompanyService();