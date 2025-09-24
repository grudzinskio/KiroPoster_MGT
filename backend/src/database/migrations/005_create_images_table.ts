import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('images', (table) => {
    table.increments('id').primary();
    table.integer('campaign_id').unsigned().notNullable();
    table.integer('uploaded_by').unsigned().notNullable();
    table.string('filename', 255).notNullable();
    table.string('original_filename', 255).notNullable();
    table.string('file_path', 500).notNullable();
    table.integer('file_size').notNullable();
    table.string('mime_type', 100).notNullable();
    table.enum('status', ['pending', 'approved', 'rejected']).defaultTo('pending');
    table.text('rejection_reason').nullable();
    table.integer('reviewed_by').unsigned().nullable();
    table.timestamp('reviewed_at').nullable();
    table.timestamp('uploaded_at').defaultTo(knex.fn.now());
    
    table.foreign('campaign_id').references('id').inTable('campaigns').onDelete('CASCADE');
    table.foreign('uploaded_by').references('id').inTable('users').onDelete('RESTRICT');
    table.foreign('reviewed_by').references('id').inTable('users').onDelete('SET NULL');
    
    table.index(['campaign_id']);
    table.index(['uploaded_by']);
    table.index(['status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('images');
}