import request from 'supertest';
import app from '../../index.js';
import { setupTestDatabase, teardownTestDatabase, createTestData, TestData } from './setup.js';

describe('Users API Integration Tests', () => {
  let testData: TestData;

  beforeAll(async () => {
    await setupTestDatabase();
    testData = await createTestData();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /api/users', () => {
    test('should return all users for company employee', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should reject access for client users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${testData.users.client.tokens.accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test('should reject access for contractors', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/users', () => {
    test('should create new user as company employee', async () => {
      const newUser = {
        email: 'newuser@test.com',
        password: 'NewPassword123!',
        firstName: 'New',
        lastName: 'User',
        role: 'contractor',
        companyId: testData.companies[0].id
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(newUser.email);
      expect(response.body.data.role).toBe(newUser.role);
    });

    test('should reject duplicate email', async () => {
      const duplicateUser = {
        email: testData.users.client.email, // Existing email
        password: 'NewPassword123!',
        firstName: 'Duplicate',
        lastName: 'User',
        role: 'contractor'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send(duplicateUser);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should validate required fields', async () => {
      const invalidUser = {
        email: 'invalid-email', // Invalid email format
        password: 'weak', // Weak password
        firstName: '',
        lastName: '',
        role: 'invalid_role'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send(invalidUser);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should reject access for non-company employees', async () => {
      const newUser = {
        email: 'unauthorized@test.com',
        password: 'Password123!',
        firstName: 'Unauthorized',
        lastName: 'User',
        role: 'contractor'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${testData.users.client.tokens.accessToken}`)
        .send(newUser);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/users/:id', () => {
    test('should return user by id for company employee', async () => {
      const response = await request(app)
        .get(`/api/users/${testData.users.client.id}`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testData.users.client.id);
    });

    test('should allow users to view their own profile', async () => {
      const response = await request(app)
        .get(`/api/users/${testData.users.client.id}`)
        .set('Authorization', `Bearer ${testData.users.client.tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testData.users.client.id);
    });

    test('should reject access to other users profile for non-company employees', async () => {
      const response = await request(app)
        .get(`/api/users/${testData.users.companyEmployee.id}`)
        .set('Authorization', `Bearer ${testData.users.client.tokens.accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/99999')
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/users/:id', () => {
    test('should update user as company employee', async () => {
      const updates = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      const response = await request(app)
        .put(`/api/users/${testData.users.contractor.id}`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe(updates.firstName);
      expect(response.body.data.lastName).toBe(updates.lastName);
    });

    test('should allow users to update their own profile', async () => {
      const updates = {
        firstName: 'Self-Updated'
      };

      const response = await request(app)
        .put(`/api/users/${testData.users.client.id}`)
        .set('Authorization', `Bearer ${testData.users.client.tokens.accessToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe(updates.firstName);
    });

    test('should reject role changes by non-company employees', async () => {
      const updates = {
        role: 'company_employee'
      };

      const response = await request(app)
        .put(`/api/users/${testData.users.client.id}`)
        .set('Authorization', `Bearer ${testData.users.client.tokens.accessToken}`)
        .send(updates);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/users/:id', () => {
    test('should deactivate user as company employee', async () => {
      // Create a user to delete
      const newUser = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send({
          email: 'todelete@test.com',
          password: 'Password123!',
          firstName: 'To',
          lastName: 'Delete',
          role: 'contractor'
        });

      const response = await request(app)
        .delete(`/api/users/${newUser.body.data.id}`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify user is deactivated, not deleted
      const checkUser = await request(app)
        .get(`/api/users/${newUser.body.data.id}`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      expect(checkUser.body.data.isActive).toBe(false);
    });

    test('should reject deletion by non-company employees', async () => {
      const response = await request(app)
        .delete(`/api/users/${testData.users.contractor.id}`)
        .set('Authorization', `Bearer ${testData.users.client.tokens.accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });
});