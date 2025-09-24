import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('campaigns', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.text('description');
    table.integer('company_id').unsigned().notNullable();
    table.enum('status', ['new', 'in_progress', 'completed', 'cancelled']).defaultTo('new');
    table.date('start_date');
    table.date('end_date');
    table.timestamp('completed_at').nullable();
    table.integer('created_by').unsigned().notNullable();
    table.timestamps(true, true);
    
    table.foreign('company_id').references('id').inTable('companies').onDelete('CASCADE');
    table.foreign('created_by').references('id').inTable('users').onDelete('RESTRICT');
    table.index(['company_id']);
    table.index(['status']);
    table.index(['created_by']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('campaigns');
}