import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('email', 255).unique().notNullable();
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.enum('role', ['company_employee', 'client', 'contractor']).notNullable();
    table.integer('company_id').unsigned().nullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.foreign('company_id').references('id').inTable('companies').onDelete('SET NULL');
    table.index(['email']);
    table.index(['role']);
    table.index(['company_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('users');
}