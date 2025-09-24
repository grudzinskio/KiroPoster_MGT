# Database Setup

This directory contains the database configuration, migrations, and seeds for the Poster Campaign Management System.

## Prerequisites

- MariaDB or MySQL server running
- Database credentials configured in `.env` file

## Environment Variables

Make sure to set the following environment variables in your `.env` file:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=poster_campaign_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password
```

## Database Schema

The system uses the following tables:

1. **companies** - Client companies that run poster campaigns
2. **users** - System users (company employees, clients, contractors)
3. **campaigns** - Poster campaigns managed by the system
4. **campaign_assignments** - Assignments of contractors to campaigns
5. **images** - Uploaded proof-of-installation images

## Available Scripts

### Initialize Database (Recommended for first setup)
```bash
npm run db:init
```
This will create the database if it doesn't exist, run all migrations, and seed initial data.

### Migration Commands
```bash
# Run all pending migrations
npm run db:migrate

# Rollback the last migration
npm run db:rollback
```

### Seed Commands
```bash
# Run all seed files
npm run db:seed
```

### Reset Database
```bash
# Rollback all migrations, re-run migrations, and seed data
npm run db:reset
```

## Migration Files

Migrations are located in `src/database/migrations/` and are numbered sequentially:

1. `001_create_companies_table.ts` - Creates companies table
2. `002_create_users_table.ts` - Creates users table with foreign key to companies
3. `003_create_campaigns_table.ts` - Creates campaigns table
4. `004_create_campaign_assignments_table.ts` - Creates campaign assignments junction table
5. `005_create_images_table.ts` - Creates images table

## Seed Files

Seed files are located in `src/database/seeds/` and provide initial test data:

1. `001_companies.ts` - Sample client companies
2. `002_users.ts` - Sample users for each role type
3. `003_campaigns.ts` - Sample campaigns
4. `004_campaign_assignments.ts` - Sample contractor assignments

## Default Seed Data

The seed files create the following test accounts:

### Company Employees
- admin@postercompany.com (password: password123)
- manager@postercompany.com (password: password123)

### Client Users
- client1@acmemarketing.com (password: password123)
- client2@globaladcorp.com (password: password123)

### Contractors
- contractor1@example.com (password: password123)
- contractor2@example.com (password: password123)

## Database Connection

The database connection is configured in `connection.ts` and uses the Knex.js query builder. The connection supports different environments (development, test, production) with appropriate connection pooling settings.

## Troubleshooting

### Connection Issues
1. Ensure MariaDB/MySQL server is running
2. Verify database credentials in `.env` file
3. Check that the database user has appropriate permissions

### Migration Issues
1. Ensure all previous migrations have been run successfully
2. Check for any foreign key constraint violations
3. Verify table names and column definitions match the schema

### Permission Issues
Make sure your database user has the following permissions:
- CREATE, DROP (for database creation)
- SELECT, INSERT, UPDATE, DELETE (for data operations)
- CREATE, ALTER, DROP (for table operations)
- INDEX (for creating indexes)