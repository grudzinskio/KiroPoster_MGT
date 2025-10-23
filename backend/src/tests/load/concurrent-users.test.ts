import request from 'supertest';
import app from '../../index.js';
import { setupTestDatabase, teardownTestDatabase, createTestData, TestData } from '../integration/setup.js';
import { getDatabase } from '../../config/database.js';
import path from 'path';
import fs from 'fs';

describe('Load Testing - Concurrent Users', () => {
  let testData: TestData;
  const testImagePath = path.join(process.cwd(), 'src/tests/fixtures/load-test.jpg');

  beforeAll(async () => {
    await setupTestDatabase();
    testData = await createTestData();
    
    // Create test image
    if (!fs.existsSync(path.dirname(testImagePath))) {
      fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
    }
    
    const jpegBuffer = Buffer.concat([
      Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]),
      Buffer.alloc(500000), // 500KB
      Buffer.from([0xFF, 0xD9])
    ]);
    fs.writeFileSync(testImagePath, jpegBuffer);

    // Setup campaign for testing
    await request(app)
      .post(`/api/campaigns/${testData.campaigns[0].id}/assign`)
      .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
      .send({ contractorId: testData.users.contractor.id });

    await request(app)
      .put(`/api/campaigns/${testData.campaigns[0].id}/status`)
      .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
      .send({ status: 'in_progress' });
  }, 30000);

  afterAll(async () => {
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    await teardownTestDatabase();
  });

  describe('Authentication Load Testing', () => {
    test('should handle 50 concurrent login requests', async () => {
      const startTime = Date.now();
      
      const loginPromises = Array.from({ length: 50 }, () =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: testData.users.companyEmployee.email,
            password: testData.users.companyEmployee.password
          })
      );

      const responses = await Promise.all(loginPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All logins should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.accessToken).toBeDefined();
      });

      // Performance expectations
      expect(totalTime).toBeLessThan(10000); // Complete within 10 seconds
      
      const avgResponseTime = totalTime / responses.length;
      expect(avgResponseTime).toBeLessThan(500); // Average under 500ms per request
    });

    test('should handle mixed authentication operations', async () => {
      const operations = [
        // Login operations
        ...Array.from({ length: 20 }, () => ({
          type: 'login',
          request: () => request(app)
            .post('/api/auth/login')
            .send({
              email: testData.users.client.email,
              password: testData.users.client.password
            })
        })),
        // Token refresh operations
        ...Array.from({ length: 15 }, () => ({
          type: 'refresh',
          request: () => request(app)
            .post('/api/auth/refresh')
            .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
        })),
        // Profile access operations
        ...Array.from({ length: 15 }, () => ({
          type: 'profile',
          request: () => request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        }))
      ];

      const startTime = Date.now();
      const responses = await Promise.all(operations.map(op => op.request()));
      const endTime = Date.now();

      // Check success rates by operation type
      const loginResponses = responses.slice(0, 20);
      const refreshResponses = responses.slice(20, 35);
      const profileResponses = responses.slice(35, 50);

      loginResponses.forEach(response => {
        expect(response.status).toBe(200);
      });

      refreshResponses.forEach(response => {
        expect([200, 401]).toContain(response.status); // Some may fail due to token reuse
      });

      profileResponses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(endTime - startTime).toBeLessThan(8000);
    });
  });

  describe('Campaign Operations Load Testing', () => {
    test('should handle concurrent campaign reads', async () => {
      const readOperations = [
        // Company employee reads all campaigns
        ...Array.from({ length: 20 }, () =>
          request(app)
            .get('/api/campaigns')
            .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        ),
        // Client reads their campaigns
        ...Array.from({ length: 15 }, () =>
          request(app)
            .get('/api/campaigns')
            .set('Authorization', `Bearer ${testData.users.client.tokens.accessToken}`)
        ),
        // Contractor reads assigned campaigns
        ...Array.from({ length: 15 }, () =>
          request(app)
            .get('/api/campaigns')
            .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
        )
      ];

      const startTime = Date.now();
      const responses = await Promise.all(readOperations);
      const endTime = Date.now();

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      expect(endTime - startTime).toBeLessThan(5000);
    });

    test('should handle concurrent campaign creation and updates', async () => {
      const { companyEmployee } = testData.users;
      const company = testData.companies[0];

      // Create campaigns concurrently
      const createOperations = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/api/campaigns')
          .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
          .send({
            name: `Load Test Campaign ${i + 1}`,
            description: `Concurrent creation test ${i + 1}`,
            companyId: company.id
          })
      );

      const startTime = Date.now();
      const createResponses = await Promise.all(createOperations);
      const createEndTime = Date.now();

      // All creations should succeed
      createResponses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Update campaigns concurrently
      const campaignIds = createResponses.map(r => r.body.data.id);
      const updateOperations = campaignIds.map(id =>
        request(app)
          .put(`/api/campaigns/${id}/status`)
          .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
          .send({ status: 'in_progress' })
      );

      const updateResponses = await Promise.all(updateOperations);
      const updateEndTime = Date.now();

      updateResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe('in_progress');
      });

      expect(createEndTime - startTime).toBeLessThan(3000);
      expect(updateEndTime - createEndTime).toBeLessThan(2000);
    });
  });

  describe('Image Upload Load Testing', () => {
    test('should handle concurrent image uploads', async () => {
      const { contractor } = testData.users;
      const campaign = testData.campaigns[0];

      const uploadOperations = Array.from({ length: 20 }, () =>
        request(app)
          .post(`/api/campaigns/${campaign.id}/images`)
          .set('Authorization', `Bearer ${contractor.tokens.accessToken}`)
          .attach('image', testImagePath)
      );

      const startTime = Date.now();
      const responses = await Promise.all(uploadOperations);
      const endTime = Date.now();

      // Most uploads should succeed (some may fail due to rate limiting)
      const successfulUploads = responses.filter(r => r.status === 201);
      const rateLimitedUploads = responses.filter(r => r.status === 429);

      expect(successfulUploads.length).toBeGreaterThan(10);
      expect(successfulUploads.length + rateLimitedUploads.length).toBe(20);

      successfulUploads.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('pending');
      });

      expect(endTime - startTime).toBeLessThan(15000); // Allow more time for file uploads
    });

    test('should handle concurrent image review operations', async () => {
      const { companyEmployee, contractor } = testData.users;
      const campaign = testData.campaigns[0];

      // First, upload images to review
      const uploadPromises = Array.from({ length: 10 }, () =>
        request(app)
          .post(`/api/campaigns/${campaign.id}/images`)
          .set('Authorization', `Bearer ${contractor.tokens.accessToken}`)
          .attach('image', testImagePath)
      );

      const uploadResponses = await Promise.all(uploadPromises);
      const imageIds = uploadResponses
        .filter(r => r.status === 201)
        .map(r => r.body.data.id);

      if (imageIds.length > 0) {
        // Review images concurrently
        const reviewOperations = imageIds.map((id, index) => {
          if (index % 2 === 0) {
            // Approve even-indexed images
            return request(app)
              .put(`/api/images/${id}/approve`)
              .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`);
          } else {
            // Reject odd-indexed images
            return request(app)
              .put(`/api/images/${id}/reject`)
              .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
              .send({ reason: 'Load test rejection' });
          }
        });

        const startTime = Date.now();
        const reviewResponses = await Promise.all(reviewOperations);
        const endTime = Date.now();

        reviewResponses.forEach(response => {
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(['approved', 'rejected']).toContain(response.body.data.status);
        });

        expect(endTime - startTime).toBeLessThan(5000);
      }
    });
  });

  describe('Database Connection Pool Testing', () => {
    test('should handle high database connection demand', async () => {
      const knex = getDatabase();
      
      // Create operations that require database connections
      const dbOperations = Array.from({ length: 100 }, () =>
        knex('users').select('*').limit(1)
      );

      const startTime = Date.now();
      const results = await Promise.all(dbOperations);
      const endTime = Date.now();

      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });

      expect(endTime - startTime).toBeLessThan(3000);
    });

    test('should handle mixed database operations under load', async () => {
      const knex = getDatabase();
      
      const operations = [
        // Read operations
        ...Array.from({ length: 30 }, () => knex('campaigns').select('*')),
        ...Array.from({ length: 30 }, () => knex('users').select('*')),
        ...Array.from({ length: 20 }, () => knex('companies').select('*')),
        
        // Write operations (inserts that will be cleaned up)
        ...Array.from({ length: 10 }, (_, i) =>
          knex('companies').insert({
            name: `Load Test Company ${Date.now()}-${i}`,
            contact_email: `loadtest${i}@test.com`,
            is_active: true
          })
        )
      ];

      const startTime = Date.now();
      const results = await Promise.all(operations);
      const endTime = Date.now();

      // Read operations should return arrays
      results.slice(0, 80).forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });

      // Write operations should return insert IDs
      results.slice(80).forEach(result => {
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });

      expect(endTime - startTime).toBeLessThan(5000);

      // Cleanup inserted test companies
      await knex('companies')
        .where('name', 'like', 'Load Test Company%')
        .del();
    });
  });

  describe('Memory and Resource Management', () => {
    test('should maintain stable memory usage under load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform memory-intensive operations
      const operations = Array.from({ length: 50 }, () =>
        request(app)
          .get('/api/campaigns')
          .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
      );

      await Promise.all(operations);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test('should handle rapid request cycles without resource leaks', async () => {
      const cycles = 5;
      const requestsPerCycle = 20;

      for (let cycle = 0; cycle < cycles; cycle++) {
        const cycleOperations = Array.from({ length: requestsPerCycle }, () =>
          request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        );

        const responses = await Promise.all(cycleOperations);
        
        responses.forEach(response => {
          expect(response.status).toBe(200);
        });

        // Small delay between cycles
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // If we reach here without timeouts or errors, resource management is working
      expect(true).toBe(true);
    });
  });

  describe('Error Handling Under Load', () => {
    test('should gracefully handle invalid requests under load', async () => {
      const invalidOperations = [
        // Invalid authentication
        ...Array.from({ length: 20 }, () =>
          request(app)
            .get('/api/campaigns')
            .set('Authorization', 'Bearer invalid-token')
        ),
        // Invalid endpoints
        ...Array.from({ length: 15 }, () =>
          request(app)
            .get('/api/nonexistent')
            .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        ),
        // Invalid data
        ...Array.from({ length: 15 }, () =>
          request(app)
            .post('/api/campaigns')
            .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
            .send({ invalidField: 'invalid' })
        )
      ];

      const responses = await Promise.all(invalidOperations);

      // Check that errors are handled gracefully
      responses.slice(0, 20).forEach(response => {
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });

      responses.slice(20, 35).forEach(response => {
        expect(response.status).toBe(404);
      });

      responses.slice(35).forEach(response => {
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    test('should maintain system stability during error conditions', async () => {
      // Mix of valid and invalid operations
      const mixedOperations = [
        // Valid operations
        ...Array.from({ length: 25 }, () =>
          request(app)
            .get('/api/campaigns')
            .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        ),
        // Invalid operations
        ...Array.from({ length: 25 }, () =>
          request(app)
            .get('/api/campaigns')
            .set('Authorization', 'Bearer invalid-token')
        )
      ];

      const responses = await Promise.all(mixedOperations);

      // Valid operations should still succeed
      const validResponses = responses.slice(0, 25);
      validResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Invalid operations should fail gracefully
      const invalidResponses = responses.slice(25);
      invalidResponses.forEach(response => {
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });
  });
});