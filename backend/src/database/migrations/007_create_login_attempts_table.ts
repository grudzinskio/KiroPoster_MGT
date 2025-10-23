import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('login_attempts', (table) => {
    table.increments('id').primary();
    table.string('email', 255).notNullable();
    table.string('ip_address', 45).notNullable();
    table.boolean('success').notNullable();
    table.string('failure_reason', 100).nullable();
    table.string('user_agent', 500).nullable();
    table.timestamp('attempted_at').defaultTo(knex.fn.now());
    
    table.index(['email', 'attempted_at']);
    table.index(['ip_address', 'attempted_at']);
    table.index(['success', 'attempted_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('login_attempts');
}