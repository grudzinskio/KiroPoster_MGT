import type { Knex } from 'knex';
import { generateUsernameFromEmail, generateUniqueUsername } from '../../utils/usernameUtils.js';

export async function up(knex: Knex): Promise<void> {
  // Get all users with their emails
  const users = await knex('users').select('id', 'email');
  
  const existingUsernames = new Set<string>();
  const updates: Array<{ id: number; username: string }> = [];
  
  // Generate usernames for all users
  for (const user of users) {
    const baseUsername = generateUsernameFromEmail(user.email);
    const finalUsername = generateUniqueUsername(baseUsername, existingUsernames);
    
    existingUsernames.add(finalUsername.toLowerCase());
    updates.push({ id: user.id, username: finalUsername });
  }
  
  // Update users with generated usernames
  for (const update of updates) {
    await knex('users')
      .where('id', update.id)
      .update('username', update.username);
  }
  
  // Make username column not nullable now that all users have usernames
  await knex.schema.alterTable('users', (table) => {
    table.string('username', 30).notNullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  // Make username nullable again
  await knex.schema.alterTable('users', (table) => {
    table.string('username', 30).nullable().alter();
  });
  
  // Clear all usernames
  await knex('users').update('username', null);
}