import { UserService } from '../../services/UserService.js';
import { UserModel } from '../../models/User.js';
import { User, CreateUserData, UpdateUserData, AuthenticatedUser } from '../../types/user.js';
import { comparePassword } from '../../utils/password.js';
import { generateTokenPair } from '../../utils/jwt.js';

// Mock the dependencies
jest.mock('../../models/User.js');
jest.mock('../../utils/password.js');
jest.mock('../../utils/jwt.js');
jest.mock('../../database/connection.js', () => ({
  default: jest.fn()
}));

const mockUserModel = UserModel as jest.Mocked<typeof UserModel>;
const mockComparePassword = comparePassword as jest.MockedFunction<typeof comparePassword>;
const mockGenerateTokenPair = generateTokenPair as jest.MockedFunction<typeof generateTokenPair>;

describe('UserService', () => {
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

  const mockAuthenticatedUser: AuthenticatedUser = {
    id: 1,
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'company_employee',
    companyId: null,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate user with valid credentials', async () => {
      mockUserModel.findByEmail.mockResolvedValue(mockUser);
      mockComparePassword.mockResolvedValue(true);
      mockGenerateTokenPair.mockReturnValue(mockTokens);
      mockUserModel.toAuthenticatedUser.mockReturnValue(mockAuthenticatedUser);

      const result = await UserService.authenticate({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(result).toEqual({
        user: mockAuthenticatedUser,
        tokens: mockTokens
      });
      expect(mockUserModel.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockComparePassword).toHaveBeenCalledWith('password123', 'hashedpassword');
      expect(mockGenerateTokenPair).toHaveBeenCalledWith(mockUser);
    });

    it('should return null for non-existent user', async () => {
      mockUserModel.findByEmail.mockResolvedValue(null);

      const result = await UserService.authenticate({
        email: 'nonexistent@example.com',
        password: 'password123'
      });

      expect(result).toBeNull();
      expect(mockComparePassword).not.toHaveBeenCalled();
    });

    it('should return null for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockUserModel.findByEmail.mockResolvedValue(inactiveUser);

      const result = await UserService.authenticate({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(result).toBeNull();
      expect(mockComparePassword).not.toHaveBeenCalled();
    });

    it('should return null for invalid password', async () => {
      mockUserModel.findByEmail.mockResolvedValue(mockUser);
      mockComparePassword.mockResolvedValue(false);

      const result = await UserService.authenticate({
        email: 'test@example.com',
        password: 'wrongpassword'
      });

      expect(result).toBeNull();
      expect(mockGenerateTokenPair).not.toHaveBeenCalled();
    });

    it('should throw error on authentication failure', async () => {
      mockUserModel.findByEmail.mockRejectedValue(new Error('Database error'));

      await expect(UserService.authenticate({
        email: 'test@example.com',
        password: 'password123'
      })).rejects.toThrow('Authentication failed: Database error');
    });
  });

  describe('getUserById', () => {
    it('should return authenticated user by ID', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUserModel.toAuthenticatedUser.mockReturnValue(mockAuthenticatedUser);

      const result = await UserService.getUserById(1);

      expect(result).toEqual(mockAuthenticatedUser);
      expect(mockUserModel.findById).toHaveBeenCalledWith(1);
    });

    it('should return null for non-existent user', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      const result = await UserService.getUserById(999);

      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      mockUserModel.findById.mockRejectedValue(new Error('Database error'));

      await expect(UserService.getUserById(1)).rejects.toThrow('Failed to get user: Database error');
    });
  });

  describe('createUser', () => {
    const createUserData: CreateUserData = {
      email: 'new@example.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'client',
      companyId: 1
    };

    it('should create user successfully', async () => {
      mockUserModel.findByEmail.mockResolvedValue(null);
      mockUserModel.create.mockResolvedValue(mockUser);
      mockUserModel.toAuthenticatedUser.mockReturnValue(mockAuthenticatedUser);

      const result = await UserService.createUser(createUserData);

      expect(result).toEqual(mockAuthenticatedUser);
      expect(mockUserModel.findByEmail).toHaveBeenCalledWith('new@example.com');
      expect(mockUserModel.create).toHaveBeenCalledWith(createUserData);
    });

    it('should throw error if email already exists', async () => {
      mockUserModel.findByEmail.mockResolvedValue(mockUser);

      await expect(UserService.createUser(createUserData)).rejects.toThrow('Email address is already in use');
      expect(mockUserModel.create).not.toHaveBeenCalled();
    });

    it('should throw error if client role without companyId', async () => {
      const invalidData = { ...createUserData, companyId: undefined };
      mockUserModel.findByEmail.mockResolvedValue(null);

      await expect(UserService.createUser(invalidData)).rejects.toThrow('Company ID is required for client role');
    });

    it('should throw error if contractor role without companyId', async () => {
      const invalidData = { ...createUserData, role: 'contractor' as const, companyId: undefined };
      mockUserModel.findByEmail.mockResolvedValue(null);

      await expect(UserService.createUser(invalidData)).rejects.toThrow('Company ID is required for contractor role');
    });

    it('should throw error if company_employee with companyId', async () => {
      const invalidData = { ...createUserData, role: 'company_employee' as const, companyId: 1 };
      mockUserModel.findByEmail.mockResolvedValue(null);

      await expect(UserService.createUser(invalidData)).rejects.toThrow('Company employees should not be associated with a specific company');
    });
  });

  describe('updateUser', () => {
    const updateData: UpdateUserData = {
      firstName: 'Updated',
      lastName: 'Name'
    };

    it('should update user successfully by company employee', async () => {
      const updatedUser = { ...mockUser, firstName: 'Updated', lastName: 'Name' };
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUserModel.update.mockResolvedValue(updatedUser);
      mockUserModel.toAuthenticatedUser.mockReturnValue({ ...mockAuthenticatedUser, firstName: 'Updated', lastName: 'Name' });

      const result = await UserService.updateUser(1, updateData, 2, 'company_employee');

      expect(result).toEqual({ ...mockAuthenticatedUser, firstName: 'Updated', lastName: 'Name' });
      expect(mockUserModel.update).toHaveBeenCalledWith(1, updateData);
    });

    it('should allow user to update their own basic info', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUserModel.update.mockResolvedValue({ ...mockUser, firstName: 'Updated' });
      mockUserModel.toAuthenticatedUser.mockReturnValue({ ...mockAuthenticatedUser, firstName: 'Updated' });

      const result = await UserService.updateUser(1, { firstName: 'Updated' }, 1, 'client');

      expect(result).toBeDefined();
      expect(mockUserModel.update).toHaveBeenCalledWith(1, { firstName: 'Updated' });
    });

    it('should throw error if non-company employee tries to update other user', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);

      await expect(UserService.updateUser(1, updateData, 2, 'client')).rejects.toThrow('Insufficient permissions to update this user');
    });

    it('should throw error if user tries to update disallowed fields', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);

      await expect(UserService.updateUser(1, { role: 'contractor' }, 1, 'client')).rejects.toThrow('You can only update your first name and last name');
    });

    it('should return null for non-existent user', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      const result = await UserService.updateUser(999, updateData, 1, 'company_employee');

      expect(result).toBeNull();
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully by company employee', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUserModel.delete.mockResolvedValue(true);

      const result = await UserService.deleteUser(1, 'company_employee');

      expect(result).toBe(true);
      expect(mockUserModel.delete).toHaveBeenCalledWith(1);
    });

    it('should throw error if non-company employee tries to delete user', async () => {
      await expect(UserService.deleteUser(1, 'client')).rejects.toThrow('Insufficient permissions to delete users');
    });

    it('should return false for non-existent user', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      const result = await UserService.deleteUser(999, 'company_employee');

      expect(result).toBe(false);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockComparePassword.mockResolvedValue(true);
      mockUserModel.updatePassword.mockResolvedValue(true);

      const result = await UserService.changePassword(1, 'currentPassword', 'newPassword');

      expect(result).toBe(true);
      expect(mockComparePassword).toHaveBeenCalledWith('currentPassword', 'hashedpassword');
      expect(mockUserModel.updatePassword).toHaveBeenCalledWith(1, 'newPassword');
    });

    it('should throw error for non-existent user', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      await expect(UserService.changePassword(999, 'currentPassword', 'newPassword')).rejects.toThrow('User not found');
    });

    it('should throw error for incorrect current password', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockComparePassword.mockResolvedValue(false);

      await expect(UserService.changePassword(1, 'wrongPassword', 'newPassword')).rejects.toThrow('Current password is incorrect');
    });
  });

  describe('getAllUsers', () => {
    it('should return all users with filters', async () => {
      const users = [mockUser];
      mockUserModel.findAll.mockResolvedValue(users);
      mockUserModel.toAuthenticatedUser.mockReturnValue(mockAuthenticatedUser);

      const filters = { role: 'company_employee', isActive: true };
      const result = await UserService.getAllUsers(filters);

      expect(result).toEqual([mockAuthenticatedUser]);
      expect(mockUserModel.findAll).toHaveBeenCalledWith(filters);
    });

    it('should return empty array when no users found', async () => {
      mockUserModel.findAll.mockResolvedValue([]);

      const result = await UserService.getAllUsers();

      expect(result).toEqual([]);
    });
  });

  describe('getUsersByCompanyId', () => {
    it('should return users by company ID', async () => {
      const users = [mockUser];
      mockUserModel.findByCompanyId.mockResolvedValue(users);
      mockUserModel.toAuthenticatedUser.mockReturnValue(mockAuthenticatedUser);

      const result = await UserService.getUsersByCompanyId(1);

      expect(result).toEqual([mockAuthenticatedUser]);
      expect(mockUserModel.findByCompanyId).toHaveBeenCalledWith(1);
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const users = [mockUser, { ...mockUser, id: 2, isActive: false }];
      const roleStats = { company_employee: 1, client: 0, contractor: 0 };
      
      mockUserModel.findAll.mockResolvedValue(users);
      mockUserModel.countByRole.mockResolvedValue(roleStats);

      const result = await UserService.getUserStats();

      expect(result).toEqual({
        total: 2,
        byRole: roleStats,
        active: 1,
        inactive: 1
      });
    });
  });

  describe('toggleUserStatus', () => {
    it('should toggle user status successfully by company employee', async () => {
      const updatedUser = { ...mockUser, isActive: false };
      mockUserModel.update.mockResolvedValue(updatedUser);
      mockUserModel.toAuthenticatedUser.mockReturnValue({ ...mockAuthenticatedUser, isActive: false });

      const result = await UserService.toggleUserStatus(1, false, 'company_employee');

      expect(result).toEqual({ ...mockAuthenticatedUser, isActive: false });
      expect(mockUserModel.update).toHaveBeenCalledWith(1, { isActive: false });
    });

    it('should throw error if non-company employee tries to change status', async () => {
      await expect(UserService.toggleUserStatus(1, false, 'client')).rejects.toThrow('Insufficient permissions to change user status');
    });

    it('should return null for non-existent user', async () => {
      mockUserModel.update.mockResolvedValue(null);

      const result = await UserService.toggleUserStatus(999, false, 'company_employee');

      expect(result).toBeNull();
    });
  });
});