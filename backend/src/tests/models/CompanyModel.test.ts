import { CompanyModel } from '../../models/Company.js';
import db from '../../database/connection.js';

// Mock the database connection
jest.mock('../../database/connection.js');

const mockDb = db as jest.MockedFunction<typeof db>;

describe('CompanyModel', () => {
  let mockQuery: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a mock query builder
    mockQuery = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereNot: jest.fn().mockReturnThis(),
      whereIn: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      first: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      del: jest.fn(),
      count: jest.fn().mockReturnThis(),
      raw: jest.fn()
    };

    mockDb.mockReturnValue(mockQuery);
  });

  describe('findAll', () => {
    it('should return all companies ordered by name', async () => {
      const mockCompanies = [
        { id: 1, name: 'Company A', is_active: true },
        { id: 2, name: 'Company B', is_active: false }
      ];

      mockQuery.select.mockReturnValue(mockCompanies);

      const result = await CompanyModel.findAll();

      expect(mockDb).toHaveBeenCalledWith('companies');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.orderBy).toHaveBeenCalledWith('name', 'asc');
      expect(result).toEqual(mockCompanies);
    });
  });

  describe('findActive', () => {
    it('should return only active companies', async () => {
      const mockActiveCompanies = [
        { id: 1, name: 'Company A', is_active: true }
      ];

      mockQuery.select.mockReturnValue(mockActiveCompanies);

      const result = await CompanyModel.findActive();

      expect(mockDb).toHaveBeenCalledWith('companies');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.where).toHaveBeenCalledWith('is_active', true);
      expect(mockQuery.orderBy).toHaveBeenCalledWith('name', 'asc');
      expect(result).toEqual(mockActiveCompanies);
    });
  });

  describe('findById', () => {
    it('should return company when found', async () => {
      const mockCompany = { id: 1, name: 'Company A', is_active: true };

      mockQuery.first.mockResolvedValue(mockCompany);

      const result = await CompanyModel.findById(1);

      expect(mockDb).toHaveBeenCalledWith('companies');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.where).toHaveBeenCalledWith('id', 1);
      expect(mockQuery.first).toHaveBeenCalled();
      expect(result).toEqual(mockCompany);
    });

    it('should return null when company not found', async () => {
      mockQuery.first.mockResolvedValue(undefined);

      const result = await CompanyModel.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should return company when found by name', async () => {
      const mockCompany = { id: 1, name: 'Company A', is_active: true };

      mockQuery.first.mockResolvedValue(mockCompany);

      const result = await CompanyModel.findByName('Company A');

      expect(mockDb).toHaveBeenCalledWith('companies');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.where).toHaveBeenCalledWith('name', 'Company A');
      expect(mockQuery.first).toHaveBeenCalled();
      expect(result).toEqual(mockCompany);
    });

    it('should return null when company not found by name', async () => {
      mockQuery.first.mockResolvedValue(undefined);

      const result = await CompanyModel.findByName('Non-existent Company');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new company and return it', async () => {
      const companyData = {
        name: 'New Company',
        contact_email: 'contact@newcompany.com',
        contact_phone: '123-456-7890',
        address: '123 Main St',
        is_active: true
      };

      const mockCreatedCompany = {
        id: 1,
        ...companyData,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.insert.mockResolvedValue([1]);
      mockQuery.first.mockResolvedValue(mockCreatedCompany);

      const result = await CompanyModel.create(companyData);

      expect(mockDb).toHaveBeenCalledWith('companies');
      expect(mockQuery.insert).toHaveBeenCalledWith({
        ...companyData,
        created_at: expect.any(Date),
        updated_at: expect.any(Date)
      });
      expect(result).toEqual(mockCreatedCompany);
    });

    it('should throw error if company creation fails', async () => {
      const companyData = {
        name: 'New Company',
        is_active: true
      };

      mockQuery.insert.mockResolvedValue([1]);
      mockQuery.first.mockResolvedValue(null);

      await expect(CompanyModel.create(companyData)).rejects.toThrow('Failed to create company');
    });
  });

  describe('update', () => {
    it('should update company and return updated company', async () => {
      const updates = { name: 'Updated Company' };
      const updatedCompany = { id: 1, name: 'Updated Company', is_active: true };

      mockQuery.update.mockResolvedValue(1);
      mockQuery.first.mockResolvedValue(updatedCompany);

      const result = await CompanyModel.update(1, updates);

      expect(mockDb).toHaveBeenCalledWith('companies');
      expect(mockQuery.where).toHaveBeenCalledWith('id', 1);
      expect(mockQuery.update).toHaveBeenCalledWith({
        ...updates,
        updated_at: expect.any(Date)
      });
      expect(result).toEqual(updatedCompany);
    });

    it('should return null if no rows were updated', async () => {
      const updates = { name: 'Updated Company' };

      mockQuery.update.mockResolvedValue(0);

      const result = await CompanyModel.update(999, updates);

      expect(result).toBeNull();
    });
  });

  describe('softDelete', () => {
    it('should soft delete company by setting is_active to false', async () => {
      mockQuery.update.mockResolvedValue(1);

      const result = await CompanyModel.softDelete(1);

      expect(mockDb).toHaveBeenCalledWith('companies');
      expect(mockQuery.where).toHaveBeenCalledWith('id', 1);
      expect(mockQuery.update).toHaveBeenCalledWith({
        is_active: false,
        updated_at: expect.any(Date)
      });
      expect(result).toBe(true);
    });

    it('should return false if no rows were updated', async () => {
      mockQuery.update.mockResolvedValue(0);

      const result = await CompanyModel.softDelete(999);

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should hard delete company', async () => {
      mockQuery.del.mockResolvedValue(1);

      const result = await CompanyModel.delete(1);

      expect(mockDb).toHaveBeenCalledWith('companies');
      expect(mockQuery.where).toHaveBeenCalledWith('id', 1);
      expect(mockQuery.del).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if no rows were deleted', async () => {
      mockQuery.del.mockResolvedValue(0);

      const result = await CompanyModel.delete(999);

      expect(result).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return true when company exists', async () => {
      mockQuery.first.mockResolvedValue({ count: 1 });

      const result = await CompanyModel.exists(1);

      expect(mockDb).toHaveBeenCalledWith('companies');
      expect(mockQuery.where).toHaveBeenCalledWith('id', 1);
      expect(mockQuery.count).toHaveBeenCalledWith('id as count');
      expect(mockQuery.first).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when company does not exist', async () => {
      mockQuery.first.mockResolvedValue({ count: 0 });

      const result = await CompanyModel.exists(999);

      expect(result).toBe(false);
    });
  });

  describe('isNameUnique', () => {
    it('should return true when name is unique', async () => {
      mockQuery.first.mockResolvedValue({ count: 0 });

      const result = await CompanyModel.isNameUnique('Unique Company');

      expect(mockDb).toHaveBeenCalledWith('companies');
      expect(mockQuery.where).toHaveBeenCalledWith('name', 'Unique Company');
      expect(mockQuery.count).toHaveBeenCalledWith('id as count');
      expect(mockQuery.first).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when name is not unique', async () => {
      mockQuery.first.mockResolvedValue({ count: 1 });

      const result = await CompanyModel.isNameUnique('Existing Company');

      expect(result).toBe(false);
    });

    it('should exclude specific ID when checking uniqueness', async () => {
      mockQuery.first.mockResolvedValue({ count: 0 });

      const result = await CompanyModel.isNameUnique('Company Name', 1);

      expect(mockQuery.where).toHaveBeenCalledWith('name', 'Company Name');
      expect(mockQuery.whereNot).toHaveBeenCalledWith('id', 1);
      expect(result).toBe(true);
    });
  });
});