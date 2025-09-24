import db from '../database/connection.js';
import { Company } from '../types/database.js';

export class CompanyModel {
  private static readonly tableName = 'companies';

  /**
   * Get all companies
   */
  static async findAll(): Promise<Company[]> {
    return db(this.tableName)
      .select('*')
      .orderBy('name', 'asc');
  }

  /**
   * Get active companies only
   */
  static async findActive(): Promise<Company[]> {
    return db(this.tableName)
      .select('*')
      .where('is_active', true)
      .orderBy('name', 'asc');
  }

  /**
   * Find company by ID
   */
  static async findById(id: number): Promise<Company | null> {
    const company = await db(this.tableName)
      .select('*')
      .where('id', id)
      .first();
    
    return company || null;
  }

  /**
   * Find company by name
   */
  static async findByName(name: string): Promise<Company | null> {
    const company = await db(this.tableName)
      .select('*')
      .where('name', name)
      .first();
    
    return company || null;
  }

  /**
   * Create a new company
   */
  static async create(companyData: Omit<Company, 'id' | 'created_at' | 'updated_at'>): Promise<Company> {
    const [id] = await db(this.tableName)
      .insert({
        ...companyData,
        created_at: new Date(),
        updated_at: new Date()
      });

    const company = await this.findById(id);
    if (!company) {
      throw new Error('Failed to create company');
    }
    
    return company;
  }

  /**
   * Update company by ID
   */
  static async update(id: number, updates: Partial<Omit<Company, 'id' | 'created_at' | 'updated_at'>>): Promise<Company | null> {
    const updateData = {
      ...updates,
      updated_at: new Date()
    };

    const updatedRows = await db(this.tableName)
      .where('id', id)
      .update(updateData);

    if (updatedRows === 0) {
      return null;
    }

    return this.findById(id);
  }

  /**
   * Delete company by ID (soft delete by setting is_active to false)
   */
  static async softDelete(id: number): Promise<boolean> {
    const updatedRows = await db(this.tableName)
      .where('id', id)
      .update({
        is_active: false,
        updated_at: new Date()
      });

    return updatedRows > 0;
  }

  /**
   * Hard delete company by ID
   */
  static async delete(id: number): Promise<boolean> {
    const deletedRows = await db(this.tableName)
      .where('id', id)
      .del();

    return deletedRows > 0;
  }

  /**
   * Get companies with user count
   */
  static async findAllWithUserCount(): Promise<(Company & { user_count: number })[]> {
    return db(this.tableName)
      .select(
        'companies.*',
        db.raw('COUNT(users.id) as user_count')
      )
      .leftJoin('users', 'companies.id', 'users.company_id')
      .groupBy('companies.id')
      .orderBy('companies.name', 'asc');
  }

  /**
   * Get company with its users
   */
  static async findByIdWithUsers(id: number): Promise<Company & { users: any[] } | null> {
    const company = await this.findById(id);
    if (!company) {
      return null;
    }

    const users = await db('users')
      .select('id', 'email', 'first_name', 'last_name', 'role', 'is_active', 'created_at')
      .where('company_id', id)
      .orderBy('first_name', 'asc');

    return {
      ...company,
      users
    };
  }

  /**
   * Check if company exists
   */
  static async exists(id: number): Promise<boolean> {
    const count = await db(this.tableName)
      .where('id', id)
      .count('id as count')
      .first();

    return (count?.count as number) > 0;
  }

  /**
   * Check if company name is unique (excluding specific ID for updates)
   */
  static async isNameUnique(name: string, excludeId?: number): Promise<boolean> {
    let query = db(this.tableName)
      .where('name', name);

    if (excludeId) {
      query = query.whereNot('id', excludeId);
    }

    const count = await query.count('id as count').first();
    return (count?.count as number) === 0;
  }
}