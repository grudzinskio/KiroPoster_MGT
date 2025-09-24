import { CompanyUserService } from '../../services/CompanyUserService.js';
import { CompanyModel } from '../../models/Company.js';
import db from '../../database/connection.js';

// Mock the database connection
jest.mock('../../database/connection.js', () => ({
  default: jest.fn()
}));

// Mock the CompanyModel
jest.mock('../../models/Company.js', () => ({
  CompanyModel: {
    findById: jest.fn()
  }
}));

describe('CompanyUserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('assignUserToCompany', () => {
    it('should throw error for invalid user ID', async () => {
      await expect(CompanyUserService.assignUserToCompany(0, 1)).rejects.toThrow('Invalid user ID');
      await expect(CompanyUserService.assignUserToCompany(-1, 1)).rejects.toThrow('Invalid user ID');
    });

    it('should throw error for invalid company ID', async () => {
      await expect(CompanyUserService.assignUserToCompany(1, 0)).rejects.toThrow('Invalid company ID');
      await expect(CompanyUserService.assignUserToCompany(1, -1)).rejects.toThrow('Invalid company ID');
    });

    it('should throw error when company not found', async () => {
      (CompanyModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(CompanyUserService.assignUserToCompany(1, 999)).rejects.toThrow('Company not found');
    });

    it('should throw error when company is inactive', async () => {
      const mockCompany = { id: 1, name: 'Company A', is_active: false };

      (CompanyModel.findById as jest.Mock).mockResolvedValue(mockCompany as any);

      await expect(CompanyUserService.assignUserToCompany(1, 1)).rejects.toThrow('Cannot assign user to inactive company');
    });
  });

  describe('removeUserFromCompany', () => {
    it('should throw error for invalid user ID', async () => {
      await expect(CompanyUserService.removeUserFromCompany(0)).rejects.toThrow('Invalid user ID');
    });
  });

  describe('getUsersByCompany', () => {
    it('should throw error for invalid company ID', async () => {
      await expect(CompanyUserService.getUsersByCompany(0)).rejects.toThrow('Invalid company ID');
    });
  });

  describe('getUsersByCompanyAndRole', () => {
    it('should throw error for invalid company ID', async () => {
      await expect(CompanyUserService.getUsersByCompanyAndRole(0, 'client')).rejects.toThrow('Invalid company ID');
    });

    it('should throw error for missing role', async () => {
      await expect(CompanyUserService.getUsersByCompanyAndRole(1, '' as any)).rejects.toThrow('Role is required');
    });
  });

  describe('getCompanyForUser', () => {
    it('should throw error for invalid user ID', async () => {
      await expect(CompanyUserService.getCompanyForUser(0)).rejects.toThrow('Invalid user ID');
    });
  });

  describe('validateUserCompanyAssignment', () => {
    it('should return invalid for invalid user ID', async () => {
      const result = await CompanyUserService.validateUserCompanyAssignment(0, 1);
      expect(result).toEqual({ valid: false, reason: 'Invalid user ID' });
    });

    it('should return invalid for invalid company ID', async () => {
      const result = await CompanyUserService.validateUserCompanyAssignment(1, 0);
      expect(result).toEqual({ valid: false, reason: 'Invalid company ID' });
    });
  });
});