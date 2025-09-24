import db from '../database/connection.js';
import { CompanyModel } from '../models/Company.js';
import { User, Company } from '../types/database.js';

export class CompanyUserService {
  /**
   * Assign user to company
   */
  static async assignUserToCompany(userId: number, companyId: number): Promise<boolean> {
    if (!userId || userId <= 0) {
      throw new Error('Invalid user ID');
    }

    if (!companyId || companyId <= 0) {
      throw new Error('Invalid company ID');
    }

    // Check if company exists and is active
    const company = await CompanyModel.findById(companyId);
    if (!company) {
      throw new Error('Company not found');
    }

    if (!company.is_active) {
      throw new Error('Cannot assign user to inactive company');
    }

    // Check if user exists
    const user = await db('users').where('id', userId).first();
    if (!user) {
      throw new Error('User not found');
    }

    // Update user's company assignment
    const updatedRows = await db('users')
      .where('id', userId)
      .update({
        company_id: companyId,
        updated_at: new Date()
      });

    return updatedRows > 0;
  }

  /**
   * Remove user from company
   */
  static async removeUserFromCompany(userId: number): Promise<boolean> {
    if (!userId || userId <= 0) {
      throw new Error('Invalid user ID');
    }

    // Check if user exists
    const user = await db('users').where('id', userId).first();
    if (!user) {
      throw new Error('User not found');
    }

    // Remove company assignment
    const updatedRows = await db('users')
      .where('id', userId)
      .update({
        company_id: null,
        updated_at: new Date()
      });

    return updatedRows > 0;
  }

  /**
   * Get all users for a company
   */
  static async getUsersByCompany(companyId: number): Promise<User[]> {
    if (!companyId || companyId <= 0) {
      throw new Error('Invalid company ID');
    }

    return db('users')
      .select('*')
      .where('company_id', companyId)
      .orderBy('first_name', 'asc');
  }

  /**
   * Get active users for a company
   */
  static async getActiveUsersByCompany(companyId: number): Promise<User[]> {
    if (!companyId || companyId <= 0) {
      throw new Error('Invalid company ID');
    }

    return db('users')
      .select('*')
      .where('company_id', companyId)
      .where('is_active', true)
      .orderBy('first_name', 'asc');
  }

  /**
   * Get users by role for a company
   */
  static async getUsersByCompanyAndRole(companyId: number, role: 'company_employee' | 'client' | 'contractor'): Promise<User[]> {
    if (!companyId || companyId <= 0) {
      throw new Error('Invalid company ID');
    }

    if (!role) {
      throw new Error('Role is required');
    }

    return db('users')
      .select('*')
      .where('company_id', companyId)
      .where('role', role)
      .where('is_active', true)
      .orderBy('first_name', 'asc');
  }

  /**
   * Get company for a user
   */
  static async getCompanyForUser(userId: number): Promise<Company | null> {
    if (!userId || userId <= 0) {
      throw new Error('Invalid user ID');
    }

    const user = await db('users')
      .select('company_id')
      .where('id', userId)
      .first();

    if (!user || !user.company_id) {
      return null;
    }

    return CompanyModel.findById(user.company_id);
  }

  /**
   * Transfer users from one company to another
   */
  static async transferUsers(fromCompanyId: number, toCompanyId: number, userIds?: number[]): Promise<number> {
    if (!fromCompanyId || fromCompanyId <= 0) {
      throw new Error('Invalid source company ID');
    }

    if (!toCompanyId || toCompanyId <= 0) {
      throw new Error('Invalid target company ID');
    }

    // Check if both companies exist
    const fromCompany = await CompanyModel.findById(fromCompanyId);
    const toCompany = await CompanyModel.findById(toCompanyId);

    if (!fromCompany) {
      throw new Error('Source company not found');
    }

    if (!toCompany) {
      throw new Error('Target company not found');
    }

    if (!toCompany.is_active) {
      throw new Error('Cannot transfer users to inactive company');
    }

    let query = db('users')
      .where('company_id', fromCompanyId);

    // If specific user IDs are provided, only transfer those users
    if (userIds && userIds.length > 0) {
      query = query.whereIn('id', userIds);
    }

    const updatedRows = await query.update({
      company_id: toCompanyId,
      updated_at: new Date()
    });

    return updatedRows;
  }

  /**
   * Get company statistics (user counts by role)
   */
  static async getCompanyStatistics(companyId: number): Promise<{
    total_users: number;
    active_users: number;
    company_employees: number;
    clients: number;
    contractors: number;
  }> {
    if (!companyId || companyId <= 0) {
      throw new Error('Invalid company ID');
    }

    const stats = await db('users')
      .select(
        db.raw('COUNT(*) as total_users'),
        db.raw('SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users'),
        db.raw('SUM(CASE WHEN role = "company_employee" AND is_active = 1 THEN 1 ELSE 0 END) as company_employees'),
        db.raw('SUM(CASE WHEN role = "client" AND is_active = 1 THEN 1 ELSE 0 END) as clients'),
        db.raw('SUM(CASE WHEN role = "contractor" AND is_active = 1 THEN 1 ELSE 0 END) as contractors')
      )
      .where('company_id', companyId)
      .first();

    return {
      total_users: parseInt(stats?.total_users || '0'),
      active_users: parseInt(stats?.active_users || '0'),
      company_employees: parseInt(stats?.company_employees || '0'),
      clients: parseInt(stats?.clients || '0'),
      contractors: parseInt(stats?.contractors || '0')
    };
  }

  /**
   * Validate user can be assigned to company based on role
   */
  static async validateUserCompanyAssignment(userId: number, companyId: number): Promise<{ valid: boolean; reason?: string }> {
    if (!userId || userId <= 0) {
      return { valid: false, reason: 'Invalid user ID' };
    }

    if (!companyId || companyId <= 0) {
      return { valid: false, reason: 'Invalid company ID' };
    }

    // Get user details
    const user = await db('users').where('id', userId).first();
    if (!user) {
      return { valid: false, reason: 'User not found' };
    }

    // Get company details
    const company = await CompanyModel.findById(companyId);
    if (!company) {
      return { valid: false, reason: 'Company not found' };
    }

    if (!company.is_active) {
      return { valid: false, reason: 'Company is not active' };
    }

    // Company employees can work for any company (they manage the system)
    if (user.role === 'company_employee') {
      return { valid: true };
    }

    // Clients and contractors should typically be assigned to specific companies
    // Additional business rules can be added here if needed

    return { valid: true };
  }
}