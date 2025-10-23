import db from '../database/connection.js';
import { logger } from '../config/logger.js';
import crypto from 'crypto';

export interface LoginAttempt {
  username: string;
  ipAddress: string;
  success: boolean;
  failureReason?: string;
  userAgent?: string;
}

export interface AccountLockoutInfo {
  isLocked: boolean;
  lockoutUntil?: Date;
  failedAttempts: number;
  remainingAttempts: number;
}

export class SecurityService {
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION_MINUTES = 30;
  private static readonly ATTEMPT_WINDOW_MINUTES = 15;

  /**
   * Log login attempt
   */
  static async logLoginAttempt(attempt: LoginAttempt): Promise<void> {
    try {
      await db('login_attempts').insert({
        username: attempt.username,
        ip_address: attempt.ipAddress,
        success: attempt.success,
        failure_reason: attempt.failureReason,
        user_agent: attempt.userAgent,
        attempted_at: new Date()
      });

      if (!attempt.success) {
        logger.warn('Failed login attempt', {
          username: attempt.username,
          ipAddress: attempt.ipAddress,
          reason: attempt.failureReason
        });
      }
    } catch (error) {
      logger.error('Failed to log login attempt', {
        error: error instanceof Error ? error.message : 'Unknown error',
        attempt
      });
    }
  }

  /**
   * Check if account is locked due to failed login attempts
   */
  static async checkAccountLockout(username: string, ipAddress: string): Promise<AccountLockoutInfo> {
    try {
      const windowStart = new Date();
      windowStart.setMinutes(windowStart.getMinutes() - this.ATTEMPT_WINDOW_MINUTES);

      // Get recent failed attempts for this username
      const failedAttempts = await db('login_attempts')
        .where('username', username)
        .where('success', false)
        .where('attempted_at', '>=', windowStart)
        .orderBy('attempted_at', 'desc');

      const failedCount = failedAttempts.length;

      if (failedCount >= this.MAX_LOGIN_ATTEMPTS) {
        const lastFailedAttempt = failedAttempts[0];
        const lockoutUntil = new Date(lastFailedAttempt.attempted_at);
        lockoutUntil.setMinutes(lockoutUntil.getMinutes() + this.LOCKOUT_DURATION_MINUTES);

        if (new Date() < lockoutUntil) {
          return {
            isLocked: true,
            lockoutUntil,
            failedAttempts: failedCount,
            remainingAttempts: 0
          };
        }
      }

      return {
        isLocked: false,
        failedAttempts: failedCount,
        remainingAttempts: Math.max(0, this.MAX_LOGIN_ATTEMPTS - failedCount)
      };
    } catch (error) {
      logger.error('Failed to check account lockout', {
        error: error instanceof Error ? error.message : 'Unknown error',
        username,
        ipAddress
      });
      
      // Return safe default (not locked) to avoid blocking legitimate users
      return {
        isLocked: false,
        failedAttempts: 0,
        remainingAttempts: this.MAX_LOGIN_ATTEMPTS
      };
    }
  }

  /**
   * Clear failed login attempts for successful login
   */
  static async clearFailedAttempts(username: string): Promise<void> {
    try {
      const windowStart = new Date();
      windowStart.setMinutes(windowStart.getMinutes() - this.LOCKOUT_DURATION_MINUTES);

      await db('login_attempts')
        .where('username', username)
        .where('success', false)
        .where('attempted_at', '>=', windowStart)
        .del();
    } catch (error) {
      logger.error('Failed to clear failed login attempts', {
        error: error instanceof Error ? error.message : 'Unknown error',
        username
      });
    }
  }

  /**
   * Get login attempt statistics
   */
  static async getLoginStats(days: number = 7): Promise<{
    totalAttempts: number;
    successfulLogins: number;
    failedAttempts: number;
    uniqueIPs: number;
    topFailureReasons: Array<{ reason: string; count: number }>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Total attempts
      const totalResult = await db('login_attempts')
        .where('attempted_at', '>=', startDate)
        .count('* as count')
        .first();

      // Successful logins
      const successResult = await db('login_attempts')
        .where('attempted_at', '>=', startDate)
        .where('success', true)
        .count('* as count')
        .first();

      // Failed attempts
      const failedResult = await db('login_attempts')
        .where('attempted_at', '>=', startDate)
        .where('success', false)
        .count('* as count')
        .first();

      // Unique IPs
      const uniqueIPsResult = await db('login_attempts')
        .where('attempted_at', '>=', startDate)
        .countDistinct('ip_address as count')
        .first();

      // Top failure reasons
      const failureReasons = await db('login_attempts')
        .where('attempted_at', '>=', startDate)
        .where('success', false)
        .whereNotNull('failure_reason')
        .select('failure_reason as reason')
        .count('* as count')
        .groupBy('failure_reason')
        .orderBy('count', 'desc')
        .limit(5);

      return {
        totalAttempts: Number(totalResult?.count) || 0,
        successfulLogins: Number(successResult?.count) || 0,
        failedAttempts: Number(failedResult?.count) || 0,
        uniqueIPs: Number(uniqueIPsResult?.count) || 0,
        topFailureReasons: failureReasons.map((item: any) => ({
          reason: item.reason,
          count: Number(item.count)
        }))
      };
    } catch (error) {
      throw new Error(`Failed to get login statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate secure random token
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash token for storage
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Verify token against hash
   */
  static verifyToken(token: string, hash: string): boolean {
    const tokenHash = this.hashToken(token);
    return crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hash));
  }

  /**
   * Clean up old login attempts
   */
  static async cleanupOldLoginAttempts(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const deletedCount = await db('login_attempts')
        .where('attempted_at', '<', cutoffDate)
        .del();

      logger.info(`Cleaned up ${deletedCount} old login attempt records`);
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old login attempts', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}