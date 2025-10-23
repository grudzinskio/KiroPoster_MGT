import db from '../database/connection.js';
import { User, CreateUserData, UpdateUserData, AuthenticatedUser } from '../types/user.js';
import { hashPassword } from '../utils/password.js';

export class UserModel {
  private static readonly TABLE_NAME = 'users';

  /**
   * Find user by ID
   */
  static async findById(id: number): Promise<User | null> {
    try {
      const user = await db(this.TABLE_NAME)
        .where({ id })
        .first();
      
      return user || null;
    } catch (error) {
      throw new Error(`Failed to find user by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find user by username
   */
  static async findByUsername(username: string): Promise<User | null> {
    try {
      const user = await db(this.TABLE_NAME)
        .where({ username: username.toLowerCase() })
        .first();
      
      return user || null;
    } catch (error) {
      throw new Error(`Failed to find user by username: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all users with optional filtering
   */
  static async findAll(filters?: {
    role?: string;
    companyId?: number;
    isActive?: boolean;
    search?: string;
  }): Promise<User[]> {
    try {
      let query = db(this.TABLE_NAME);

      if (filters?.role) {
        query = query.where('role', filters.role);
      }

      if (filters?.companyId !== undefined) {
        query = query.where('companyId', filters.companyId);
      }

      if (filters?.isActive !== undefined) {
        query = query.where('isActive', filters.isActive);
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.where(function() {
          this.where('firstName', 'like', searchTerm)
            .orWhere('lastName', 'like', searchTerm)
            .orWhere('username', 'like', searchTerm);
        });
      }

      return await query.orderBy('createdAt', 'desc');
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new user
   */
  static async create(userData: CreateUserData): Promise<User> {
    try {
      const hashedPassword = await hashPassword(userData.password);
      
      const [userId] = await db(this.TABLE_NAME)
        .insert({
          username: userData.username.toLowerCase(),
          passwordHash: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          companyId: userData.companyId || null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });

      const newUser = await this.findById(userId);
      if (!newUser) {
        throw new Error('Failed to retrieve created user');
      }

      return newUser;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Duplicate entry')) {
        throw new Error('Username is already in use');
      }
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user by ID
   */
  static async update(id: number, updateData: UpdateUserData): Promise<User | null> {
    try {
      const updateFields: any = {
        ...updateData,
        updatedAt: new Date()
      };

      // Convert username to lowercase if provided
      if (updateFields.username) {
        updateFields.username = updateFields.username.toLowerCase();
      }

      const affectedRows = await db(this.TABLE_NAME)
        .where({ id })
        .update(updateFields);

      if (affectedRows === 0) {
        return null;
      }

      return await this.findById(id);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Duplicate entry')) {
        throw new Error('Username is already in use');
      }
      throw new Error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete user by ID (soft delete by setting isActive to false)
   */
  static async delete(id: number): Promise<boolean> {
    try {
      const affectedRows = await db(this.TABLE_NAME)
        .where({ id })
        .update({
          isActive: false,
          updatedAt: new Date()
        });

      return affectedRows > 0;
    } catch (error) {
      throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Hard delete user by ID (permanent deletion)
   */
  static async hardDelete(id: number): Promise<boolean> {
    try {
      const affectedRows = await db(this.TABLE_NAME)
        .where({ id })
        .del();

      return affectedRows > 0;
    } catch (error) {
      throw new Error(`Failed to permanently delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user password
   */
  static async updatePassword(id: number, newPassword: string): Promise<boolean> {
    try {
      const hashedPassword = await hashPassword(newPassword);
      
      const affectedRows = await db(this.TABLE_NAME)
        .where({ id })
        .update({
          passwordHash: hashedPassword,
          updatedAt: new Date()
        });

      return affectedRows > 0;
    } catch (error) {
      throw new Error(`Failed to update password: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get users by company ID
   */
  static async findByCompanyId(companyId: number): Promise<User[]> {
    try {
      return await db(this.TABLE_NAME)
        .where({ companyId })
        .orderBy('createdAt', 'desc');
    } catch (error) {
      throw new Error(`Failed to find users by company ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Count users by role
   */
  static async countByRole(): Promise<Record<string, number>> {
    try {
      const counts = await db(this.TABLE_NAME)
        .select('role')
        .count('* as count')
        .where('isActive', true)
        .groupBy('role');

      const result = counts.reduce((acc, item: any) => {
        acc[item.role] = Number(item.count);
        return acc;
      }, {} as any);
      
      return result as Record<string, number>;
    } catch (error) {
      throw new Error(`Failed to count users by role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert User to AuthenticatedUser (removes password hash)
   */
  static toAuthenticatedUser(user: User): AuthenticatedUser {
    const { passwordHash, ...authenticatedUser } = user;
    return authenticatedUser;
  }
}