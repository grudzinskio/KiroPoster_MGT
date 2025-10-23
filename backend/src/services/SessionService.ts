import db from '../database/connection.js';
import { logger } from '../config/logger.js';
import { SecurityService } from './SecurityService.js';
import { AuditService } from './AuditService.js';

export interface UserSession {
  id: number;
  userId: number;
  sessionToken: string;
  refreshTokenHash: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  isActive: boolean;
  lastActivity: Date;
  createdAt: Date;
}

export interface SessionInfo {
  sessionId: number;
  ipAddress?: string;
  userAgent?: string;
  lastActivity: Date;
  createdAt: Date;
  isActive: boolean;
}

export class SessionService {
  private static readonly SESSION_TIMEOUT_HOURS = 24; // 24 hours
  private static readonly MAX_SESSIONS_PER_USER = 5; // Max concurrent sessions

  /**
   * Create new session
   */
  static async createSession(
    userId: number,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    try {
      // Clean up expired sessions first
      await this.cleanupExpiredSessions();
      
      // Clean up excess sessions for this user
      await this.cleanupUserSessions(userId);

      const sessionToken = SecurityService.generateSecureToken(32);
      const refreshTokenHash = SecurityService.hashToken(refreshToken);
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.SESSION_TIMEOUT_HOURS);

      await db('user_sessions').insert({
        user_id: userId,
        session_token: sessionToken,
        refresh_token_hash: refreshTokenHash,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: expiresAt,
        is_active: true,
        last_activity: new Date(),
        created_at: new Date()
      });

      // Log session creation
      await AuditService.logAction({
        userId,
        action: 'session_created',
        resourceType: 'session',
        ipAddress,
        userAgent
      });

      logger.info('Session created', {
        userId,
        sessionToken: sessionToken.substring(0, 8) + '...',
        ipAddress,
        expiresAt
      });

      return sessionToken;
    } catch (error) {
      logger.error('Failed to create session', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        ipAddress
      });
      throw new Error('Failed to create session');
    }
  }

  /**
   * Validate and update session activity
   */
  static async validateSession(sessionToken: string, refreshToken: string): Promise<{
    valid: boolean;
    userId?: number;
    session?: UserSession;
  }> {
    try {
      const session = await db('user_sessions')
        .where('session_token', sessionToken)
        .where('is_active', true)
        .where('expires_at', '>', new Date())
        .first();

      if (!session) {
        return { valid: false };
      }

      // Verify refresh token
      const refreshTokenValid = SecurityService.verifyToken(refreshToken, session.refresh_token_hash);
      if (!refreshTokenValid) {
        // Invalid refresh token - deactivate session
        await this.deactivateSession(sessionToken);
        return { valid: false };
      }

      // Update last activity
      await db('user_sessions')
        .where('id', session.id)
        .update({
          last_activity: new Date()
        });

      return {
        valid: true,
        userId: session.user_id,
        session
      };
    } catch (error) {
      logger.error('Failed to validate session', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionToken: sessionToken.substring(0, 8) + '...'
      });
      return { valid: false };
    }
  }

  /**
   * Deactivate session
   */
  static async deactivateSession(sessionToken: string, userId?: number): Promise<boolean> {
    try {
      const result = await db('user_sessions')
        .where('session_token', sessionToken)
        .update({
          is_active: false
        });

      if (result > 0 && userId) {
        await AuditService.logAction({
          userId,
          action: 'session_deactivated',
          resourceType: 'session'
        });
      }

      return result > 0;
    } catch (error) {
      logger.error('Failed to deactivate session', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionToken: sessionToken.substring(0, 8) + '...'
      });
      return false;
    }
  }

  /**
   * Deactivate all sessions for a user
   */
  static async deactivateAllUserSessions(userId: number, exceptSessionToken?: string): Promise<number> {
    try {
      let query = db('user_sessions')
        .where('user_id', userId)
        .where('is_active', true);

      if (exceptSessionToken) {
        query = query.where('session_token', '!=', exceptSessionToken);
      }

      const deactivatedCount = await query.update({
        is_active: false
      });

      if (deactivatedCount > 0) {
        await AuditService.logAction({
          userId,
          action: 'all_sessions_deactivated',
          resourceType: 'session',
          newValues: { deactivatedCount }
        });

        logger.info('All user sessions deactivated', {
          userId,
          deactivatedCount,
          exceptSession: exceptSessionToken ? exceptSessionToken.substring(0, 8) + '...' : undefined
        });
      }

      return deactivatedCount;
    } catch (error) {
      logger.error('Failed to deactivate all user sessions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  /**
   * Get active sessions for a user
   */
  static async getUserSessions(userId: number): Promise<SessionInfo[]> {
    try {
      const sessions = await db('user_sessions')
        .where('user_id', userId)
        .where('is_active', true)
        .where('expires_at', '>', new Date())
        .select('id', 'ip_address', 'user_agent', 'last_activity', 'created_at', 'is_active')
        .orderBy('last_activity', 'desc');

      return sessions.map(session => ({
        sessionId: session.id,
        ipAddress: session.ip_address,
        userAgent: session.user_agent,
        lastActivity: session.last_activity,
        createdAt: session.created_at,
        isActive: session.is_active
      }));
    } catch (error) {
      throw new Error(`Failed to get user sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean up expired sessions
   */
  private static async cleanupExpiredSessions(): Promise<number> {
    try {
      const deletedCount = await db('user_sessions')
        .where('expires_at', '<', new Date())
        .orWhere('is_active', false)
        .del();

      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} expired sessions`);
      }

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired sessions', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }

  /**
   * Clean up excess sessions for a user
   */
  private static async cleanupUserSessions(userId: number): Promise<void> {
    try {
      const activeSessions = await db('user_sessions')
        .where('user_id', userId)
        .where('is_active', true)
        .where('expires_at', '>', new Date())
        .orderBy('last_activity', 'desc');

      if (activeSessions.length >= this.MAX_SESSIONS_PER_USER) {
        const sessionsToRemove = activeSessions.slice(this.MAX_SESSIONS_PER_USER - 1);
        const sessionIds = sessionsToRemove.map(s => s.id);
        
        if (sessionIds.length > 0) {
          await db('user_sessions')
            .whereIn('id', sessionIds)
            .update({ is_active: false });

          logger.info(`Deactivated ${sessionIds.length} excess sessions for user ${userId}`);
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup user sessions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
    }
  }

  /**
   * Get session statistics
   */
  static async getSessionStats(): Promise<{
    activeSessions: number;
    totalSessions: number;
    sessionsByUser: Record<string, number>;
    averageSessionDuration: number;
  }> {
    try {
      const [activeResult, totalResult] = await Promise.all([
        db('user_sessions')
          .where('is_active', true)
          .where('expires_at', '>', new Date())
          .count('* as count')
          .first(),
        
        db('user_sessions')
          .count('* as count')
          .first()
      ]);

      // Sessions by user (top 10)
      const sessionsByUser = await db('user_sessions')
        .leftJoin('users', 'user_sessions.user_id', 'users.id')
        .where('user_sessions.is_active', true)
        .where('user_sessions.expires_at', '>', new Date())
        .select('users.email')
        .count('* as count')
        .groupBy('users.id', 'users.email')
        .orderBy('count', 'desc')
        .limit(10);

      // Average session duration (for completed sessions)
      const avgDurationResult = await db('user_sessions')
        .where('is_active', false)
        .whereNotNull('last_activity')
        .select(
          db.raw('AVG(TIMESTAMPDIFF(MINUTE, created_at, last_activity)) as avg_minutes')
        )
        .first();

      return {
        activeSessions: Number(activeResult?.count) || 0,
        totalSessions: Number(totalResult?.count) || 0,
        sessionsByUser: sessionsByUser.reduce((acc: any, item: any) => {
          acc[item.email || 'Unknown'] = Number(item.count);
          return acc;
        }, {} as Record<string, number>),
        averageSessionDuration: avgDurationResult?.avg_minutes || 0
      };
    } catch (error) {
      throw new Error(`Failed to get session statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean up old sessions
   */
  static async cleanupOldSessions(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const deletedCount = await db('user_sessions')
        .where('created_at', '<', cutoffDate)
        .del();

      logger.info(`Cleaned up ${deletedCount} old session records`);
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old sessions', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}