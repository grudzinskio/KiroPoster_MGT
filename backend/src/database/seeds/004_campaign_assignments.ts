import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex('campaign_assignments').del();

  // Inserts seed entries
  await knex('campaign_assignments').insert([
    {
      id: 1,
      campaign_id: 1,
      contractor_id: 5, // Mike Johnson
      assigned_by: 1,   // Admin User
    },
    {
      id: 2,
      campaign_id: 2,
      contractor_id: 6, // Sarah Davis
      assigned_by: 2,   // Manager Smith
    },
    {
      id: 3,
      campaign_id: 2,
      contractor_id: 5, // Mike Johnson (assigned to multiple campaigns)
      assigned_by: 2,   // Manager Smith
    },
    {
      id: 4,
      campaign_id: 3,
      contractor_id: 6, // Sarah Davis (completed campaign)
      assigned_by: 1,   // Admin User
    },
  ]);
}