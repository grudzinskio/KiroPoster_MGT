import knex, { Knex } from 'knex';
import { config } from './env.js';

// Import knex configuration directly to avoid path issues
const knexConfig = {
  development: {
    client: 'mysql2',
    connection: {
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.name,
    },
    migrations: {
      directory: './src/database/migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './src/database/seeds',
      extension: 'ts',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
  test: {
    client: 'mysql2',
    connection: {
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.name + '_test',
    },
    migrations: {
      directory: './src/database/migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './src/database/seeds',
      extension: 'ts',
    },
    pool: {
      min: 1,
      max: 5,
    },
  },
  production: {
    client: 'mysql2',
    connection: {
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.name,
      charset: 'utf8mb4',
      timezone: 'UTC',
      ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false
      } : false,
    },
    migrations: {
      directory: './src/database/migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './src/database/seeds',
      extension: 'ts',
    },
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '5'),
      max: parseInt(process.env.DB_POOL_MAX || '50'),
      idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
      acquireTimeoutMillis: parseInt(process.env.DB_POOL_ACQUIRE_TIMEOUT || '60000'),
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100,
      propagateCreateError: false
    },
    acquireConnectionTimeout: 60000,
    asyncStackTraces: false,
    debug: false,
  },
};

/**
 * Database connection instance
 */
let db: Knex | null = null;

/**
 * Get database connection instance
 */
export const getDatabase = (): Knex => {
  if (!db) {
    const environment = config.nodeEnv as keyof typeof knexConfig;
    const dbConfig = knexConfig[environment];
    
    if (!dbConfig) {
      throw new Error(`Database configuration not found for environment: ${environment}`);
    }
    
    db = knex(dbConfig);
    
    // Set up connection event handlers for monitoring
    if (config.nodeEnv === 'production') {
      setupConnectionMonitoring(db);
    }
  }
  
  return db;
};

/**
 * Close database connection
 */
export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.destroy();
    db = null;
  }
};

/**
 * Test database connection
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const database = getDatabase();
    await database.raw('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
};

/**
 * Get database connection pool status
 */
export const getPoolStatus = (): any => {
  if (!db) {
    return null;
  }
  
  const pool = (db as any).client?.pool;
  if (!pool) {
    return null;
  }
  
  return {
    used: pool.numUsed(),
    free: pool.numFree(),
    pending: pool.numPendingAcquires(),
    pendingCreates: pool.numPendingCreates(),
    min: pool.min,
    max: pool.max
  };
};

/**
 * Set up connection monitoring for production
 */
function setupConnectionMonitoring(database: Knex): void {
  const client = (database as any).client;
  
  if (client?.pool) {
    const pool = client.pool;
    
    // Log pool events
    pool.on('createSuccess', () => {
      console.log('Database connection created');
    });
    
    pool.on('createFail', (err: Error) => {
      console.error('Database connection creation failed:', err);
    });
    
    pool.on('destroySuccess', () => {
      console.log('Database connection destroyed');
    });
    
    pool.on('destroyFail', (err: Error) => {
      console.error('Database connection destruction failed:', err);
    });
    
    pool.on('poolDestroySuccess', () => {
      console.log('Database pool destroyed');
    });
    
    // Monitor pool status periodically
    const monitorInterval = setInterval(() => {
      const status = getPoolStatus();
      if (status) {
        console.log('Database pool status:', status);
        
        // Alert if pool is running low
        if (status.free < 2 && status.used > status.max * 0.8) {
          console.warn('Database pool running low on connections');
        }
      }
    }, 60000); // Check every minute
    
    // Clean up interval on process exit
    process.on('SIGINT', () => {
      clearInterval(monitorInterval);
    });
    
    process.on('SIGTERM', () => {
      clearInterval(monitorInterval);
    });
  }
}

/**
 * Database health check
 */
export const healthCheck = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  details: any;
}> => {
  try {
    const database = getDatabase();
    const startTime = Date.now();
    
    // Test basic connectivity
    await database.raw('SELECT 1 as test');
    
    const responseTime = Date.now() - startTime;
    const poolStatus = getPoolStatus();
    
    return {
      status: 'healthy',
      details: {
        responseTime,
        pool: poolStatus,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    };
  }
};

export default getDatabase;