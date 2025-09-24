import { ensureDatabase, testConnection, runMigrations, runSeeds, closeConnection } from './utils.js';

/**
 * Initialize database - create database, run migrations and seeds
 */
async function initializeDatabase(): Promise<void> {
  try {
    console.log('Starting database initialization...');
    
    // Ensure database exists
    await ensureDatabase();
    
    // Test connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }
    
    // Run migrations
    await runMigrations();
    
    // Run seeds
    await runSeeds();
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  } finally {
    await closeConnection();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase()
    .then(() => {
      console.log('Database setup complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database setup failed:', error);
      process.exit(1);
    });
}

export { initializeDatabase };