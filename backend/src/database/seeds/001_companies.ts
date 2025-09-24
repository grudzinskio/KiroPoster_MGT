import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex('companies').del();

  // Inserts seed entries
  await knex('companies').insert([
    {
      id: 1,
      name: 'Acme Marketing Solutions',
      contact_email: 'contact@acmemarketing.com',
      contact_phone: '+1-555-0123',
      address: '123 Business Ave, Marketing City, MC 12345',
      is_active: true,
    },
    {
      id: 2,
      name: 'Global Advertising Corp',
      contact_email: 'info@globaladcorp.com',
      contact_phone: '+1-555-0456',
      address: '456 Corporate Blvd, Ad City, AC 67890',
      is_active: true,
    },
    {
      id: 3,
      name: 'Local Business Partners',
      contact_email: 'hello@localbizpartners.com',
      contact_phone: '+1-555-0789',
      address: '789 Partnership St, Business Town, BT 11111',
      is_active: true,
    },
  ]);
}