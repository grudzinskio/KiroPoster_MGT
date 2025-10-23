import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { FileSecurityService } from '../../services/FileSecurityService.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('FileSecurityService', () => {
  let tempDir: string;
  let testFilePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-security-test-'));
    testFilePath = path.join(tempDir, 'test-file.jpg');
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('validateFileUpload', () => {
    beforeEach(() => {
      // Create a test file
      fs.writeFileSync(testFilePath, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0])); // JPEG header
    });

    it('should validate a proper image file', () => {
      const validation = FileSecurityService.validateFileUpload(
        testFilePath,
        'test.jpg',
        'image/jpeg',
        1024
      );

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject file that is too large', () => {
      const validation = FileSecurityService.validateFileUpload(
        testFilePath,
        'test.jpg',
        'image/jpeg',
        11 * 1024 * 1024 // 11MB
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('File size exceeds maximum allowed size of 10MB');
    });

    it('should reject empty file', () => {
      const validation = FileSecurityService.validateFileUpload(
        testFilePath,
        'test.jpg',
        'image/jpeg',
        0
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('File is empty');
    });

    it('should reject invalid MIME type', () => {
      const validation = FileSecurityService.validateFileUpload(
        testFilePath,
        'test.exe',
        'application/x-executable',
        1024
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("File type 'application/x-executable' is not allowed");
    });

    it('should reject invalid file extension', () => {
      const validation = FileSecurityService.validateFileUpload(
        testFilePath,
        'test.exe',
        'image/jpeg',
        1024
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("File extension '.exe' is not allowed");
    });

    it('should warn about suspicious filename', () => {
      const validation = FileSecurityService.validateFileUpload(
        testFilePath,
        'test<script>.jpg',
        'image/jpeg',
        1024
      );

      expect(validation.valid).toBe(true);
      expect(validation.warnings).toContain('Filename contains suspicious patterns');
    });

    it('should reject non-existent file', () => {
      const validation = FileSecurityService.validateFileUpload(
        '/non/existent/file.jpg',
        'test.jpg',
        'image/jpeg',
        1024
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('File not found');
    });
  });

  describe('scanFile', () => {
    it('should pass scan for clean JPEG file', async () => {
      // Create a clean JPEG file
      const jpegHeader = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46
      ]);
      fs.writeFileSync(testFilePath, jpegHeader);

      const result = await FileSecurityService.scanFile(testFilePath, 1);

      expect(result.safe).toBe(true);
      expect(result.threats).toHaveLength(0);
      expect(result.fileInfo.mimeType).toBe('image/jpeg');
    });

    it('should detect malicious PE executable signature', async () => {
      // Create file with PE executable signature
      const peHeader = Buffer.from([0x4D, 0x5A, 0x90, 0x00]); // MZ header
      fs.writeFileSync(testFilePath, peHeader);

      const result = await FileSecurityService.scanFile(testFilePath, 1);

      expect(result.safe).toBe(false);
      expect(result.threats).toContain('Malicious file signature detected: 4d5a');
    });

    it('should detect suspicious script content', async () => {
      // Create file with suspicious content
      const content = Buffer.from('<?php eval($_POST["cmd"]); ?>');
      fs.writeFileSync(testFilePath, content);

      const result = await FileSecurityService.scanFile(testFilePath, 1);

      expect(result.safe).toBe(false);
      expect(result.threats.some(threat => threat.includes('Suspicious content pattern'))).toBe(true);
    });

    it('should detect embedded executable', async () => {
      // Create file with embedded PE signature
      const content = Buffer.concat([
        Buffer.from('Some normal content here'),
        Buffer.from([0x4D, 0x5A]), // PE signature embedded
        Buffer.from('more content')
      ]);
      fs.writeFileSync(testFilePath, content);

      const result = await FileSecurityService.scanFile(testFilePath, 1);

      expect(result.safe).toBe(false);
      expect(result.threats).toContain('Embedded executable detected');
    });

    it('should detect polyglot file (image with HTML)', async () => {
      // Create file that looks like JPEG but contains HTML
      const content = Buffer.concat([
        Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), // JPEG header
        Buffer.from('<html><script>alert("xss")</script></html>')
      ]);
      fs.writeFileSync(testFilePath, content);

      const result = await FileSecurityService.scanFile(testFilePath, 1);

      expect(result.safe).toBe(false);
      expect(result.threats).toContain('Polyglot file detected - image with embedded code');
    });

    it('should handle scan failure gracefully', async () => {
      // Test with non-existent file
      const result = await FileSecurityService.scanFile('/non/existent/file.jpg', 1);

      expect(result.safe).toBe(false);
      expect(result.threats).toContain('Security scan failed');
    });
  });

  describe('quarantineFile', () => {
    beforeEach(() => {
      fs.writeFileSync(testFilePath, 'test content');
    });

    it('should quarantine suspicious file', async () => {
      const quarantinePath = await FileSecurityService.quarantineFile(
        testFilePath,
        'Test quarantine',
        1
      );

      expect(fs.existsSync(testFilePath)).toBe(false);
      expect(fs.existsSync(quarantinePath)).toBe(true);
      expect(quarantinePath).toContain('quarantine');
    });

    it('should handle quarantine failure', async () => {
      // Try to quarantine non-existent file
      await expect(
        FileSecurityService.quarantineFile('/non/existent/file.jpg', 'Test', 1)
      ).rejects.toThrow();
    });
  });

  describe('MIME type detection', () => {
    it('should detect JPEG MIME type', async () => {
      const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
      fs.writeFileSync(testFilePath, jpegHeader);

      const result = await FileSecurityService.scanFile(testFilePath);
      expect(result.fileInfo.mimeType).toBe('image/jpeg');
    });

    it('should detect PNG MIME type', async () => {
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
      ]);
      fs.writeFileSync(testFilePath, pngHeader);

      const result = await FileSecurityService.scanFile(testFilePath);
      expect(result.fileInfo.mimeType).toBe('image/png');
    });

    it('should detect GIF MIME type', async () => {
      const gifHeader = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]);
      fs.writeFileSync(testFilePath, gifHeader);

      const result = await FileSecurityService.scanFile(testFilePath);
      expect(result.fileInfo.mimeType).toBe('image/gif');
    });

    it('should detect WebP MIME type', async () => {
      const webpHeader = Buffer.concat([
        Buffer.from('RIFF'),
        Buffer.from([0x00, 0x00, 0x00, 0x00]), // File size placeholder
        Buffer.from('WEBP')
      ]);
      fs.writeFileSync(testFilePath, webpHeader);

      const result = await FileSecurityService.scanFile(testFilePath);
      expect(result.fileInfo.mimeType).toBe('image/webp');
    });

    it('should default to octet-stream for unknown types', async () => {
      const unknownHeader = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      fs.writeFileSync(testFilePath, unknownHeader);

      const result = await FileSecurityService.scanFile(testFilePath);
      expect(result.fileInfo.mimeType).toBe('application/octet-stream');
    });
  });
});