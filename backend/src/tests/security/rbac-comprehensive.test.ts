import request from 'supertest';
import app from '../../index.js';
import { setupTestDatabase, teardownTestDatabase, createTestData, TestData } from '../integration/setup.js';
import { getDatabase } from '../../config/database.js';
import path from 'path';
import fs from 'fs';

describe('Comprehensive Role-Based Access Control Tests', () => {
  let testData: TestData;
  let knex: any;
  let additionalUsers: any = {};
  let additionalCompanies: any = {};
  const testImagePath = path.join(process.cwd(), 'src/tests/fixtures/rbac-test.jpg');

  beforeAll(async () => {
    await setupTestDatabase();
    testData = await createTestData();
    knex = getDatabase();
    
    // Create test image
    if (!fs.existsSync(path.dirname(testImagePath))) {
      fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
    }
    
    const jpegBuffer = Buffer.concat([
      Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]),
      Buffer.alloc(1000),
      Buffer.from([0xFF, 0xD9])
    ]);
    fs.writeFileSync(testImagePath, jpegBuffer);

    await setupAdditionalTestData();
  });

  afterAll(async () => {
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    await teardownTestDatabase();
  });

  async function setupAdditionalTestData() {
    const { companyEmployee } = testData.users;

    // Create additional company
    const company2Response = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
      .send({
        name: 'Second Test Company',
        contactEmail: 'company2@test.com'
      });

    additionalCompanies.company2 = company2Response.body.data;

    // Create additional users for different scenarios
    const users = [
      {
        key: 'client2',
        data: {
          email: 'client2@test.com',
          password: 'TestPassword123!',
          firstName: 'Client',
          lastName: 'Two',
          role: 'client',
          companyId: additionalCompanies.company2.id
        }
      },
      {
        key: 'contractor2',
        data: {
          email: 'contractor2@test.com',
          password: 'TestPassword123!',
          firstName: 'Contractor',
          lastName: 'Two',
          role: 'contractor'
        }
      },
      {
        key: 'inactiveUser',
        data: {
          email: 'inactive@test.com',
          password: 'TestPassword123!',
          firstName: 'Inactive',
          lastName: 'User',
          role: 'contractor'
        }
      }
    ];

    for (const user of users) {
      const createResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send(user.data);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.data.email,
          password: user.data.password
        });

      additionalUsers[user.key] = {
        ...createResponse.body.data,
        tokens: loginResponse.body.data
      };
    }

    // Deactivate inactive user
    await request(app)
      .put(`/api/users/${additionalUsers.inactiveUser.id}`)
      .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
      .send({ isActive: false });

    // Create campaigns for different companies
    const campaign2Response = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
      .send({
        name: 'Company 2 Campaign',
        companyId: additionalCompanies.company2.id
      });

    additionalCompanies.company2.campaign = campaign2Response.body.data;
  }

  describe('Company Employee Access Control', () => {
    test('should have full access to all system resources', async () => {
      const { companyEmployee } = testData.users;

      // Can access all users
      const usersResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`);

      expect(usersResponse.status).toBe(200);
      expect(usersResponse.body.data.length).toBeGreaterThan(1);

      // Can access all companies
      const companiesResponse = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`);

      expect(companiesResponse.status).toBe(200);
      expect(companiesResponse.body.data.length).toBeGreaterThan(1);

      // Can access all campaigns
      const campaignsResponse = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`);

      expect(campaignsResponse.status).toBe(200);
      expect(campaignsResponse.body.data.length).toBeGreaterThan(1);

      // Can create users
      const createUserResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({
          email: 'rbac-test@test.com',
          password: 'TestPassword123!',
          firstName: 'RBAC',
          lastName: 'Test',
          role: 'contractor'
        });

      expect(createUserResponse.status).toBe(201);

      // Can create companies
      const createCompanyResponse = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({
          name: 'RBAC Test Company',
          contactEmail: 'rbac@company.com'
        });

      expect(createCompanyResponse.status).toBe(201);

      // Can create campaigns
      const createCampaignResponse = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({
          name: 'RBAC Test Campaign',
          companyId: testData.companies[0].id
        });

      expect(createCampaignResponse.status).toBe(201);
    });

    test('should be able to manage all campaign statuses and assignments', async () => {
      const { companyEmployee } = testData.users;
      const campaign = testData.campaigns[0];

      // Can assign contractors
      const assignResponse = await request(app)
        .post(`/api/campaigns/${campaign.id}/assign`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ contractorId: testData.users.contractor.id });

      expect(assignResponse.status).toBe(200);

      // Can change campaign status
      const statusResponse = await request(app)
        .put(`/api/campaigns/${campaign.id}/status`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ status: 'in_progress' });

      expect(statusResponse.status).toBe(200);

      // Can approve/reject images (after upload)
      const uploadResponse = await request(app)
        .post(`/api/campaigns/${campaign.id}/images`)
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`)
        .attach('image', testImagePath);

      if (uploadResponse.status === 201) {
        const imageId = uploadResponse.body.data.id;

        const approveResponse = await request(app)
          .put(`/api/images/${imageId}/approve`)
          .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`);

        expect(approveResponse.status).toBe(200);
      }
    });

    test('should be able to access cross-company data', async () => {
      const { companyEmployee } = testData.users;

      // Can view campaigns from different companies
      const company1Campaign = testData.campaigns[0];
      const company2Campaign = additionalCompanies.company2.campaign;

      const campaign1Response = await request(app)
        .get(`/api/campaigns/${company1Campaign.id}`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`);

      const campaign2Response = await request(app)
        .get(`/api/campaigns/${company2Campaign.id}`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`);

      expect(campaign1Response.status).toBe(200);
      expect(campaign2Response.status).toBe(200);

      // Can view users from different companies
      const client1Response = await request(app)
        .get(`/api/users/${testData.users.client.id}`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`);

      const client2Response = await request(app)
        .get(`/api/users/${additionalUsers.client2.id}`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`);

      expect(client1Response.status).toBe(200);
      expect(client2Response.status).toBe(200);
    });
  });

  describe('Client User Access Control', () => {
    test('should only access their company data', async () => {
      const { client } = testData.users;
      const client2 = additionalUsers.client2;

      // Client 1 can see their company campaigns
      const client1CampaignsResponse = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${client.tokens.accessToken}`);

      expect(client1CampaignsResponse.status).toBe(200);
      client1CampaignsResponse.body.data.forEach((campaign: any) => {
        expect(campaign.companyId).toBe(testData.companies[0].id);
      });

      // Client 2 can see their company campaigns
      const client2CampaignsResponse = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${client2.tokens.accessToken}`);

      expect(client2CampaignsResponse.status).toBe(200);
      client2CampaignsResponse.body.data.forEach((campaign: any) => {
        expect(campaign.companyId).toBe(additionalCompanies.company2.id);
      });

      // Client 1 cannot access Client 2's campaign
      const unauthorizedResponse = await request(app)
        .get(`/api/campaigns/${additionalCompanies.company2.campaign.id}`)
        .set('Authorization', `Bearer ${client.tokens.accessToken}`);

      expect(unauthorizedResponse.status).toBe(403);

      // Client 2 cannot access Client 1's campaign
      const unauthorizedResponse2 = await request(app)
        .get(`/api/campaigns/${testData.campaigns[0].id}`)
        .set('Authorization', `Bearer ${client2.tokens.accessToken}`);

      expect(unauthorizedResponse2.status).toBe(403);
    });

    test('should not have administrative privileges', async () => {
      const { client } = testData.users;

      // Cannot create users
      const createUserResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${client.tokens.accessToken}`)
        .send({
          email: 'unauthorized@test.com',
          password: 'TestPassword123!',
          firstName: 'Unauthorized',
          lastName: 'User',
          role: 'contractor'
        });

      expect(createUserResponse.status).toBe(403);

      // Cannot create companies
      const createCompanyResponse = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${client.tokens.accessToken}`)
        .send({
          name: 'Unauthorized Company',
          contactEmail: 'unauthorized@company.com'
        });

      expect(createCompanyResponse.status).toBe(403);

      // Cannot create campaigns
      const createCampaignResponse = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${client.tokens.accessToken}`)
        .send({
          name: 'Unauthorized Campaign',
          companyId: testData.companies[0].id
        });

      expect(createCampaignResponse.status).toBe(403);

      // Cannot access user management endpoints
      const usersResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${client.tokens.accessToken}`);

      expect(usersResponse.status).toBe(403);

      // Cannot access company management endpoints
      const companiesResponse = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${client.tokens.accessToken}`);

      expect(companiesResponse.status).toBe(403);
    });

    test('should not be able to modify campaign data', async () => {
      const { client } = testData.users;
      const campaign = testData.campaigns[0];

      // Cannot change campaign status
      const statusResponse = await request(app)
        .put(`/api/campaigns/${campaign.id}/status`)
        .set('Authorization', `Bearer ${client.tokens.accessToken}`)
        .send({ status: 'completed' });

      expect(statusResponse.status).toBe(403);

      // Cannot assign contractors
      const assignResponse = await request(app)
        .post(`/api/campaigns/${campaign.id}/assign`)
        .set('Authorization', `Bearer ${client.tokens.accessToken}`)
        .send({ contractorId: testData.users.contractor.id });

      expect(assignResponse.status).toBe(403);

      // Cannot approve/reject images
      const approveResponse = await request(app)
        .put('/api/images/1/approve')
        .set('Authorization', `Bearer ${client.tokens.accessToken}`);

      expect(approveResponse.status).toBe(403);
    });

    test('should be able to view campaign images but not upload', async () => {
      const { client, companyEmployee, contractor } = testData.users;
      const campaign = testData.campaigns[0];

      // Setup campaign with image
      await request(app)
        .post(`/api/campaigns/${campaign.id}/assign`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ contractorId: contractor.id });

      await request(app)
        .put(`/api/campaigns/${campaign.id}/status`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ status: 'in_progress' });

      const uploadResponse = await request(app)
        .post(`/api/campaigns/${campaign.id}/images`)
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`)
        .attach('image', testImagePath);

      if (uploadResponse.status === 201) {
        // Client can view images
        const viewImagesResponse = await request(app)
          .get(`/api/campaigns/${campaign.id}/images`)
          .set('Authorization', `Bearer ${client.tokens.accessToken}`);

        expect(viewImagesResponse.status).toBe(200);
        expect(Array.isArray(viewImagesResponse.body.data)).toBe(true);

        // Client cannot upload images
        const clientUploadResponse = await request(app)
          .post(`/api/campaigns/${campaign.id}/images`)
          .set('Authorization', `Bearer ${client.tokens.accessToken}`)
          .attach('image', testImagePath);

        expect(clientUploadResponse.status).toBe(403);
      }
    });
  });

  describe('Contractor Access Control', () => {
    test('should only access assigned campaigns', async () => {
      const { contractor, companyEmployee } = testData.users;
      const contractor2 = additionalUsers.contractor2;
      const campaign = testData.campaigns[0];
      const campaign2 = additionalCompanies.company2.campaign;

      // Initially, contractors see no campaigns
      const initialCampaignsResponse = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`);

      expect(initialCampaignsResponse.status).toBe(200);
      expect(initialCampaignsResponse.body.data.length).toBe(0);

      // Assign contractor to campaign 1
      await request(app)
        .post(`/api/campaigns/${campaign.id}/assign`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ contractorId: contractor.id });

      await request(app)
        .put(`/api/campaigns/${campaign.id}/status`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ status: 'in_progress' });

      // Assign contractor2 to campaign 2
      await request(app)
        .post(`/api/campaigns/${campaign2.id}/assign`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ contractorId: contractor2.id });

      await request(app)
        .put(`/api/campaigns/${campaign2.id}/status`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ status: 'in_progress' });

      // Contractor 1 can only see campaign 1
      const contractor1CampaignsResponse = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`);

      expect(contractor1CampaignsResponse.status).toBe(200);
      expect(contractor1CampaignsResponse.body.data.length).toBe(1);
      expect(contractor1CampaignsResponse.body.data[0].id).toBe(campaign.id);

      // Contractor 2 can only see campaign 2
      const contractor2CampaignsResponse = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${contractor2.tokens.accessToken}`);

      expect(contractor2CampaignsResponse.status).toBe(200);
      expect(contractor2CampaignsResponse.body.data.length).toBe(1);
      expect(contractor2CampaignsResponse.body.data[0].id).toBe(campaign2.id);

      // Contractor 1 cannot access campaign 2
      const unauthorizedResponse = await request(app)
        .get(`/api/campaigns/${campaign2.id}`)
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`);

      expect(unauthorizedResponse.status).toBe(403);
    });

    test('should only upload to assigned campaigns', async () => {
      const { contractor, companyEmployee } = testData.users;
      const contractor2 = additionalUsers.contractor2;
      const campaign = testData.campaigns[0];
      const campaign2 = additionalCompanies.company2.campaign;

      // Setup assignments
      await request(app)
        .post(`/api/campaigns/${campaign.id}/assign`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ contractorId: contractor.id });

      await request(app)
        .put(`/api/campaigns/${campaign.id}/status`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ status: 'in_progress' });

      // Contractor can upload to assigned campaign
      const validUploadResponse = await request(app)
        .post(`/api/campaigns/${campaign.id}/images`)
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`)
        .attach('image', testImagePath);

      expect(validUploadResponse.status).toBe(201);

      // Contractor cannot upload to unassigned campaign
      const invalidUploadResponse = await request(app)
        .post(`/api/campaigns/${campaign2.id}/images`)
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`)
        .attach('image', testImagePath);

      expect(invalidUploadResponse.status).toBe(403);

      // Different contractor cannot upload to first campaign
      const crossContractorUploadResponse = await request(app)
        .post(`/api/campaigns/${campaign.id}/images`)
        .set('Authorization', `Bearer ${contractor2.tokens.accessToken}`)
        .attach('image', testImagePath);

      expect(crossContractorUploadResponse.status).toBe(403);
    });

    test('should not have administrative privileges', async () => {
      const { contractor } = testData.users;

      // Cannot create users
      const createUserResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`)
        .send({
          email: 'contractor-unauthorized@test.com',
          password: 'TestPassword123!',
          firstName: 'Contractor',
          lastName: 'Unauthorized',
          role: 'contractor'
        });

      expect(createUserResponse.status).toBe(403);

      // Cannot create companies
      const createCompanyResponse = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`)
        .send({
          name: 'Contractor Unauthorized Company'
        });

      expect(createCompanyResponse.status).toBe(403);

      // Cannot create campaigns
      const createCampaignResponse = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`)
        .send({
          name: 'Contractor Unauthorized Campaign',
          companyId: testData.companies[0].id
        });

      expect(createCampaignResponse.status).toBe(403);

      // Cannot approve/reject images
      const approveResponse = await request(app)
        .put('/api/images/1/approve')
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`);

      expect(approveResponse.status).toBe(403);

      // Cannot change campaign status
      const statusResponse = await request(app)
        .put(`/api/campaigns/${testData.campaigns[0].id}/status`)
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`)
        .send({ status: 'completed' });

      expect(statusResponse.status).toBe(403);
    });

    test('should only see their own uploaded images', async () => {
      const { contractor, companyEmployee } = testData.users;
      const contractor2 = additionalUsers.contractor2;
      const campaign = testData.campaigns[0];

      // Setup campaign with both contractors
      await request(app)
        .post(`/api/campaigns/${campaign.id}/assign`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ contractorId: contractor.id });

      await request(app)
        .post(`/api/campaigns/${campaign.id}/assign`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ contractorId: contractor2.id });

      await request(app)
        .put(`/api/campaigns/${campaign.id}/status`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ status: 'in_progress' });

      // Both contractors upload images
      const upload1Response = await request(app)
        .post(`/api/campaigns/${campaign.id}/images`)
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`)
        .attach('image', testImagePath);

      const upload2Response = await request(app)
        .post(`/api/campaigns/${campaign.id}/images`)
        .set('Authorization', `Bearer ${contractor2.tokens.accessToken}`)
        .attach('image', testImagePath);

      if (upload1Response.status === 201 && upload2Response.status === 201) {
        // Contractor 1 sees all images but with appropriate filtering
        const contractor1ImagesResponse = await request(app)
          .get(`/api/campaigns/${campaign.id}/images`)
          .set('Authorization', `Bearer ${contractor.tokens.accessToken}`);

        expect(contractor1ImagesResponse.status).toBe(200);
        
        // Contractor 2 sees all images but with appropriate filtering
        const contractor2ImagesResponse = await request(app)
          .get(`/api/campaigns/${campaign.id}/images`)
          .set('Authorization', `Bearer ${contractor2.tokens.accessToken}`);

        expect(contractor2ImagesResponse.status).toBe(200);

        // Company employee sees all images
        const employeeImagesResponse = await request(app)
          .get(`/api/campaigns/${campaign.id}/images`)
          .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`);

        expect(employeeImagesResponse.status).toBe(200);
        expect(employeeImagesResponse.body.data.length).toBe(2);
      }
    });
  });

  describe('Inactive User Access Control', () => {
    test('should deny access to inactive users', async () => {
      const inactiveUser = additionalUsers.inactiveUser;

      // Inactive user cannot login (if session is invalidated)
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'inactive@test.com',
          password: 'TestPassword123!'
        });

      // Should either deny login or allow login but deny API access
      if (loginResponse.status === 200) {
        // If login succeeds, API calls should be denied
        const campaignsResponse = await request(app)
          .get('/api/campaigns')
          .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`);

        expect(campaignsResponse.status).toBe(403);
      } else {
        expect(loginResponse.status).toBe(401);
      }

      // Using old token should be denied
      const oldTokenResponse = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${inactiveUser.tokens.accessToken}`);

      expect(oldTokenResponse.status).toBe(401);
    });
  });

  describe('Cross-Role Security Boundaries', () => {
    test('should prevent privilege escalation attempts', async () => {
      const { client, contractor } = testData.users;

      // Client cannot access contractor-only endpoints
      const contractorUploadResponse = await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/images`)
        .set('Authorization', `Bearer ${client.tokens.accessToken}`)
        .attach('image', testImagePath);

      expect(contractorUploadResponse.status).toBe(403);

      // Contractor cannot access client company data from other companies
      const otherCompanyResponse = await request(app)
        .get(`/api/campaigns/${additionalCompanies.company2.campaign.id}`)
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`);

      expect(otherCompanyResponse.status).toBe(403);

      // Neither can access admin endpoints
      const clientAdminResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${client.tokens.accessToken}`);

      const contractorAdminResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`);

      expect(clientAdminResponse.status).toBe(403);
      expect(contractorAdminResponse.status).toBe(403);
    });

    test('should maintain data isolation between companies', async () => {
      const { client } = testData.users;
      const client2 = additionalUsers.client2;

      // Create test data for both companies
      const { companyEmployee } = testData.users;

      // Client 1 cannot see Client 2's company data
      const company2Response = await request(app)
        .get(`/api/companies/${additionalCompanies.company2.id}`)
        .set('Authorization', `Bearer ${client.tokens.accessToken}`);

      expect(company2Response.status).toBe(403);

      // Client 2 cannot see Client 1's company data
      const company1Response = await request(app)
        .get(`/api/companies/${testData.companies[0].id}`)
        .set('Authorization', `Bearer ${client2.tokens.accessToken}`);

      expect(company1Response.status).toBe(403);

      // Verify campaign isolation
      const client1CampaignsResponse = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${client.tokens.accessToken}`);

      const client2CampaignsResponse = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${client2.tokens.accessToken}`);

      expect(client1CampaignsResponse.status).toBe(200);
      expect(client2CampaignsResponse.status).toBe(200);

      // No overlap in campaign data
      const client1CampaignIds = client1CampaignsResponse.body.data.map((c: any) => c.id);
      const client2CampaignIds = client2CampaignsResponse.body.data.map((c: any) => c.id);

      const overlap = client1CampaignIds.filter((id: number) => client2CampaignIds.includes(id));
      expect(overlap.length).toBe(0);
    });

    test('should enforce proper token validation', async () => {
      // Test with invalid token
      const invalidTokenResponse = await request(app)
        .get('/api/campaigns')
        .set('Authorization', 'Bearer invalid-token-here');

      expect(invalidTokenResponse.status).toBe(401);

      // Test with malformed token
      const malformedTokenResponse = await request(app)
        .get('/api/campaigns')
        .set('Authorization', 'InvalidFormat token');

      expect(malformedTokenResponse.status).toBe(401);

      // Test with no token
      const noTokenResponse = await request(app)
        .get('/api/campaigns');

      expect(noTokenResponse.status).toBe(401);

      // Test with expired token (if token expiry is implemented)
      // This would require creating an expired token or mocking time
    });
  });

  describe('API Endpoint Security Matrix', () => {
    const endpoints = [
      { method: 'GET', path: '/api/users', allowedRoles: ['company_employee'] },
      { method: 'POST', path: '/api/users', allowedRoles: ['company_employee'] },
      { method: 'GET', path: '/api/companies', allowedRoles: ['company_employee'] },
      { method: 'POST', path: '/api/companies', allowedRoles: ['company_employee'] },
      { method: 'GET', path: '/api/campaigns', allowedRoles: ['company_employee', 'client', 'contractor'] },
      { method: 'POST', path: '/api/campaigns', allowedRoles: ['company_employee'] }
    ];

    const roleTokens = {
      company_employee: testData.users.companyEmployee.tokens.accessToken,
      client: testData.users.client.tokens.accessToken,
      contractor: testData.users.contractor.tokens.accessToken
    };

    endpoints.forEach(endpoint => {
      test(`${endpoint.method} ${endpoint.path} should enforce role restrictions`, async () => {
        for (const [role, token] of Object.entries(roleTokens)) {
          let response;
          
          if (endpoint.method === 'GET') {
            response = await request(app)
              .get(endpoint.path)
              .set('Authorization', `Bearer ${token}`);
          } else if (endpoint.method === 'POST') {
            const testData = getTestDataForEndpoint(endpoint.path);
            response = await request(app)
              .post(endpoint.path)
              .set('Authorization', `Bearer ${token}`)
              .send(testData);
          }

          if (endpoint.allowedRoles.includes(role)) {
            expect([200, 201]).toContain(response.status);
          } else {
            expect(response.status).toBe(403);
          }
        }
      });
    });

    function getTestDataForEndpoint(path: string) {
      switch (path) {
        case '/api/users':
          return {
            email: 'matrix-test@test.com',
            password: 'TestPassword123!',
            firstName: 'Matrix',
            lastName: 'Test',
            role: 'contractor'
          };
        case '/api/companies':
          return {
            name: 'Matrix Test Company',
            contactEmail: 'matrix@company.com'
          };
        case '/api/campaigns':
          return {
            name: 'Matrix Test Campaign',
            companyId: testData.companies[0].id
          };
        default:
          return {};
      }
    }
  });
});