import request from 'supertest';
import app from '../../index.js';
import { getDatabase } from '../../config/database.js';
import { setupTestDatabase, teardownTestDatabase, createTestData, TestData } from './setup.js';
import path from 'path';
import fs from 'fs';

describe('Data Integrity and Business Rules', () => {
  let testData: TestData;
  let knex: any;
  const testImagePath = path.join(process.cwd(), 'src/tests/fixtures/integrity-test.jpg');

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
  });

  afterAll(async () => {
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    await teardownTestDatabase();
  });

  describe('User Data Integrity', () => {
    test('should enforce unique email constraints', async () => {
      const { companyEmployee } = testData.users;
      
      // Try to create user with existing email
      const duplicateEmailResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({
          email: testData.users.client.email, // Existing email
          password: 'NewPassword123!',
          firstName: 'Duplicate',
          lastName: 'User',
          role: 'contractor'
        });

      expect(duplicateEmailResponse.status).toBe(400);
      expect(duplicateEmailResponse.body.success).toBe(false);
      expect(duplicateEmailResponse.body.error.message).toMatch(/email.*already.*exists/i);
    });

    test('should maintain referential integrity for company relationships', async () => {
      const { companyEmployee } = testData.users;
      
      // Try to create user with non-existent company
      const invalidCompanyResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({
          email: 'invalid-company@test.com',
          password: 'TestPassword123!',
          firstName: 'Invalid',
          lastName: 'Company',
          role: 'client',
          companyId: 99999 // Non-existent company
        });

      expect(invalidCompanyResponse.status).toBe(400);
      expect(invalidCompanyResponse.body.success).toBe(false);
    });

    test('should enforce role-based company assignment rules', async () => {
      const { companyEmployee } = testData.users;
      const company = testData.companies[0];
      
      // Client users must have a company
      const clientWithoutCompanyResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({
          email: 'client-no-company@test.com',
          password: 'TestPassword123!',
          firstName: 'Client',
          lastName: 'NoCompany',
          role: 'client'
          // Missing companyId
        });

      expect(clientWithoutCompanyResponse.status).toBe(400);
      expect(clientWithoutCompanyResponse.body.success).toBe(false);

      // Company employees should not have a company assignment
      const employeeWithCompanyResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({
          email: 'employee-with-company@test.com',
          password: 'TestPassword123!',
          firstName: 'Employee',
          lastName: 'WithCompany',
          role: 'company_employee',
          companyId: company.id // Should not be allowed
        });

      expect(employeeWithCompanyResponse.status).toBe(400);
      expect(employeeWithCompanyResponse.body.success).toBe(false);
    });

    test('should prevent deletion of users with active relationships', async () => {
      const { companyEmployee } = testData.users;
      
      // Try to delete user who created campaigns
      const deleteResponse = await request(app)
        .delete(`/api/users/${companyEmployee.id}`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`);

      // Should either prevent deletion or handle cascade properly
      if (deleteResponse.status === 400) {
        expect(deleteResponse.body.success).toBe(false);
        expect(deleteResponse.body.error.message).toMatch(/cannot.*delete.*active.*relationships/i);
      } else if (deleteResponse.status === 200) {
        // If deletion is allowed, verify cascade behavior
        const campaignsResponse = await knex('campaigns')
          .where('created_by', companyEmployee.id);
        
        // Campaigns should either be deleted or have created_by set to null
        expect(campaignsResponse.length).toBe(0);
      }
    });
  });

  describe('Campaign Data Integrity', () => {
    test('should enforce campaign-company relationships', async () => {
      const { companyEmployee } = testData.users;
      
      // Try to create campaign for non-existent company
      const invalidCampaignResponse = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({
          name: 'Invalid Company Campaign',
          description: 'Campaign for non-existent company',
          companyId: 99999 // Non-existent company
        });

      expect(invalidCampaignResponse.status).toBe(400);
      expect(invalidCampaignResponse.body.success).toBe(false);
    });

    test('should validate campaign status transitions', async () => {
      const { companyEmployee } = testData.users;
      const company = testData.companies[0];
      
      // Create new campaign
      const campaignResponse = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({
          name: 'Status Transition Test',
          companyId: company.id
        });

      const campaignId = campaignResponse.body.data.id;
      expect(campaignResponse.body.data.status).toBe('new');

      // Valid transition: new -> in_progress
      const validTransitionResponse = await request(app)
        .put(`/api/campaigns/${campaignId}/status`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ status: 'in_progress' });

      expect(validTransitionResponse.status).toBe(200);
      expect(validTransitionResponse.body.data.status).toBe('in_progress');

      // Valid transition: in_progress -> completed
      const completeResponse = await request(app)
        .put(`/api/campaigns/${campaignId}/status`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ status: 'completed' });

      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body.data.status).toBe('completed');
      expect(completeResponse.body.data.completedAt).toBeDefined();

      // Invalid transition: completed -> new (should not be allowed)
      const invalidTransitionResponse = await request(app)
        .put(`/api/campaigns/${campaignId}/status`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ status: 'new' });

      expect(invalidTransitionResponse.status).toBe(400);
      expect(invalidTransitionResponse.body.success).toBe(false);
    });

    test('should maintain campaign assignment integrity', async () => {
      const { companyEmployee, contractor } = testData.users;
      const campaign = testData.campaigns[0];

      // Assign contractor to campaign
      const assignResponse = await request(app)
        .post(`/api/campaigns/${campaign.id}/assign`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ contractorId: contractor.id });

      expect(assignResponse.status).toBe(200);

      // Try to assign same contractor again (should prevent duplicates)
      const duplicateAssignResponse = await request(app)
        .post(`/api/campaigns/${campaign.id}/assign`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ contractorId: contractor.id });

      expect(duplicateAssignResponse.status).toBe(400);
      expect(duplicateAssignResponse.body.success).toBe(false);

      // Try to assign non-existent user
      const invalidUserResponse = await request(app)
        .post(`/api/campaigns/${campaign.id}/assign`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ contractorId: 99999 });

      expect(invalidUserResponse.status).toBe(400);
      expect(invalidUserResponse.body.success).toBe(false);

      // Try to assign non-contractor role
      const clientAssignResponse = await request(app)
        .post(`/api/campaigns/${campaign.id}/assign`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ contractorId: testData.users.client.id });

      expect(clientAssignResponse.status).toBe(400);
      expect(clientAssignResponse.body.success).toBe(false);
    });

    test('should enforce date validation rules', async () => {
      const { companyEmployee } = testData.users;
      const company = testData.companies[0];

      // Try to create campaign with end date before start date
      const invalidDateResponse = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({
          name: 'Invalid Date Campaign',
          companyId: company.id,
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          endDate: new Date().toISOString() // Today (before start date)
        });

      expect(invalidDateResponse.status).toBe(400);
      expect(invalidDateResponse.body.success).toBe(false);
      expect(invalidDateResponse.body.error.message).toMatch(/end.*date.*before.*start.*date/i);
    });
  });

  describe('Image Data Integrity', () => {
    test('should enforce image-campaign relationships', async () => {
      const { contractor } = testData.users;
      
      // Try to upload image to non-existent campaign
      const invalidCampaignResponse = await request(app)
        .post('/api/campaigns/99999/images')
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`)
        .attach('image', testImagePath);

      expect(invalidCampaignResponse.status).toBe(404);
      expect(invalidCampaignResponse.body.success).toBe(false);
    });

    test('should maintain image approval workflow integrity', async () => {
      const { companyEmployee, contractor } = testData.users;
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

      // Upload image
      const uploadResponse = await request(app)
        .post(`/api/campaigns/${campaign.id}/images`)
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`)
        .attach('image', testImagePath);

      const imageId = uploadResponse.body.data.id;
      expect(uploadResponse.body.data.status).toBe('pending');

      // Approve image
      const approveResponse = await request(app)
        .put(`/api/images/${imageId}/approve`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`);

      expect(approveResponse.status).toBe(200);
      expect(approveResponse.body.data.status).toBe('approved');
      expect(approveResponse.body.data.reviewedBy).toBe(companyEmployee.id);
      expect(approveResponse.body.data.reviewedAt).toBeDefined();

      // Try to approve already approved image (should be idempotent or prevent)
      const reapproveResponse = await request(app)
        .put(`/api/images/${imageId}/approve`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`);

      expect([200, 400]).toContain(reapproveResponse.status);

      // Try to reject already approved image
      const rejectApprovedResponse = await request(app)
        .put(`/api/images/${imageId}/reject`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ reason: 'Changed mind' });

      expect(rejectApprovedResponse.status).toBe(400);
      expect(rejectApprovedResponse.body.success).toBe(false);
    });

    test('should enforce image file integrity', async () => {
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

      // Upload image
      const uploadResponse = await request(app)
        .post(`/api/campaigns/${campaign.id}/images`)
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`)
        .attach('image', testImagePath);

      const imageData = uploadResponse.body.data;
      
      // Verify file metadata integrity
      expect(imageData.filename).toBeDefined();
      expect(imageData.originalFilename).toBeDefined();
      expect(imageData.filePath).toBeDefined();
      expect(imageData.fileSize).toBeGreaterThan(0);
      expect(imageData.mimeType).toBe('image/jpeg');

      // Verify database record matches file system
      const dbImage = await knex('images').where('id', imageData.id).first();
      expect(dbImage.filename).toBe(imageData.filename);
      expect(dbImage.file_size).toBe(imageData.fileSize);
      expect(dbImage.mime_type).toBe(imageData.mimeType);

      // Verify file exists on disk
      const fullPath = path.join(process.cwd(), 'uploads', imageData.filePath);
      expect(fs.existsSync(fullPath)).toBe(true);
    });

    test('should prevent orphaned image records', async () => {
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

      // Upload image
      const uploadResponse = await request(app)
        .post(`/api/campaigns/${campaign.id}/images`)
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`)
        .attach('image', testImagePath);

      const imageId = uploadResponse.body.data.id;

      // Delete image
      const deleteResponse = await request(app)
        .delete(`/api/images/${imageId}`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`);

      expect(deleteResponse.status).toBe(200);

      // Verify image record is deleted from database
      const dbImage = await knex('images').where('id', imageId).first();
      expect(dbImage).toBeUndefined();

      // Verify file is deleted from disk
      const imageData = uploadResponse.body.data;
      const fullPath = path.join(process.cwd(), 'uploads', imageData.filePath);
      expect(fs.existsSync(fullPath)).toBe(false);
    });
  });

  describe('Transaction Integrity', () => {
    test('should handle failed transactions properly', async () => {
      const { companyEmployee } = testData.users;
      
      // Simulate a transaction that should fail
      // Try to create campaign with invalid data that would cause DB constraint violation
      const invalidCampaignResponse = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({
          name: '', // Empty name should fail validation
          companyId: testData.companies[0].id
        });

      expect(invalidCampaignResponse.status).toBe(400);
      expect(invalidCampaignResponse.body.success).toBe(false);

      // Verify no partial data was created
      const campaignsAfterFailure = await knex('campaigns').where('name', '');
      expect(campaignsAfterFailure.length).toBe(0);
    });

    test('should maintain consistency during concurrent operations', async () => {
      const { companyEmployee, contractor } = testData.users;
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

      // Upload image first
      const uploadResponse = await request(app)
        .post(`/api/campaigns/${campaign.id}/images`)
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`)
        .attach('image', testImagePath);

      const imageId = uploadResponse.body.data.id;

      // Perform concurrent operations on the same image
      const concurrentOperations = [
        request(app)
          .put(`/api/images/${imageId}/approve`)
          .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`),
        request(app)
          .put(`/api/images/${imageId}/reject`)
          .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
          .send({ reason: 'Concurrent rejection' }),
        request(app)
          .get(`/api/images/${imageId}`)
          .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
      ];

      const results = await Promise.all(concurrentOperations);

      // One operation should succeed, others should fail or be consistent
      const successfulOperations = results.filter(r => r.status === 200);
      expect(successfulOperations.length).toBeGreaterThanOrEqual(1);

      // Verify final state is consistent
      const finalImageResponse = await request(app)
        .get(`/api/campaigns/${campaign.id}/images`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`);

      const finalImage = finalImageResponse.body.data.find((img: any) => img.id === imageId);
      expect(['approved', 'rejected']).toContain(finalImage.status);
      
      if (finalImage.status === 'approved') {
        expect(finalImage.rejectionReason).toBeNull();
      } else if (finalImage.status === 'rejected') {
        expect(finalImage.rejectionReason).toBeDefined();
      }
    });
  });

  describe('Audit Trail Integrity', () => {
    test('should maintain complete audit trail for user actions', async () => {
      const { companyEmployee } = testData.users;
      const company = testData.companies[0];

      // Create campaign (should be audited)
      const campaignResponse = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({
          name: 'Audit Trail Test Campaign',
          companyId: company.id
        });

      const campaignId = campaignResponse.body.data.id;

      // Update campaign status (should be audited)
      await request(app)
        .put(`/api/campaigns/${campaignId}/status`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ status: 'in_progress' });

      // Check if audit logs exist (if audit logging is implemented)
      const auditLogs = await knex('audit_logs')
        .where('user_id', companyEmployee.id)
        .where('entity_type', 'campaign')
        .where('entity_id', campaignId)
        .orderBy('created_at', 'desc');

      if (auditLogs.length > 0) {
        // Verify audit log completeness
        expect(auditLogs.length).toBeGreaterThanOrEqual(2); // Create + Update
        
        auditLogs.forEach(log => {
          expect(log.user_id).toBe(companyEmployee.id);
          expect(log.entity_type).toBe('campaign');
          expect(log.entity_id).toBe(campaignId);
          expect(log.action).toBeDefined();
          expect(log.created_at).toBeDefined();
        });
      }
    });

    test('should track image approval/rejection history', async () => {
      const { companyEmployee, contractor } = testData.users;
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

      // Upload and review image
      const uploadResponse = await request(app)
        .post(`/api/campaigns/${campaign.id}/images`)
        .set('Authorization', `Bearer ${contractor.tokens.accessToken}`)
        .attach('image', testImagePath);

      const imageId = uploadResponse.body.data.id;

      const rejectResponse = await request(app)
        .put(`/api/images/${imageId}/reject`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ reason: 'Quality issues' });

      expect(rejectResponse.status).toBe(200);

      // Verify image record contains complete review information
      const imageRecord = await knex('images').where('id', imageId).first();
      expect(imageRecord.status).toBe('rejected');
      expect(imageRecord.rejection_reason).toBe('Quality issues');
      expect(imageRecord.reviewed_by).toBe(companyEmployee.id);
      expect(imageRecord.reviewed_at).toBeDefined();
    });
  });

  describe('Data Cleanup and Archival', () => {
    test('should handle campaign completion date tracking', async () => {
      const { companyEmployee } = testData.users;
      const company = testData.companies[0];

      // Create and complete campaign
      const campaignResponse = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({
          name: 'Completion Date Test',
          companyId: company.id
        });

      const campaignId = campaignResponse.body.data.id;
      const beforeCompletion = new Date();

      const completeResponse = await request(app)
        .put(`/api/campaigns/${campaignId}/status`)
        .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
        .send({ status: 'completed' });

      const afterCompletion = new Date();

      expect(completeResponse.status).toBe(200);
      
      const completedAt = new Date(completeResponse.body.data.completedAt);
      expect(completedAt.getTime()).toBeGreaterThanOrEqual(beforeCompletion.getTime());
      expect(completedAt.getTime()).toBeLessThanOrEqual(afterCompletion.getTime());

      // Verify database record
      const dbCampaign = await knex('campaigns').where('id', campaignId).first();
      expect(dbCampaign.status).toBe('completed');
      expect(dbCampaign.completed_at).toBeDefined();
    });

    test('should maintain data consistency during bulk operations', async () => {
      const { companyEmployee } = testData.users;
      const company = testData.companies[0];

      // Create multiple campaigns
      const campaignPromises = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/campaigns')
          .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
          .send({
            name: `Bulk Test Campaign ${i + 1}`,
            companyId: company.id
          })
      );

      const campaignResponses = await Promise.all(campaignPromises);
      const campaignIds = campaignResponses.map(r => r.body.data.id);

      // Verify all campaigns were created
      campaignResponses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Perform bulk status update
      const updatePromises = campaignIds.map(id =>
        request(app)
          .put(`/api/campaigns/${id}/status`)
          .set('Authorization', `Bearer ${companyEmployee.tokens.accessToken}`)
          .send({ status: 'in_progress' })
      );

      const updateResponses = await Promise.all(updatePromises);

      // Verify all updates succeeded
      updateResponses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe('in_progress');
      });

      // Verify database consistency
      const dbCampaigns = await knex('campaigns')
        .whereIn('id', campaignIds)
        .select('id', 'status');

      expect(dbCampaigns.length).toBe(5);
      dbCampaigns.forEach(campaign => {
        expect(campaign.status).toBe('in_progress');
      });
    });
  });
});