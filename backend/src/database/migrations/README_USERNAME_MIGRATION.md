# Username Authentication Migration

This document describes the database migration process to replace email-based authentication with username-based authentication.

## Migration Overview

The migration consists of 5 sequential steps that safely transition from email to username authentication:

### Step 1: Add Username Column (010_add_username_to_users.ts)
- Adds `username` column to `users` table (initially nullable)
- Creates unique index on username column
- **Rollback**: Removes username column and index

### Step 2: Populate Usernames (011_populate_usernames.ts)
- Generates usernames for all existing users based on their email addresses
- Handles conflicts by appending numeric suffixes
- Makes username column NOT NULL after population
- **Rollback**: Clears all usernames and makes column nullable

### Step 3: Update Login Attempts Table (012_update_login_attempts_for_username.ts)
- Adds `username` column to `login_attempts` table
- Creates index for username-based lookups
- **Rollback**: Removes username column and index

### Step 4: Remove Email from Users (013_remove_email_from_users.ts)
- Removes email column from `users` table
- Drops email-related indexes
- **Rollback**: Adds email column back (data will be lost)

### Step 5: Remove Email from Login Attempts (014_remove_email_from_login_attempts.ts)
- Removes email column from `login_attempts` table
- Makes username column NOT NULL
- **Rollback**: Adds email column back and makes username nullable

## Username Generation Rules

Usernames are generated from email addresses using the following rules:

1. Extract the part before the @ symbol
2. Replace dots (.) with underscores (_)
3. Remove invalid characters (keep only alphanumeric, underscore, hyphen)
4. Convert to lowercase
5. Ensure minimum length of 3 characters (pad with '0' if needed)
6. Ensure maximum length of 30 characters (truncate if needed)
7. Handle conflicts by appending numeric suffixes

### Examples:
- `john.doe@company.com` → `john_doe`
- `admin@site.com` → `admin`
- `a@short.com` → `a00`
- `verylongusername@example.com` → `verylongusernamethatexceedsl` (truncated to 30 chars)
- Conflicts: `user@company1.com` → `user`, `user@company2.com` → `user1`

## Running the Migration

```bash
# Run all migrations
npm run db:migrate

# Rollback if needed (run in reverse order)
npm run db:rollback
```

## Validation

The migration includes comprehensive tests:
- Username generation logic tests
- Migration simulation tests
- Edge case handling tests
- Conflict resolution tests

Run tests with:
```bash
npm test -- --testPathPatterns="usernameUtils.test.ts"
npm test -- --testPathPatterns="username-migration.test.ts"
```

## Post-Migration Steps

After running the database migration, you will need to:

1. Update backend authentication logic to use usernames
2. Update frontend login forms to accept usernames
3. Update API endpoints to use username parameters
4. Remove email-related validation and functionality
5. Update user management interfaces

## Rollback Considerations

⚠️ **Warning**: Rolling back migrations 013 and 014 will result in data loss as email columns are permanently removed. Ensure you have backups before running these migrations in production.

The rollback process should only be used in development or if the migration fails partway through.

## Security Notes

- Usernames are not considered sensitive information
- Username enumeration protection should be maintained through consistent error messages
- Existing password hashing and session management remain unchanged
- Rate limiting should be updated to work with usernames instead of emails