export interface Company {
  id: number;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyRequest {
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
}

export interface UpdateCompanyRequest {
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  isActive?: boolean;
}

export interface CompanyFilters {
  search?: string;
  isActive?: boolean | '';
}

export interface CompaniesResponse {
  success: boolean;
  data: Company[];
}

export interface CompanyResponse {
  success: boolean;
  data: Company;
}