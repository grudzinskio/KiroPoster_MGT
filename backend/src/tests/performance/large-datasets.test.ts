import request from 'supertest';
import app from '../../index.js';
import { knex } from '../../config/database.js';
import { setupTestDatabase, teardownTestDatabase } from '../integration/setup.js';
import { hashPassword } from '../../utils/password.js';
import { generateTokenPair } from '../../utils/jwt.js';

describe('Performance Tests for Large Datasets', () => {
  let companyEmployeeToken: string;
  let clientToken: string;
  let contractorToken: string;
  let companyIds: number[] = [];
  let userIds: number[] = [];
  let campaignIds: number[] = [];

  beforeAll(async () => {
    await setupTestDatabase();
    
    // Create test users for performance testing
    const passwordHash = await hashPassword('TestPassword123!');
    
    // Create company employee
    const [employeeId] = await knex('users').insert({
      email: 'perf-employee@test.com',
      password_hash: passwordHash,
      first_name: 'Performance',
      last_name: 'Employee',
      role: 'company_employee',
      is_active: true
    });

    const [employee] = await knex('users').where('id', employeeId);
    companyEmployeeToken = generateTokenPair(employee).accessToken;

    console.log('Setting up large dataset for performance testing...');
    await setupLargeDataset();
    console.log('Large dataset setup complete');
  }, 60000); // 60 second timeout for setup

  afterAll(async () => {
    await teardownTestDatabase();
  });

  async function setupLargeDataset() {
    const passwordHash = await hashPassword('TestPassword123!');
    
    // Create 100 companies
    const companyInserts = Array.from({ length: 100 }, (_, i) => ({
      name: `Performance Test Company ${i + 1}`,
      contact_email: `company${i + 1}@perftest.com`,
      contact_phone: `555-${String(i + 1).padStart(4, '0')}`,
      address: `${i + 1} Performance St`,
      is_active: true
    }));

    const insertedCompanies = await knex('companies').insert(companyInserts);
    companyIds = Array.from({ length: 100 }, (_, i) => insertedCompanies[0] + i);

    // Create 1000 users (10 per company)
    const userInserts = [];
    for (let i = 0; i < 100; i++) {
      const companyId = companyIds[i];
      
      // 1 client per company
      userInserts.push({
        email: `client${i + 1}@perftest.com`,
        password_hash: passwordHash,
        first_name: `Client`,
        last_name: `${i + 1}`,
        role: 'client',
        company_id: companyId,
        is_active: true
      });

      // 9 contractors per company
      for (let j = 0; j < 9; j++) {
        userInserts.push({
          email: `contractor${i + 1}-${j + 1}@perftest.com`,
          password_hash: passwordHash,
          first_name: `Contractor`,
          last_name: `${i + 1}-${j + 1}`,
          role: 'contractor',
          is_active: true
        });
      }
    }

    const insertedUsers = await knex('users').insert(userInserts);
    userIds = Array.from({ length: 1000 }, (_, i) => insertedUsers[0] + i);

    // Create client and contractor tokens
    const [client] = await knex('users').where('email', 'client1@perftest.com');
    const [contractor] = await knex('users').where('email', 'contractor1-1@perftest.com');
    
    clientToken = generateTokenPair(client).accessToken;
    contractorToken = generateTokenPair(contractor).accessToken;

    // Create 500 campaigns (5 per company)
    const campaignInserts = [];
    for (let i = 0; i < 100; i++) {
      const companyId = companyIds[i];
      const employeeId = userIds[0]; // Use first user as creator
      
      for (let j = 0; j < 5; j++) {
        campaignInserts.push({
          name: `Performance Campaign ${i + 1}-${j + 1}`,
          description: `Performance test campaign ${j + 1} for company ${i + 1}`,
          company_id: companyId,
          status: ['new', 'in_progress', 'completed'][j % 3],
          start_date: new Date(Date.now() - (j * 7 * 24 * 60 * 60 * 1000)),
          end_date: new Date(Date.now() + ((5 - j) * 7 * 24 * 60 * 60 * 1000)),
          created_by: employeeId,
          completed_at: j % 3 === 2 ? new Date() : null
        });
      }
    }

    const insertedCampaigns = await knex('campaigns').insert(campaignInserts);
    campaignIds = Array.from({ length: 500 }, (_, i) => insertedCampaigns[0] + i);

    // Create campaign assignments (assign contractors to campaigns)
    const assignmentInserts = [];
    for (let i = 0; i < 500; i++) {
      const campaignId = campaignIds[i];
      const contractorStartIndex = Math.floor(i / 5) * 10 + 1; // Skip client user
      
      // Assign 3 contractors per campaign
      for (let j = 0; j < 3; j++) {
        const contractorIndex = contractorStartIndex + j;
        if (contractorIndex < userIds.length) {
          assignmentInserts.push({
            campaign_id: campaignId,
            contractor_id: userIds[contractorIndex],
            assigned_by: userIds[0]
          });
        }
      }
    }

    await knex('campaign_assignments').insert(assignmentInserts);

    // Create 2000 images (4 per campaign on average)
    const imageInserts = [];
    for (let i = 0; i < 500; i++) {
      const campaignId = campaignIds[i];
      const contractorStartIndex = Math.floor(i / 5) * 10 + 1;
      
      // 4 images per campaign
      for (let j = 0; j < 4; j++) {
        const contractorIndex = contractorStartIndex + (j % 3);
        if (contractorIndex < userIds.length) {
          imageInserts.push({
            campaign_id: campaignId,
            uploaded_by: userIds[contractorIndex],
            filename: `perf-image-${i}-${j}.jpg`,
            original_filename: `original-${i}-${j}.jpg`,
            file_path: `/uploads/images/perf-image-${i}-${j}.jpg`,
            file_size: Math.floor(Math.random() * 5000000) + 100000, // 100KB - 5MB
            mime_type: 'image/jpeg',
            status: ['pending', 'approved', 'rejected'][j % 3],
            rejection_reason: j % 3 === 2 ? 'Quality issues' : null,
            reviewed_by: j % 3 !== 0 ? userIds[0] : null,
            reviewed_at: j % 3 !== 0 ? new Date() : null
          });
        }
      }
    }

    await knex('images').insert(imageInserts);
  }

  describe('User Management Performance', () => {
    test('should handle large user list efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${companyEmployeeToken}`);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(1000);
      expect(responseTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    test('should handle user search with pagination efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/users?search=contractor&page=1&limit=50')
        .set('Authorization', `Bearer ${companyEmployeeToken}`);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(50);
      expect(responseTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle concurrent user creation efficiently', async () => {
      const startTime = Date.now();
      
      const userCreationPromises = Array.from({ length: 20 }, (_, i) =>
        request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${companyEmployeeToken}`)
          .send({
            email: `concurrent-user-${i}@perftest.com`,
            password: 'TestPassword123!',
            firstName: 'Concurrent',
            lastName: `User ${i}`,
            role: 'contractor'
          })
      );

      const responses = await Promise.all(userCreationPromises);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
      
      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Campaign Management Performance', () => {
    test('should handle large campaign list efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${companyEmployeeToken}`);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(500);
      expect(responseTime).toBeLessThan(3000); // Should complete within 3 seconds
    });

    test('should handle campaign filtering efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/campaigns?status=in_progress&companyId=' + companyIds[0])
        .set('Authorization', `Bearer ${companyEmployeeToken}`);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle client campaign filtering efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${clientToken}`);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(5); // Only campaigns for client's company
      expect(responseTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle contractor campaign filtering efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${contractorToken}`);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Image Management Performance', () => {
    test('should handle large image list efficiently', async () => {
      const campaignId = campaignIds[0];
      const startTime = Date.now();
      
      const response = await request(app)
        .get(`/api/campaigns/${campaignId}/images`)
        .set('Authorization', `Bearer ${companyEmployeeToken}`);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(4); // 4 images per campaign
      expect(responseTime).toBeLessThan(500); // Should complete within 500ms
    });

    test('should handle image approval batch operations efficiently', async () => {
      // Get pending images
      const imagesResponse = await request(app)
        .get(`/api/campaigns/${campaignIds[0]}/images`)
        .set('Authorization', `Bearer ${companyEmployeeToken}`);

      const pendingImages = imagesResponse.body.data.filter((img: any) => img.status === 'pending');
      
      if (pendingImages.length > 0) {
        const startTime = Date.now();
        
        const approvalPromises = pendingImages.map((image: any) =>
          request(app)
            .put(`/api/images/${image.id}/approve`)
            .set('Authorization', `Bearer ${companyEmployeeToken}`)
        );

        const responses = await Promise.all(approvalPromises);
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        responses.forEach(response => {
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
        });
        
        expect(responseTime).toBeLessThan(2000); // Should complete within 2 seconds
      }
    });
  });

  describe('Database Query Performance', () => {
    test('should handle complex joins efficiently', async () => {
      const startTime = Date.now();
      
      // Complex query with multiple joins
      const results = await knex('campaigns')
        .select(
          'campaigns.*',
          'companies.name as company_name',
          'users.first_name as creator_first_name',
          'users.last_name as creator_last_name'
        )
        .join('companies', 'campaigns.company_id', 'companies.id')
        .join('users', 'campaigns.created_by', 'users.id')
        .where('campaigns.status', 'in_progress')
        .orderBy('campaigns.created_at', 'desc')
        .limit(100);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(results.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle aggregation queries efficiently', async () => {
      const startTime = Date.now();
      
      // Aggregation query for campaign statistics
      const stats = await knex('campaigns')
        .select('status')
        .count('* as count')
        .groupBy('status');

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(stats.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(500); // Should complete within 500ms
    });

    test('should handle subqueries efficiently', async () => {
      const startTime = Date.now();
      
      // Subquery to find campaigns with most images
      const campaignsWithImageCount = await knex('campaigns')
        .select('campaigns.*')
        .select(knex.raw('(SELECT COUNT(*) FROM images WHERE images.campaign_id = campaigns.id) as image_count'))
        .orderBy('image_count', 'desc')
        .limit(10);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(campaignsWithImageCount.length).toBe(10);
      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Concurrent Operations Performance', () => {
    test('should handle concurrent read operations efficiently', async () => {
      const startTime = Date.now();
      
      const concurrentReads = Array.from({ length: 50 }, () =>
        request(app)
          .get('/api/campaigns')
          .set('Authorization', `Bearer ${companyEmployeeToken}`)
      );

      const responses = await Promise.all(concurrentReads);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
      
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      // Calculate average response time
      const avgResponseTime = totalTime / responses.length;
      expect(avgResponseTime).toBeLessThan(500); // Average should be under 500ms
    });

    test('should handle mixed read/write operations efficiently', async () => {
      const startTime = Date.now();
      
      const mixedOperations = [
        // Read operations
        ...Array.from({ length: 20 }, () =>
          request(app)
            .get('/api/campaigns')
            .set('Authorization', `Bearer ${companyEmployeeToken}`)
        ),
        // Write operations
        ...Array.from({ length: 10 }, (_, i) =>
          request(app)
            .post('/api/campaigns')
            .set('Authorization', `Bearer ${companyEmployeeToken}`)
            .send({
              name: `Concurrent Campaign ${i}`,
              companyId: companyIds[i % companyIds.length]
            })
        )
      ];

      const responses = await Promise.all(mixedOperations);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Check read operations
      responses.slice(0, 20).forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Check write operations
      responses.slice(20).forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
      
      expect(totalTime).toBeLessThan(15000); // Should complete within 15 seconds
    });
  });

  describe('Memory Usage and Resource Management', () => {
    test('should handle large result sets without memory issues', async () => {
      const initialMemory = process.memoryUsage();
      
      // Fetch large dataset
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${companyEmployeeToken}`);

      const afterFetchMemory = process.memoryUsage();
      
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(1000);
      
      // Memory increase should be reasonable (less than 100MB)
      const memoryIncrease = afterFetchMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB
    });

    test('should clean up resources after operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        await request(app)
          .get('/api/campaigns')
          .set('Authorization', `Bearer ${companyEmployeeToken}`);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      
      // Memory should not grow significantly
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
    });
  });
});