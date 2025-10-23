import request from 'supertest';
import app from '../../index.js';
import { setupTestDatabase, teardownTestDatabase, createTestData, TestData } from './setup.js';

describe('Authentication API Integration Tests', () => {
  let testData: TestData;

  beforeAll(async () => {
    await setupTestDatabase();
    testData = await createTestData();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('POST /api/auth/login', () => {
    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testData.users.companyEmployee.email,
          password: testData.users.companyEmployee.password
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(testData.users.companyEmployee.email);
      expect(response.headers['set-cookie']).toBeDefined();
    });

    test('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testData.users.companyEmployee.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should reject inactive user', async () => {
      // Deactivate user temporarily
      await request(app)
        .put(`/api/users/${testData.users.contractor.id}`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send({ is_active: false });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testData.users.contractor.email,
          password: testData.users.contractor.password
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);

      // Reactivate user
      await request(app)
        .put(`/api/users/${testData.users.contractor.id}`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send({ is_active: true });
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testData.users.companyEmployee.email
          // Missing password
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    test('should refresh tokens with valid refresh token', async () => {
      // First login to get cookies
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testData.users.companyEmployee.email,
          password: testData.users.companyEmployee.password
        });

      const cookies = loginResponse.headers['set-cookie'];

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.headers['set-cookie']).toBeDefined();
    });

    test('should reject request without refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    test('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/auth/me', () => {
    test('should return current user info', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(testData.users.companyEmployee.email);
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});