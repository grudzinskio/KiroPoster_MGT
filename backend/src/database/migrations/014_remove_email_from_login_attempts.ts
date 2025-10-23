import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('login_attempts', (table) => {
    // Remove email-based indexes
    table.dropIndex(['email', 'attempted_at']);
    
    // Remove email column
    table.dropColumn('email');
    
    // Make username not nullable now that email is removed
    table.string('username', 30).notNullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('login_attempts', (table) => {
    // Add email column back
    table.string('email', 255).nullable();
    
    // Add email index back
    table.index(['email', 'attempted_at']);
    
    // Make username nullable again
    table.string('username', 30).nullable().alter();
  });
}