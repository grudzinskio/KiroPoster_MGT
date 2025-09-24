import type { Knex } from 'knex';
import bcrypt from 'bcrypt';

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex('users').del();

  // Hash passwords for seed users
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash('password123', saltRounds);

  // Inserts seed entries
  await knex('users').insert([
    {
      id: 1,
      email: 'admin@postercompany.com',
      password_hash: hashedPassword,
      first_name: 'Admin',
      last_name: 'User',
      role: 'company_employee',
      company_id: null,
      is_active: true,
    },
    {
      id: 2,
      email: 'manager@postercompany.com',
      password_hash: hashedPassword,
      first_name: 'Manager',
      last_name: 'Smith',
      role: 'company_employee',
      company_id: null,
      is_active: true,
    },
    {
      id: 3,
      email: 'client1@acmemarketing.com',
      password_hash: hashedPassword,
      first_name: 'John',
      last_name: 'Doe',
      role: 'client',
      company_id: 1,
      is_active: true,
    },
    {
      id: 4,
      email: 'client2@globaladcorp.com',
      password_hash: hashedPassword,
      first_name: 'Jane',
      last_name: 'Wilson',
      role: 'client',
      company_id: 2,
      is_active: true,
    },
    {
      id: 5,
      email: 'contractor1@example.com',
      password_hash: hashedPassword,
      first_name: 'Mike',
      last_name: 'Johnson',
      role: 'contractor',
      company_id: null,
      is_active: true,
    },
    {
      id: 6,
      email: 'contractor2@example.com',
      password_hash: hashedPassword,
      first_name: 'Sarah',
      last_name: 'Davis',
      role: 'contractor',
      company_id: null,
      is_active: true,
    },
  ]);
}