import { Router, Request, Response } from 'express';
import { UserService } from '../services/UserService.js';
import { verifyRefreshToken, generateTokenPair } from '../utils/jwt.js';
import { validate } from '../middleware/validation.js';
import { loginSchema, refreshTokenSchema, changePasswordSchema } from '../validation/auth.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 */
router.post('/login', validate(loginSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const result = await UserService.authenticate({ email, password });

    if (!result) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password'
        }
      });
      return;
    }

    const { user, tokens } = result;

    // Set refresh token as httpOnly cookie
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
router.post('/logout', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
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
router.post('/change-password', authenticate, validate(changePasswordSchema), async (req: Request, res: Response): Promise<void> => {
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

export default router;