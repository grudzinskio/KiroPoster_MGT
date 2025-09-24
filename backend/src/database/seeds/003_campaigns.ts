import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex('campaigns').del();

  // Inserts seed entries
  await knex('campaigns').insert([
    {
      id: 1,
      name: 'Summer Product Launch 2024',
      description: 'Poster campaign for new summer product line across downtown locations',
      company_id: 1,
      status: 'new',
      start_date: '2024-06-01',
      end_date: '2024-08-31',
      created_by: 1,
    },
    {
      id: 2,
      name: 'Holiday Shopping Campaign',
      description: 'Black Friday and holiday shopping promotional posters',
      company_id: 2,
      status: 'in_progress',
      start_date: '2024-11-01',
      end_date: '2024-12-31',
      created_by: 2,
    },
    {
      id: 3,
      name: 'Local Business Awareness',
      description: 'Community awareness campaign for local business partnerships',
      company_id: 3,
      status: 'completed',
      start_date: '2024-03-01',
      end_date: '2024-05-31',
      completed_at: '2024-05-31 23:59:59',
      created_by: 1,
    },
  ]);
}