import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/AuditService.js';

// Extend Express Request interface to include audit info
declare global {
  namespace Express {
    interface Request {
      auditInfo?: {
        resourceType?: string;
        resourceId?: number;
        oldValues?: any;
      };
    }
  }
}

/**
 * Middleware to automatically log user actions for audit trail
 */
export const auditLogger = (resourceType: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Store original res.json to intercept response
    const originalJson = res.json;
    
    res.json = function(body: any) {
      // Log the action after successful response
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const action = getActionFromRequest(req);
        const resourceId = getResourceIdFromRequest(req, body);
        
        // Don't await this to avoid blocking the response
        AuditService.logAction({
          userId: req.user.userId,
          action,
          resourceType,
          resourceId,
          oldValues: req.auditInfo?.oldValues,
          newValues: getNewValuesFromResponse(req, body),
          ipAddress: getClientIP(req),
          userAgent: req.get('User-Agent'),
          requestId: (req as any).requestId
        }).catch(error => {
          // Error is already logged in AuditService
        });
      }
      
      return originalJson.call(this, body);
    };

    next();
  };
};

/**
 * Middleware to capture old values before update operations
 */
export const captureOldValues = (getOldValuesFn: (req: Request) => Promise<any>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.method === 'PUT' || req.method === 'PATCH') {
        const oldValues = await getOldValuesFn(req);
        req.auditInfo = { ...req.auditInfo, oldValues };
      }
      next();
    } catch (error) {
      // Continue even if we can't capture old values
      next();
    }
  };
};

/**
 * Get action name from HTTP request
 */
function getActionFromRequest(req: Request): string {
  const method = req.method.toLowerCase();
  const path = req.route?.path || req.path;
  
  // Map HTTP methods to action names
  const actionMap: Record<string, string> = {
    'post': 'create',
    'put': 'update',
    'patch': 'update',
    'delete': 'delete',
    'get': 'view'
  };

  let action = actionMap[method] || method;

  // Add specific action context based on path
  if (path.includes('/login')) {
    action = 'login';
  } else if (path.includes('/logout')) {
    action = 'logout';
  } else if (path.includes('/password')) {
    action = 'password_change';
  } else if (path.includes('/approve')) {
    action = 'approve';
  } else if (path.includes('/reject')) {
    action = 'reject';
  } else if (path.includes('/assign')) {
    action = 'assign';
  } else if (path.includes('/status')) {
    action = 'status_change';
  }

  return action;
}

/**
 * Extract resource ID from request or response
 */
function getResourceIdFromRequest(req: Request, responseBody: any): number | undefined {
  // Try to get ID from URL parameters
  if (req.params.id) {
    return parseInt(req.params.id);
  }

  // Try to get ID from response body
  if (responseBody?.data?.id) {
    return responseBody.data.id;
  }

  if (responseBody?.data?.user?.id) {
    return responseBody.data.user.id;
  }

  if (responseBody?.data?.campaign?.id) {
    return responseBody.data.campaign.id;
  }

  if (responseBody?.data?.company?.id) {
    return responseBody.data.company.id;
  }

  if (responseBody?.data?.image?.id) {
    return responseBody.data.image.id;
  }

  return undefined;
}

/**
 * Extract new values from response for audit trail
 */
function getNewValuesFromResponse(req: Request, responseBody: any): any {
  if (!responseBody?.data) {
    return undefined;
  }

  // For create/update operations, capture the new state
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    return responseBody.data;
  }

  // For status changes, capture the status
  if (req.path.includes('/status') && req.body.status) {
    return { status: req.body.status };
  }

  return undefined;
}

/**
 * Get client IP address from request
 */
function getClientIP(req: Request): string {
  return (
    req.ip ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection as any)?.socket?.remoteAddress ||
    req.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    req.get('X-Real-IP') ||
    'unknown'
  );
}

/**
 * Specific audit loggers for different resources
 */
export const auditLoggers = {
  user: auditLogger('user'),
  company: auditLogger('company'),
  campaign: auditLogger('campaign'),
  image: auditLogger('image'),
  auth: auditLogger('auth')
};