export interface User {
  id: number;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: 'company_employee' | 'client' | 'contractor';
  companyId?: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'company_employee' | 'client' | 'contractor';
  companyId?: number | null;
}

export interface UpdateUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: 'company_employee' | 'client' | 'contractor';
  companyId?: number | null;
  isActive?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthenticatedUser extends Omit<User, 'passwordHash'> {
  // User without password hash for safe transmission
  companyId?: number | null;
}