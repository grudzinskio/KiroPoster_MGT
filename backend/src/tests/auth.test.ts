import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password.js';
import { generateTokenPair, verifyAccessToken, verifyRefreshToken } from '../utils/jwt.js';
import { User } from '../types/user.js';

describe('Authentication Infrastructure', () => {
  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    passwordHash: 'hashedpassword',
    firstName: 'John',
    lastName: 'Doe',
    role: 'company_employee',
    companyId: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  describe('Password Utilities', () => {
    test('should hash password correctly', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await hashPassword(password);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
    });

    test('should compare passwords correctly', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await hashPassword(password);
      
      const isValid = await comparePassword(password, hashedPassword);
      const isInvalid = await comparePassword('wrongpassword', hashedPassword);
      
      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    test('should validate password strength', () => {
      const strongPassword = 'StrongPass123!';
      const weakPassword = 'weak';
      
      const strongResult = validatePasswordStrength(strongPassword);
      const weakResult = validatePasswordStrength(weakPassword);
      
      expect(strongResult.isValid).toBe(true);
      expect(strongResult.errors).toHaveLength(0);
      
      expect(weakResult.isValid).toBe(false);
      expect(weakResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe('JWT Utilities', () => {
    test('should generate token pair', () => {
      const tokens = generateTokenPair(mockUser);
      
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });

    test('should verify access token', () => {
      const tokens = generateTokenPair(mockUser);
      const payload = verifyAccessToken(tokens.accessToken);
      
      expect(payload.userId).toBe(mockUser.id);
      expect(payload.email).toBe(mockUser.email);
      expect(payload.role).toBe(mockUser.role);
      expect(payload.companyId).toBe(mockUser.companyId);
    });

    test('should verify refresh token', () => {
      const tokens = generateTokenPair(mockUser);
      const payload = verifyRefreshToken(tokens.refreshToken);
      
      expect(payload.userId).toBe(mockUser.id);
      expect(payload.email).toBe(mockUser.email);
      expect(payload.role).toBe(mockUser.role);
      expect(payload.companyId).toBe(mockUser.companyId);
    });

    test('should throw error for invalid token', () => {
      expect(() => {
        verifyAccessToken('invalid-token');
      }).toThrow('Invalid or expired access token');
    });
  });
});