export interface User {
  id: number;
  username: string;
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
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'company_employee' | 'client' | 'contractor';
  companyId?: number | null;
}

export interface UpdateUserData {
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: 'company_employee' | 'client' | 'contractor';
  companyId?: number | null;
  isActive?: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthenticatedUser extends Omit<User, 'passwordHash'> {
  // User without password hash for safe transmission
  companyId?: number | null;
}