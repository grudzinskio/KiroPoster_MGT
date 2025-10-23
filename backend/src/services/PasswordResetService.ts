import db from '../database/connection.js';
import { logger } from '../config/logger.js';
import { SecurityService } from './SecurityService.js';
import { UserModel } from '../models/User.js';
import { AuditService } from './AuditService.js';

export interface PasswordResetRequest {
  email: string;
  ipAddress: string;
  userAgent?: string;
}

export interface PasswordResetToken {
  id: number;
  userId: number;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
  usedAt?: Date;
}

export class PasswordResetService {
  private static readonly TOKEN_EXPIRY_HOURS = 1; // 1 hour expiry
  private static readonly MAX_TOKENS_PER_USER = 3; // Max active tokens per user

  /**
   * Request password reset - generates token and returns it (for email sending)
   */
  static async requestPasswordReset(request: PasswordResetRequest): Promise<{ token: string; user: any } | null> {
    // TODO: Remove this entire service as part of email removal task
    logger.warn('Password reset functionality disabled - email functionality removed');
    return null;
  }

  /**
   * Verify password reset token
   */
  static async verifyResetToken(token: string): Promise<{ valid: boolean; userId?: number; error?: string }> {
    try {
      const tokenHash = SecurityService.hashToken(token);
      
      const resetToken = await db('password_reset_tokens')
        .where('token', tokenHash)
        .where('used', false)
        .where('expires_at', '>', new Date())
        .first();

      if (!resetToken) {
        return {
          valid: false,
          error: 'Invalid or expired reset token'
        };
      }

      return {
        valid: true,
        userId: resetToken.user_id
      };
    } catch (error) {
      logger.error('Failed to verify reset token', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return {
        valid: false,
        error: 'Token verification failed'
      };
    }
  }

  /**
   * Reset password using token
   */
  static async resetPassword(
    token: string, 
    newPassword: string, 
    ipAddress: string, 
    userAgent?: string
  ): Promise<{ success: boolean; error?: string }> {
    const trx = await db.transaction();
    
    try {
      // Verify token
      const verification = await this.verifyResetToken(token);
      if (!verification.valid || !verification.userId) {
        return {
          success: false,
          error: verification.error || 'Invalid token'
        };
      }

      const userId = verification.userId;
      const tokenHash = SecurityService.hashToken(token);

      // Get user to ensure they still exist and are active
      const user = await UserModel.findById(userId);
      if (!user || !user.isActive) {
        await trx.rollback();
        return {
          success: false,
          error: 'User not found or inactive'
        };
      }

      // Update password
      const passwordUpdated = await UserModel.updatePassword(userId, newPassword);
      if (!passwordUpdated) {
        await trx.rollback();
        return {
          success: false,
          error: 'Failed to update password'
        };
      }

      // Mark token as used
      await trx('password_reset_tokens')
        .where('token', tokenHash)
        .update({
          used: true,
          used_at: new Date()
        });

      // Invalidate all other tokens for this user
      await trx('password_reset_tokens')
        .where('user_id', userId)
        .where('token', '!=', tokenHash)
        .where('used', false)
        .update({
          used: true,
          used_at: new Date()
        });

      await trx.commit();

      // Log audit trail
      await AuditService.logAction({
        userId,
        action: 'password_reset_completed',
        resourceType: 'user',
        resourceId: userId,
        ipAddress,
        userAgent
      });

      logger.info('Password reset completed', {
        userId,
        username: user.username, // Changed from email
        ipAddress
      });

      return { success: true };
    } catch (error) {
      await trx.rollback();
      
      logger.error('Failed to reset password', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ipAddress
      });
      
      return {
        success: false,
        error: 'Password reset failed'
      };
    }
  }

  /**
   * Clean up expired and excess tokens for a user
   */
  private static async cleanupUserTokens(userId: number): Promise<void> {
    try {
      // Remove expired tokens
      await db('password_reset_tokens')
        .where('user_id', userId)
        .where('expires_at', '<', new Date())
        .del();

      // Get active tokens count
      const activeTokens = await db('password_reset_tokens')
        .where('user_id', userId)
        .where('used', false)
        .where('expires_at', '>', new Date())
        .orderBy('created_at', 'desc');

      // If too many active tokens, remove oldest ones
      if (activeTokens.length >= this.MAX_TOKENS_PER_USER) {
        const tokensToRemove = activeTokens.slice(this.MAX_TOKENS_PER_USER - 1);
        const tokenIds = tokensToRemove.map(t => t.id);
        
        if (tokenIds.length > 0) {
          await db('password_reset_tokens')
            .whereIn('id', tokenIds)
            .del();
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup user tokens', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
    }
  }

  /**
   * Get password reset statistics
   */
  static async getResetStats(days: number = 30): Promise<{
    totalRequests: number;
    completedResets: number;
    expiredTokens: number;
    activeTokens: number;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [totalRequests, completedResets, expiredTokens, activeTokens] = await Promise.all([
        db('password_reset_tokens')
          .where('created_at', '>=', startDate)
          .count('* as count')
          .first(),
        
        db('password_reset_tokens')
          .where('created_at', '>=', startDate)
          .where('used', true)
          .count('* as count')
          .first(),
        
        db('password_reset_tokens')
          .where('expires_at', '<', new Date())
          .where('used', false)
          .count('* as count')
          .first(),
        
        db('password_reset_tokens')
          .where('expires_at', '>', new Date())
          .where('used', false)
          .count('* as count')
          .first()
      ]);

      return {
        totalRequests: Number(totalRequests?.count) || 0,
        completedResets: Number(completedResets?.count) || 0,
        expiredTokens: Number(expiredTokens?.count) || 0,
        activeTokens: Number(activeTokens?.count) || 0
      };
    } catch (error) {
      throw new Error(`Failed to get reset statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean up old password reset tokens
   */
  static async cleanupOldTokens(retentionDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const deletedCount = await db('password_reset_tokens')
        .where('created_at', '<', cutoffDate)
        .del();

      logger.info(`Cleaned up ${deletedCount} old password reset tokens`);
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old password reset tokens', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}