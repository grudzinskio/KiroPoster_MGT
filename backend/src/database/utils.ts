import db from './connection.js';

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    await db.raw('SELECT 1');
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

/**
 * Close database connection
 */
export async function closeConnection(): Promise<void> {
  try {
    await db.destroy();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}

/**
 * Run migrations
 */
export async function runMigrations(): Promise<void> {
  try {
    await db.migrate.latest();
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Run seeds
 */
export async function runSeeds(): Promise<void> {
  try {
    await db.seed.run();
    console.log('Seeds completed successfully');
  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  }
}

/**
 * Check if database exists and create if not
 */
export async function ensureDatabase(): Promise<void> {
  const dbName = process.env.DB_NAME || 'poster_campaign_db';
  
  try {
    // Create a connection without specifying database
    const tempDb = require('knex')({
      client: 'mysql2',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
      },
    });

    // Check if database exists, create if not
    await tempDb.raw(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`Database ${dbName} ensured`);
    
    await tempDb.destroy();
  } catch (error) {
    console.error('Error ensuring database exists:', error);
    throw error;
  }
}

export default db;