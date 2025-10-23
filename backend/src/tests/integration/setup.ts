import { getDatabase } from '../../config/database.js';
import { User } from '../../types/user.js';
import { Campaign } from '../../types/campaign.js';
import { hashPassword } from '../../utils/password.js';
import { generateTokenPair } from '../../utils/jwt.js';

export interface TestUser extends User {
  password: string;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

interface Company {
  id: number;
  name: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TestData {
  users: {
    companyEmployee: TestUser;
    client: TestUser;
    contractor: TestUser;
  };
  companies: Company[];
  campaigns: Campaign[];
}

export async function setupTestDatabase(): Promise<void> {
  const knex = getDatabase();
  
  // Run migrations
  await knex.migrate.latest();
  
  // Clean existing data
  await knex('images').del();
  await knex('campaign_assignments').del();
  await knex('campaigns').del();
  await knex('users').del();
  await knex('companies').del();
}

export async function teardownTestDatabase(): Promise<void> {
  const knex = getDatabase();
  
  // Clean test data
  await knex('images').del();
  await knex('campaign_assignments').del();
  await knex('campaigns').del();
  await knex('users').del();
  await knex('companies').del();
}

export async function createTestData(): Promise<TestData> {
  const knex = getDatabase();
  
  // Create test companies
  const [companyId] = await knex('companies').insert({
    name: 'Test Client Company',
    contact_email: 'client@test.com',
    contact_phone: '123-456-7890',
    address: '123 Test St',
    is_active: true
  });

  const companies = await knex('companies').where('id', companyId);

  // Create test users
  const passwordHash = await hashPassword('TestPassword123!');
  
  const [companyEmployeeId] = await knex('users').insert({
    email: 'employee@test.com',
    password_hash: passwordHash,
    first_name: 'Company',
    last_name: 'Employee',
    role: 'company_employee',
    is_active: true
  });

  const [clientId] = await knex('users').insert({
    email: 'client@test.com',
    password_hash: passwordHash,
    first_name: 'Client',
    last_name: 'User',
    role: 'client',
    company_id: companyId,
    is_active: true
  });

  const [contractorId] = await knex('users').insert({
    email: 'contractor@test.com',
    password_hash: passwordHash,
    first_name: 'Contractor',
    last_name: 'User',
    role: 'contractor',
    is_active: true
  });

  // Fetch created users
  const [companyEmployee] = await knex('users').where('id', companyEmployeeId);
  const [client] = await knex('users').where('id', clientId);
  const [contractor] = await knex('users').where('id', contractorId);

  // Generate tokens for each user
  const companyEmployeeTokens = generateTokenPair(companyEmployee);
  const clientTokens = generateTokenPair(client);
  const contractorTokens = generateTokenPair(contractor);

  // Create test campaigns
  const [campaignId] = await knex('campaigns').insert({
    name: 'Test Campaign',
    description: 'Test campaign description',
    company_id: companyId,
    status: 'new',
    start_date: new Date(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    created_by: companyEmployeeId
  });

  const campaigns = await knex('campaigns').where('id', campaignId);

  return {
    users: {
      companyEmployee: {
        ...companyEmployee,
        password: 'TestPassword123!',
        tokens: companyEmployeeTokens
      },
      client: {
        ...client,
        password: 'TestPassword123!',
        tokens: clientTokens
      },
      contractor: {
        ...contractor,
        password: 'TestPassword123!',
        tokens: contractorTokens
      }
    },
    companies,
    campaigns
  };
}

export function getAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`
  };
}