import request from 'supertest';
import app from '../../index.js';
import { setupTestDatabase, teardownTestDatabase, createTestData, TestData } from './setup.js';
import path from 'path';
import fs from 'fs';

describe('Images API Integration Tests', () => {
  let testData: TestData;
  const testImagePath = path.join(process.cwd(), 'src/tests/fixtures/test-image.jpg');

  beforeAll(async () => {
    await setupTestDatabase();
    testData = await createTestData();
    
    // Create test image fixture if it doesn't exist
    if (!fs.existsSync(path.dirname(testImagePath))) {
      fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
    }
    
    if (!fs.existsSync(testImagePath)) {
      // Create a minimal valid JPEG file for testing
      const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
      const jpegFooter = Buffer.from([0xFF, 0xD9]);
      const testImageBuffer = Buffer.concat([jpegHeader, Buffer.alloc(100), jpegFooter]);
      fs.writeFileSync(testImagePath, testImageBuffer);
    }

    // Assign contractor to campaign for testing
    await request(app)
      .post(`/api/campaigns/${testData.campaigns[0].id}/assign`)
      .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
      .send({ contractorId: testData.users.contractor.id });
  });

  afterAll(async () => {
    // Clean up test image
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    await teardownTestDatabase();
  });

  describe('GET /api/campaigns/:id/images', () => {
    test('should return campaign images for company employee', async () => {
      const response = await request(app)
        .get(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should return campaign images for assigned contractor', async () => {
      const response = await request(app)
        .get(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should return campaign images for client of the company', async () => {
      const response = await request(app)
        .get(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${testData.users.client.tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should reject access for unassigned contractor', async () => {
      // Create another contractor
      const anotherContractor = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send({
          email: 'another@contractor.com',
          password: 'Password123!',
          firstName: 'Another',
          lastName: 'Contractor',
          role: 'contractor'
        });

      // Login as the new contractor
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'another@contractor.com',
          password: 'Password123!'
        });

      const response = await request(app)
        .get(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/campaigns/:id/images', () => {
    test('should upload image as assigned contractor', async () => {
      const response = await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
        .attach('image', testImagePath);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.filename).toBeDefined();
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.uploadedBy).toBe(testData.users.contractor.id);
    });

    test('should reject upload without image file', async () => {
      const response = await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should reject upload by non-contractor', async () => {
      const response = await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${testData.users.client.tokens.accessToken}`)
        .attach('image', testImagePath);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test('should reject upload by unassigned contractor', async () => {
      // Create another contractor
      const anotherContractor = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send({
          email: 'unassigned@contractor.com',
          password: 'Password123!',
          firstName: 'Unassigned',
          lastName: 'Contractor',
          role: 'contractor'
        });

      // Login as the new contractor
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unassigned@contractor.com',
          password: 'Password123!'
        });

      const response = await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`)
        .attach('image', testImagePath);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test('should validate file type', async () => {
      // Create a text file to test invalid file type
      const textFilePath = path.join(process.cwd(), 'src/tests/fixtures/test.txt');
      fs.writeFileSync(textFilePath, 'This is not an image');

      const response = await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
        .attach('image', textFilePath);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);

      // Clean up
      fs.unlinkSync(textFilePath);
    });

    test('should validate file size', async () => {
      // Create a large file to test size limit
      const largeFilePath = path.join(process.cwd(), 'src/tests/fixtures/large-image.jpg');
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB file
      fs.writeFileSync(largeFilePath, largeBuffer);

      const response = await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
        .attach('image', largeFilePath);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);

      // Clean up
      fs.unlinkSync(largeFilePath);
    });
  });

  describe('PUT /api/images/:id/approve', () => {
    let uploadedImageId: number;

    beforeEach(async () => {
      // Upload an image to approve
      const uploadResponse = await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
        .attach('image', testImagePath);

      uploadedImageId = uploadResponse.body.data.id;
    });

    test('should approve image as company employee', async () => {
      const response = await request(app)
        .put(`/api/images/${uploadedImageId}/approve`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('approved');
      expect(response.body.data.reviewedBy).toBe(testData.users.companyEmployee.id);
      expect(response.body.data.reviewedAt).toBeDefined();
    });

    test('should reject approval by non-company employee', async () => {
      const response = await request(app)
        .put(`/api/images/${uploadedImageId}/approve`)
        .set('Authorization', `Bearer ${testData.users.client.tokens.accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test('should reject approval of already approved image', async () => {
      // First approval
      await request(app)
        .put(`/api/images/${uploadedImageId}/approve`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      // Second approval attempt
      const response = await request(app)
        .put(`/api/images/${uploadedImageId}/approve`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/images/:id/reject', () => {
    let uploadedImageId: number;

    beforeEach(async () => {
      // Upload an image to reject
      const uploadResponse = await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
        .attach('image', testImagePath);

      uploadedImageId = uploadResponse.body.data.id;
    });

    test('should reject image with reason as company employee', async () => {
      const rejectionData = {
        reason: 'Image quality is too low'
      };

      const response = await request(app)
        .put(`/api/images/${uploadedImageId}/reject`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send(rejectionData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('rejected');
      expect(response.body.data.rejectionReason).toBe(rejectionData.reason);
      expect(response.body.data.reviewedBy).toBe(testData.users.companyEmployee.id);
    });

    test('should require rejection reason', async () => {
      const response = await request(app)
        .put(`/api/images/${uploadedImageId}/reject`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should reject rejection by non-company employee', async () => {
      const rejectionData = {
        reason: 'Unauthorized rejection'
      };

      const response = await request(app)
        .put(`/api/images/${uploadedImageId}/reject`)
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
        .send(rejectionData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/images/:id/file', () => {
    let uploadedImageId: number;

    beforeEach(async () => {
      // Upload an image to download
      const uploadResponse = await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
        .attach('image', testImagePath);

      uploadedImageId = uploadResponse.body.data.id;
    });

    test('should serve image file for authorized users', async () => {
      const response = await request(app)
        .get(`/api/images/${uploadedImageId}/file`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/image/);
    });

    test('should reject access for unauthorized users', async () => {
      // Create another client from different company
      const anotherCompany = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send({
          name: 'Another Company',
          contactEmail: 'another@company.com'
        });

      const anotherClient = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send({
          email: 'anotherclient@test.com',
          password: 'Password123!',
          firstName: 'Another',
          lastName: 'Client',
          role: 'client',
          companyId: anotherCompany.body.data.id
        });

      // Login as the new client
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'anotherclient@test.com',
          password: 'Password123!'
        });

      const response = await request(app)
        .get(`/api/images/${uploadedImageId}/file`)
        .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/images/:id', () => {
    let uploadedImageId: number;

    beforeEach(async () => {
      // Upload an image to delete
      const uploadResponse = await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
        .attach('image', testImagePath);

      uploadedImageId = uploadResponse.body.data.id;
    });

    test('should delete image as company employee', async () => {
      const response = await request(app)
        .delete(`/api/images/${uploadedImageId}`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify image is deleted
      const checkResponse = await request(app)
        .get(`/api/images/${uploadedImageId}/file`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      expect(checkResponse.status).toBe(404);
    });

    test('should allow contractor to delete their own pending images', async () => {
      const response = await request(app)
        .delete(`/api/images/${uploadedImageId}`)
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject deletion of approved images by contractor', async () => {
      // First approve the image
      await request(app)
        .put(`/api/images/${uploadedImageId}/approve`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      // Then try to delete as contractor
      const response = await request(app)
        .delete(`/api/images/${uploadedImageId}`)
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test('should reject deletion by unauthorized users', async () => {
      const response = await request(app)
        .delete(`/api/images/${uploadedImageId}`)
        .set('Authorization', `Bearer ${testData.users.client.tokens.accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });
});