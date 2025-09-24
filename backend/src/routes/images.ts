import express from 'express';
import { ImageService } from '../services/ImageService.js';
import { authenticate } from '../middleware/auth.js';
import { validate, validateQuery, validateParams } from '../middleware/validation.js';
import { upload } from '../utils/fileUpload.js';
import { 
  imageApprovalSchema, 
  imageFiltersSchema, 
  campaignIdSchema, 
  imageIdSchema, 
  uploaderIdSchema 
} from '../validation/image.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * GET /api/images
 * Get all images with optional filtering
 */
router.get('/', validateQuery(imageFiltersSchema), async (req, res) => {
  try {
    const { user } = req as any;
    const filters = req.query;

    const images = await ImageService.getAllImages(
      user.id,
      user.role,
      user.companyId,
      filters
    );

    res.json({
      success: true,
      data: images
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to get images'
      }
    });
  }
});

/**
 * GET /api/images/pending
 * Get pending images for review (company employees only)
 */
router.get('/pending', async (req, res) => {
  try {
    const { user } = req as any;

    const images = await ImageService.getPendingImages(user.id, user.role);

    res.json({
      success: true,
      data: images
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to get pending images'
      }
    });
  }
});

/**
 * GET /api/images/stats
 * Get image statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const { user } = req as any;
    const { campaignId } = req.query;

    const stats = await ImageService.getImageStats(
      user.id,
      user.role,
      campaignId ? Number(campaignId) : undefined
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to get image statistics'
      }
    });
  }
});

/**
 * GET /api/images/:id
 * Get image by ID
 */
router.get('/:id', validateParams(imageIdSchema), async (req, res) => {
  try {
    const { user } = req as any;
    const { id } = req.params;

    const image = await ImageService.getImageById(
      Number(id),
      user.id,
      user.role,
      user.companyId
    );

    if (!image) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Image not found'
        }
      });
    }

    res.json({
      success: true,
      data: image
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to get image'
      }
    });
  }
});

/**
 * GET /api/images/:id/file
 * Serve image file
 */
router.get('/:id/file', validateParams(imageIdSchema), async (req, res) => {
  try {
    const { user } = req as any;
    const { id } = req.params;

    const filePath = await ImageService.getImageFilePath(
      Number(id),
      user.id,
      user.role,
      user.companyId
    );

    if (!filePath) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Image not found'
        }
      });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Image file not found'
        }
      });
    }

    // Set appropriate headers
    const extension = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };

    const mimeType = mimeTypes[extension] || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to serve image file'
      }
    });
  }
});

/**
 * POST /api/images/upload/:campaignId
 * Upload images for a campaign
 */
router.post('/upload/:campaignId', 
  validateParams(campaignIdSchema),
  upload.array('images', 10), // Allow up to 10 images
  async (req, res) => {
    try {
      const { user } = req as any;
      const { campaignId } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'No files uploaded'
          }
        });
      }

      const uploadedImages = [];
      const errors = [];

      // Process each uploaded file
      for (const file of files) {
        try {
          const image = await ImageService.uploadImage(
            file,
            Number(campaignId),
            user.id,
            user.role
          );
          uploadedImages.push(image);
        } catch (error) {
          errors.push({
            filename: file.originalname,
            error: error instanceof Error ? error.message : 'Upload failed'
          });
        }
      }

      // Return results
      if (uploadedImages.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'All uploads failed',
            details: errors
          }
        });
      }

      res.status(201).json({
        success: true,
        data: {
          uploaded: uploadedImages,
          errors: errors.length > 0 ? errors : undefined
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to upload images'
        }
      });
    }
  }
);

/**
 * PUT /api/images/:id/approve
 * Approve or reject an image
 */
router.put('/:id/approve', 
  validateParams(imageIdSchema),
  validate(imageApprovalSchema),
  async (req, res) => {
    try {
      const { user } = req as any;
      const { id } = req.params;
      const approvalData = {
        ...req.body,
        reviewedBy: user.id
      };

      const image = await ImageService.updateImageApproval(
        Number(id),
        approvalData,
        user.id,
        user.role
      );

      if (!image) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Image not found'
          }
        });
      }

      res.json({
        success: true,
        data: image
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to update image approval'
        }
      });
    }
  }
);

/**
 * DELETE /api/images/:id
 * Delete an image
 */
router.delete('/:id', validateParams(imageIdSchema), async (req, res) => {
  try {
    const { user } = req as any;
    const { id } = req.params;

    const deleted = await ImageService.deleteImage(
      Number(id),
      user.id,
      user.role
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Image not found'
        }
      });
    }

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to delete image'
      }
    });
  }
});

/**
 * GET /api/images/campaign/:campaignId
 * Get images by campaign ID
 */
router.get('/campaign/:campaignId', 
  validateParams(campaignIdSchema),
  async (req, res) => {
    try {
      const { user } = req as any;
      const { campaignId } = req.params;

      const images = await ImageService.getImagesByCampaignId(
        Number(campaignId),
        user.id,
        user.role,
        user.companyId
      );

      res.json({
        success: true,
        data: images
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to get images by campaign'
        }
      });
    }
  }
);

/**
 * GET /api/images/uploader/:uploaderId
 * Get images by uploader ID
 */
router.get('/uploader/:uploaderId', 
  validateParams(uploaderIdSchema),
  async (req, res) => {
    try {
      const { user } = req as any;
      const { uploaderId } = req.params;

      const images = await ImageService.getImagesByUploaderId(
        Number(uploaderId),
        user.id,
        user.role
      );

      res.json({
        success: true,
        data: images
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to get images by uploader'
        }
      });
    }
  }
);

export default router;