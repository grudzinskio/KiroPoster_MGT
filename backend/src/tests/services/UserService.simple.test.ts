import { UserService } from '../../services/UserService.js';

// Mock all dependencies
jest.mock('../../models/User.js', () => ({
  UserModel: {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
    findByCompanyId: jest.fn(),
    countByRole: jest.fn(),
    updatePassword: jest.fn(),
    toAuthenticatedUser: jest.fn()
  }
}));

jest.mock('../../utils/password.js', () => ({
  comparePassword: jest.fn(),
  hashPassword: jest.fn()
}));

jest.mock('../../utils/jwt.js', () => ({
  generateTokenPair: jest.fn()
}));

describe('UserService Basic Tests', () => {
  it('should be defined', () => {
    expect(UserService).toBeDefined();
    expect(UserService.authenticate).toBeDefined();
    expect(UserService.getUserById).toBeDefined();
    expect(UserService.createUser).toBeDefined();
    expect(UserService.updateUser).toBeDefined();
    expect(UserService.deleteUser).toBeDefined();
  });
});