import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AuditService } from '../../services/AuditService.js';
import db from '../../database/connection.js';

describe('AuditService', () => {
  beforeEach(async () => {
    // Clean up audit logs before each test
    await db('audit_logs').del();
  });

  afterEach(async () => {
    // Clean up after each test
    await db('audit_logs').del();
  });

  describe('logAction', () => {
    it('should log user action successfully', async () => {
      const auditEntry = {
        userId: 1,
        action: 'create',
        resourceType: 'user',
        resourceId: 2,
        oldValues: null,
        newValues: { name: 'Test User' },
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        requestId: 'test-request-123'
      };

      await AuditService.logAction(auditEntry);

      const logs = await db('audit_logs').select('*');
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        user_id: 1,
        action: 'create',
        resource_type: 'user',
        resource_id: 2,
        ip_address: '127.0.0.1',
        user_agent: 'Test Agent',
        request_id: 'test-request-123'
      });
    });

    it('should handle logging without user ID', async () => {
      const auditEntry = {
        action: 'system_startup',
        resourceType: 'system',
        ipAddress: '127.0.0.1'
      };

      await AuditService.logAction(auditEntry);

      const logs = await db('audit_logs').select('*');
      expect(logs).toHaveLength(1);
      expect(logs[0].user_id).toBeNull();
      expect(logs[0].action).toBe('system_startup');
    });

    it('should not throw error on logging failure', async () => {
      // This test ensures the service doesn't break the main operation
      const auditEntry = {
        action: 'test',
        resourceType: 'test'
      };

      // Should not throw
      await expect(AuditService.logAction(auditEntry)).resolves.toBeUndefined();
    });
  });

  describe('getAuditLogs', () => {
    beforeEach(async () => {
      // Insert test data
      await db('audit_logs').insert([
        {
          user_id: 1,
          action: 'create',
          resource_type: 'user',
          resource_id: 1,
          ip_address: '127.0.0.1',
          created_at: new Date('2024-01-01')
        },
        {
          user_id: 2,
          action: 'update',
          resource_type: 'campaign',
          resource_id: 1,
          ip_address: '192.168.1.1',
          created_at: new Date('2024-01-02')
        },
        {
          user_id: 1,
          action: 'delete',
          resource_type: 'image',
          resource_id: 1,
          ip_address: '127.0.0.1',
          created_at: new Date('2024-01-03')
        }
      ]);
    });

    it('should get all logs without filters', async () => {
      const logs = await AuditService.getAuditLogs();
      expect(logs).toHaveLength(3);
    });

    it('should filter by user ID', async () => {
      const logs = await AuditService.getAuditLogs({ userId: 1 });
      expect(logs).toHaveLength(2);
      expect(logs.every(log => log.user_id === 1)).toBe(true);
    });

    it('should filter by action', async () => {
      const logs = await AuditService.getAuditLogs({ action: 'create' });
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('create');
    });

    it('should filter by resource type', async () => {
      const logs = await AuditService.getAuditLogs({ resourceType: 'user' });
      expect(logs).toHaveLength(1);
      expect(logs[0].resource_type).toBe('user');
    });

    it('should filter by date range', async () => {
      const logs = await AuditService.getAuditLogs({
        startDate: new Date('2024-01-02'),
        endDate: new Date('2024-01-02')
      });
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('update');
    });

    it('should apply limit and offset', async () => {
      const logs = await AuditService.getAuditLogs({ limit: 2, offset: 1 });
      expect(logs).toHaveLength(2);
    });
  });

  describe('getAuditStats', () => {
    beforeEach(async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      await db('audit_logs').insert([
        {
          user_id: 1,
          action: 'create',
          resource_type: 'user',
          created_at: now
        },
        {
          user_id: 1,
          action: 'create',
          resource_type: 'campaign',
          created_at: now
        },
        {
          user_id: 2,
          action: 'update',
          resource_type: 'user',
          created_at: yesterday
        }
      ]);
    });

    it('should return audit statistics', async () => {
      const stats = await AuditService.getAuditStats(30);
      
      expect(stats.totalActions).toBe(3);
      expect(stats.actionsByType).toHaveProperty('create');
      expect(stats.actionsByType).toHaveProperty('update');
      expect(stats.actionsByType.create).toBe(2);
      expect(stats.actionsByType.update).toBe(1);
      expect(stats.recentActivity).toHaveLength(3);
    });
  });

  describe('cleanupOldLogs', () => {
    beforeEach(async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 400); // 400 days ago
      
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 30); // 30 days ago
      
      await db('audit_logs').insert([
        {
          user_id: 1,
          action: 'old_action',
          resource_type: 'user',
          created_at: oldDate
        },
        {
          user_id: 1,
          action: 'recent_action',
          resource_type: 'user',
          created_at: recentDate
        }
      ]);
    });

    it('should clean up old logs', async () => {
      const deletedCount = await AuditService.cleanupOldLogs(365);
      expect(deletedCount).toBe(1);
      
      const remainingLogs = await db('audit_logs').select('*');
      expect(remainingLogs).toHaveLength(1);
      expect(remainingLogs[0].action).toBe('recent_action');
    });
  });
});