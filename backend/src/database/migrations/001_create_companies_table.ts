import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('companies', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.string('contact_email', 255);
    table.string('contact_phone', 50);
    table.text('address');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('companies');
}