import fs from 'fs';
import path from 'path';
import { config } from './env.js';
import { logger } from './logger.js';

/**
 * Storage configuration interface
 */
interface StorageConfig {
  type: 'local' | 'cloud';
  basePath: string;
  maxSize: number;
  allowedTypes: string[];
  structure: {
    uploads: string;
    temp: string;
    processed: string;
    thumbnails: string;
  };
}

/**
 * File metadata interface
 */
export interface FileMetadata {
  originalName: string;
  filename: string;
  path: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  campaignId: number;
  userId: number;
}

/**
 * Storage service class
 */
class StorageService {
  private config: StorageConfig;

  constructor() {
    this.config = {
      type: (process.env.STORAGE_TYPE as 'local' | 'cloud') || 'local',
      basePath: process.env.STORAGE_PATH || config.upload.uploadDir,
      maxSize: parseInt(process.env.STORAGE_MAX_SIZE || '1073741824'), // 1GB default
      allowedTypes: config.upload.allowedMimeTypes,
      structure: {
        uploads: 'uploads',
        temp: 'temp',
        processed: 'processed',
        thumbnails: 'thumbnails'
      }
    };

    this.initializeDirectories();
  }

  /**
   * Initialize storage directory structure
   */
  private initializeDirectories(): void {
    const directories = [
      this.config.basePath,
      path.join(this.config.basePath, this.config.structure.uploads),
      path.join(this.config.basePath, this.config.structure.temp),
      path.join(this.config.basePath, this.config.structure.processed),
      path.join(this.config.basePath, this.config.structure.thumbnails)
    ];

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
          logger.info(`Created storage directory: ${dir}`);
        } catch (error) {
          logger.error(`Failed to create storage directory: ${dir}`, { error });
          throw new Error(`Failed to create storage directory: ${dir}`);
        }
      }
    });

    // Create .gitkeep files to preserve directory structure
    directories.slice(1).forEach(dir => {
      const gitkeepPath = path.join(dir, '.gitkeep');
      if (!fs.existsSync(gitkeepPath)) {
        try {
          fs.writeFileSync(gitkeepPath, '');
        } catch (error) {
          logger.warn(`Failed to create .gitkeep in ${dir}`, { error });
        }
      }
    });

    // Set up directory permissions (Unix-like systems)
    if (process.platform !== 'win32') {
      directories.forEach(dir => {
        try {
          fs.chmodSync(dir, 0o755);
        } catch (error) {
          logger.warn(`Failed to set permissions for ${dir}`, { error });
        }
      });
    }
  }

  /**
   * Get file path for campaign
   */
  getCampaignPath(campaignId: number): string {
    const campaignDir = path.join(
      this.config.basePath,
      this.config.structure.uploads,
      `campaign_${campaignId}`
    );

    if (!fs.existsSync(campaignDir)) {
      fs.mkdirSync(campaignDir, { recursive: true, mode: 0o755 });
    }

    return campaignDir;
  }

  /**
   * Get temporary file path
   */
  getTempPath(): string {
    return path.join(this.config.basePath, this.config.structure.temp);
  }

  /**
   * Get processed file path
   */
  getProcessedPath(campaignId: number): string {
    const processedDir = path.join(
      this.config.basePath,
      this.config.structure.processed,
      `campaign_${campaignId}`
    );

    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir, { recursive: true, mode: 0o755 });
    }

    return processedDir;
  }

  /**
   * Get thumbnail path
   */
  getThumbnailPath(campaignId: number): string {
    const thumbnailDir = path.join(
      this.config.basePath,
      this.config.structure.thumbnails,
      `campaign_${campaignId}`
    );

    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true, mode: 0o755 });
    }

    return thumbnailDir;
  }

  /**
   * Generate unique filename
   */
  generateFilename(originalName: string, userId: number): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = path.extname(originalName);
    return `${timestamp}_${userId}_${random}${extension}`;
  }

  /**
   * Validate file
   */
  validateFile(file: Express.Multer.File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.config.maxSize) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${this.config.maxSize} bytes`
      };
    }

    // Check file type
    if (!this.config.allowedTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `File type ${file.mimetype} is not allowed`
      };
    }

    // Check for malicious file extensions
    const extension = path.extname(file.originalname).toLowerCase();
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.js', '.jar'];
    if (dangerousExtensions.includes(extension)) {
      return {
        valid: false,
        error: `File extension ${extension} is not allowed for security reasons`
      };
    }

    return { valid: true };
  }

  /**
   * Store file
   */
  async storeFile(
    file: Express.Multer.File,
    campaignId: number,
    userId: number
  ): Promise<FileMetadata> {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const filename = this.generateFilename(file.originalname, userId);
    const campaignPath = this.getCampaignPath(campaignId);
    const filePath = path.join(campaignPath, filename);

    try {
      // Move file from temp location to final location
      await fs.promises.copyFile(file.path, filePath);
      await fs.promises.unlink(file.path); // Clean up temp file

      // Set file permissions
      if (process.platform !== 'win32') {
        await fs.promises.chmod(filePath, 0o644);
      }

      const metadata: FileMetadata = {
        originalName: file.originalname,
        filename,
        path: filePath,
        size: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date(),
        campaignId,
        userId
      };

      logger.info(`File stored successfully`, {
        filename,
        campaignId,
        userId,
        size: file.size
      });

      return metadata;
    } catch (error) {
      logger.error(`Failed to store file`, {
        filename,
        campaignId,
        userId,
        error: error instanceof Error ? error.message : error
      });
      throw new Error('Failed to store file');
    }
  }

  /**
   * Delete file
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        logger.info(`File deleted successfully`, { filePath });
      }
    } catch (error) {
      logger.error(`Failed to delete file`, {
        filePath,
        error: error instanceof Error ? error.message : error
      });
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalSize: number;
    fileCount: number;
    campaignCount: number;
  }> {
    try {
      const uploadsPath = path.join(this.config.basePath, this.config.structure.uploads);
      let totalSize = 0;
      let fileCount = 0;
      let campaignCount = 0;

      if (fs.existsSync(uploadsPath)) {
        const campaigns = await fs.promises.readdir(uploadsPath);
        campaignCount = campaigns.filter(name => name.startsWith('campaign_')).length;

        for (const campaign of campaigns) {
          if (campaign.startsWith('campaign_')) {
            const campaignPath = path.join(uploadsPath, campaign);
            const files = await fs.promises.readdir(campaignPath);
            
            for (const file of files) {
              if (file !== '.gitkeep') {
                const filePath = path.join(campaignPath, file);
                const stats = await fs.promises.stat(filePath);
                totalSize += stats.size;
                fileCount++;
              }
            }
          }
        }
      }

      return { totalSize, fileCount, campaignCount };
    } catch (error) {
      logger.error('Failed to get storage statistics', { error });
      return { totalSize: 0, fileCount: 0, campaignCount: 0 };
    }
  }

  /**
   * Cleanup old temporary files
   */
  async cleanupTempFiles(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const tempPath = this.getTempPath();
      const files = await fs.promises.readdir(tempPath);
      const now = Date.now();

      for (const file of files) {
        if (file !== '.gitkeep') {
          const filePath = path.join(tempPath, file);
          const stats = await fs.promises.stat(filePath);
          
          if (now - stats.mtime.getTime() > maxAge) {
            await fs.promises.unlink(filePath);
            logger.info(`Cleaned up old temp file: ${file}`);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup temp files', { error });
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();

export default storageService;