import { Router, Request, Response } from 'express';
import { CampaignService } from '../services/CampaignService.js';
import { authenticate } from '../middleware/auth.js';
import { validate, validateQuery, validateParams } from '../middleware/validation.js';
import {
  createCampaignSchema,
  updateCampaignSchema,
  updateCampaignStatusSchema,
  assignContractorSchema,
  campaignFiltersSchema,
  campaignIdSchema
} from '../validation/campaign.js';

// Helper function to safely access authenticated user
const getAuthenticatedUser = (req: Request) => {
  if (!req.user) {
    throw new Error('User not authenticated');
  }
  return {
    id: req.user.userId,
    role: req.user.role,
    companyId: req.user.companyId || undefined
  };
};

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * GET /api/campaigns
 * Get all campaigns with role-based filtering
 */
router.get('/', validateQuery(campaignFiltersSchema), async (req: Request, res: Response) => {
  try {
    const user = getAuthenticatedUser(req);
    const filters = req.query;

    const campaigns = await CampaignService.getAllCampaigns(
      user.id,
      user.role,
      user.companyId,
      filters as any
    );

    res.json({
      success: true,
      data: campaigns
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to fetch campaigns'
      }
    });
  }
});

/**
 * GET /api/campaigns/stats
 * Get campaign statistics (company employees only)
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const user = getAuthenticatedUser(req);

    const stats = await CampaignService.getCampaignStats(
      user.id,
      user.role,
      user.companyId
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to fetch campaign statistics'
      }
    });
  }
});

/**
 * GET /api/campaigns/:id
 * Get campaign by ID with role-based access control
 */
router.get('/:id', validateParams(campaignIdSchema), async (req: Request, res: Response) => {
  try {
    const user = getAuthenticatedUser(req);
    const campaignId = parseInt(req.params.id);

    const campaign = await CampaignService.getCampaignById(
      campaignId,
      user.id,
      user.role,
      user.companyId
    );

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Campaign not found'
        }
      });
    }

    res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('permissions') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to fetch campaign'
      }
    });
  }
});

/**
 * POST /api/campaigns
 * Create a new campaign (company employees only)
 */
router.post('/', validate(createCampaignSchema), async (req: Request, res: Response) => {
  try {
    const user = getAuthenticatedUser(req);
    const campaignData = req.body;

    const campaign = await CampaignService.createCampaign(
      campaignData,
      user.id,
      user.role
    );

    res.status(201).json({
      success: true,
      data: campaign
    });
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('permissions') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to create campaign'
      }
    });
  }
});

/**
 * PUT /api/campaigns/:id
 * Update campaign by ID (company employees only)
 */
router.put('/:id', 
  validateParams(campaignIdSchema),
  validate(updateCampaignSchema),
  async (req: Request, res: Response) => {
    try {
      const user = getAuthenticatedUser(req);
      const campaignId = parseInt(req.params.id);
      const updateData = req.body;

      const campaign = await CampaignService.updateCampaign(
        campaignId,
        updateData,
        user.id,
        user.role,
        user.companyId
      );

      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Campaign not found'
          }
        });
      }

      res.json({
        success: true,
        data: campaign
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('permissions') ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to update campaign'
        }
      });
    }
  }
);

/**
 * DELETE /api/campaigns/:id
 * Delete campaign by ID (company employees only)
 */
router.delete('/:id', validateParams(campaignIdSchema), async (req: Request, res: Response) => {
  try {
    const user = getAuthenticatedUser(req);
    const campaignId = parseInt(req.params.id);

    const deleted = await CampaignService.deleteCampaign(
      campaignId,
      user.id,
      user.role
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Campaign not found'
        }
      });
    }

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('permissions') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to delete campaign'
      }
    });
  }
});

/**
 * PUT /api/campaigns/:id/status
 * Update campaign status (company employees only)
 */
