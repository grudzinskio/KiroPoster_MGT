import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('password_reset_tokens', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable();
    table.string('token', 255).notNullable().unique();
    table.timestamp('expires_at').notNullable();
    table.boolean('used').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('used_at').nullable();
    
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.index(['token', 'expires_at']);
    table.index(['user_id', 'used']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('password_reset_tokens');
}