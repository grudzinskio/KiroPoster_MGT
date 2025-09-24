import { CompanyService } from '../../services/CompanyService.js';
import { CompanyModel } from '../../models/Company.js';

// Mock the CompanyModel
jest.mock('../../models/Company.js', () => ({
  CompanyModel: {
    findAll: jest.fn(),
    findActive: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    delete: jest.fn(),
    findAllWithUserCount: jest.fn(),
    findByIdWithUsers: jest.fn(),
    exists: jest.fn(),
    isNameUnique: jest.fn()
  }
}));

describe('CompanyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllCompanies', () => {
    it('should return all companies', async () => {
      const mockCompanies = [
        { id: 1, name: 'Company A', is_active: true },
        { id: 2, name: 'Company B', is_active: false }
      ];

      (CompanyModel.findAll as jest.Mock).mockResolvedValue(mockCompanies as any);

      const result = await CompanyService.getAllCompanies();

      expect(CompanyModel.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockCompanies);
    });
  });

  describe('getActiveCompanies', () => {
    it('should return only active companies', async () => {
      const mockActiveCompanies = [
        { id: 1, name: 'Company A', is_active: true }
      ];

      (CompanyModel.findActive as jest.Mock).mockResolvedValue(mockActiveCompanies as any);

      const result = await CompanyService.getActiveCompanies();

      expect(CompanyModel.findActive).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockActiveCompanies);
    });
  });

  describe('getCompanyById', () => {
    it('should return company when valid ID is provided', async () => {
      const mockCompany = { id: 1, name: 'Company A', is_active: true };

      (CompanyModel.findById as jest.Mock).mockResolvedValue(mockCompany as any);

      const result = await CompanyService.getCompanyById(1);

      expect(CompanyModel.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockCompany);
    });

    it('should throw error for invalid ID', async () => {
      await expect(CompanyService.getCompanyById(0)).rejects.toThrow('Invalid company ID');
      await expect(CompanyService.getCompanyById(-1)).rejects.toThrow('Invalid company ID');
    });

    it('should return null when company not found', async () => {
      (CompanyModel.findById as jest.Mock).mockResolvedValue(null);

      const result = await CompanyService.getCompanyById(999);

      expect(result).toBeNull();
    });
  });

  describe('createCompany', () => {
    it('should create company with valid data', async () => {
      const companyData = {
        name: 'New Company',
        contact_email: 'contact@newcompany.com',
        contact_phone: '123-456-7890',
        address: '123 Main St'
      };

      const mockCreatedCompany = {
        id: 1,
        ...companyData,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      (CompanyModel.isNameUnique as jest.Mock).mockResolvedValue(true);
      (CompanyModel.create as jest.Mock).mockResolvedValue(mockCreatedCompany as any);

      const result = await CompanyService.createCompany(companyData);

      expect(CompanyModel.isNameUnique).toHaveBeenCalledWith('New Company');
      expect(CompanyModel.create).toHaveBeenCalledWith({
        name: 'New Company',
        contact_email: 'contact@newcompany.com',
        contact_phone: '123-456-7890',
        address: '123 Main St',
        is_active: true
      });
      expect(result).toEqual(mockCreatedCompany);
    });

    it('should throw error for empty name', async () => {
      const companyData = { name: '' };

      await expect(CompanyService.createCompany(companyData)).rejects.toThrow('Company name is required');
    });

    it('should throw error for name too long', async () => {
      const companyData = { name: 'a'.repeat(256) };

      await expect(CompanyService.createCompany(companyData)).rejects.toThrow('Company name must be 255 characters or less');
    });

    it('should throw error for duplicate name', async () => {
      const companyData = { name: 'Existing Company' };

      (CompanyModel.isNameUnique as jest.Mock).mockResolvedValue(false);

      await expect(CompanyService.createCompany(companyData)).rejects.toThrow('Company name already exists');
    });

    it('should throw error for invalid email', async () => {
      const companyData = {
        name: 'New Company',
        contact_email: 'invalid-email'
      };

      (CompanyModel.isNameUnique as jest.Mock).mockResolvedValue(true);

      await expect(CompanyService.createCompany(companyData)).rejects.toThrow('Invalid email format');
    });

    it('should throw error for invalid phone', async () => {
      const companyData = {
        name: 'New Company',
        contact_phone: '123'
      };

      (CompanyModel.isNameUnique as jest.Mock).mockResolvedValue(true);

      await expect(CompanyService.createCompany(companyData)).rejects.toThrow('Invalid phone format');
    });
  });

  describe('updateCompany', () => {
    it('should update company with valid data', async () => {
      const updates = { name: 'Updated Company' };
      const existingCompany = { id: 1, name: 'Old Company', is_active: true };
      const updatedCompany = { id: 1, name: 'Updated Company', is_active: true };

      (CompanyModel.findById as jest.Mock).mockResolvedValue(existingCompany as any);
      (CompanyModel.isNameUnique as jest.Mock).mockResolvedValue(true);
      (CompanyModel.update as jest.Mock).mockResolvedValue(updatedCompany as any);

      const result = await CompanyService.updateCompany(1, updates);

      expect(CompanyModel.findById).toHaveBeenCalledWith(1);
      expect(CompanyModel.isNameUnique).toHaveBeenCalledWith('Updated Company', 1);
      expect(CompanyModel.update).toHaveBeenCalledWith(1, { name: 'Updated Company' });
      expect(result).toEqual(updatedCompany);
    });

    it('should throw error for invalid ID', async () => {
      await expect(CompanyService.updateCompany(0, {})).rejects.toThrow('Invalid company ID');
    });

    it('should throw error when company not found', async () => {
      (CompanyModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(CompanyService.updateCompany(999, {})).rejects.toThrow('Company not found');
    });

    it('should throw error for duplicate name', async () => {
      const updates = { name: 'Existing Company' };
      const existingCompany = { id: 1, name: 'Old Company', is_active: true };

      (CompanyModel.findById as jest.Mock).mockResolvedValue(existingCompany as any);
      (CompanyModel.isNameUnique as jest.Mock).mockResolvedValue(false);

      await expect(CompanyService.updateCompany(1, updates)).rejects.toThrow('Company name already exists');
    });
  });

  describe('deactivateCompany', () => {
    it('should deactivate company with no active users', async () => {
      const existingCompany = { id: 1, name: 'Company A', is_active: true };
      const companyWithUsers = { ...existingCompany, users: [] };

      (CompanyModel.findById as jest.Mock).mockResolvedValue(existingCompany as any);
      (CompanyModel.findByIdWithUsers as jest.Mock).mockResolvedValue(companyWithUsers as any);
      (CompanyModel.softDelete as jest.Mock).mockResolvedValue(true);

      const result = await CompanyService.deactivateCompany(1);

      expect(CompanyModel.softDelete).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });

    it('should throw error when company has active users', async () => {
      const existingCompany = { id: 1, name: 'Company A', is_active: true };
      const companyWithUsers = {
        ...existingCompany,
        users: [{ id: 1, is_active: true }]
      };

      (CompanyModel.findById as jest.Mock).mockResolvedValue(existingCompany as any);
      (CompanyModel.findByIdWithUsers as jest.Mock).mockResolvedValue(companyWithUsers as any);

      await expect(CompanyService.deactivateCompany(1)).rejects.toThrow('Cannot deactivate company with active users');
    });

    it('should throw error for invalid ID', async () => {
      await expect(CompanyService.deactivateCompany(0)).rejects.toThrow('Invalid company ID');
    });

    it('should throw error when company not found', async () => {
      (CompanyModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(CompanyService.deactivateCompany(999)).rejects.toThrow('Company not found');
    });
  });

  describe('deleteCompany', () => {
    it('should delete company with no users', async () => {
      const existingCompany = { id: 1, name: 'Company A', is_active: true };
      const companyWithUsers = { ...existingCompany, users: [] };

      (CompanyModel.findById as jest.Mock).mockResolvedValue(existingCompany as any);
      (CompanyModel.findByIdWithUsers as jest.Mock).mockResolvedValue(companyWithUsers as any);
      (CompanyModel.delete as jest.Mock).mockResolvedValue(true);

      const result = await CompanyService.deleteCompany(1);

      expect(CompanyModel.delete).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });

    it('should throw error when company has users', async () => {
      const existingCompany = { id: 1, name: 'Company A', is_active: true };
      const companyWithUsers = {
        ...existingCompany,
        users: [{ id: 1, is_active: false }]
      };

      (CompanyModel.findById as jest.Mock).mockResolvedValue(existingCompany as any);
      (CompanyModel.findByIdWithUsers as jest.Mock).mockResolvedValue(companyWithUsers as any);

      await expect(CompanyService.deleteCompany(1)).rejects.toThrow('Cannot delete company with associated users');
    });
  });

  describe('companyExists', () => {
    it('should return true when company exists', async () => {
      (CompanyModel.exists as jest.Mock).mockResolvedValue(true);

      const result = await CompanyService.companyExists(1);

      expect(CompanyModel.exists).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });

    it('should return false when company does not exist', async () => {
      (CompanyModel.exists as jest.Mock).mockResolvedValue(false);

      const result = await CompanyService.companyExists(999);

      expect(result).toBe(false);
    });

    it('should return false for invalid ID', async () => {
      const result = await CompanyService.companyExists(0);
      expect(result).toBe(false);
    });
  });
});