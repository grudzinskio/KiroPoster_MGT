import request from 'supertest';
import app from '../../index.js';
import { setupTestDatabase, teardownTestDatabase, createTestData, TestData } from '../integration/setup.js';
import path from 'path';
import fs from 'fs';

describe('File Upload Security Tests', () => {
  let testData: TestData;
  const fixturesDir = path.join(process.cwd(), 'src/tests/fixtures');

  beforeAll(async () => {
    await setupTestDatabase();
    testData = await createTestData();
    
    // Create fixtures directory
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    // Assign contractor to campaign
    await request(app)
      .post(`/api/campaigns/${testData.campaigns[0].id}/assign`)
      .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
      .send({ contractorId: testData.users.contractor.id });
  });

  afterAll(async () => {
    // Clean up test files
    if (fs.existsSync(fixturesDir)) {
      const files = fs.readdirSync(fixturesDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(fixturesDir, file));
      });
      fs.rmdirSync(fixturesDir);
    }
    await teardownTestDatabase();
  });

  describe('File Type Validation', () => {
    test('should accept valid image formats', async () => {
      const validFormats = [
        { ext: 'jpg', mime: 'image/jpeg', header: [0xFF, 0xD8, 0xFF, 0xE0] },
        { ext: 'png', mime: 'image/png', header: [0x89, 0x50, 0x4E, 0x47] },
        { ext: 'gif', mime: 'image/gif', header: [0x47, 0x49, 0x46, 0x38] }
      ];

      for (const format of validFormats) {
        const filePath = path.join(fixturesDir, `test.${format.ext}`);
        const buffer = Buffer.concat([
          Buffer.from(format.header),
          Buffer.alloc(100)
        ]);
        fs.writeFileSync(filePath, buffer);

        const response = await request(app)
          .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
          .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
          .attach('image', filePath);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      }
    });

    test('should reject executable files', async () => {
      const maliciousFiles = [
        { name: 'malware.exe', header: [0x4D, 0x5A] }, // PE executable
        { name: 'script.bat', content: '@echo off\necho malicious' },
        { name: 'shell.sh', content: '#!/bin/bash\necho malicious' },
        { name: 'macro.docm', header: [0x50, 0x4B, 0x03, 0x04] } // ZIP-based Office doc
      ];

      for (const file of maliciousFiles) {
        const filePath = path.join(fixturesDir, file.name);
        
        if (file.header) {
          const buffer = Buffer.concat([
            Buffer.from(file.header),
            Buffer.alloc(100)
          ]);
          fs.writeFileSync(filePath, buffer);
        } else {
          fs.writeFileSync(filePath, file.content);
        }

        const response = await request(app)
          .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
          .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
          .attach('image', filePath);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toMatch(/invalid file type|not allowed/i);
      }
    });

    test('should reject files with misleading extensions', async () => {
      // Create executable with image extension
      const filePath = path.join(fixturesDir, 'fake-image.jpg');
      const executableHeader = Buffer.from([0x4D, 0x5A]); // PE executable header
      fs.writeFileSync(filePath, executableHeader);

      const response = await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
        .attach('image', filePath);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should reject polyglot files', async () => {
      // Create file that looks like both image and script
      const filePath = path.join(fixturesDir, 'polyglot.jpg');
      const polyglotContent = Buffer.concat([
        Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), // JPEG header
        Buffer.from('<?php system($_GET["cmd"]); ?>'), // PHP code
        Buffer.alloc(100)
      ]);
      fs.writeFileSync(filePath, polyglotContent);

      const response = await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
        .attach('image', filePath);

      // Should be rejected due to embedded script content
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('File Size Validation', () => {
    test('should reject files exceeding size limit', async () => {
      const filePath = path.join(fixturesDir, 'large-image.jpg');
      
      // Create file larger than 10MB limit
      const largeBuffer = Buffer.concat([
        Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), // JPEG header
        Buffer.alloc(11 * 1024 * 1024) // 11MB
      ]);
      fs.writeFileSync(filePath, largeBuffer);

      const response = await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
        .attach('image', filePath);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toMatch(/file too large|size limit/i);
    });

    test('should accept files within size limit', async () => {
      const filePath = path.join(fixturesDir, 'normal-image.jpg');
      
      // Create file within 10MB limit
      const normalBuffer = Buffer.concat([
        Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), // JPEG header
        Buffer.alloc(1024 * 1024) // 1MB
      ]);
      fs.writeFileSync(filePath, normalBuffer);

      const response = await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
        .attach('image', filePath);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('should reject empty files', async () => {
      const filePath = path.join(fixturesDir, 'empty.jpg');
      fs.writeFileSync(filePath, '');

      const response = await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
        .attach('image', filePath);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Path Traversal Protection', () => {
    test('should prevent directory traversal in filename', async () => {
      const filePath = path.join(fixturesDir, 'normal.jpg');
      const buffer = Buffer.concat([
        Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]),
        Buffer.alloc(100)
      ]);
      fs.writeFileSync(filePath, buffer);

      // Try to upload with malicious filename
      const response = await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
        .field('maliciousPath', '../../../etc/passwd')
        .attach('image', filePath);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      
      // Verify filename was sanitized
      expect(response.body.data.filename).not.toMatch(/\.\./);
      expect(response.body.data.filename).not.toMatch(/\//);
      expect(response.body.data.filename).not.toMatch(/\\/);
    });

    test('should sanitize original filename', async () => {
      const maliciousName = '../../../malicious.jpg';
      const filePath = path.join(fixturesDir, 'test.jpg');
      const buffer = Buffer.concat([
        Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]),
        Buffer.alloc(100)
      ]);
      fs.writeFileSync(filePath, buffer);

      // Rename file to have malicious name
      const maliciousPath = path.join(fixturesDir, maliciousName);
      fs.renameSync(filePath, maliciousPath);

      const response = await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
        .attach('image', maliciousPath);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      
      // Verify original filename was sanitized
      expect(response.body.data.originalFilename).not.toMatch(/\.\./);
    });
  });

  describe('Content Validation', () => {
    test('should detect and reject embedded scripts in images', async () => {
      const filePath = path.join(fixturesDir, 'script-embedded.jpg');
      
      // Create image with embedded script
      const maliciousContent = Buffer.concat([
        Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), // JPEG header
        Buffer.from('<script>alert("xss")</script>'),
        Buffer.from('<?php system("rm -rf /"); ?>'),
        Buffer.alloc(100)
      ]);
      fs.writeFileSync(filePath, maliciousContent);

      const response = await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
        .attach('image', filePath);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should validate image metadata', async () => {
      const filePath = path.join(fixturesDir, 'metadata-test.jpg');
      
      // Create image with suspicious metadata
      const suspiciousMetadata = Buffer.concat([
        Buffer.from([0xFF, 0xD8, 0xFF, 0xE1]), // JPEG with EXIF
        Buffer.from([0x00, 0x16]), // Length
        Buffer.from('Exif\0\0'),
        Buffer.from('<script>alert(1)</script>'), // Malicious EXIF data
        Buffer.alloc(100)
      ]);
      fs.writeFileSync(filePath, suspiciousMetadata);

      const response = await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
        .attach('image', filePath);

      // Should either reject or strip metadata
      if (response.status === 201) {
        // If accepted, metadata should be stripped
        expect(response.body.success).toBe(true);
      } else {
        // If rejected, should be due to security concerns
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Rate Limiting and Abuse Prevention', () => {
    test('should rate limit file uploads', async () => {
      const filePath = path.join(fixturesDir, 'rate-limit-test.jpg');
      const buffer = Buffer.concat([
        Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]),
        Buffer.alloc(100)
      ]);
      fs.writeFileSync(filePath, buffer);

      // Attempt multiple rapid uploads
      const uploadPromises = Array.from({ length: 20 }, () =>
        request(app)
          .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
          .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
          .attach('image', filePath)
      );

      const responses = await Promise.all(uploadPromises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should prevent zip bomb attacks', async () => {
      const filePath = path.join(fixturesDir, 'zip-bomb.jpg');
      
      // Create file that appears small but expands when processed
      // This is a simplified test - real zip bombs are more complex
      const compressedData = Buffer.concat([
        Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), // JPEG header
        Buffer.alloc(1000, 0x00), // Highly compressible data
        Buffer.from([0xFF, 0xD9]) // JPEG footer
      ]);
      fs.writeFileSync(filePath, compressedData);

      const response = await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
        .attach('image', filePath);

      // Should handle gracefully without consuming excessive resources
      expect([200, 201, 400]).toContain(response.status);
    });
  });

  describe('File Storage Security', () => {
    test('should store files outside web root', async () => {
      const filePath = path.join(fixturesDir, 'storage-test.jpg');
      const buffer = Buffer.concat([
        Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]),
        Buffer.alloc(100)
      ]);
      fs.writeFileSync(filePath, buffer);

      const response = await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
        .attach('image', filePath);

      expect(response.status).toBe(201);
      
      // Verify file path doesn't expose system structure
      expect(response.body.data.filePath).not.toMatch(/\/var\/www/);
      expect(response.body.data.filePath).not.toMatch(/\/public/);
      expect(response.body.data.filePath).not.toMatch(/C:\\/);
    });

    test('should generate secure random filenames', async () => {
      const filePath = path.join(fixturesDir, 'filename-test.jpg');
      const buffer = Buffer.concat([
        Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]),
        Buffer.alloc(100)
      ]);
      fs.writeFileSync(filePath, buffer);

      const responses = await Promise.all([
        request(app)
          .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
          .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
          .attach('image', filePath),
        request(app)
          .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
          .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
          .attach('image', filePath)
      ]);

      expect(responses[0].status).toBe(201);
      expect(responses[1].status).toBe(201);
      
      // Filenames should be different and unpredictable
      expect(responses[0].body.data.filename).not.toBe(responses[1].body.data.filename);
      expect(responses[0].body.data.filename).toMatch(/^[a-f0-9-]+\.jpg$/);
      expect(responses[1].body.data.filename).toMatch(/^[a-f0-9-]+\.jpg$/);
    });

    test('should prevent direct file access without authorization', async () => {
      const filePath = path.join(fixturesDir, 'access-test.jpg');
      const buffer = Buffer.concat([
        Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]),
        Buffer.alloc(100)
      ]);
      fs.writeFileSync(filePath, buffer);

      // Upload file
      const uploadResponse = await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
        .attach('image', filePath);

      expect(uploadResponse.status).toBe(201);
      const imageId = uploadResponse.body.data.id;

      // Try to access file without authorization
      const unauthorizedResponse = await request(app)
        .get(`/api/images/${imageId}/file`);

      expect(unauthorizedResponse.status).toBe(401);
      expect(unauthorizedResponse.body.success).toBe(false);
    });
  });

  describe('Virus and Malware Detection', () => {
    test('should detect EICAR test string', async () => {
      const filePath = path.join(fixturesDir, 'eicar-test.jpg');
      
      // EICAR test string (standard antivirus test)
      const eicarString = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
      const maliciousContent = Buffer.concat([
        Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), // JPEG header
        Buffer.from(eicarString),
        Buffer.alloc(100)
      ]);
      fs.writeFileSync(filePath, maliciousContent);

      const response = await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
        .attach('image', filePath);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toMatch(/security threat|malware|virus/i);
    });

    test('should scan for common malware signatures', async () => {
      const malwareSignatures = [
        'eval(base64_decode(',
        'system($_GET',
        'exec($_POST',
        'shell_exec(',
        'passthru('
      ];

      for (const signature of malwareSignatures) {
        const filePath = path.join(fixturesDir, `malware-${Date.now()}.jpg`);
        const maliciousContent = Buffer.concat([
          Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), // JPEG header
          Buffer.from(signature),
          Buffer.alloc(100)
        ]);
        fs.writeFileSync(filePath, maliciousContent);

        const response = await request(app)
          .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
          .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
          .attach('image', filePath);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });
  });
});