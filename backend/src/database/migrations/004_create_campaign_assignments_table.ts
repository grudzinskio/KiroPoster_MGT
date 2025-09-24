import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('campaign_assignments', (table) => {
    table.increments('id').primary();
    table.integer('campaign_id').unsigned().notNullable();
    table.integer('contractor_id').unsigned().notNullable();
    table.timestamp('assigned_at').defaultTo(knex.fn.now());
    table.integer('assigned_by').unsigned().notNullable();
    
    table.foreign('campaign_id').references('id').inTable('campaigns').onDelete('CASCADE');
    table.foreign('contractor_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('assigned_by').references('id').inTable('users').onDelete('RESTRICT');
    
    table.unique(['campaign_id', 'contractor_id'], 'unique_assignment');
    table.index(['campaign_id']);
    table.index(['contractor_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('campaign_assignments');
}