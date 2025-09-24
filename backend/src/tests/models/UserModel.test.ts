import { UserModel } from '../../models/User.js';
import { User, CreateUserData, UpdateUserData } from '../../types/user.js';
import db from '../../database/connection.js';
import { hashPassword } from '../../utils/password.js';

// Mock the database connection and password utility
jest.mock('../../database/connection.js', () => ({
  default: jest.fn()
}));
jest.mock('../../utils/password.js');

const mockDb = db as jest.Mocked<typeof db>;
const mockHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>;

describe('UserModel', () => {
  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    passwordHash: 'hashedpassword',
    firstName: 'John',
    lastName: 'Doe',
    role: 'company_employee',
    companyId: null,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock chain
    const mockQuery = {
      where: jest.fn().mockReturnThis(),
      first: jest.fn(),
      orderBy: jest.fn().mockReturnThis(),
      insert: jest.fn(),
      update: jest.fn(),
      del: jest.fn(),
      select: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis()
    };

    (mockDb as any).mockReturnValue(mockQuery);
    mockQuery.where.mockReturnValue(mockQuery);
    mockQuery.first.mockResolvedValue(mockUser);
    mockQuery.orderBy.mockResolvedValue([mockUser]);
    mockQuery.insert.mockResolvedValue([1]);
    mockQuery.update.mockResolvedValue(1);
    mockQuery.del.mockResolvedValue(1);
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser)
      };
      (mockDb as any).mockReturnValue(mockQuery);

      const result = await UserModel.findById(1);

      expect(result).toEqual(mockUser);
      expect(mockDb).toHaveBeenCalledWith('users');
      expect(mockQuery.where).toHaveBeenCalledWith({ id: 1 });
      expect(mockQuery.first).toHaveBeenCalled();
    });

    it('should return null when user not found', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(undefined)
      };
      (mockDb as any).mockReturnValue(mockQuery);

      const result = await UserModel.findById(999);

      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockRejectedValue(new Error('Database error'))
      };
      (mockDb as any).mockReturnValue(mockQuery);

      await expect(UserModel.findById(1)).rejects.toThrow('Failed to find user by ID: Database error');
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser)
      };
      (mockDb as any).mockReturnValue(mockQuery);

      const result = await UserModel.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockQuery.where).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('should convert email to lowercase', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser)
      };
      (mockDb as any).mockReturnValue(mockQuery);

      await UserModel.findByEmail('TEST@EXAMPLE.COM');

      expect(mockQuery.where).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('should return null when user not found', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(undefined)
      };
      (mockDb as any).mockReturnValue(mockQuery);

      const result = await UserModel.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all users without filters', async () => {
      const mockQuery = {
        orderBy: jest.fn().mockResolvedValue([mockUser])
      };
      (mockDb as any).mockReturnValue(mockQuery);

      const result = await UserModel.findAll();

      expect(result).toEqual([mockUser]);
      expect(mockQuery.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });

    it('should apply role filter', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([mockUser])
      };
      (mockDb as any).mockReturnValue(mockQuery);

      const result = await UserModel.findAll({ role: 'company_employee' });

      expect(result).toEqual([mockUser]);
      expect(mockQuery.where).toHaveBeenCalledWith('role', 'company_employee');
    });

    it('should apply search filter', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([mockUser])
      };
      (mockDb as any).mockReturnValue(mockQuery);

      const result = await UserModel.findAll({ search: 'john' });

      expect(result).toEqual([mockUser]);
      expect(mockQuery.where).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('create', () => {
    const createUserData: CreateUserData = {
      email: 'new@example.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'client',
      companyId: 1
    };

    it('should create user successfully', async () => {
      mockHashPassword.mockResolvedValue('hashedpassword');
      
      const mockInsertQuery = {
        insert: jest.fn().mockResolvedValue([1])
      };
      (mockDb as any).mockReturnValue(mockInsertQuery);

      // Mock findById call after creation
      const mockFindQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser)
      };
      (mockDb as any).mockReturnValueOnce(mockInsertQuery).mockReturnValueOnce(mockFindQuery);

      const result = await UserModel.create(createUserData);

      expect(result).toEqual(mockUser);
      expect(mockHashPassword).toHaveBeenCalledWith('password123');
      expect(mockInsertQuery.insert).toHaveBeenCalledWith({
        email: 'new@example.com',
        passwordHash: 'hashedpassword',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'client',
        companyId: 1,
        isActive: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should handle duplicate email error', async () => {
      mockHashPassword.mockResolvedValue('hashedpassword');
      
      const mockQuery = {
        insert: jest.fn().mockRejectedValue(new Error('Duplicate entry'))
      };
      (mockDb as any).mockReturnValue(mockQuery);

      await expect(UserModel.create(createUserData)).rejects.toThrow('Email address is already in use');
    });

    it('should throw error if created user cannot be retrieved', async () => {
      mockHashPassword.mockResolvedValue('hashedpassword');
      
      const mockInsertQuery = {
        insert: jest.fn().mockResolvedValue([1])
      };
      const mockFindQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null)
      };
      (mockDb as any).mockReturnValueOnce(mockInsertQuery).mockReturnValueOnce(mockFindQuery);

      await expect(UserModel.create(createUserData)).rejects.toThrow('Failed to retrieve created user');
    });
  });

  describe('update', () => {
    const updateData: UpdateUserData = {
      firstName: 'Updated',
      lastName: 'Name'
    };

    it('should update user successfully', async () => {
      const updatedUser = { ...mockUser, firstName: 'Updated', lastName: 'Name' };
      
      const mockUpdateQuery = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1)
      };
      const mockFindQuery = {
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(updatedUser)
      };
      (mockDb as any).mockReturnValueOnce(mockUpdateQuery).mockReturnValueOnce(mockFindQuery);

      const result = await UserModel.update(1, updateData);

      expect(result).toEqual(updatedUser);
      expect(mockUpdateQuery.where).toHaveBeenCalledWith({ id: 1 });
      expect(mockUpdateQuery.update).toHaveBeenCalledWith({
        ...updateData,
        updatedAt: expect.any(Date)
      });
    });

    it('should return null when user not found', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(0)
      };
      (mockDb as any).mockReturnValue(mockQuery);

      const result = await UserModel.update(999, updateData);

      expect(result).toBeNull();
    });

    it('should handle duplicate email error', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockRejectedValue(new Error('Duplicate entry'))
      };
      (mockDb as any).mockReturnValue(mockQuery);

      await expect(UserModel.update(1, { email: 'existing@example.com' })).rejects.toThrow('Email address is already in use');
    });
  });

  describe('delete', () => {
    it('should soft delete user successfully', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1)
      };
      (mockDb as any).mockReturnValue(mockQuery);

      const result = await UserModel.delete(1);

      expect(result).toBe(true);
      expect(mockQuery.where).toHaveBeenCalledWith({ id: 1 });
      expect(mockQuery.update).toHaveBeenCalledWith({
        isActive: false,
        updatedAt: expect.any(Date)
      });
    });

    it('should return false when user not found', async () => {
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(0)
      };
      (mockDb as any).mockReturnValue(mockQuery);

      const result = await UserModel.delete(999);

      expect(result).toBe(false);
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      mockHashPassword.mockResolvedValue('newhashed');
      
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1)
      };
      (mockDb as any).mockReturnValue(mockQuery);

      const result = await UserModel.updatePassword(1, 'newpassword');

      expect(result).toBe(true);
      expect(mockHashPassword).toHaveBeenCalledWith('newpassword');
      expect(mockQuery.update).toHaveBeenCalledWith({
        passwordHash: 'newhashed',
        updatedAt: expect.any(Date)
      });
    });

    it('should return false when user not found', async () => {
      mockHashPassword.mockResolvedValue('newhashed');
      
      const mockQuery = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(0)
      };
      (mockDb as any).mockReturnValue(mockQuery);

      const result = await UserModel.updatePassword(999, 'newpassword');

      expect(result).toBe(false);
    });
  });

  describe('toAuthenticatedUser', () => {
    it('should remove password hash from user object', () => {
      const result = UserModel.toAuthenticatedUser(mockUser);

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toEqual({
        id: 1,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'company_employee',
        companyId: null,
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      });
    });
  });

  describe('countByRole', () => {
    it('should return role counts', async () => {
      const mockCounts = [
        { role: 'company_employee', count: '5' },
        { role: 'client', count: '10' },
        { role: 'contractor', count: '15' }
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        count: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockResolvedValue(mockCounts)
      };
      (mockDb as any).mockReturnValue(mockQuery);

      const result = await UserModel.countByRole();

      expect(result).toEqual({
        company_employee: 5,
        client: 10,
        contractor: 15
      });
      expect(mockQuery.select).toHaveBeenCalledWith('role');
      expect(mockQuery.count).toHaveBeenCalledWith('* as count');
      expect(mockQuery.where).toHaveBeenCalledWith('isActive', true);
      expect(mockQuery.groupBy).toHaveBeenCalledWith('role');
    });
  });
});