router.put('/:id/status',
  validateParams(campaignIdSchema),
  validate(updateCampaignStatusSchema),
  async (req: Request, res: Response) => {
    try {
      const user = getAuthenticatedUser(req);
      const campaignId = parseInt(req.params.id);
      const { status } = req.body;

      const campaign = await CampaignService.updateCampaignStatus(
        campaignId,
        status,
        user.id,
        user.role
      );

      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Campaign not found'
          }
        });
      }

      res.json({
        success: true,
        data: campaign
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('permissions') ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to update campaign status'
        }
      });
    }
  }
);

/**
 * POST /api/campaigns/:id/contractors
 * Assign contractor to campaign (company employees only)
 */
router.post('/:id/contractors',
  validateParams(campaignIdSchema),
  validate(assignContractorSchema),
  async (req: Request, res: Response) => {
    try {
      const user = getAuthenticatedUser(req);
      const campaignId = parseInt(req.params.id);
      const { contractorId } = req.body;

      const assigned = await CampaignService.assignContractor(
        campaignId,
        contractorId,
        user.id,
        user.role
      );

      if (!assigned) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Failed to assign contractor'
          }
        });
      }

      res.json({
        success: true,
        message: 'Contractor assigned successfully'
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('permissions') ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to assign contractor'
        }
      });
    }
  }
);

/**
 * DELETE /api/campaigns/:id/contractors/:contractorId
 * Remove contractor assignment from campaign (company employees only)
 */
router.delete('/:id/contractors/:contractorId', 
  validateParams(campaignIdSchema),
  async (req: Request, res: Response) => {
    try {
      const user = getAuthenticatedUser(req);
      const campaignId = parseInt(req.params.id);
      const contractorId = parseInt(req.params.contractorId);

      if (isNaN(contractorId)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid contractor ID'
          }
        });
      }

      const removed = await CampaignService.removeContractorAssignment(
        campaignId,
        contractorId,
        user.id,
        user.role
      );

      if (!removed) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Contractor assignment not found'
          }
        });
      }

      res.json({
        success: true,
        message: 'Contractor assignment removed successfully'
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message.includes('permissions') ? 403 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to remove contractor assignment'
        }
      });
    }
  }
);

/**
 * GET /api/campaigns/:id/contractors
 * Get assigned contractors for a campaign
 */
router.get('/:id/contractors', validateParams(campaignIdSchema), async (req: Request, res: Response) => {
  try {
    const user = getAuthenticatedUser(req);
    const campaignId = parseInt(req.params.id);

    const contractors = await CampaignService.getAssignedContractors(
      campaignId,
      user.id,
      user.role,
      user.companyId
    );

    res.json({
      success: true,
      data: contractors
    });
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('permissions') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to fetch assigned contractors'
      }
    });
  }
});

/**
 * GET /api/campaigns/company/:companyId
 * Get campaigns by company ID
 */
router.get('/company/:companyId', async (req: Request, res: Response) => {
  try {
    const user = getAuthenticatedUser(req);
    const companyId = parseInt(req.params.companyId);

    if (isNaN(companyId)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid company ID'
        }
      });
    }

    const campaigns = await CampaignService.getCampaignsByCompanyId(
      companyId,
      user.id,
      user.role,
      user.companyId
    );

    res.json({
      success: true,
      data: campaigns
    });
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('permissions') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to fetch campaigns by company'
      }
    });
  }
});

/**
 * GET /api/campaigns/contractor/:contractorId
 * Get campaigns assigned to a contractor
 */
router.get('/contractor/:contractorId', async (req: Request, res: Response) => {
  try {
    const user = getAuthenticatedUser(req);
    const contractorId = parseInt(req.params.contractorId);

    if (isNaN(contractorId)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid contractor ID'
        }
      });
    }

    const campaigns = await CampaignService.getCampaignsByContractorId(
      contractorId,
      user.id,
      user.role
    );

    res.json({
      success: true,
      data: campaigns
    });
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('permissions') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to fetch campaigns by contractor'
      }
    });
  }
});

export default router;