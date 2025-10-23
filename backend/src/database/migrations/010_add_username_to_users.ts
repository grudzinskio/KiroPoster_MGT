import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', (table) => {
    // Add username column - initially nullable to allow for data migration
    table.string('username', 30).nullable().unique();
    
    // Add index for username lookups
    table.index(['username']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', (table) => {
    table.dropIndex(['username']);
    table.dropColumn('username');
  });
}