import { CompanyModel } from '../models/Company.js';
import { Company } from '../types/database.js';

export interface CreateCompanyData {
  name: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  is_active?: boolean;
}

export interface UpdateCompanyData {
  name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  is_active?: boolean;
}

export class CompanyService {
  /**
   * Get all companies
   */
  static async getAllCompanies(): Promise<Company[]> {
    return CompanyModel.findAll();
  }

  /**
   * Get active companies only
   */
  static async getActiveCompanies(): Promise<Company[]> {
    return CompanyModel.findActive();
  }

  /**
   * Get companies with user count for dashboard/listing
   */
  static async getCompaniesWithUserCount(): Promise<(Company & { user_count: number })[]> {
    return CompanyModel.findAllWithUserCount();
  }

  /**
   * Get company by ID
   */
  static async getCompanyById(id: number): Promise<Company | null> {
    if (!id || id <= 0) {
      throw new Error('Invalid company ID');
    }

    return CompanyModel.findById(id);
  }

  /**
   * Get company by ID with associated users
   */
  static async getCompanyByIdWithUsers(id: number): Promise<Company & { users: any[] } | null> {
    if (!id || id <= 0) {
      throw new Error('Invalid company ID');
    }

    return CompanyModel.findByIdWithUsers(id);
  }

  /**
   * Create a new company
   */
  static async createCompany(companyData: CreateCompanyData): Promise<Company> {
    // Validate required fields
    if (!companyData.name || companyData.name.trim().length === 0) {
      throw new Error('Company name is required');
    }

    // Validate name length
    if (companyData.name.length > 255) {
      throw new Error('Company name must be 255 characters or less');
    }

    // Check if name is unique
    const isNameUnique = await CompanyModel.isNameUnique(companyData.name.trim());
    if (!isNameUnique) {
      throw new Error('Company name already exists');
    }

    // Validate email format if provided
    if (companyData.contact_email && !this.isValidEmail(companyData.contact_email)) {
      throw new Error('Invalid email format');
    }

    // Validate phone format if provided
    if (companyData.contact_phone && !this.isValidPhone(companyData.contact_phone)) {
      throw new Error('Invalid phone format');
    }

    const sanitizedData = {
      name: companyData.name.trim(),
      contact_email: companyData.contact_email?.trim() || undefined,
      contact_phone: companyData.contact_phone?.trim() || undefined,
      address: companyData.address?.trim() || undefined,
      is_active: companyData.is_active ?? true
    };

    return CompanyModel.create(sanitizedData);
  }

  /**
   * Update company
   */
  static async updateCompany(id: number, updates: UpdateCompanyData): Promise<Company | null> {
    if (!id || id <= 0) {
      throw new Error('Invalid company ID');
    }

    // Check if company exists
    const existingCompany = await CompanyModel.findById(id);
    if (!existingCompany) {
      throw new Error('Company not found');
    }

    // Validate name if being updated
    if (updates.name !== undefined) {
      if (!updates.name || updates.name.trim().length === 0) {
        throw new Error('Company name is required');
      }

      if (updates.name.length > 255) {
        throw new Error('Company name must be 255 characters or less');
      }

      // Check if name is unique (excluding current company)
      const isNameUnique = await CompanyModel.isNameUnique(updates.name.trim(), id);
      if (!isNameUnique) {
        throw new Error('Company name already exists');
      }
    }

    // Validate email format if provided
    if (updates.contact_email !== undefined && updates.contact_email && !this.isValidEmail(updates.contact_email)) {
      throw new Error('Invalid email format');
    }

    // Validate phone format if provided
    if (updates.contact_phone !== undefined && updates.contact_phone && !this.isValidPhone(updates.contact_phone)) {
      throw new Error('Invalid phone format');
    }

    const sanitizedUpdates: Partial<Company> = {};

    if (updates.name !== undefined) {
      sanitizedUpdates.name = updates.name.trim();
    }
    if (updates.contact_email !== undefined) {
      sanitizedUpdates.contact_email = updates.contact_email?.trim() || undefined;
    }
    if (updates.contact_phone !== undefined) {
      sanitizedUpdates.contact_phone = updates.contact_phone?.trim() || undefined;
    }
    if (updates.address !== undefined) {
      sanitizedUpdates.address = updates.address?.trim() || undefined;
    }
    if (updates.is_active !== undefined) {
      sanitizedUpdates.is_active = updates.is_active;
    }

    return CompanyModel.update(id, sanitizedUpdates);
  }

  /**
   * Deactivate company (soft delete)
   */
  static async deactivateCompany(id: number): Promise<boolean> {
    if (!id || id <= 0) {
      throw new Error('Invalid company ID');
    }

    // Check if company exists
    const existingCompany = await CompanyModel.findById(id);
    if (!existingCompany) {
      throw new Error('Company not found');
    }

    // Check if company has active users
    const companyWithUsers = await CompanyModel.findByIdWithUsers(id);
    const activeUsers = companyWithUsers?.users.filter(user => user.is_active) || [];
    
    if (activeUsers.length > 0) {
      throw new Error('Cannot deactivate company with active users. Please deactivate all users first.');
    }

    return CompanyModel.softDelete(id);
  }

  /**
   * Permanently delete company
   */
  static async deleteCompany(id: number): Promise<boolean> {
    if (!id || id <= 0) {
      throw new Error('Invalid company ID');
    }

    // Check if company exists
    const existingCompany = await CompanyModel.findById(id);
    if (!existingCompany) {
      throw new Error('Company not found');
    }

    // Check if company has any users
    const companyWithUsers = await CompanyModel.findByIdWithUsers(id);
    if (companyWithUsers && companyWithUsers.users.length > 0) {
      throw new Error('Cannot delete company with associated users. Please remove all users first.');
    }

    return CompanyModel.delete(id);
  }

  /**
   * Check if company exists
   */
  static async companyExists(id: number): Promise<boolean> {
    if (!id || id <= 0) {
      return false;
    }

    return CompanyModel.exists(id);
  }

  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format (basic validation)
   */
  private static isValidPhone(phone: string): boolean {
    // Allow various phone formats: +1234567890, (123) 456-7890, 123-456-7890, etc.
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }
}