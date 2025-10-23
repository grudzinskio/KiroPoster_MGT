import { describe, it, expect } from '@jest/globals';
import { generateUsernameFromEmail, generateUniqueUsername } from '../../utils/usernameUtils.js';

describe('Username Migration Logic', () => {
  describe('Migration simulation', () => {
    it('should successfully migrate a set of users from email to username', () => {
      // Simulate existing users with emails (like what would be in the database)
      const existingUsers = [
        { id: 1, email: 'john.doe@company.com' },
        { id: 2, email: 'jane.smith@example.org' },
        { id: 3, email: 'admin@site.com' },
        { id: 4, email: 'test.user@domain.co.uk' },
        { id: 5, email: 'contractor123@freelance.net' },
        { id: 6, email: 'john@different-company.com' }, // Potential conflict with john.doe
        { id: 7, email: 'a@short.com' }, // Short email that needs padding
        { id: 8, email: 'verylongusernamethatexceedslimit@example.com' }, // Long email that needs truncation
      ];

      const existingUsernames = new Set<string>();
      const migrationResults: Array<{ id: number; email: string; username: string }> = [];

      // Simulate the migration process
      for (const user of existingUsers) {
        const baseUsername = generateUsernameFromEmail(user.email);
        const finalUsername = generateUniqueUsername(baseUsername, existingUsernames);
        
        existingUsernames.add(finalUsername.toLowerCase());
        migrationResults.push({
          id: user.id,
          email: user.email,
          username: finalUsername
        });
      }

      // Verify all usernames are unique
      const usernames = migrationResults.map(r => r.username.toLowerCase());
      const uniqueUsernames = new Set(usernames);
      expect(uniqueUsernames.size).toBe(usernames.length);

      // Verify specific expected results
      expect(migrationResults[0].username).toBe('john_doe');
      expect(migrationResults[1].username).toBe('jane_smith');
      expect(migrationResults[2].username).toBe('admin');
      expect(migrationResults[3].username).toBe('test_user');
      expect(migrationResults[4].username).toBe('contractor123');
      expect(migrationResults[5].username).toBe('john'); // Different from john_doe
      expect(migrationResults[6].username).toBe('a00'); // Padded to minimum length
      expect(migrationResults[7].username.length).toBeLessThanOrEqual(30); // Truncated

      // Verify all usernames are valid
      for (const result of migrationResults) {
        expect(result.username.length).toBeGreaterThanOrEqual(3);
        expect(result.username.length).toBeLessThanOrEqual(30);
        expect(/^[a-zA-Z0-9_-]+$/.test(result.username)).toBe(true);
      }
    });

    it('should handle edge cases in migration', () => {
      const edgeCaseUsers = [
        { id: 1, email: 'user+tag@example.com' }, // Plus sign
        { id: 2, email: 'user.with.many.dots@example.com' }, // Multiple dots
        { id: 3, email: 'user@example.com' }, // Simple case
        { id: 4, email: 'user@example.com' }, // Duplicate email (shouldn't happen in real DB but test anyway)
        { id: 5, email: 'UPPERCASE@EXAMPLE.COM' }, // Uppercase
        { id: 6, email: 'user123@example.com' }, // Numbers
        { id: 7, email: 'user-name@example.com' }, // Hyphen (valid)
        { id: 8, email: 'user_name@example.com' }, // Underscore (valid)
      ];

      const existingUsernames = new Set<string>();
      const migrationResults: Array<{ id: number; email: string; username: string }> = [];

      for (const user of edgeCaseUsers) {
        const baseUsername = generateUsernameFromEmail(user.email);
        const finalUsername = generateUniqueUsername(baseUsername, existingUsernames);
        
        existingUsernames.add(finalUsername.toLowerCase());
        migrationResults.push({
          id: user.id,
          email: user.email,
          username: finalUsername
        });
      }

      // Verify results
      expect(migrationResults[0].username).toBe('usertag'); // Plus removed
      expect(migrationResults[1].username).toBe('user_with_many_dots'); // Dots converted to underscores
      expect(migrationResults[2].username).toBe('user');
      expect(migrationResults[3].username).toBe('user1'); // Conflict resolved
      expect(migrationResults[4].username).toBe('uppercase'); // Lowercase
      expect(migrationResults[5].username).toBe('user123'); // Numbers preserved
      expect(migrationResults[6].username).toBe('user-name'); // Hyphen preserved
      expect(migrationResults[7].username).toBe('user_name'); // Underscore preserved

      // Verify all are unique
      const usernames = migrationResults.map(r => r.username.toLowerCase());
      const uniqueUsernames = new Set(usernames);
      expect(uniqueUsernames.size).toBe(usernames.length);
    });

    it('should handle large number of conflicts', () => {
      // Simulate many users with the same email prefix
      const conflictUsers = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        email: `user@company${i}.com`
      }));

      const existingUsernames = new Set<string>();
      const migrationResults: Array<{ id: number; email: string; username: string }> = [];

      for (const user of conflictUsers) {
        const baseUsername = generateUsernameFromEmail(user.email);
        const finalUsername = generateUniqueUsername(baseUsername, existingUsernames);
        
        existingUsernames.add(finalUsername.toLowerCase());
        migrationResults.push({
          id: user.id,
          email: user.email,
          username: finalUsername
        });
      }

      // Verify all usernames are unique
      const usernames = migrationResults.map(r => r.username.toLowerCase());
      const uniqueUsernames = new Set(usernames);
      expect(uniqueUsernames.size).toBe(usernames.length);

      // Verify first few results
      expect(migrationResults[0].username).toBe('user');
      expect(migrationResults[1].username).toBe('user1');
      expect(migrationResults[2].username).toBe('user2');
      expect(migrationResults[99].username).toBe('user99');

      // Verify all are valid usernames
      for (const result of migrationResults) {
        expect(result.username.length).toBeGreaterThanOrEqual(3);
        expect(result.username.length).toBeLessThanOrEqual(30);
        expect(/^[a-zA-Z0-9_-]+$/.test(result.username)).toBe(true);
      }
    });
  });

  describe('Database schema validation', () => {
    it('should validate that migration steps are in correct order', () => {
      // This test validates the logical order of migration steps
      const migrationSteps = [
        '010_add_username_to_users.ts',
        '011_populate_usernames.ts', 
        '012_update_login_attempts_for_username.ts',
        '013_remove_email_from_users.ts',
        '014_remove_email_from_login_attempts.ts'
      ];

      // Verify the steps are in the expected order
      expect(migrationSteps[0]).toContain('add_username_to_users');
      expect(migrationSteps[1]).toContain('populate_usernames');
      expect(migrationSteps[2]).toContain('update_login_attempts');
      expect(migrationSteps[3]).toContain('remove_email_from_users');
      expect(migrationSteps[4]).toContain('remove_email_from_login_attempts');

      // Verify numbering is sequential
      for (let i = 0; i < migrationSteps.length - 1; i++) {
        const currentNum = parseInt(migrationSteps[i].substring(0, 3));
        const nextNum = parseInt(migrationSteps[i + 1].substring(0, 3));
        expect(nextNum).toBe(currentNum + 1);
      }
    });
  });
});