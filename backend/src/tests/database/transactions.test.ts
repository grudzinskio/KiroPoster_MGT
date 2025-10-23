import { knex } from '../../config/database.js';
import { setupTestDatabase, teardownTestDatabase } from '../integration/setup.js';

describe('Database Transaction Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clean data before each test
    await knex('images').del();
    await knex('campaign_assignments').del();
    await knex('campaigns').del();
    await knex('users').del();
    await knex('companies').del();
  });

  describe('User Creation Transaction', () => {
    test('should rollback user creation if company assignment fails', async () => {
      const trx = await knex.transaction();

      try {
        // Insert user
        const [userId] = await trx('users').insert({
          email: 'test@transaction.com',
          password_hash: 'hashedpassword',
          first_name: 'Test',
          last_name: 'User',
          role: 'client',
          company_id: 99999, // Non-existent company
          is_active: true
        });

        // This should fail due to foreign key constraint
        await trx.commit();
        
        // If we reach here, the test should fail
        expect(true).toBe(false);
      } catch (error) {
        await trx.rollback();
        
        // Verify user was not created
        const users = await knex('users').where('email', 'test@transaction.com');
        expect(users).toHaveLength(0);
      }
    });

    test('should commit user creation when all constraints are satisfied', async () => {
      const trx = await knex.transaction();

      try {
        // First create a company
        const [companyId] = await trx('companies').insert({
          name: 'Test Company',
          contact_email: 'test@company.com',
          is_active: true
        });

        // Then create user with valid company reference
        const [userId] = await trx('users').insert({
          email: 'test@transaction.com',
          password_hash: 'hashedpassword',
          first_name: 'Test',
          last_name: 'User',
          role: 'client',
          company_id: companyId,
          is_active: true
        });

        await trx.commit();

        // Verify both records were created
        const companies = await knex('companies').where('id', companyId);
        const users = await knex('users').where('id', userId);
        
        expect(companies).toHaveLength(1);
        expect(users).toHaveLength(1);
        expect(users[0].company_id).toBe(companyId);
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    });
  });

  describe('Campaign Creation Transaction', () => {
    let companyId: number;
    let userId: number;

    beforeEach(async () => {
      // Setup test data
      [companyId] = await knex('companies').insert({
        name: 'Test Company',
        contact_email: 'test@company.com',
        is_active: true
      });

      [userId] = await knex('users').insert({
        email: 'employee@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Employee',
        last_name: 'User',
        role: 'company_employee',
        is_active: true
      });
    });

    test('should rollback campaign creation if validation fails', async () => {
      const trx = await knex.transaction();

      try {
        // Insert campaign with invalid data
        await trx('campaigns').insert({
          name: '', // Empty name should fail validation
          company_id: companyId,
          status: 'invalid_status', // Invalid status
          created_by: userId
        });

        await trx.commit();
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        await trx.rollback();
        
        // Verify campaign was not created
        const campaigns = await knex('campaigns').where('company_id', companyId);
        expect(campaigns).toHaveLength(0);
      }
    });

    test('should handle concurrent campaign creation', async () => {
      const campaignData = {
        name: 'Concurrent Campaign',
        company_id: companyId,
        status: 'new',
        created_by: userId
      };

      // Simulate concurrent transactions
      const promises = Array.from({ length: 5 }, async (_, index) => {
        const trx = await knex.transaction();
        try {
          const [campaignId] = await trx('campaigns').insert({
            ...campaignData,
            name: `${campaignData.name} ${index}`
          });
          await trx.commit();
          return campaignId;
        } catch (error) {
          await trx.rollback();
          throw error;
        }
      });

      const results = await Promise.all(promises);
      
      // All campaigns should be created successfully
      expect(results).toHaveLength(5);
      results.forEach(id => expect(id).toBeDefined());

      // Verify all campaigns exist
      const campaigns = await knex('campaigns').where('company_id', companyId);
      expect(campaigns).toHaveLength(5);
    });
  });

  describe('Campaign Assignment Transaction', () => {
    let companyId: number;
    let campaignId: number;
    let contractorId: number;
    let employeeId: number;

    beforeEach(async () => {
      // Setup test data
      [companyId] = await knex('companies').insert({
        name: 'Test Company',
        contact_email: 'test@company.com',
        is_active: true
      });

      [employeeId] = await knex('users').insert({
        email: 'employee@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Employee',
        last_name: 'User',
        role: 'company_employee',
        is_active: true
      });

      [contractorId] = await knex('users').insert({
        email: 'contractor@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Contractor',
        last_name: 'User',
        role: 'contractor',
        is_active: true
      });

      [campaignId] = await knex('campaigns').insert({
        name: 'Test Campaign',
        company_id: companyId,
        status: 'new',
        created_by: employeeId
      });
    });

    test('should prevent duplicate campaign assignments', async () => {
      // First assignment should succeed
      const trx1 = await knex.transaction();
      try {
        await trx1('campaign_assignments').insert({
          campaign_id: campaignId,
          contractor_id: contractorId,
          assigned_by: employeeId
        });
        await trx1.commit();
      } catch (error) {
        await trx1.rollback();
        throw error;
      }

      // Second assignment should fail due to unique constraint
      const trx2 = await knex.transaction();
      try {
        await trx2('campaign_assignments').insert({
          campaign_id: campaignId,
          contractor_id: contractorId,
          assigned_by: employeeId
        });
        await trx2.commit();
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        await trx2.rollback();
        
        // Verify only one assignment exists
        const assignments = await knex('campaign_assignments')
          .where('campaign_id', campaignId)
          .where('contractor_id', contractorId);
        expect(assignments).toHaveLength(1);
      }
    });

    test('should handle cascade deletion properly', async () => {
      // Create assignment
      await knex('campaign_assignments').insert({
        campaign_id: campaignId,
        contractor_id: contractorId,
        assigned_by: employeeId
      });

      // Delete campaign should cascade to assignments
      const trx = await knex.transaction();
      try {
        await trx('campaigns').where('id', campaignId).del();
        await trx.commit();

        // Verify assignment was also deleted
        const assignments = await knex('campaign_assignments')
          .where('campaign_id', campaignId);
        expect(assignments).toHaveLength(0);
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    });
  });

  describe('Image Upload Transaction', () => {
    let companyId: number;
    let campaignId: number;
    let contractorId: number;
    let employeeId: number;

    beforeEach(async () => {
      // Setup test data
      [companyId] = await knex('companies').insert({
        name: 'Test Company',
        contact_email: 'test@company.com',
        is_active: true
      });

      [employeeId] = await knex('users').insert({
        email: 'employee@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Employee',
        last_name: 'User',
        role: 'company_employee',
        is_active: true
      });

      [contractorId] = await knex('users').insert({
        email: 'contractor@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Contractor',
        last_name: 'User',
        role: 'contractor',
        is_active: true
      });

      [campaignId] = await knex('campaigns').insert({
        name: 'Test Campaign',
        company_id: companyId,
        status: 'in_progress',
        created_by: employeeId
      });

      // Assign contractor to campaign
      await knex('campaign_assignments').insert({
        campaign_id: campaignId,
        contractor_id: contractorId,
        assigned_by: employeeId
      });
    });

    test('should rollback image creation if file system operation fails', async () => {
      const trx = await knex.transaction();

      try {
        // Insert image record
        const [imageId] = await trx('images').insert({
          campaign_id: campaignId,
          uploaded_by: contractorId,
          filename: 'test-image.jpg',
          original_filename: 'original.jpg',
          file_path: '/invalid/path/test-image.jpg', // Invalid path
          file_size: 1024,
          mime_type: 'image/jpeg',
          status: 'pending'
        });

        // Simulate file system operation failure
        throw new Error('File system operation failed');
      } catch (error) {
        await trx.rollback();
        
        // Verify image record was not created
        const images = await knex('images').where('campaign_id', campaignId);
        expect(images).toHaveLength(0);
      }
    });

    test('should handle image approval transaction', async () => {
      // First create an image
      const [imageId] = await knex('images').insert({
        campaign_id: campaignId,
        uploaded_by: contractorId,
        filename: 'test-image.jpg',
        original_filename: 'original.jpg',
        file_path: '/uploads/test-image.jpg',
        file_size: 1024,
        mime_type: 'image/jpeg',
        status: 'pending'
      });

      // Approve image in transaction
      const trx = await knex.transaction();
      try {
        await trx('images')
          .where('id', imageId)
          .update({
            status: 'approved',
            reviewed_by: employeeId,
            reviewed_at: new Date()
          });

        await trx.commit();

        // Verify image was approved
        const [image] = await knex('images').where('id', imageId);
        expect(image.status).toBe('approved');
        expect(image.reviewed_by).toBe(employeeId);
        expect(image.reviewed_at).toBeDefined();
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    });
  });

  describe('Data Integrity Constraints', () => {
    test('should enforce foreign key constraints', async () => {
      // Test user -> company foreign key
      try {
        await knex('users').insert({
          email: 'test@constraint.com',
          password_hash: 'hashedpassword',
          first_name: 'Test',
          last_name: 'User',
          role: 'client',
          company_id: 99999, // Non-existent company
          is_active: true
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toMatch(/foreign key constraint/i);
      }

      // Test campaign -> company foreign key
      try {
        await knex('campaigns').insert({
          name: 'Test Campaign',
          company_id: 99999, // Non-existent company
          status: 'new',
          created_by: 1 // Non-existent user
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toMatch(/foreign key constraint/i);
      }
    });

    test('should enforce unique constraints', async () => {
      // Create first user
      await knex('users').insert({
        email: 'unique@test.com',
        password_hash: 'hashedpassword',
        first_name: 'First',
        last_name: 'User',
        role: 'company_employee',
        is_active: true
      });

      // Try to create second user with same email
      try {
        await knex('users').insert({
          email: 'unique@test.com', // Duplicate email
          password_hash: 'hashedpassword',
          first_name: 'Second',
          last_name: 'User',
          role: 'contractor',
          is_active: true
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toMatch(/unique constraint|duplicate/i);
      }
    });

    test('should enforce check constraints', async () => {
      // Test invalid role
      try {
        await knex('users').insert({
          email: 'invalid@role.com',
          password_hash: 'hashedpassword',
          first_name: 'Invalid',
          last_name: 'Role',
          role: 'invalid_role', // Invalid role
          is_active: true
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toMatch(/check constraint|invalid/i);
      }

      // Test invalid campaign status
      const [companyId] = await knex('companies').insert({
        name: 'Test Company',
        is_active: true
      });

      const [userId] = await knex('users').insert({
        email: 'employee@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Employee',
        last_name: 'User',
        role: 'company_employee',
        is_active: true
      });

      try {
        await knex('campaigns').insert({
          name: 'Test Campaign',
          company_id: companyId,
          status: 'invalid_status', // Invalid status
          created_by: userId
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toMatch(/check constraint|invalid/i);
      }
    });
  });

  describe('Connection Pool and Performance', () => {
    test('should handle multiple concurrent transactions', async () => {
      const [companyId] = await knex('companies').insert({
        name: 'Concurrent Test Company',
        is_active: true
      });

      const [userId] = await knex('users').insert({
        email: 'concurrent@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Concurrent',
        last_name: 'User',
        role: 'company_employee',
        is_active: true
      });

      // Create multiple concurrent transactions
      const concurrentOperations = Array.from({ length: 10 }, async (_, index) => {
        const trx = await knex.transaction();
        try {
          const [campaignId] = await trx('campaigns').insert({
            name: `Concurrent Campaign ${index}`,
            company_id: companyId,
            status: 'new',
            created_by: userId
          });

          // Simulate some processing time
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

          await trx.commit();
          return campaignId;
        } catch (error) {
          await trx.rollback();
          throw error;
        }
      });

      const results = await Promise.all(concurrentOperations);
      
      // All operations should complete successfully
      expect(results).toHaveLength(10);
      results.forEach(id => expect(id).toBeDefined());

      // Verify all campaigns were created
      const campaigns = await knex('campaigns').where('company_id', companyId);
      expect(campaigns).toHaveLength(10);
    });

    test('should handle transaction timeout gracefully', async () => {
      const trx = await knex.transaction();
      
      try {
        // Start a long-running operation
        await trx.raw('SELECT SLEEP(0.1)'); // Short sleep for testing
        
        // Perform actual database operation
        const [companyId] = await trx('companies').insert({
          name: 'Timeout Test Company',
          is_active: true
        });

        await trx.commit();
        
        // Verify operation completed
        const companies = await knex('companies').where('id', companyId);
        expect(companies).toHaveLength(1);
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    });
  });
});