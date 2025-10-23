import { describe, it, expect } from '@jest/globals';
import {
  validateUsernameFormat,
  generateUsernameFromEmail,
  generateUniqueUsername,
  normalizeUsername,
  getUsernameValidationError
} from '../../utils/usernameUtils.js';

describe('Username Utils', () => {
  describe('validateUsernameFormat', () => {
    it('should validate correct usernames', () => {
      expect(validateUsernameFormat('user123')).toBe(true);
      expect(validateUsernameFormat('test_user')).toBe(true);
      expect(validateUsernameFormat('user-name')).toBe(true);
      expect(validateUsernameFormat('abc')).toBe(true); // minimum length
      expect(validateUsernameFormat('a'.repeat(30))).toBe(true); // maximum length
    });

    it('should reject invalid usernames', () => {
      expect(validateUsernameFormat('')).toBe(false);
      expect(validateUsernameFormat('ab')).toBe(false); // too short
      expect(validateUsernameFormat('a'.repeat(31))).toBe(false); // too long
      expect(validateUsernameFormat('user@name')).toBe(false); // invalid character
      expect(validateUsernameFormat('user.name')).toBe(false); // invalid character
      expect(validateUsernameFormat('user name')).toBe(false); // space
      expect(validateUsernameFormat(null as any)).toBe(false);
      expect(validateUsernameFormat(undefined as any)).toBe(false);
    });
  });

  describe('generateUsernameFromEmail', () => {
    it('should generate username from simple email', () => {
      expect(generateUsernameFromEmail('john@example.com')).toBe('john');
      expect(generateUsernameFromEmail('test@domain.org')).toBe('test');
    });

    it('should handle email with dots', () => {
      expect(generateUsernameFromEmail('john.doe@example.com')).toBe('john_doe');
      expect(generateUsernameFromEmail('first.middle.last@domain.com')).toBe('first_middle_last');
    });

    it('should remove invalid characters', () => {
      expect(generateUsernameFromEmail('user+tag@example.com')).toBe('usertag');
      expect(generateUsernameFromEmail('user#symbol@example.com')).toBe('usersymbol');
      expect(generateUsernameFromEmail('user.name+tag@example.com')).toBe('user_nametag');
    });

    it('should handle minimum length requirement', () => {
      expect(generateUsernameFromEmail('a@example.com')).toBe('a00');
      expect(generateUsernameFromEmail('ab@example.com')).toBe('ab0');
    });

    it('should handle maximum length requirement', () => {
      const longEmail = 'a'.repeat(40) + '@example.com';
      const result = generateUsernameFromEmail(longEmail);
      expect(result.length).toBe(30);
      expect(result).toBe('a'.repeat(30));
    });

    it('should convert to lowercase', () => {
      expect(generateUsernameFromEmail('John.Doe@Example.COM')).toBe('john_doe');
      expect(generateUsernameFromEmail('TESTUSER@DOMAIN.ORG')).toBe('testuser');
    });

    it('should throw error for invalid email', () => {
      expect(() => generateUsernameFromEmail('')).toThrow('Invalid email provided');
      expect(() => generateUsernameFromEmail('@example.com')).toThrow('Invalid email format');
      expect(() => generateUsernameFromEmail(null as any)).toThrow('Invalid email provided');
    });
  });

  describe('generateUniqueUsername', () => {
    it('should return base username if not taken', () => {
      const existingUsernames = new Set<string>();
      expect(generateUniqueUsername('testuser', existingUsernames)).toBe('testuser');
    });

    it('should append number for conflicts', () => {
      const existingUsernames = new Set(['testuser', 'testuser1']);
      expect(generateUniqueUsername('testuser', existingUsernames)).toBe('testuser2');
    });

    it('should handle case insensitive conflicts', () => {
      const existingUsernames = new Set(['testuser']);
      expect(generateUniqueUsername('TestUser', existingUsernames)).toBe('TestUser1');
    });

    it('should truncate base username if needed for suffix', () => {
      const longBase = 'a'.repeat(30);
      const existingUsernames = new Set([longBase]);
      const result = generateUniqueUsername(longBase, existingUsernames);
      expect(result.length).toBe(30);
      expect(result).toBe('a'.repeat(29) + '1');
    });

    it('should handle multiple conflicts', () => {
      const existingUsernames = new Set(['user', 'user1', 'user2', 'user3']);
      expect(generateUniqueUsername('user', existingUsernames)).toBe('user4');
    });
  });

  describe('normalizeUsername', () => {
    it('should convert to lowercase', () => {
      expect(normalizeUsername('TestUser')).toBe('testuser');
      expect(normalizeUsername('USER_NAME')).toBe('user_name');
      expect(normalizeUsername('MixedCase123')).toBe('mixedcase123');
    });
  });

  describe('getUsernameValidationError', () => {
    it('should return null for valid usernames', () => {
      expect(getUsernameValidationError('validuser')).toBeNull();
      expect(getUsernameValidationError('user_123')).toBeNull();
      expect(getUsernameValidationError('test-user')).toBeNull();
    });

    it('should return appropriate error messages', () => {
      expect(getUsernameValidationError('')).toBe('Username is required');
      expect(getUsernameValidationError('ab')).toBe('Username must be at least 3 characters long');
      expect(getUsernameValidationError('a'.repeat(31))).toBe('Username must be no more than 30 characters long');
      expect(getUsernameValidationError('user@name')).toBe('Username must contain only letters, numbers, underscores, and hyphens');
      expect(getUsernameValidationError('user.name')).toBe('Username must contain only letters, numbers, underscores, and hyphens');
      expect(getUsernameValidationError(null as any)).toBe('Username is required');
    });
  });

  describe('Migration scenario tests', () => {
    it('should handle typical email-to-username conversion scenarios', () => {
      const testEmails = [
        'john.doe@company.com',
        'jane_smith@example.org',
        'test+user@domain.co.uk',
        'admin@site.com',
        'user123@test.net'
      ];

      const existingUsernames = new Set<string>();
      const generatedUsernames: string[] = [];

      for (const email of testEmails) {
        const baseUsername = generateUsernameFromEmail(email);
        const uniqueUsername = generateUniqueUsername(baseUsername, existingUsernames);
        
        expect(validateUsernameFormat(uniqueUsername)).toBe(true);
        expect(existingUsernames.has(uniqueUsername.toLowerCase())).toBe(false);
        
        existingUsernames.add(uniqueUsername.toLowerCase());
        generatedUsernames.push(uniqueUsername);
      }

      expect(generatedUsernames).toEqual([
        'john_doe',
        'jane_smith',
        'testuser',
        'admin',
        'user123'
      ]);
    });

    it('should handle duplicate email prefixes', () => {
      const duplicateEmails = [
        'john@company1.com',
        'john@company2.com',
        'john@company3.com'
      ];

      const existingUsernames = new Set<string>();
      const generatedUsernames: string[] = [];

      for (const email of duplicateEmails) {
        const baseUsername = generateUsernameFromEmail(email);
        const uniqueUsername = generateUniqueUsername(baseUsername, existingUsernames);
        
        existingUsernames.add(uniqueUsername.toLowerCase());
        generatedUsernames.push(uniqueUsername);
      }

      expect(generatedUsernames).toEqual(['john', 'john1', 'john2']);
    });
  });
});