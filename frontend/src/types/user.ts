export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'company_employee' | 'client' | 'contractor';
  companyId?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'company_employee' | 'client' | 'contractor';
  companyId?: number;
}

export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: 'company_employee' | 'client' | 'contractor';
  companyId?: number;
  isActive?: boolean;
}

export interface UserFilters {
  search?: string;
  role?: 'company_employee' | 'client' | 'contractor' | '';
  isActive?: boolean | '';
  companyId?: number | '';
}

export interface UsersResponse {
  success: boolean;
  data: User[];
}

export interface UserResponse {
  success: boolean;
  data: User;
}