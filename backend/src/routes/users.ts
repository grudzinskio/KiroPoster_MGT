import { Router, Request, Response } from 'express';
import { UserService } from '../services/UserService.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { createUserSchema, updateUserSchema } from '../validation/auth.js';

const router = Router();

/**
 * GET /api/users
 * Get all users (Company Employees only)
 */
router.get('/', authenticate, authorize('company_employee'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, companyId, isActive, search } = req.query;

    const filters: any = {};
    
    if (role && typeof role === 'string') {
      filters.role = role;
    }
    
    if (companyId && typeof companyId === 'string') {
      filters.companyId = parseInt(companyId, 10);
    }
    
    if (isActive !== undefined && typeof isActive === 'string') {
      filters.isActive = isActive === 'true';
    }
    
    if (search && typeof search === 'string') {
      filters.search = search;
    }

    const users = await UserService.getAllUsers(filters);

    res.status(200).json({
      success: true,
      data: {
        users,
        count: users.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch users',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * GET /api/users/stats
 * Get user statistics (Company Employees only)
 */
router.get('/stats', authenticate, authorize('company_employee'), async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await UserService.getUserStats();

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch user statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id, 10);
    
    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid user ID'
        }
      });
      return;
    }

    // Users can only view their own profile unless they're company employees
    if (req.user?.role !== 'company_employee' && req.user?.userId !== userId) {
      res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions'
        }
      });
      return;
    }

    const user = await UserService.getUserById(userId);

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
        message: 'Failed to fetch user',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * POST /api/users
 * Create a new user (Company Employees only)
 */
router.post('/', authenticate, authorize('company_employee'), validate(createUserSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const userData = req.body;

    const user = await UserService.createUser(userData);

    res.status(201).json({
      success: true,
      data: {
        user,
        message: 'User created successfully'
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to create user'
      }
    });
  }
});

/**
 * PUT /api/users/:id
 * Update user by ID
 */
router.put('/:id', authenticate, validate(updateUserSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id, 10);
    
    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid user ID'
        }
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required'
        }
      });
      return;
    }

    const updateData = req.body;

    const user = await UserService.updateUser(
      userId, 
      updateData, 
      req.user.userId, 
      req.user.role
    );

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
        user,
        message: 'User updated successfully'
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to update user'
      }
    });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user by ID (Company Employees only)
 */
router.delete('/:id', authenticate, authorize('company_employee'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id, 10);
    
    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid user ID'
        }
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required'
        }
      });
      return;
    }

    const success = await UserService.deleteUser(userId, req.user.role);

    if (!success) {
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
        message: 'User deleted successfully'
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to delete user'
      }
    });
  }
});

/**
 * PATCH /api/users/:id/status
 * Toggle user active status (Company Employees only)
 */
router.patch('/:id/status', authenticate, authorize('company_employee'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { isActive } = req.body;
    
    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid user ID'
        }
      });
      return;
    }

    if (typeof isActive !== 'boolean') {
      res.status(400).json({
        success: false,
        error: {
          message: 'isActive must be a boolean value'
        }
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required'
        }
      });
      return;
    }

    const user = await UserService.toggleUserStatus(userId, isActive, req.user.role);

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
        user,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to update user status'
      }
    });
  }
});

/**
 * GET /api/users/company/:companyId
 * Get users by company ID (Company Employees only)
 */
router.get('/company/:companyId', authenticate, authorize('company_employee'), async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    
    if (isNaN(companyId)) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid company ID'
        }
      });
      return;
    }

    const users = await UserService.getUsersByCompanyId(companyId);

    res.status(200).json({
      success: true,
      data: {
        users,
        count: users.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch users by company',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

export default router;