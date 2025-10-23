import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', (table) => {
    // Remove email index first
    table.dropIndex(['email']);
    
    // Remove email column
    table.dropColumn('email');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', (table) => {
    // Add email column back
    table.string('email', 255).nullable();
    
    // Add index back
    table.index(['email']);
  });
}