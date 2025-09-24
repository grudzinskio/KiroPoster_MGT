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

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
    refreshToken: string;
  };
}

export interface RefreshResponse {
  success: boolean;
  data: {
    token: string;
    refreshToken: string;
  };
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}