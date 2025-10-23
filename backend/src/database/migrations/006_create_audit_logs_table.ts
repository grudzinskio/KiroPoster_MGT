import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('audit_logs', (table) => {
    table.increments('id').primary();
    table.integer('user_id').nullable();
    table.string('action', 100).notNullable();
    table.string('resource_type', 50).notNullable();
    table.integer('resource_id').nullable();
    table.json('old_values').nullable();
    table.json('new_values').nullable();
    table.string('ip_address', 45).nullable();
    table.string('user_agent', 500).nullable();
    table.string('request_id', 50).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.foreign('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.index(['user_id', 'created_at']);
    table.index(['action', 'created_at']);
    table.index(['resource_type', 'resource_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('audit_logs');
}