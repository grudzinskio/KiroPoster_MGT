import { apiService } from './api';
import type { User, CreateUserRequest, UpdateUserRequest } from '../types/user';

export class UserService {
  async getUsers(filters?: { search?: string; limit?: number }): Promise<User[]> {
    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/users?${queryString}` : '/users';
    
    const response = await apiService.get(url);
    return response.data.data;
  }

  async getUser(id: number): Promise<User> {
    const response = await apiService.get(`/users/${id}`);
    return response.data.data;
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    const response = await apiService.post('/users', userData);
    return response.data.data;
  }

  async updateUser(id: number, userData: UpdateUserRequest): Promise<User> {
    const response = await apiService.put(`/users/${id}`, userData);
    return response.data.data;
  }

  async deleteUser(id: number): Promise<void> {
    await apiService.delete(`/users/${id}`);
  }

  async toggleUserStatus(id: number, isActive: boolean): Promise<User> {
    const response = await apiService.put(`/users/${id}`, { isActive });
    return response.data.data;
  }
}

export const userService = new UserService();