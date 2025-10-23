import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../config/logger.js';
import { AuditService } from './AuditService.js';

export interface FileSecurityScanResult {
  safe: boolean;
  threats: string[];
  fileInfo: {
    size: number;
    mimeType: string;
    extension: string;
    hash: string;
  };
}

export interface FileUploadValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class FileSecurityService {
  // Allowed MIME types for images
  private static readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  // Allowed file extensions
  private static readonly ALLOWED_EXTENSIONS = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp'
  ];

  // Maximum file size (10MB)
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024;

  // Known malicious file signatures (magic bytes)
  private static readonly MALICIOUS_SIGNATURES = [
    // Executable signatures
    Buffer.from([0x4D, 0x5A]), // PE executable (MZ)
    Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF executable
    Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]), // Java class file
    Buffer.from([0xFE, 0xED, 0xFA, 0xCE]), // Mach-O executable
    Buffer.from([0xFE, 0xED, 0xFA, 0xCF]), // Mach-O executable (64-bit)
    
    // Script signatures
    Buffer.from('<?php'), // PHP script
    Buffer.from('#!/bin/'), // Shell script
    Buffer.from('<script'), // JavaScript in HTML
    Buffer.from('javascript:'), // JavaScript URL
    
    // Archive with executable content indicators
    Buffer.from('PK'), // ZIP archive (could contain executables)
  ];

  // Suspicious patterns in file content
  private static readonly SUSPICIOUS_PATTERNS = [
    /eval\s*\(/gi,
    /exec\s*\(/gi,
    /system\s*\(/gi,
    /shell_exec\s*\(/gi,
    /passthru\s*\(/gi,
    /base64_decode\s*\(/gi,
    /<\s*script[^>]*>/gi,
    /javascript\s*:/gi,
    /vbscript\s*:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
  ];

  /**
   * Validate file upload before processing
   */
  static validateFileUpload(
    filePath: string,
    originalName: string,
    mimeType: string,
    size: number
  ): FileUploadValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file size
    if (size > this.MAX_FILE_SIZE) {
      errors.push(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    if (size === 0) {
      errors.push('File is empty');
    }

    // Check MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      errors.push(`File type '${mimeType}' is not allowed`);
    }

    // Check file extension
    const extension = path.extname(originalName).toLowerCase();
    if (!this.ALLOWED_EXTENSIONS.includes(extension)) {
      errors.push(`File extension '${extension}' is not allowed`);
    }

    // Check for suspicious filename patterns
    if (this.hasSuspiciousFilename(originalName)) {
      warnings.push('Filename contains suspicious patterns');
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      errors.push('File not found');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Perform comprehensive security scan on uploaded file
   */
  static async scanFile(filePath: string, userId?: number): Promise<FileSecurityScanResult> {
    try {
      const stats = fs.statSync(filePath);
      const fileBuffer = fs.readFileSync(filePath);
      
      const fileInfo = {
        size: stats.size,
        mimeType: this.detectMimeType(fileBuffer),
        extension: path.extname(filePath).toLowerCase(),
        hash: this.calculateFileHash(fileBuffer)
      };

      const threats: string[] = [];

      // Check file signatures
      const signatureThreats = this.checkMaliciousSignatures(fileBuffer);
      threats.push(...signatureThreats);

      // Check for suspicious content patterns
      const contentThreats = this.checkSuspiciousContent(fileBuffer);
      threats.push(...contentThreats);

      // Check for embedded executables
      const embeddedThreats = this.checkEmbeddedExecutables(fileBuffer);
      threats.push(...embeddedThreats);

      // Check for polyglot files (files that are valid in multiple formats)
      const polyglotThreats = this.checkPolyglotFile(fileBuffer);
      threats.push(...polyglotThreats);

      const result: FileSecurityScanResult = {
        safe: threats.length === 0,
        threats,
        fileInfo
      };

      // Log security scan results
      if (threats.length > 0) {
        logger.warn('File security threats detected', {
          filePath,
          userId,
          threats,
          fileInfo
        });

        if (userId) {
          await AuditService.logAction({
            userId,
            action: 'file_security_threat_detected',
            resourceType: 'file',
            newValues: { filePath, threats, fileInfo }
          });
        }
      }

      return result;
    } catch (error) {
      logger.error('File security scan failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filePath,
        userId
      });

      return {
        safe: false,
        threats: ['Security scan failed'],
        fileInfo: {
          size: 0,
          mimeType: 'unknown',
          extension: '',
          hash: ''
        }
      };
    }
  }

  /**
   * Check for malicious file signatures
   */
  private static checkMaliciousSignatures(buffer: Buffer): string[] {
    const threats: string[] = [];

    for (const signature of this.MALICIOUS_SIGNATURES) {
      if (buffer.subarray(0, signature.length).equals(signature)) {
        threats.push(`Malicious file signature detected: ${signature.toString('hex')}`);
      }
    }

    return threats;
  }

  /**
   * Check for suspicious content patterns
   */
  private static checkSuspiciousContent(buffer: Buffer): string[] {
    const threats: string[] = [];
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 8192)); // Check first 8KB

    for (const pattern of this.SUSPICIOUS_PATTERNS) {
      if (pattern.test(content)) {
        threats.push(`Suspicious content pattern detected: ${pattern.source}`);
      }
    }

    return threats;
  }

  /**
   * Check for embedded executables
   */
  private static checkEmbeddedExecutables(buffer: Buffer): string[] {
    const threats: string[] = [];

    // Look for PE header deeper in the file (could be embedded)
    for (let i = 0; i < Math.min(buffer.length - 2, 1024); i++) {
      if (buffer[i] === 0x4D && buffer[i + 1] === 0x5A) {
        if (i > 0) {
          threats.push('Embedded executable detected');
          break;
        }
      }
    }

    return threats;
  }

  /**
   * Check for polyglot files (files valid in multiple formats)
   */
  private static checkPolyglotFile(buffer: Buffer): string[] {
    const threats: string[] = [];

    // Check if file starts with image signature but contains HTML/script
    const imageSignatures = [
      Buffer.from([0xFF, 0xD8, 0xFF]), // JPEG
      Buffer.from([0x89, 0x50, 0x4E, 0x47]), // PNG
      Buffer.from([0x47, 0x49, 0x46]), // GIF
    ];

    let isImage = false;
    for (const sig of imageSignatures) {
      if (buffer.subarray(0, sig.length).equals(sig)) {
        isImage = true;
        break;
      }
    }

    if (isImage) {
      const content = buffer.toString('utf8');
      if (content.includes('<html') || content.includes('<script') || content.includes('<?php')) {
        threats.push('Polyglot file detected - image with embedded code');
      }
    }

    return threats;
  }

  /**
   * Detect MIME type from file content
   */
  private static detectMimeType(buffer: Buffer): string {
    // Check magic bytes for common image formats
    if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return 'image/jpeg';
    }
    
    if (buffer.length >= 8 && 
        buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
        buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) {
      return 'image/png';
    }
    
    if (buffer.length >= 6 && 
        buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 &&
        buffer[3] === 0x38 && (buffer[4] === 0x37 || buffer[4] === 0x39) && buffer[5] === 0x61) {
      return 'image/gif';
    }

    if (buffer.length >= 12 &&
        buffer.subarray(0, 4).toString() === 'RIFF' &&
        buffer.subarray(8, 12).toString() === 'WEBP') {
      return 'image/webp';
    }

    return 'application/octet-stream';
  }

  /**
   * Calculate file hash for integrity checking
   */
  private static calculateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Check for suspicious filename patterns
   */
  private static hasSuspiciousFilename(filename: string): boolean {
    const suspiciousPatterns = [
      /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|php|asp|jsp)$/i,
      /\.\w+\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|php|asp|jsp)$/i, // Double extension
      /[<>:"|?*]/,
      /^\./,
      /\s+$/,
      /\x00/,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(filename));
  }

  /**
   * Quarantine suspicious file
   */
  static async quarantineFile(filePath: string, reason: string, userId?: number): Promise<string> {
    try {
      const quarantineDir = path.join(process.cwd(), 'quarantine');
      
      // Create quarantine directory if it doesn't exist
      if (!fs.existsSync(quarantineDir)) {
        fs.mkdirSync(quarantineDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const originalName = path.basename(filePath);
      const quarantinePath = path.join(quarantineDir, `${timestamp}_${originalName}`);

      // Move file to quarantine
      fs.renameSync(filePath, quarantinePath);

      // Log quarantine action
      logger.warn('File quarantined', {
        originalPath: filePath,
        quarantinePath,
        reason,
        userId
      });

      if (userId) {
        await AuditService.logAction({
          userId,
          action: 'file_quarantined',
          resourceType: 'file',
          newValues: { originalPath: filePath, quarantinePath, reason }
        });
      }

      return quarantinePath;
    } catch (error) {
      logger.error('Failed to quarantine file', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filePath,
        reason,
        userId
      });
      throw error;
    }
  }
}