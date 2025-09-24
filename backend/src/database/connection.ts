import knex from 'knex';

// Database configuration
const environment = process.env.NODE_ENV || 'development';

const config = {
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'poster_campaign'
    },
    migrations: {
      directory: './src/database/migrations',
      extension: 'ts'
    },
    seeds: {
      directory: './src/database/seeds',
      extension: 'ts'
    }
  },
  test: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME_TEST || 'poster_campaign_test'
    },
    migrations: {
      directory: './src/database/migrations',
      extension: 'ts'
    }
  },
  production: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    },
    migrations: {
      directory: './dist/database/migrations',
      extension: 'js'
    }
  }
};

const knexConfig = config[environment as keyof typeof config];

if (!knexConfig) {
  throw new Error(`No database configuration found for environment: ${environment}`);
}

const db = knex(knexConfig);

export default db;