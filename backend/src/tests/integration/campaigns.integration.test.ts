import request from 'supertest';
import app from '../../index.js';
import { setupTestDatabase, teardownTestDatabase, createTestData, TestData } from './setup.js';

describe('Campaigns API Integration Tests', () => {
  let testData: TestData;

  beforeAll(async () => {
    await setupTestDatabase();
    testData = await createTestData();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /api/campaigns', () => {
    test('should return all campaigns for company employee', async () => {
      const response = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should return only company campaigns for client users', async () => {
      const response = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${testData.users.client.tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All campaigns should belong to the client's company
      response.body.data.forEach((campaign: any) => {
        expect(campaign.companyId).toBe(testData.users.client.companyId);
      });
    });

    test('should return only assigned campaigns for contractors', async () => {
      // First assign contractor to a campaign
      await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/assign`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send({ contractorId: testData.users.contractor.id });

      const response = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${testData.users.contractor.tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should filter campaigns by status', async () => {
      const response = await request(app)
        .get('/api/campaigns?status=new')
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      response.body.data.forEach((campaign: any) => {
        expect(campaign.status).toBe('new');
      });
    });

    test('should filter campaigns by company', async () => {
      const response = await request(app)
        .get(`/api/campaigns?companyId=${testData.companies[0].id}`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      response.body.data.forEach((campaign: any) => {
        expect(campaign.companyId).toBe(testData.companies[0].id);
      });
    });
  });

  describe('POST /api/campaigns', () => {
    test('should create new campaign as company employee', async () => {
      const newCampaign = {
        name: 'New Test Campaign',
        description: 'New campaign description',
        companyId: testData.companies[0].id,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send(newCampaign);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(newCampaign.name);
      expect(response.body.data.companyId).toBe(newCampaign.companyId);
      expect(response.body.data.status).toBe('new');
    });

    test('should validate required fields', async () => {
      const invalidCampaign = {
        // Missing name
        description: 'Invalid campaign',
        companyId: 'invalid-id'
      };

      const response = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send(invalidCampaign);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should reject access for non-company employees', async () => {
      const newCampaign = {
        name: 'Unauthorized Campaign',
        companyId: testData.companies[0].id
      };

      const response = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${testData.users.client.tokens.accessToken}`)
        .send(newCampaign);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    test('should validate company exists', async () => {
      const campaignWithInvalidCompany = {
        name: 'Campaign with Invalid Company',
        companyId: 99999
      };

      const response = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send(campaignWithInvalidCompany);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/campaigns/:id', () => {
    test('should return campaign by id for company employee', async () => {
      const response = await request(app)
        .get(`/api/campaigns/${testData.campaigns[0].id}`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testData.campaigns[0].id);
    });

    test('should allow client to view their company campaigns', async () => {
      const response = await request(app)
        .get(`/api/campaigns/${testData.campaigns[0].id}`)
        .set('Authorization', `Bearer ${testData.users.client.tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.companyId).toBe(testData.users.client.companyId);
    });

    test('should return 404 for non-existent campaign', async () => {
      const response = await request(app)
        .get('/api/campaigns/99999')
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/campaigns/:id', () => {
    test('should update campaign as company employee', async () => {
      const updates = {
        name: 'Updated Campaign Name',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/campaigns/${testData.campaigns[0].id}`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updates.name);
      expect(response.body.data.description).toBe(updates.description);
    });

    test('should reject updates by non-company employees', async () => {
      const updates = {
        name: 'Unauthorized Update'
      };

      const response = await request(app)
        .put(`/api/campaigns/${testData.campaigns[0].id}`)
        .set('Authorization', `Bearer ${testData.users.client.tokens.accessToken}`)
        .send(updates);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/campaigns/:id/status', () => {
    test('should update campaign status as company employee', async () => {
      const statusUpdate = {
        status: 'in_progress'
      };

      const response = await request(app)
        .put(`/api/campaigns/${testData.campaigns[0].id}/status`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send(statusUpdate);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(statusUpdate.status);
    });

    test('should validate status values', async () => {
      const invalidStatus = {
        status: 'invalid_status'
      };

      const response = await request(app)
        .put(`/api/campaigns/${testData.campaigns[0].id}/status`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send(invalidStatus);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should set completed_at when status changes to completed', async () => {
      const statusUpdate = {
        status: 'completed'
      };

      const response = await request(app)
        .put(`/api/campaigns/${testData.campaigns[0].id}/status`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send(statusUpdate);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.completedAt).toBeDefined();
    });
  });

  describe('POST /api/campaigns/:id/assign', () => {
    test('should assign contractor to campaign', async () => {
      const assignment = {
        contractorId: testData.users.contractor.id
      };

      const response = await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/assign`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send(assignment);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject duplicate assignments', async () => {
      const assignment = {
        contractorId: testData.users.contractor.id
      };

      // First assignment should succeed
      await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/assign`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send(assignment);

      // Second assignment should fail
      const response = await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/assign`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send(assignment);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should validate contractor role', async () => {
      const assignment = {
        contractorId: testData.users.client.id // Client, not contractor
      };

      const response = await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/assign`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send(assignment);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/campaigns/:id/assign/:contractorId', () => {
    test('should unassign contractor from campaign', async () => {
      // First assign contractor
      await request(app)
        .post(`/api/campaigns/${testData.campaigns[0].id}/assign`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`)
        .send({ contractorId: testData.users.contractor.id });

      // Then unassign
      const response = await request(app)
        .delete(`/api/campaigns/${testData.campaigns[0].id}/assign/${testData.users.contractor.id}`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should handle unassigning non-assigned contractor', async () => {
      const response = await request(app)
        .delete(`/api/campaigns/${testData.campaigns[0].id}/assign/${testData.users.contractor.id}`)
        .set('Authorization', `Bearer ${testData.users.companyEmployee.tokens.accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});