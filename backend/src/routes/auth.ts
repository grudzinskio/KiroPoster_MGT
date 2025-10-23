import { Router, Request, Response } from 'express';
import { UserService } from '../services/UserService.js';
import { verifyRefreshToken, generateTokenPair } from '../utils/jwt.js';
import { validate } from '../middleware/validation.js';
import { loginSchema, refreshTokenSchema, changePasswordSchema } from '../validation/auth.js';
import { authenticate } from '../middleware/auth.js';
import { SecurityService } from '../services/SecurityService.js';

import { SessionService } from '../services/SessionService.js';
import { auditLoggers } from '../middleware/auditLogger.js';

const router = Router();

/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 */
router.post('/login', auditLoggers.auth, validate(loginSchema), async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent');

  try {
    // Check account lockout
    const lockoutInfo = await SecurityService.checkAccountLockout(username, ipAddress);
    
    if (lockoutInfo.isLocked) {
      await SecurityService.logLoginAttempt({
        username,
        ipAddress,
        success: false,
        failureReason: 'account_locked',
        userAgent
      });

      res.status(423).json({
        success: false,
        error: {
          message: `Account temporarily locked. Try again after ${lockoutInfo.lockoutUntil?.toLocaleTimeString()}`,
          lockoutUntil: lockoutInfo.lockoutUntil
        }
      });
      return;
    }

    const result = await UserService.authenticate({ username, password });

    if (!result) {
      // Log failed attempt
      await SecurityService.logLoginAttempt({
        username,
        ipAddress,
        success: false,
        failureReason: 'invalid_credentials',
        userAgent
      });

      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid username or password',
          remainingAttempts: lockoutInfo.remainingAttempts - 1
        }
      });
      return;
    }

    const { user, tokens } = result;

    // Log successful attempt
    await SecurityService.logLoginAttempt({
      username,
      ipAddress,
      success: true,
      userAgent
    });

    // Clear any failed attempts
    await SecurityService.clearFailedAttempts(username);

    // Create session
    const sessionToken = await SessionService.createSession(
      user.id,
      tokens.refreshToken,
      ipAddress,
      userAgent
    );

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Set session token as httpOnly cookie
    res.cookie('sessionToken', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.status(200).json({
      success: true,
      data: {
        user,
        accessToken: tokens.accessToken
      }
    });
  } catch (error) {
    // Log failed attempt due to error
    await SecurityService.logLoginAttempt({
      username,
      ipAddress,
      success: false,
      failureReason: 'system_error',
      userAgent
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Login failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', validate(refreshTokenSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    
    // Also check for refresh token in cookies as fallback
    const token = refreshToken || req.cookies.refreshToken;
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Refresh token required'
        }
      });
      return;
    }

    // Verify refresh token
    const payload = verifyRefreshToken(token);
    
    // Get current user data
    const user = await UserService.getUserById(payload.userId);
    
    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: {
          message: 'User not found or inactive'
        }
      });
      return;
    }

    // Generate new token pair
    const userForTokens = { ...user, passwordHash: '' } as any; // UserModel expects User type
    const tokens = generateTokenPair(userForTokens);

    // Update refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      success: true,
      data: {
        user,
        accessToken: tokens.accessToken
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Invalid or expired refresh token'
      }
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user and clear refresh token
 */
router.post('/logout', authenticate, auditLoggers.auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionToken = req.cookies.sessionToken;
    
    // Deactivate session if exists
    if (sessionToken && req.user) {
      await SessionService.deactivateSession(sessionToken, req.user.userId);
    }

    // Clear cookies
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.clearCookie('sessionToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(200).json({
      success: true,
      data: {
        message: 'Logged out successfully'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Logout failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user information
 */
router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required'
        }
      });
      return;
    }

    const user = await UserService.getUserById(req.user.userId);
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          message: 'User not found'
        }
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get user information',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password', authenticate, auditLoggers.auth, validate(changePasswordSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required'
        }
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    const success = await UserService.changePassword(req.user.userId, currentPassword, newPassword);

    if (!success) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Failed to change password'
        }
      });
      return;
    }

    // Deactivate all other sessions for security
    await SessionService.deactivateAllUserSessions(req.user.userId, req.cookies.sessionToken);

    res.status(200).json({
      success: true,
      data: {
        message: 'Password changed successfully'
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to change password'
      }
    });
  }
});



/**
 * GET /api/auth/sessions
 * Get active sessions for current user
 */
router.get('/sessions', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required'
        }
      });
      return;
    }

    const sessions = await SessionService.getUserSessions(req.user.userId);

    res.status(200).json({
      success: true,
      data: {
        sessions
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get sessions'
      }
    });
  }
});

/**
 * POST /api/auth/revoke-all-sessions
 * Revoke all sessions except current one
 */
router.post('/revoke-all-sessions', authenticate, auditLoggers.auth, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required'
        }
      });
      return;
    }

    const currentSessionToken = req.cookies.sessionToken;
    const revokedCount = await SessionService.deactivateAllUserSessions(
      req.user.userId,
      currentSessionToken
    );

    res.status(200).json({
      success: true,
      data: {
        message: `Revoked ${revokedCount} sessions`,
        revokedCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to revoke sessions'
      }
    });
  }
});

export default router;