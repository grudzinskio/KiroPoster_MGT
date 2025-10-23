import db from '../database/connection.js';
import { logger } from '../config/logger.js';

export interface AuditLogEntry {
  userId?: number;
  action: string;
  resourceType: string;
  resourceId?: number;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface AuditLogFilter {
  userId?: number;
  action?: string;
  resourceType?: string;
  resourceId?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class AuditService {
  /**
   * Log user action for audit trail
   */
  static async logAction(entry: AuditLogEntry): Promise<void> {
    try {
      await db('audit_logs').insert({
        user_id: entry.userId,
        action: entry.action,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId,
        old_values: entry.oldValues ? JSON.stringify(entry.oldValues) : null,
        new_values: entry.newValues ? JSON.stringify(entry.newValues) : null,
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent,
        request_id: entry.requestId,
        created_at: new Date()
      });

      // Also log to application logger for immediate monitoring
      logger.info(`Audit: ${entry.action}`, {
        userId: entry.userId,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        ipAddress: entry.ipAddress,
        requestId: entry.requestId
      });
    } catch (error) {
      logger.error('Failed to log audit entry', {
        error: error instanceof Error ? error.message : 'Unknown error',
        entry
      });
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Get audit logs with filtering
   */
  static async getAuditLogs(filters: AuditLogFilter = {}): Promise<any[]> {
    try {
      let query = db('audit_logs')
        .leftJoin('users', 'audit_logs.user_id', 'users.id')
        .select(
          'audit_logs.*',
          'users.email as user_email',
          'users.first_name as user_first_name',
          'users.last_name as user_last_name'
        )
        .orderBy('audit_logs.created_at', 'desc');

      if (filters.userId) {
        query = query.where('audit_logs.user_id', filters.userId);
      }

      if (filters.action) {
        query = query.where('audit_logs.action', filters.action);
      }

      if (filters.resourceType) {
        query = query.where('audit_logs.resource_type', filters.resourceType);
      }

      if (filters.resourceId) {
        query = query.where('audit_logs.resource_id', filters.resourceId);
      }

      if (filters.startDate) {
        query = query.where('audit_logs.created_at', '>=', filters.startDate);
      }

      if (filters.endDate) {
        query = query.where('audit_logs.created_at', '<=', filters.endDate);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.offset(filters.offset);
      }

      const logs = await query;

      return logs.map((log: any) => ({
        ...log,
        old_values: log.old_values ? JSON.parse(log.old_values) : null,
        new_values: log.new_values ? JSON.parse(log.new_values) : null
      }));
    } catch (error) {
      throw new Error(`Failed to get audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get audit statistics
   */
  static async getAuditStats(days: number = 30): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    actionsByUser: Record<string, number>;
    recentActivity: any[];
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get total actions
      const totalResult = await db('audit_logs')
        .where('created_at', '>=', startDate)
        .count('* as count')
        .first();

      // Get actions by type
      const actionsByType = await db('audit_logs')
        .where('created_at', '>=', startDate)
        .select('action')
        .count('* as count')
        .groupBy('action')
        .orderBy('count', 'desc');

      // Get actions by user
      const actionsByUser = await db('audit_logs')
        .leftJoin('users', 'audit_logs.user_id', 'users.id')
        .where('audit_logs.created_at', '>=', startDate)
        .select('users.email', 'users.first_name', 'users.last_name')
        .count('* as count')
        .groupBy('users.id', 'users.email', 'users.first_name', 'users.last_name')
        .orderBy('count', 'desc')
        .limit(10);

      // Get recent activity
      const recentActivity = await this.getAuditLogs({ limit: 20 });

      return {
        totalActions: Number(totalResult?.count) || 0,
        actionsByType: actionsByType.reduce((acc: any, item: any) => {
          acc[item.action] = item.count;
          return acc;
        }, {} as Record<string, number>),
        actionsByUser: actionsByUser.reduce((acc: any, item: any) => {
          const userName = item.email || `${item.first_name} ${item.last_name}`.trim() || 'Unknown';
          acc[userName] = item.count;
          return acc;
        }, {} as Record<string, number>),
        recentActivity
      };
    } catch (error) {
      throw new Error(`Failed to get audit statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean up old audit logs
   */
  static async cleanupOldLogs(retentionDays: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const deletedCount = await db('audit_logs')
        .where('created_at', '<', cutoffDate)
        .del();

      logger.info(`Cleaned up ${deletedCount} old audit log entries`);
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old audit logs', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}