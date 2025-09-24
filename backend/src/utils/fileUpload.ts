import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Allowed image MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
];

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Upload directory
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'images');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random string
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(file.originalname);
    const filename = `${timestamp}-${randomString}${extension}`;
    cb(null, filename);
  }
});

// File filter function
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`));
  }

  // Additional security check on file extension
  const extension = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  
  if (!allowedExtensions.includes(extension)) {
    return cb(new Error(`Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`));
  }

  cb(null, true);
};

// Create multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10 // Maximum 10 files per request
  }
});

// Utility functions
export const getUploadPath = (filename: string): string => {
  return path.join(UPLOAD_DIR, filename);
};

export const deleteFile = (filename: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const filePath = getUploadPath(filename);
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

export const fileExists = (filename: string): boolean => {
  const filePath = getUploadPath(filename);
  return fs.existsSync(filePath);
};

export const validateImageFile = (file: Express.Multer.File): { isValid: boolean; error?: string } => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return {
      isValid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
    };
  }

  // Check file extension
  const extension = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  
  if (!allowedExtensions.includes(extension)) {
    return {
      isValid: false,
      error: `Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`
    };
  }

  return { isValid: true };
};

// Security validation for uploaded files
export const performSecurityScan = async (filePath: string): Promise<{ isSafe: boolean; reason?: string }> => {
  try {
    // Read first few bytes to check file signature
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    // Check for common image file signatures
    const signatures = {
      jpeg: [0xFF, 0xD8, 0xFF],
      png: [0x89, 0x50, 0x4E, 0x47],
      gif: [0x47, 0x49, 0x46],
      webp: [0x52, 0x49, 0x46, 0x46] // RIFF header for WebP
    };

    let isValidSignature = false;
    
    // Check JPEG signature
    if (buffer[0] === signatures.jpeg[0] && buffer[1] === signatures.jpeg[1] && buffer[2] === signatures.jpeg[2]) {
      isValidSignature = true;
    }
    
    // Check PNG signature
    if (buffer[0] === signatures.png[0] && buffer[1] === signatures.png[1] && 
        buffer[2] === signatures.png[2] && buffer[3] === signatures.png[3]) {
      isValidSignature = true;
    }
    
    // Check GIF signature
    if (buffer[0] === signatures.gif[0] && buffer[1] === signatures.gif[1] && buffer[2] === signatures.gif[2]) {
      isValidSignature = true;
    }
    
    // Check WebP signature (RIFF)
    if (buffer[0] === signatures.webp[0] && buffer[1] === signatures.webp[1] && 
        buffer[2] === signatures.webp[2] && buffer[3] === signatures.webp[3]) {
      // Also check for WEBP at offset 8
      if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
        isValidSignature = true;
      }
    }

    if (!isValidSignature) {
      return {
        isSafe: false,
        reason: 'File signature does not match expected image format'
      };
    }

    // Additional checks could be added here:
    // - Scan for embedded scripts
    // - Check for suspicious metadata
    // - Validate image dimensions

    return { isSafe: true };
  } catch (error) {
    return {
      isSafe: false,
      reason: `Security scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

export const getFileStats = (filePath: string): { size: number; mtime: Date } | null => {
  try {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      mtime: stats.mtime
    };
  } catch (error) {
    return null;
  }
};