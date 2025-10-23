import request from 'supertest';
import app from '../../index.js';
import { setupTestDatabase, teardownTestDatabase, createTestData, TestData } from '../integration/setup.js';
import path from 'path';
import fs from 'fs';

describe('User Acceptance Tests', () => {
  let testData: TestData;
  const testImagePath = path.join(process.cwd(), 'src/tests/fixtures/acceptance-test.jpg');

  beforeAll(async () => {
    await setupTestDatabase();
    testData = await createTestData();
    
    // Create test image fixture
    if (!fs.existsSync(path.dirname(testImagePath))) {
      fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
    }
    
    if (!fs.existsSync(testImagePath)) {
      const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
      const jpegFooter = Buffer.from([0xFF, 0xD9]);
      const testImageBuffer = Buffer.concat([jpegHeader, Buffer.alloc(1000), jpegFooter]);
      fs.writeFileSync(testImagePath, testImageBuffer);
    }
  });

  afterAll(async () => {
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    await teardownTestDatabase();
  });

  describe('UAT-001: Company Employee Campaign Management', () => {
    test('Company employee can create and manage complete campaign lifecycle', async () => {
      const { companyEmployee } = testData.users;
      const company = testData.companies[0];

      // 1. Create new campaign
      const campaignData = {
        name: 'UAT Campaign - Lifecycle Test',
        description: 'User acceptance test for complete campaign lifecycle',
        companyId: company.id,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      const createResponse = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send(campaignData);

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.data.name).toBe(campaignData.name);
      expect(createResponse.body.data.status).toBe('new');

      const campaignId = createResponse.body.data.id;

      // 2. Assign contractor to campaign
      const assignResponse = await request(app)
        .post(`/api/campaigns/${campaignId}/assign`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ contractorId: testData.users.contractor.id });

      expect(assignResponse.status).toBe(200);

      // 3. Change campaign status to in_progress
      const statusResponse = await request(app)
        .put(`/api/campaigns/${campaignId}/status`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ status: 'in_progress' });

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.data.status).toBe('in_progress');

      // 4. View campaign details with assignments
      const detailResponse = await request(app)
        .get(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`);

      expect(detailResponse.status).toBe(200);
      expect(detailResponse.body.data.status).toBe('in_progress');

      // 5. Complete campaign
      const completeResponse = await request(app)
        .put(`/api/campaigns/${campaignId}/status`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ status: 'completed' });

      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body.data.status).toBe('completed');
      expect(completeResponse.body.data.completedAt).toBeDefined();
    });

    test('Company employee can manage users across all roles', async () => {
      const { companyEmployee } = testData.users;
      const company = testData.companies[0];

      // 1. Create new client user
      const clientData = {
        email: 'uat-client@test.com',
        password: 'TestPassword123!',
        firstName: 'UAT',
        lastName: 'Client',
        role: 'client',
        companyId: company.id
      };

      const createClientResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send(clientData);

      expect(createClientResponse.status).toBe(201);
      expect(createClientResponse.body.data.role).toBe('client');

      // 2. Create new contractor user
      const contractorData = {
        email: 'uat-contractor@test.com',
        password: 'TestPassword123!',
        firstName: 'UAT',
        lastName: 'Contractor',
        role: 'contractor'
      };

      const createContractorResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send(contractorData);

      expect(createContractorResponse.status).toBe(201);
      expect(createContractorResponse.body.data.role).toBe('contractor');

      // 3. List all users
      const listResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`);

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.data.length).toBeGreaterThanOrEqual(5); // Original 3 + 2 new

      // 4. Update user information
      const updateResponse = await request(app)
        .put(`/api/users/${createClientResponse.body.data.id}`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ firstName: 'Updated UAT' });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.firstName).toBe('Updated UAT');

      // 5. Deactivate user
      const deactivateResponse = await request(app)
        .put(`/api/users/${createContractorResponse.body.data.id}`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ isActive: false });

      expect(deactivateResponse.status).toBe(200);
      expect(deactivateResponse.body.data.isActive).toBe(false);
    });
  });

  describe('UAT-002: Client User Experience', () => {
    test('Client can view and monitor their company campaigns', async () => {
      const { client, companyEmployee } = testData.users;
      const company = testData.companies[0];

      // Setup: Create campaign for client's company
      const campaignResponse = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({
          name: 'Client UAT Campaign',
          description: 'Campaign for client user acceptance testing',
          companyId: company.id
        });

      const campaignId = campaignResponse.body.data.id;

      // 1. Client views their campaigns
      const viewCampaignsResponse = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${client.tokens.accessToken}`);

      expect(viewCampaignsResponse.status).toBe(200);
      expect(viewCampaignsResponse.body.data.length).toBeGreaterThanOrEqual(1);
      
      // All campaigns should belong to client's company
      viewCampaignsResponse.body.data.forEach((campaign: any) => {
        expect(campaign.companyId).toBe(company.id);
      });

      // 2. Client views specific campaign details
      const campaignDetailResponse = await request(app)
        .get(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${client.tokens.accessToken}`);

      expect(campaignDetailResponse.status).toBe(200);
      expect(campaignDetailResponse.body.data.companyId).toBe(company.id);

      // 3. Client views campaign images (initially empty)
      const imagesResponse = await request(app)
        .get(`/api/campaigns/${campaignId}/images`)
        .set('Authorization', `Bearer ${client.tokens.accessToken}`);

      expect(imagesResponse.status).toBe(200);
      expect(Array.isArray(imagesResponse.body.data)).toBe(true);
    });

    test('Client cannot access other companies data', async () => {
      const { client, companyEmployee } = testData.users;

      // Setup: Create another company and campaign
      const anotherCompanyResponse = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({
          name: 'Another Company',
          contactEmail: 'another@company.com'
        });

      const anotherCompanyId = anotherCompanyResponse.body.data.id;

      const anotherCampaignResponse = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({
          name: 'Another Company Campaign',
          companyId: anotherCompanyId
        });

      const anotherCampaignId = anotherCampaignResponse.body.data.id;

      // 1. Client cannot view other company's campaign
      const unauthorizedResponse = await request(app)
        .get(`/api/campaigns/${anotherCampaignId}`)
        .set('Authorization', `Bearer ${client.tokens.accessToken}`);

      expect(unauthorizedResponse.status).toBe(403);

      // 2. Client cannot view other company's images
      const unauthorizedImagesResponse = await request(app)
        .get(`/api/campaigns/${anotherCampaignId}/images`)
        .set('Authorization', `Bearer ${client.tokens.accessToken}`);

      expect(unauthorizedImagesResponse.status).toBe(403);
    });
  });

  describe('UAT-003: Contractor Workflow', () => {
    test('Contractor can complete assigned campaign workflow', async () => {
      const { contractor, companyEmployee } = testData.users;
      const campaign = testData.campaigns[0];

      // Setup: Assign contractor to campaign and set status
      await request(app)
        .post(`/api/campaigns/${campaign.id}/assign`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ contractorId: contractor.id });

      await request(app)
        .put(`/api/campaigns/${campaign.id}/status`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ status: 'in_progress' });

      // 1. Contractor views assigned campaigns
      const assignedCampaignsResponse = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`);

      expect(assignedCampaignsResponse.status).toBe(200);
      expect(assignedCampaignsResponse.body.data.length).toBeGreaterThanOrEqual(1);

      const assignedCampaign = assignedCampaignsResponse.body.data.find(
        (c: any) => c.id === campaign.id
      );
      expect(assignedCampaign).toBeDefined();

      // 2. Contractor uploads proof images
      const uploadResponse1 = await request(app)
        .post(`/api/campaigns/${campaign.id}/images`)
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`)
        .attach('image', testImagePath);

      expect(uploadResponse1.status).toBe(201);
      expect(uploadResponse1.body.data.status).toBe('pending');

      const uploadResponse2 = await request(app)
        .post(`/api/campaigns/${campaign.id}/images`)
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`)
        .attach('image', testImagePath);

      expect(uploadResponse2.status).toBe(201);
      expect(uploadResponse2.body.data.status).toBe('pending');

      // 3. Contractor views uploaded images
      const contractorImagesResponse = await request(app)
        .get(`/api/campaigns/${campaign.id}/images`)
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`);

      expect(contractorImagesResponse.status).toBe(200);
      expect(contractorImagesResponse.body.data.length).toBe(2);

      // 4. Company employee rejects one image
      const images = contractorImagesResponse.body.data;
      const rejectResponse = await request(app)
        .put(`/api/images/${images[0].id}/reject`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ reason: 'Image quality needs improvement' });

      expect(rejectResponse.status).toBe(200);

      // 5. Contractor sees rejection feedback
      const feedbackResponse = await request(app)
        .get(`/api/campaigns/${campaign.id}/images`)
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`);

      const rejectedImage = feedbackResponse.body.data.find((img: any) => img.status === 'rejected');
      expect(rejectedImage).toBeDefined();
      expect(rejectedImage.rejectionReason).toBe('Image quality needs improvement');

      // 6. Contractor re-uploads improved image
      const reuploadResponse = await request(app)
        .post(`/api/campaigns/${campaign.id}/images`)
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`)
        .attach('image', testImagePath);

      expect(reuploadResponse.status).toBe(201);
    });

    test('Contractor cannot access unassigned campaigns', async () => {
      const { contractor, companyEmployee } = testData.users;
      const company = testData.companies[0];

      // Setup: Create campaign without assigning contractor
      const unassignedCampaignResponse = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({
          name: 'Unassigned Campaign',
          companyId: company.id
        });

      const unassignedCampaignId = unassignedCampaignResponse.body.data.id;

      // 1. Contractor cannot view unassigned campaign details
      const unauthorizedDetailResponse = await request(app)
        .get(`/api/campaigns/${unassignedCampaignId}`)
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`);

      expect(unauthorizedDetailResponse.status).toBe(403);

      // 2. Contractor cannot upload to unassigned campaign
      const unauthorizedUploadResponse = await request(app)
        .post(`/api/campaigns/${unassignedCampaignId}/images`)
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`)
        .attach('image', testImagePath);

      expect(unauthorizedUploadResponse.status).toBe(403);
    });
  });

  describe('UAT-004: Image Review and Approval Process', () => {
    test('Complete image review workflow with all stakeholders', async () => {
      const { companyEmployee, client, contractor } = testData.users;
      const campaign = testData.campaigns[0];

      // Setup campaign
      await request(app)
        .post(`/api/campaigns/${campaign.id}/assign`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ contractorId: contractor.id });

      await request(app)
        .put(`/api/campaigns/${campaign.id}/status`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ status: 'in_progress' });

      // 1. Contractor uploads multiple images
      const uploads = await Promise.all([
        request(app)
          .post(`/api/campaigns/${campaign.id}/images`)
          .set('Authorization', `Bearer ${contractor.tokens.accessToken}`)
          .attach('image', testImagePath),
        request(app)
          .post(`/api/campaigns/${campaign.id}/images`)
          .set('Authorization', `Bearer ${contractor.tokens.accessToken}`)
          .attach('image', testImagePath),
        request(app)
          .post(`/api/campaigns/${campaign.id}/images`)
          .set('Authorization', `Bearer ${contractor.tokens.accessToken}`)
          .attach('image', testImagePath)
      ]);

      uploads.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.data.status).toBe('pending');
      });

      // 2. Client can view pending images
      const clientViewResponse = await request(app)
        .get(`/api/campaigns/${campaign.id}/images`)
        .set('Authorization', `Bearer ${client.tokens.accessToken}`);

      expect(clientViewResponse.status).toBe(200);
      expect(clientViewResponse.body.data.length).toBe(3);

      const images = clientViewResponse.body.data;

      // 3. Company employee reviews images
      // Approve first image
      const approveResponse = await request(app)
        .put(`/api/images/${images[0].id}/approve`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`);

      expect(approveResponse.status).toBe(200);
      expect(approveResponse.body.data.status).toBe('approved');

      // Reject second image with reason
      const rejectResponse = await request(app)
        .put(`/api/images/${images[1].id}/reject`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ reason: 'Poster not clearly visible' });

      expect(rejectResponse.status).toBe(200);
      expect(rejectResponse.body.data.status).toBe('rejected');
      expect(rejectResponse.body.data.rejectionReason).toBe('Poster not clearly visible');

      // Leave third image pending

      // 4. All users can see updated image statuses
      const finalStatusResponse = await request(app)
        .get(`/api/campaigns/${campaign.id}/images`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`);

      const finalImages = finalStatusResponse.body.data;
      expect(finalImages.find((img: any) => img.id === images[0].id).status).toBe('approved');
      expect(finalImages.find((img: any) => img.id === images[1].id).status).toBe('rejected');
      expect(finalImages.find((img: any) => img.id === images[2].id).status).toBe('pending');

      // 5. Contractor can see all feedback
      const contractorFeedbackResponse = await request(app)
        .get(`/api/campaigns/${campaign.id}/images`)
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`);

      const contractorImages = contractorFeedbackResponse.body.data;
      const rejectedImage = contractorImages.find((img: any) => img.status === 'rejected');
      expect(rejectedImage.rejectionReason).toBe('Poster not clearly visible');
    });
  });

  describe('UAT-005: Business Rules and Data Integrity', () => {
    test('Campaign completion rules are enforced', async () => {
      const { companyEmployee, client } = testData.users;
      const company = testData.companies[0];

      // 1. Create and complete campaign
      const campaignResponse = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({
          name: 'Business Rules Test Campaign',
          companyId: company.id
        });

      const campaignId = campaignResponse.body.data.id;

      const completeResponse = await request(app)
        .put(`/api/campaigns/${campaignId}/status`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ status: 'completed' });

      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body.data.completedAt).toBeDefined();

      // 2. Client can see completed campaign immediately
      const immediateViewResponse = await request(app)
        .get(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${client.tokens.accessToken}`);

      expect(immediateViewResponse.status).toBe(200);
      expect(immediateViewResponse.body.data.status).toBe('completed');

      // 3. Verify campaign appears in client's campaign list
      const clientCampaignsResponse = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${client.tokens.accessToken}`);

      const completedCampaign = clientCampaignsResponse.body.data.find(
        (c: any) => c.id === campaignId
      );
      expect(completedCampaign).toBeDefined();
      expect(completedCampaign.status).toBe('completed');
    });

    test('File upload limits and validation are enforced', async () => {
      const { contractor, companyEmployee } = testData.users;
      const campaign = testData.campaigns[0];

      // Setup
      await request(app)
        .post(`/api/campaigns/${campaign.id}/assign`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ contractorId: contractor.id });

      await request(app)
        .put(`/api/campaigns/${campaign.id}/status`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ status: 'in_progress' });

      // 1. Test file size limit (create oversized file)
      const oversizedPath = path.join(path.dirname(testImagePath), 'oversized.jpg');
      const oversizedBuffer = Buffer.concat([
        Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]),
        Buffer.alloc(12 * 1024 * 1024) // 12MB (over 10MB limit)
      ]);
      fs.writeFileSync(oversizedPath, oversizedBuffer);

      const oversizedResponse = await request(app)
        .post(`/api/campaigns/${campaign.id}/images`)
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`)
        .attach('image', oversizedPath);

      expect(oversizedResponse.status).toBe(400);
      expect(oversizedResponse.body.success).toBe(false);

      // Cleanup
      fs.unlinkSync(oversizedPath);

      // 2. Test invalid file type
      const textFilePath = path.join(path.dirname(testImagePath), 'invalid.txt');
      fs.writeFileSync(textFilePath, 'This is not an image');

      const invalidTypeResponse = await request(app)
        .post(`/api/campaigns/${campaign.id}/images`)
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`)
        .attach('image', textFilePath);

      expect(invalidTypeResponse.status).toBe(400);
      expect(invalidTypeResponse.body.success).toBe(false);

      // Cleanup
      fs.unlinkSync(textFilePath);

      // 3. Test valid image upload
      const validResponse = await request(app)
        .post(`/api/campaigns/${campaign.id}/images`)
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`)
        .attach('image', testImagePath);

      expect(validResponse.status).toBe(201);
      expect(validResponse.body.success).toBe(true);
    });
  });

  describe('UAT-006: System Performance and Reliability', () => {
    test('System handles concurrent user operations', async () => {
      const { companyEmployee, client, contractor } = testData.users;
      const campaign = testData.campaigns[0];

      // Setup
      await request(app)
        .post(`/api/campaigns/${campaign.id}/assign`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ contractorId: contractor.id });

      await request(app)
        .put(`/api/campaigns/${campaign.id}/status`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ status: 'in_progress' });

      // Perform concurrent operations
      const concurrentOperations = [
        // Company employee operations
        request(app)
          .get('/api/campaigns')
          .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`),
        request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`),
        
        // Client operations
        request(app)
          .get('/api/campaigns')
          .set('Authorization', `Bearer ${client.tokens.accessToken}`),
        request(app)
          .get(`/api/campaigns/${campaign.id}`)
          .set('Authorization', `Bearer ${client.tokens.accessToken}`),
        
        // Contractor operations
        request(app)
          .get('/api/campaigns')
          .set('Authorization', `Bearer ${contractor.tokens.accessToken}`),
        request(app)
          .post(`/api/campaigns/${campaign.id}/images`)
          .set('Authorization', `Bearer ${contractor.tokens.accessToken}`)
          .attach('image', testImagePath)
      ];

      const results = await Promise.all(concurrentOperations);

      // All operations should succeed
      results.forEach((result, index) => {
        expect([200, 201]).toContain(result.status);
        expect(result.body.success).toBe(true);
      });
    });

    test('System maintains data consistency under load', async () => {
      const { companyEmployee } = testData.users;
      const company = testData.companies[0];

      // Create multiple campaigns concurrently
      const campaignCreations = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/campaigns')
          .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
          .send({
            name: `Concurrent Campaign ${i + 1}`,
            description: `Concurrent test campaign ${i + 1}`,
            companyId: company.id
          })
      );

      const creationResults = await Promise.all(campaignCreations);

      // All campaigns should be created successfully
      creationResults.forEach(result => {
        expect(result.status).toBe(201);
        expect(result.body.success).toBe(true);
        expect(result.body.data.companyId).toBe(company.id);
      });

      // Verify all campaigns exist in database
      const listResponse = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`);

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.data.length).toBeGreaterThanOrEqual(5);

      // Check for duplicate names (should not exist)
      const campaignNames = listResponse.body.data.map((c: any) => c.name);
      const uniqueNames = [...new Set(campaignNames)];
      expect(campaignNames.length).toBe(uniqueNames.length);
    });
  });
});