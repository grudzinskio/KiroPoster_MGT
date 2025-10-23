import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SecurityService } from '../../services/SecurityService.js';
import db from '../../database/connection.js';

describe('SecurityService', () => {
  beforeEach(async () => {
    // Clean up login attempts before each test
    await db('login_attempts').del();
  });

  afterEach(async () => {
    // Clean up after each test
    await db('login_attempts').del();
  });

  describe('logLoginAttempt', () => {
    it('should log successful login attempt', async () => {
      const attempt = {
        email: 'test@example.com',
        ipAddress: '127.0.0.1',
        success: true,
        userAgent: 'Test Agent'
      };

      await SecurityService.logLoginAttempt(attempt);

      const attempts = await db('login_attempts').select('*');
      expect(attempts).toHaveLength(1);
      expect(attempts[0]).toMatchObject({
        email: 'test@example.com',
        ip_address: '127.0.0.1',
        success: true,
        user_agent: 'Test Agent'
      });
    });

    it('should log failed login attempt with reason', async () => {
      const attempt = {
        email: 'test@example.com',
        ipAddress: '127.0.0.1',
        success: false,
        failureReason: 'invalid_credentials',
        userAgent: 'Test Agent'
      };

      await SecurityService.logLoginAttempt(attempt);

      const attempts = await db('login_attempts').select('*');
      expect(attempts).toHaveLength(1);
      expect(attempts[0]).toMatchObject({
        email: 'test@example.com',
        success: false,
        failure_reason: 'invalid_credentials'
      });
    });
  });

  describe('checkAccountLockout', () => {
    it('should return not locked for new account', async () => {
      const lockoutInfo = await SecurityService.checkAccountLockout(
        'new@example.com',
        '127.0.0.1'
      );

      expect(lockoutInfo.isLocked).toBe(false);
      expect(lockoutInfo.failedAttempts).toBe(0);
      expect(lockoutInfo.remainingAttempts).toBe(5);
    });

    it('should return locked after max failed attempts', async () => {
      const email = 'test@example.com';
      const ipAddress = '127.0.0.1';

      // Create 5 failed attempts within the window
      const now = new Date();
      for (let i = 0; i < 5; i++) {
        await db('login_attempts').insert({
          email,
          ip_address: ipAddress,
          success: false,
          failure_reason: 'invalid_credentials',
          attempted_at: new Date(now.getTime() - i * 60000) // 1 minute apart
        });
      }

      const lockoutInfo = await SecurityService.checkAccountLockout(email, ipAddress);

      expect(lockoutInfo.isLocked).toBe(true);
      expect(lockoutInfo.failedAttempts).toBe(5);
      expect(lockoutInfo.remainingAttempts).toBe(0);
      expect(lockoutInfo.lockoutUntil).toBeDefined();
    });

    it('should not be locked if attempts are outside window', async () => {
      const email = 'test@example.com';
      const ipAddress = '127.0.0.1';

      // Create old failed attempts (outside 15-minute window)
      const oldTime = new Date();
      oldTime.setMinutes(oldTime.getMinutes() - 20);

      for (let i = 0; i < 5; i++) {
        await db('login_attempts').insert({
          email,
          ip_address: ipAddress,
          success: false,
          failure_reason: 'invalid_credentials',
          attempted_at: oldTime
        });
      }

      const lockoutInfo = await SecurityService.checkAccountLockout(email, ipAddress);

      expect(lockoutInfo.isLocked).toBe(false);
      expect(lockoutInfo.failedAttempts).toBe(0);
    });

    it('should not be locked if lockout period has expired', async () => {
      const email = 'test@example.com';
      const ipAddress = '127.0.0.1';

      // Create failed attempts that would cause lockout, but 31 minutes ago
      const oldTime = new Date();
      oldTime.setMinutes(oldTime.getMinutes() - 31);

      for (let i = 0; i < 5; i++) {
        await db('login_attempts').insert({
          email,
          ip_address: ipAddress,
          success: false,
          failure_reason: 'invalid_credentials',
          attempted_at: oldTime
        });
      }

      const lockoutInfo = await SecurityService.checkAccountLockout(email, ipAddress);

      expect(lockoutInfo.isLocked).toBe(false);
    });
  });

  describe('clearFailedAttempts', () => {
    it('should clear recent failed attempts', async () => {
      const email = 'test@example.com';
      const now = new Date();

      // Insert recent failed attempts
      await db('login_attempts').insert([
        {
          email,
          ip_address: '127.0.0.1',
          success: false,
          attempted_at: now
        },
        {
          email,
          ip_address: '127.0.0.1',
          success: false,
          attempted_at: new Date(now.getTime() - 5 * 60000) // 5 minutes ago
        }
      ]);

      await SecurityService.clearFailedAttempts(email);

      const remainingAttempts = await db('login_attempts')
        .where('email', email)
        .where('success', false);

      expect(remainingAttempts).toHaveLength(0);
    });
  });

  describe('getLoginStats', () => {
    beforeEach(async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      await db('login_attempts').insert([
        {
          email: 'user1@example.com',
          ip_address: '127.0.0.1',
          success: true,
          attempted_at: now
        },
        {
          email: 'user2@example.com',
          ip_address: '192.168.1.1',
          success: false,
          failure_reason: 'invalid_credentials',
          attempted_at: yesterday
        },
        {
          email: 'user3@example.com',
          ip_address: '127.0.0.1',
          success: false,
          failure_reason: 'account_locked',
          attempted_at: now
        }
      ]);
    });

    it('should return login statistics', async () => {
      const stats = await SecurityService.getLoginStats(7);

      expect(stats.totalAttempts).toBe(3);
      expect(stats.successfulLogins).toBe(1);
      expect(stats.failedAttempts).toBe(2);
      expect(stats.uniqueIPs).toBe(2);
      expect(stats.topFailureReasons).toHaveLength(2);
      expect(stats.topFailureReasons[0].reason).toBe('invalid_credentials');
    });
  });

  describe('generateSecureToken', () => {
    it('should generate token of specified length', () => {
      const token = SecurityService.generateSecureToken(16);
      expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it('should generate different tokens each time', () => {
      const token1 = SecurityService.generateSecureToken();
      const token2 = SecurityService.generateSecureToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('hashToken and verifyToken', () => {
    it('should hash and verify token correctly', () => {
      const token = 'test-token-123';
      const hash = SecurityService.hashToken(token);
      
      expect(hash).not.toBe(token);
      expect(SecurityService.verifyToken(token, hash)).toBe(true);
      expect(SecurityService.verifyToken('wrong-token', hash)).toBe(false);
    });
  });

  describe('cleanupOldLoginAttempts', () => {
    beforeEach(async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days ago
      
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 30); // 30 days ago
      
      await db('login_attempts').insert([
        {
          email: 'old@example.com',
          ip_address: '127.0.0.1',
          success: false,
          attempted_at: oldDate
        },
        {
          email: 'recent@example.com',
          ip_address: '127.0.0.1',
          success: true,
          attempted_at: recentDate
        }
      ]);
    });

    it('should clean up old login attempts', async () => {
      const deletedCount = await SecurityService.cleanupOldLoginAttempts(90);
      expect(deletedCount).toBe(1);
      
      const remainingAttempts = await db('login_attempts').select('*');
      expect(remainingAttempts).toHaveLength(1);
      expect(remainingAttempts[0].email).toBe('recent@example.com');
    });
  });
});