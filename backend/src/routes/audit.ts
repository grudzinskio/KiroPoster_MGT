import { Router, Request, Response } from 'express';
import { AuditService } from '../services/AuditService.js';
import { SecurityService } from '../services/SecurityService.js';
import { PasswordResetService } from '../services/PasswordResetService.js';
import { SessionService } from '../services/SessionService.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, validateQuery } from '../middleware/validation.js';
import Joi from 'joi';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * Audit log filters validation schema
 */
const auditFiltersSchema = Joi.object({
  userId: Joi.number().integer().positive().optional(),
  action: Joi.string().max(100).optional(),
  resourceType: Joi.string().max(50).optional(),
  resourceId: Joi.number().integer().positive().optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  limit: Joi.number().integer().min(1).max(1000).default(100).optional(),
  offset: Joi.number().integer().min(0).default(0).optional()
});

/**
 * Stats query validation schema
 */
const statsQuerySchema = Joi.object({
  days: Joi.number().integer().min(1).max(365).default(30).optional()
});

/**
 * GET /api/audit/logs
 * Get audit logs (company employees only)
 */
router.get('/logs', 
  authorize('company_employee'),
  validateQuery(auditFiltersSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = req.query;
      const logs = await AuditService.getAuditLogs(filters);

      res.status(200).json({
        success: true,
        data: {
          logs,
          filters
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get audit logs',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
);

/**
 * GET /api/audit/stats
 * Get audit statistics (company employees only)
 */
router.get('/stats',
  authorize('company_employee'),
  validateQuery(statsQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { days = 30 } = req.query;
      const stats = await AuditService.getAuditStats(Number(days));

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get audit statistics',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
);

/**
 * GET /api/audit/security/login-stats
 * Get login attempt statistics (company employees only)
 */
router.get('/security/login-stats',
  authorize('company_employee'),
  validateQuery(statsQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { days = 7 } = req.query;
      const stats = await SecurityService.getLoginStats(Number(days));

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get login statistics',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
);

/**
 * GET /api/audit/security/password-reset-stats
 * Get password reset statistics (company employees only)
 */
router.get('/security/password-reset-stats',
  authorize('company_employee'),
  validateQuery(statsQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { days = 30 } = req.query;
      const stats = await PasswordResetService.getResetStats(Number(days));

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get password reset statistics',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
);

/**
 * GET /api/audit/security/session-stats
 * Get session statistics (company employees only)
 */
router.get('/security/session-stats',
  authorize('company_employee'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await SessionService.getSessionStats();

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get session statistics',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
);

/**
 * POST /api/audit/cleanup
 * Clean up old audit data (company employees only)
 */
router.post('/cleanup',
  authorize('company_employee'),
  validate(Joi.object({
    auditRetentionDays: Joi.number().integer().min(30).max(3650).default(365).optional(),
    loginAttemptsRetentionDays: Joi.number().integer().min(30).max(365).default(90).optional(),
    passwordResetRetentionDays: Joi.number().integer().min(7).max(90).default(30).optional(),
    sessionRetentionDays: Joi.number().integer().min(30).max(365).default(90).optional()
  })),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        auditRetentionDays = 365,
        loginAttemptsRetentionDays = 90,
        passwordResetRetentionDays = 30,
        sessionRetentionDays = 90
      } = req.body;

      const results = await Promise.allSettled([
        AuditService.cleanupOldLogs(auditRetentionDays),
        SecurityService.cleanupOldLoginAttempts(loginAttemptsRetentionDays),
        PasswordResetService.cleanupOldTokens(passwordResetRetentionDays),
        SessionService.cleanupOldSessions(sessionRetentionDays)
      ]);

      const cleanupResults = {
        auditLogs: results[0].status === 'fulfilled' ? results[0].value : 0,
        loginAttempts: results[1].status === 'fulfilled' ? results[1].value : 0,
        passwordResetTokens: results[2].status === 'fulfilled' ? results[2].value : 0,
        sessions: results[3].status === 'fulfilled' ? results[3].value : 0
      };

      const errors = results
        .map((result, index) => ({ result, index }))
        .filter(({ result }) => result.status === 'rejected')
        .map(({ result, index }) => ({
          operation: ['auditLogs', 'loginAttempts', 'passwordResetTokens', 'sessions'][index],
          error: (result as PromiseRejectedResult).reason
        }));

      res.status(200).json({
        success: true,
        data: {
          cleanupResults,
          errors: errors.length > 0 ? errors : undefined
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to cleanup audit data',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
);

/**
 * GET /api/audit/user/:userId/activity
 * Get activity for a specific user (company employees only, or own activity)
 */
router.get('/user/:userId/activity',
  validateQuery(auditFiltersSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const requestingUser = req.user!;
      
      // Users can only view their own activity unless they're company employees
      if (requestingUser.role !== 'company_employee' && requestingUser.userId !== Number(userId)) {
        res.status(403).json({
          success: false,
          error: {
            message: 'Insufficient permissions to view user activity'
          }
        });
        return;
      }

      const filters = {
        ...req.query,
        userId: Number(userId)
      };

      const logs = await AuditService.getAuditLogs(filters);

      res.status(200).json({
        success: true,
        data: {
          logs,
          userId: Number(userId)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get user activity',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
);

export default router;