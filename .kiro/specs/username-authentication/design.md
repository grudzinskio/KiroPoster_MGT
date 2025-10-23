# Design Document

## Overview

This design outlines the complete replacement of the email-based authentication system with a username-only authentication system. The implementation will involve database schema changes, backend API modifications, frontend interface updates, and removal of all email-related functionality.

## Architecture

### High-Level Changes

The authentication system will be modified at three main layers:

1. **Database Layer**: Replace email fields with username fields
2. **Backend API Layer**: Update authentication logic, validation, and user management
3. **Frontend Layer**: Update forms, validation, and user interfaces

### Migration Strategy

The migration will follow a phased approach:
1. Add username field to existing users table
2. Generate usernames for existing users
3. Update backend authentication logic
4. Update frontend interfaces
5. Remove email field and related functionality

## Components and Interfaces

### Database Schema Changes

#### Users Table Migration
- Add `username` column (VARCHAR(30), UNIQUE, NOT NULL)
- Generate usernames for existing users based on email prefixes
- Remove `email` column after migration
- Update indexes to use username instead of email

#### Related Tables
- Update `login_attempts` table to track by username instead of email
- Update `password_reset_tokens` table or remove if password reset is eliminated
- Update any audit logs to reference usernames

### Backend API Changes

#### Authentication Endpoints
- **POST /api/auth/login**: Accept username instead of email
- **GET /api/auth/me**: Return user data without email field
- **POST /api/auth/change-password**: Continue using current user ID
- Remove or modify password reset endpoints

#### User Management Endpoints
- **POST /api/users**: Accept username in user creation
- **GET /api/users**: Search and filter by username
- **PUT /api/users/:id**: Allow username updates with validation
- **GET /api/users/:id**: Return user data without email

#### Validation Schema Updates
- Replace email validation with username validation
- Username format: 3-30 characters, alphanumeric plus underscore and hyphen
- Ensure username uniqueness across the system

### Frontend Interface Changes

#### Login Form
- Replace email input with username input
- Update validation rules for username format
- Update error messages and help text
- Remove email-related autocomplete attributes

#### User Management Forms
- Replace email fields with username fields in user creation/editing
- Update user search to use username
- Update user display components to show username

#### User Profile Components
- Remove email display from user profiles
- Update user identification to use username
- Remove email-related settings or preferences

## Data Models

### Updated User Model

```typescript
interface User {
  id: number;
  username: string;           // New field, replaces email
  firstName: string;
  lastName: string;
  role: 'company_employee' | 'client' | 'contractor';
  companyId?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // email field removed
}

interface LoginCredentials {
  username: string;           // Changed from email
  password: string;
}

interface CreateUserData {
  username: string;           // Changed from email
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId?: number;
}
```

### Username Generation Logic

For existing users during migration:
1. Extract username from email prefix (before @)
2. Remove invalid characters (keep only alphanumeric, underscore, hyphen)
3. Ensure minimum length of 3 characters
4. Handle conflicts by appending numeric suffixes
5. Validate against username rules

Example: `john.doe@company.com` → `john_doe` or `john_doe1` if conflict exists

## Error Handling

### Username Validation Errors
- Invalid format: "Username must contain only letters, numbers, underscores, and hyphens"
- Too short: "Username must be at least 3 characters long"
- Too long: "Username must be no more than 30 characters long"
- Already taken: "This username is already in use"

### Authentication Errors
- Invalid credentials: "Invalid username or password"
- Account locked: "Account temporarily locked due to multiple failed attempts"
- Inactive account: "Account is not active"

### Migration Errors
- Username generation conflicts handled automatically with suffixes
- Database constraint violations logged and handled gracefully
- Rollback procedures for failed migrations

## Testing Strategy

### Unit Tests
- Username validation logic
- User model CRUD operations with username
- Authentication service with username credentials
- Username generation algorithm

### Integration Tests
- Login flow with username credentials
- User creation with username validation
- User search and lookup by username
- Database migration scripts

### End-to-End Tests
- Complete login workflow using username
- User registration with username
- User profile management without email
- Error handling for invalid usernames

### Migration Testing
- Test username generation for various email formats
- Verify data integrity after migration
- Test rollback procedures
- Performance testing with large user datasets

## Security Considerations

### Username Security
- Usernames are not considered sensitive information
- No additional encryption required for username storage
- Username enumeration protection through consistent error messages

### Authentication Security
- Maintain existing password hashing and validation
- Continue rate limiting on login attempts by username
- Preserve session management and token security

### Migration Security
- Ensure no data loss during email field removal
- Maintain audit trail of username changes
- Secure handling of temporary migration data

## Performance Considerations

### Database Performance
- Update indexes from email to username
- Ensure username lookups remain efficient
- Consider username prefix indexing for search functionality

### Migration Performance
- Batch processing for large user datasets
- Minimize downtime during schema changes
- Efficient username conflict resolution

## Backward Compatibility

### API Versioning
- Maintain API compatibility during transition
- Provide clear deprecation notices for email-based endpoints
- Support both email and username temporarily if needed

### Data Migration
- Preserve user relationships and foreign keys
- Maintain user ID consistency throughout migration
- Backup procedures before schema changes

## Deployment Strategy

### Phase 1: Database Preparation
1. Add username column to users table
2. Generate usernames for existing users
3. Verify data integrity

### Phase 2: Backend Updates
1. Update authentication logic
2. Modify user management endpoints
3. Update validation schemas
4. Deploy with feature flags if needed

### Phase 3: Frontend Updates
1. Update login forms and validation
2. Modify user management interfaces
3. Remove email-related components
4. Update error messages and help text

### Phase 4: Cleanup
1. Remove email column from database
2. Remove email-related code and endpoints
3. Update documentation
4. Remove feature flags