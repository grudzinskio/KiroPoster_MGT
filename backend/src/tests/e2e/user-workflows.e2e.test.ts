import request from 'supertest';
import app from '../../index.js';
import { setupTestDatabase, teardownTestDatabase } from '../integration/setup.js';
import path from 'path';
import fs from 'fs';

describe('End-to-End User Workflows', () => {
  const testImagePath = path.join(process.cwd(), 'src/tests/fixtures/test-image.jpg');

  beforeAll(async () => {
    await setupTestDatabase();
    
    // Create test image fixture
    if (!fs.existsSync(path.dirname(testImagePath))) {
      fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
    }
    
    if (!fs.existsSync(testImagePath)) {
      const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
      const jpegFooter = Buffer.from([0xFF, 0xD9]);
      const testImageBuffer = Buffer.concat([jpegHeader, Buffer.alloc(100), jpegFooter]);
      fs.writeFileSync(testImagePath, testImageBuffer);
    }
  });

  afterAll(async () => {
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    await teardownTestDatabase();
  });

  describe('Complete Campaign Workflow', () => {
    let companyEmployeeToken: string;
    let clientToken: string;
    let contractorToken: string;
    let companyId: number;
    let campaignId: number;
    let contractorId: number;

    test('1. Company employee creates company and users', async () => {
      // Create company employee
      const employeeData = {
        email: 'employee@workflow.com',
        password: 'Password123!',
        firstName: 'Company',
        lastName: 'Employee',
        role: 'company_employee'
      };

      const createEmployeeResponse = await request(app)
        .post('/api/users')
        .send(employeeData);

      expect(createEmployeeResponse.status).toBe(201);

      // Login as company employee
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: employeeData.email,
          password: employeeData.password
        });

      expect(loginResponse.status).toBe(200);
      companyEmployeeToken = loginResponse.body.data.accessToken;

      // Create client company
      const companyData = {
        name: 'Workflow Test Company',
        contactEmail: 'contact@workflow.com',
        contactPhone: '123-456-7890',
        address: '123 Workflow St'
      };

      const createCompanyResponse = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${companyEmployeeToken}`)
        .send(companyData);

      expect(createCompanyResponse.status).toBe(201);
      companyId = createCompanyResponse.body.data.id;

      // Create client user
      const clientData = {
        email: 'client@workflow.com',
        password: 'Password123!',
        firstName: 'Client',
        lastName: 'User',
        role: 'client',
        companyId: companyId
      };

      const createClientResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${companyEmployeeToken}`)
        .send(clientData);

      expect(createClientResponse.status).toBe(201);

      // Create contractor user
      const contractorData = {
        email: 'contractor@workflow.com',
        password: 'Password123!',
        firstName: 'Contractor',
        lastName: 'User',
        role: 'contractor'
      };

      const createContractorResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${companyEmployeeToken}`)
        .send(contractorData);

      expect(createContractorResponse.status).toBe(201);
      contractorId = createContractorResponse.body.data.id;
    });

    test('2. Client and contractor login', async () => {
      // Client login
      const clientLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'client@workflow.com',
          password: 'Password123!'
        });

      expect(clientLoginResponse.status).toBe(200);
      clientToken = clientLoginResponse.body.data.accessToken;

      // Contractor login
      const contractorLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'contractor@workflow.com',
          password: 'Password123!'
        });

      expect(contractorLoginResponse.status).toBe(200);
      contractorToken = contractorLoginResponse.body.data.accessToken;
    });

    test('3. Company employee creates campaign', async () => {
      const campaignData = {
        name: 'Workflow Test Campaign',
        description: 'End-to-end test campaign',
        companyId: companyId,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      const createCampaignResponse = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${companyEmployeeToken}`)
        .send(campaignData);

      expect(createCampaignResponse.status).toBe(201);
      expect(createCampaignResponse.body.data.status).toBe('new');
      campaignId = createCampaignResponse.body.data.id;
    });

    test('4. Client can view their company campaign', async () => {
      const viewCampaignResponse = await request(app)
        .get(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(viewCampaignResponse.status).toBe(200);
      expect(viewCampaignResponse.body.data.companyId).toBe(companyId);
    });

    test('5. Contractor cannot see unassigned campaign', async () => {
      const viewCampaignsResponse = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${contractorToken}`);

      expect(viewCampaignsResponse.status).toBe(200);
      expect(viewCampaignsResponse.body.data).toHaveLength(0);
    });

    test('6. Company employee assigns contractor to campaign', async () => {
      const assignResponse = await request(app)
        .post(`/api/campaigns/${campaignId}/assign`)
        .set('Authorization', `Bearer ${companyEmployeeToken}`)
        .send({ contractorId: contractorId });

      expect(assignResponse.status).toBe(200);
    });

    test('7. Company employee changes campaign status to in_progress', async () => {
      const statusResponse = await request(app)
        .put(`/api/campaigns/${campaignId}/status`)
        .set('Authorization', `Bearer ${companyEmployeeToken}`)
        .send({ status: 'in_progress' });

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.data.status).toBe('in_progress');
    });

    test('8. Contractor can now see assigned campaign', async () => {
      const viewCampaignsResponse = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${contractorToken}`);

      expect(viewCampaignsResponse.status).toBe(200);
      expect(viewCampaignsResponse.body.data).toHaveLength(1);
      expect(viewCampaignsResponse.body.data[0].id).toBe(campaignId);
    });

    test('9. Contractor uploads proof images', async () => {
      // Upload first image
      const upload1Response = await request(app)
        .post(`/api/campaigns/${campaignId}/images`)
        .set('Authorization', `Bearer ${contractorToken}`)
        .attach('image', testImagePath);

      expect(upload1Response.status).toBe(201);
      expect(upload1Response.body.data.status).toBe('pending');

      // Upload second image
      const upload2Response = await request(app)
        .post(`/api/campaigns/${campaignId}/images`)
        .set('Authorization', `Bearer ${contractorToken}`)
        .attach('image', testImagePath);

      expect(upload2Response.status).toBe(201);
      expect(upload2Response.body.data.status).toBe('pending');
    });

    test('10. Client can view uploaded images', async () => {
      const imagesResponse = await request(app)
        .get(`/api/campaigns/${campaignId}/images`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(imagesResponse.status).toBe(200);
      expect(imagesResponse.body.data).toHaveLength(2);
      expect(imagesResponse.body.data[0].status).toBe('pending');
    });

    test('11. Company employee reviews and approves/rejects images', async () => {
      // Get images
      const imagesResponse = await request(app)
        .get(`/api/campaigns/${campaignId}/images`)
        .set('Authorization', `Bearer ${companyEmployeeToken}`);

      const images = imagesResponse.body.data;
      expect(images).toHaveLength(2);

      // Approve first image
      const approveResponse = await request(app)
        .put(`/api/images/${images[0].id}/approve`)
        .set('Authorization', `Bearer ${companyEmployeeToken}`);

      expect(approveResponse.status).toBe(200);
      expect(approveResponse.body.data.status).toBe('approved');

      // Reject second image
      const rejectResponse = await request(app)
        .put(`/api/images/${images[1].id}/reject`)
        .set('Authorization', `Bearer ${companyEmployeeToken}`)
        .send({ reason: 'Image quality is too low' });

      expect(rejectResponse.status).toBe(200);
      expect(rejectResponse.body.data.status).toBe('rejected');
      expect(rejectResponse.body.data.rejectionReason).toBe('Image quality is too low');
    });

    test('12. Contractor can see rejection feedback and re-upload', async () => {
      // Check image status
      const imagesResponse = await request(app)
        .get(`/api/campaigns/${campaignId}/images`)
        .set('Authorization', `Bearer ${contractorToken}`);

      const rejectedImage = imagesResponse.body.data.find((img: any) => img.status === 'rejected');
      expect(rejectedImage.rejectionReason).toBe('Image quality is too low');

      // Upload replacement image
      const reuploadResponse = await request(app)
        .post(`/api/campaigns/${campaignId}/images`)
        .set('Authorization', `Bearer ${contractorToken}`)
        .attach('image', testImagePath);

      expect(reuploadResponse.status).toBe(201);
    });

    test('13. Company employee completes campaign', async () => {
      const completeResponse = await request(app)
        .put(`/api/campaigns/${campaignId}/status`)
        .set('Authorization', `Bearer ${companyEmployeeToken}`)
        .send({ status: 'completed' });

      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body.data.status).toBe('completed');
      expect(completeResponse.body.data.completedAt).toBeDefined();
    });

    test('14. All users can view completed campaign with final statistics', async () => {
      // Company employee view
      const employeeViewResponse = await request(app)
        .get(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${companyEmployeeToken}`);

      expect(employeeViewResponse.status).toBe(200);
      expect(employeeViewResponse.body.data.status).toBe('completed');

      // Client view
      const clientViewResponse = await request(app)
        .get(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(clientViewResponse.status).toBe(200);
      expect(clientViewResponse.body.data.status).toBe('completed');

      // Contractor view
      const contractorViewResponse = await request(app)
        .get(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${contractorToken}`);

      expect(contractorViewResponse.status).toBe(200);
      expect(contractorViewResponse.body.data.status).toBe('completed');

      // Check final image count
      const finalImagesResponse = await request(app)
        .get(`/api/campaigns/${campaignId}/images`)
        .set('Authorization', `Bearer ${companyEmployeeToken}`);

      expect(finalImagesResponse.body.data).toHaveLength(3); // 1 approved, 1 rejected, 1 pending
    });
  });

  describe('Security and Access Control Workflow', () => {
    let tokens: { [key: string]: string } = {};
    let companyId: number;
    let campaignId: number;

    test('Setup users and data for security testing', async () => {
      // Create company employee
      const employeeResponse = await request(app)
        .post('/api/users')
        .send({
          email: 'security@test.com',
          password: 'Password123!',
          firstName: 'Security',
          lastName: 'Employee',
          role: 'company_employee'
        });

      const employeeLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'security@test.com', password: 'Password123!' });

      tokens.employee = employeeLogin.body.data.accessToken;

      // Create company
      const companyResponse = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${tokens.employee}`)
        .send({
          name: 'Security Test Company',
          contactEmail: 'security@company.com'
        });

      companyId = companyResponse.body.data.id;

      // Create client
      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tokens.employee}`)
        .send({
          email: 'securityclient@test.com',
          password: 'Password123!',
          firstName: 'Security',
          lastName: 'Client',
          role: 'client',
          companyId: companyId
        });

      const clientLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'securityclient@test.com', password: 'Password123!' });

      tokens.client = clientLogin.body.data.accessToken;

      // Create contractor
      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tokens.employee}`)
        .send({
          email: 'securitycontractor@test.com',
          password: 'Password123!',
          firstName: 'Security',
          lastName: 'Contractor',
          role: 'contractor'
        });

      const contractorLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'securitycontractor@test.com', password: 'Password123!' });

      tokens.contractor = contractorLogin.body.data.accessToken;

      // Create campaign
      const campaignResponse = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${tokens.employee}`)
        .send({
          name: 'Security Test Campaign',
          companyId: companyId
        });

      campaignId = campaignResponse.body.data.id;
    });

    test('Role-based access control is enforced', async () => {
      // Client cannot create users
      const clientCreateUser = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tokens.client}`)
        .send({
          email: 'unauthorized@test.com',
          password: 'Password123!',
          firstName: 'Unauthorized',
          lastName: 'User',
          role: 'contractor'
        });

      expect(clientCreateUser.status).toBe(403);

      // Contractor cannot create campaigns
      const contractorCreateCampaign = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${tokens.contractor}`)
        .send({
          name: 'Unauthorized Campaign',
          companyId: companyId
        });

      expect(contractorCreateCampaign.status).toBe(403);

      // Client cannot approve images
      const clientApproveImage = await request(app)
        .put('/api/images/1/approve')
        .set('Authorization', `Bearer ${tokens.client}`);

      expect(clientApproveImage.status).toBe(403);
    });

    test('Data isolation is maintained', async () => {
      // Create another company and client
      const anotherCompanyResponse = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${tokens.employee}`)
        .send({
          name: 'Another Company',
          contactEmail: 'another@company.com'
        });

      const anotherCompanyId = anotherCompanyResponse.body.data.id;

      await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tokens.employee}`)
        .send({
          email: 'anotherclient@test.com',
          password: 'Password123!',
          firstName: 'Another',
          lastName: 'Client',
          role: 'client',
          companyId: anotherCompanyId
        });

      const anotherClientLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'anotherclient@test.com', password: 'Password123!' });

      const anotherClientToken = anotherClientLogin.body.data.accessToken;

      // Another client cannot see first company's campaigns
      const campaignsResponse = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${anotherClientToken}`);

      expect(campaignsResponse.status).toBe(200);
      expect(campaignsResponse.body.data).toHaveLength(0);

      // Another client cannot access first company's campaign details
      const campaignDetailResponse = await request(app)
        .get(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${anotherClientToken}`);

      expect(campaignDetailResponse.status).toBe(403);
    });

    test('Authentication is required for all protected endpoints', async () => {
      const protectedEndpoints = [
        { method: 'get', path: '/api/users' },
        { method: 'post', path: '/api/users' },
        { method: 'get', path: '/api/companies' },
        { method: 'post', path: '/api/companies' },
        { method: 'get', path: '/api/campaigns' },
        { method: 'post', path: '/api/campaigns' },
        { method: 'get', path: '/api/auth/me' }
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app)[endpoint.method](endpoint.path);
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      }
    });

    test('Token refresh workflow works correctly', async () => {
      // Login to get refresh token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security@test.com',
          password: 'Password123!'
        });

      const cookies = loginResponse.headers['set-cookie'];
      expect(cookies).toBeDefined();

      // Use refresh token to get new access token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', cookies);

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.headers['set-cookie']).toBeDefined();

      // Logout should invalidate tokens
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${tokens.employee}`);

      expect(logoutResponse.status).toBe(200);
    });
  });
});