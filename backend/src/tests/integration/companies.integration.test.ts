import request from 'supertest';
import app from '../../index.js';
import { setupTestDatabase, teardownTestDatabase, createTestData, TestData } from './setup.js';

describe('Companies API Integration Tests', () => {
  let testData: TestData;

  beforeAll(async () => {
    await setupTestDatabase();
    testData = await createTestData();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /api/companies', () => {
    test('should return all companies for company employee', async () => {
      const response = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should reject access for client users', async () => {
      const response = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${testData.users.client.tokens.accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test('should reject access for contractors', async () => {
      const response = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/companies', () => {
    test('should create new company as company employee', async () => {
      const newCompany = {
        name: 'New Test Company',
        contactEmail: 'contact@newcompany.com',
        contactPhone: '987-654-3210',
        address: '456 New St'
      };

      const response = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send(newCompany);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(newCompany.name);
      expect(response.body.data.contactEmail).toBe(newCompany.contactEmail);
    });

    test('should validate required fields', async () => {
      const invalidCompany = {
        // Missing name
        contactEmail: 'invalid-email', // Invalid email format
        contactPhone: '',
        address: ''
      };

      const response = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send(invalidCompany);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should reject access for non-company employees', async () => {
      const newCompany = {
        name: 'Unauthorized Company',
        contactEmail: 'contact@unauthorized.com'
      };

      const response = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${testData.users.client.tokens.accessToken}`)
        .send(newCompany);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/companies/:id', () => {
    test('should return company by id for company employee', async () => {
      const response = await request(app)
        .get(`/api/companies/${testData.companies[0].id}`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testData.companies[0].id);
    });

    test('should allow client to view their own company', async () => {
      const response = await request(app)
        .get(`/api/companies/${testData.users.client.companyId}`)
        .set('Authorization', `Bearer ${testData.users.client.tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testData.users.client.companyId);
    });

    test('should reject access to other companies for client users', async () => {
      // Create another company
      const anotherCompany = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send({
          name: 'Another Company',
          contactEmail: 'another@company.com'
        });

      const response = await request(app)
        .get(`/api/companies/${anotherCompany.body.data.id}`)
        .set('Authorization', `Bearer ${testData.users.client.tokens.accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test('should return 404 for non-existent company', async () => {
      const response = await request(app)
        .get('/api/companies/99999')
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/companies/:id', () => {
    test('should update company as company employee', async () => {
      const updates = {
        name: 'Updated Company Name',
        contactEmail: 'updated@company.com'
      };

      const response = await request(app)
        .put(`/api/companies/${testData.companies[0].id}`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updates.name);
      expect(response.body.data.contactEmail).toBe(updates.contactEmail);
    });

    test('should reject updates by non-company employees', async () => {
      const updates = {
        name: 'Unauthorized Update'
      };

      const response = await request(app)
        .put(`/api/companies/${testData.companies[0].id}`)
        .set('Authorization', `Bearer ${testData.users.client.tokens.accessToken}`)
        .send(updates);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test('should validate email format', async () => {
      const updates = {
        contactEmail: 'invalid-email-format'
      };

      const response = await request(app)
        .put(`/api/companies/${testData.companies[0].id}`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send(updates);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/companies/:id', () => {
    test('should deactivate company as company employee', async () => {
      // Create a company to delete
      const newCompany = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send({
          name: 'Company To Delete',
          contactEmail: 'delete@company.com'
        });

      const response = await request(app)
        .delete(`/api/companies/${newCompany.body.data.id}`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify company is deactivated, not deleted
      const checkCompany = await request(app)
        .get(`/api/companies/${newCompany.body.data.id}`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      expect(checkCompany.body.data.isActive).toBe(false);
    });

    test('should reject deletion by non-company employees', async () => {
      const response = await request(app)
        .delete(`/api/companies/${testData.companies[0].id}`)
        .set('Authorization', `Bearer ${testData.users.client.tokens.accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test('should handle deletion of company with associated campaigns', async () => {
      // The test company already has campaigns, so this tests cascade handling
      const response = await request(app)
        .delete(`/api/companies/${testData.companies[0].id}`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});