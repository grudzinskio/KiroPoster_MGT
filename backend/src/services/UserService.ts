import { UserModel } from '../models/User.js';
import { User, CreateUserData, UpdateUserData, AuthenticatedUser, LoginCredentials } from '../types/user.js';
import { comparePassword } from '../utils/password.js';
import { generateTokenPair, TokenPair } from '../utils/jwt.js';

export class UserService {
  /**
   * Authenticate user with email and password
   */
  static async authenticate(credentials: LoginCredentials): Promise<{ user: AuthenticatedUser; tokens: TokenPair } | null> {
    try {
      const user = await UserModel.findByEmail(credentials.email);
      
      if (!user || !user.isActive) {
        return null;
      }

      const isPasswordValid = await comparePassword(credentials.password, user.passwordHash);
      
      if (!isPasswordValid) {
        return null;
      }

      const tokens = generateTokenPair(user);
      const authenticatedUser = UserModel.toAuthenticatedUser(user);

      return {
        user: authenticatedUser,
        tokens
      };
    } catch (error) {
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user by ID (without password hash)
   */
  static async getUserById(id: number): Promise<AuthenticatedUser | null> {
    try {
      const user = await UserModel.findById(id);
      
      if (!user) {
        return null;
      }

      return UserModel.toAuthenticatedUser(user);
    } catch (error) {
      throw new Error(`Failed to get user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user by email (without password hash)
   */
  static async getUserByEmail(email: string): Promise<AuthenticatedUser | null> {
    try {
      const user = await UserModel.findByEmail(email);
      
      if (!user) {
        return null;
      }

      return UserModel.toAuthenticatedUser(user);
    } catch (error) {
      throw new Error(`Failed to get user by email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all users with filtering options
   */
  static async getAllUsers(filters?: {
    role?: string;
    companyId?: number;
    isActive?: boolean;
    search?: string;
  }): Promise<AuthenticatedUser[]> {
    try {
      const users = await UserModel.findAll(filters);
      return users.map(user => UserModel.toAuthenticatedUser(user));
    } catch (error) {
      throw new Error(`Failed to get users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new user
   */
  static async createUser(userData: CreateUserData): Promise<AuthenticatedUser> {
    try {
      // Validate that email is not already in use
      const existingUser = await UserModel.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('Email address is already in use');
      }

      // For client and contractor roles, companyId is required
      if ((userData.role === 'client' || userData.role === 'contractor') && !userData.companyId) {
        throw new Error(`Company ID is required for ${userData.role} role`);
      }

      // Company employees should not have a companyId
      if (userData.role === 'company_employee' && userData.companyId) {
        throw new Error('Company employees should not be associated with a specific company');
      }

      const user = await UserModel.create(userData);
      return UserModel.toAuthenticatedUser(user);
    } catch (error) {
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user by ID
   */
  static async updateUser(id: number, updateData: UpdateUserData, requestingUserId: number, requestingUserRole: string): Promise<AuthenticatedUser | null> {
    try {
      const existingUser = await UserModel.findById(id);
      if (!existingUser) {
        return null;
      }

      // Authorization checks
      if (requestingUserRole !== 'company_employee' && requestingUserId !== id) {
        throw new Error('Insufficient permissions to update this user');
      }

      // Non-company employees can only update their own basic info
      if (requestingUserRole !== 'company_employee' && requestingUserId === id) {
        const allowedFields = ['firstName', 'lastName'];
        const hasDisallowedFields = Object.keys(updateData).some(key => !allowedFields.includes(key));
        
        if (hasDisallowedFields) {
          throw new Error('You can only update your first name and last name');
        }
      }

      // Validate email uniqueness if email is being updated
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailExists = await UserModel.findByEmail(updateData.email);
        if (emailExists) {
          throw new Error('Email address is already in use');
        }
      }

      // Validate role and company relationship
      if (updateData.role || updateData.companyId !== undefined) {
        const newRole = updateData.role || existingUser.role;
        const newCompanyId = updateData.companyId !== undefined ? updateData.companyId : existingUser.companyId;

        if ((newRole === 'client' || newRole === 'contractor') && !newCompanyId) {
          throw new Error(`Company ID is required for ${newRole} role`);
        }

        if (newRole === 'company_employee' && newCompanyId) {
          throw new Error('Company employees should not be associated with a specific company');
        }
      }

      const updatedUser = await UserModel.update(id, updateData);
      
      if (!updatedUser) {
        return null;
      }

      return UserModel.toAuthenticatedUser(updatedUser);
    } catch (error) {
      throw new Error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete user by ID (soft delete)
   */
  static async deleteUser(id: number, requestingUserRole: string): Promise<boolean> {
    try {
      // Only company employees can delete users
      if (requestingUserRole !== 'company_employee') {
        throw new Error('Insufficient permissions to delete users');
      }

      const user = await UserModel.findById(id);
      if (!user) {
        return false;
      }

      return await UserModel.delete(id);
    } catch (error) {
      throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Change user password
   */
  static async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const isCurrentPasswordValid = await comparePassword(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      return await UserModel.updatePassword(userId, newPassword);
    } catch (error) {
      throw new Error(`Failed to change password: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get users by company ID
   */
  static async getUsersByCompanyId(companyId: number): Promise<AuthenticatedUser[]> {
    try {
      const users = await UserModel.findByCompanyId(companyId);
      return users.map(user => UserModel.toAuthenticatedUser(user));
    } catch (error) {
      throw new Error(`Failed to get users by company: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(): Promise<{
    total: number;
    byRole: Record<string, number>;
    active: number;
    inactive: number;
  }> {
    try {
      const allUsers = await UserModel.findAll();
      const roleStats = await UserModel.countByRole();
      
      const total = allUsers.length;
      const active = allUsers.filter(user => user.isActive).length;
      const inactive = total - active;

      return {
        total,
        byRole: roleStats,
        active,
        inactive
      };
    } catch (error) {
      throw new Error(`Failed to get user statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Activate or deactivate user
   */
  static async toggleUserStatus(id: number, isActive: boolean, requestingUserRole: string): Promise<AuthenticatedUser | null> {
    try {
      // Only company employees can change user status
      if (requestingUserRole !== 'company_employee') {
        throw new Error('Insufficient permissions to change user status');
      }

      const updatedUser = await UserModel.update(id, { isActive });
      
      if (!updatedUser) {
        return null;
      }

      return UserModel.toAuthenticatedUser(updatedUser);
    } catch (error) {
      throw new Error(`Failed to toggle user status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}