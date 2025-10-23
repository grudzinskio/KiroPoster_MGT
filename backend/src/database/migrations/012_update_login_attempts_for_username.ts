import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('login_attempts', (table) => {
    // Add username column
    table.string('username', 30).nullable();
    
    // Add index for username-based lookups
    table.index(['username', 'attempted_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('login_attempts', (table) => {
    table.dropIndex(['username', 'attempted_at']);
    table.dropColumn('username');
  });
}