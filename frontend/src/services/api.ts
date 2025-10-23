import axios from 'axios';
import type { AuthResponse, LoginCredentials, RefreshResponse } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiService {
  private api: any;
  private refreshTokenPromise: Promise<string> | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config: any) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: any) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh and errors
    this.api.interceptors.response.use(
      (response: any) => response,
      async (error: any) => {
        const originalRequest = error.config;

        // Handle 401 errors with token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.handleTokenRefresh();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.api(originalRequest);
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        // Handle network errors
        if (!error.response) {
          error.isNetworkError = true;
          error.userMessage = 'Network error. Please check your connection and try again.';
        }

        // Handle server errors
        if (error.response?.status >= 500) {
          error.userMessage = 'Server error. Please try again later.';
        }

        // Handle rate limiting
        if (error.response?.status === 429) {
          error.userMessage = 'Too many requests. Please wait a moment and try again.';
        }

        return Promise.reject(error);
      }
    );
  }

  private async handleTokenRefresh(): Promise<string> {
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    this.refreshTokenPromise = this.refreshTokenInternal();
    
    try {
      const token = await this.refreshTokenPromise;
      return token;
    } finally {
      this.refreshTokenPromise = null;
    }
  }

  private async refreshTokenInternal(): Promise<string> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response: any = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken }
    );

    const { token, refreshToken: newRefreshToken } = response.data.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', newRefreshToken);
    
    return token;
  }

  private clearTokens() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  // Auth methods
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response: any = await this.api.post('/auth/login', credentials);
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      this.clearTokens();
    }
  }

  async refreshToken(): Promise<RefreshResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response: any = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken }
    );
    
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.api.get('/auth/me');
    return response.data;
  }

  // Generic API methods
  get(url: string) {
    return this.api.get(url);
  }

  post(url: string, data?: any) {
    return this.api.post(url, data);
  }

  put(url: string, data?: unknown) {
    return this.api.put(url, data);
  }

  delete(url: string) {
    return this.api.delete(url);
  }
}

export const apiService = new ApiService();
export default apiService;