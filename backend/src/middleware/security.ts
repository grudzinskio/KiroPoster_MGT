import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

/**
 * Enhanced helmet configuration for security headers
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for file uploads
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  } : false,
  // Additional production security headers
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: false,
  dnsPrefetchControl: { allow: false },
  ieNoOpen: true,
  hidePoweredBy: true
});

/**
 * Request sanitization middleware
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Remove any potential XSS attempts from request body
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }
  
  next();
};

/**
 * Recursively sanitize object properties
 */
const sanitizeObject = (obj: any): void => {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === 'string') {
        // Remove potential script tags and other dangerous content
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  }
};

/**
 * File upload security middleware
 */
export const fileUploadSecurity = (req: Request, res: Response, next: NextFunction): void => {
  // Check Content-Type header for file uploads
  const contentType = req.headers['content-type'];
  
  if (contentType && contentType.includes('multipart/form-data')) {
    // Additional security checks for file uploads can be added here
    // For now, we'll rely on multer configuration in the upload service
  }
  
  next();
};

/**
 * Request logging for security audit
 */
export const securityLogger = (req: Request, res: Response, next: NextFunction): void => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const method = req.method;
  const url = req.url;
  
  // Log security-relevant requests
  if (method !== 'GET' || url.includes('/auth/') || url.includes('/admin/')) {
    console.log(`[SECURITY] ${timestamp} - ${ip} - ${method} ${url} - ${userAgent}`);
  }
  
  next();
};