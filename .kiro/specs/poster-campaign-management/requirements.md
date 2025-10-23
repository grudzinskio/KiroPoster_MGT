# Requirements Document

## Introduction

This poster management system is designed for companies that manage poster advertising campaigns for multiple clients. The system tracks campaign progress through photographs that serve as proof of poster installation. The platform supports three distinct user roles with different access levels and responsibilities: Company Employees who manage the entire system, Clients who monitor their campaigns, and Contractors who upload proof-of-installation images.

## Requirements

### Requirement 1

**User Story:** As a company employee, I want to manage all users in the system, so that I can control access and maintain proper user roles.

#### Acceptance Criteria

1. WHEN a company employee accesses the user management section THEN the system SHALL display all users with their roles and status
2. WHEN a company employee creates a new user THEN the system SHALL validate required fields and assign appropriate permissions
3. WHEN a company employee updates user information THEN the system SHALL maintain audit trail of changes
4. WHEN a company employee deactivates a user THEN the system SHALL revoke access while preserving historical data

### Requirement 2

**User Story:** As a company employee, I want to manage client companies, so that I can organize campaigns by client organization.

#### Acceptance Criteria

1. WHEN a company employee creates a client company THEN the system SHALL store company details and generate unique identifier
2. WHEN a company employee views client companies THEN the system SHALL display active campaigns and associated users
3. WHEN a company employee updates client information THEN the system SHALL validate changes and update related campaigns
4. WHEN a company employee deactivates a client company THEN the system SHALL handle existing campaigns appropriately

### Requirement 3

**User Story:** As a company employee, I want to manage campaigns for all clients, so that I can oversee the entire poster installation process.

#### Acceptance Criteria

1. WHEN a company employee creates a campaign THEN the system SHALL associate it with a client company and set initial status
2. WHEN a company employee views campaigns THEN the system SHALL display filterable list of new, current, and completed campaigns
3. WHEN a company employee changes campaign status THEN the system SHALL update status and notify relevant users
4. WHEN a company employee assigns contractors to campaigns THEN the system SHALL grant appropriate access permissions

### Requirement 4

**User Story:** As a company employee, I want to approve or reject uploaded images, so that I can ensure quality standards are met.

#### Acceptance Criteria

1. WHEN a company employee reviews uploaded images THEN the system SHALL display images with campaign context
2. WHEN a company employee approves an image THEN the system SHALL mark it as accepted and update campaign progress
3. WHEN a company employee rejects an image THEN the system SHALL require a rejection note and notify the contractor
4. WHEN a company employee views image history THEN the system SHALL show approval status and rejection reasons

### Requirement 5

**User Story:** As a client user, I want to view only my company's campaigns, so that I can monitor our advertising progress.

#### Acceptance Criteria

1. WHEN a client user logs in THEN the system SHALL display only campaigns associated with their company
2. WHEN a client user views current campaigns THEN the system SHALL show real-time progress and uploaded images
3. WHEN a client user views completed campaigns THEN the system SHALL show campaigns completed within the last month
4. IF a campaign was completed more than 1 month ago THEN the system SHALL NOT display it to client users

### Requirement 6

**User Story:** As a contractor, I want to upload images for assigned campaigns, so that I can provide proof of poster installation.

#### Acceptance Criteria

1. WHEN a contractor logs in THEN the system SHALL display only campaigns they are assigned to that are in progress
2. WHEN a contractor uploads an image THEN the system SHALL validate file format and associate it with the correct campaign
3. WHEN a contractor views their completed campaigns THEN the system SHALL show acceptance statistics for their uploaded images
4. WHEN a contractor's image is rejected THEN the system SHALL display the rejection reason and allow re-upload

### Requirement 7

**User Story:** As a system administrator, I want role-based access control, so that users can only access appropriate functionality.

#### Acceptance Criteria

1. WHEN any user attempts to access a protected resource THEN the system SHALL verify their role and permissions
2. WHEN a user's session expires THEN the system SHALL require re-authentication before allowing further access
3. WHEN unauthorized access is attempted THEN the system SHALL log the attempt and deny access
4. IF a user's role changes THEN the system SHALL immediately update their access permissions

### Requirement 8

**User Story:** As a system user, I want secure data handling, so that sensitive information is protected.

#### Acceptance Criteria

1. WHEN user data is transmitted THEN the system SHALL use encrypted connections
2. WHEN passwords are stored THEN the system SHALL use secure hashing algorithms
3. WHEN file uploads occur THEN the system SHALL validate file types and scan for security threats
4. WHEN data is accessed THEN the system SHALL log access attempts for audit purposes

### Requirement 9

**User Story:** As a system operator, I want persistent data storage, so that all information is reliably maintained.

#### Acceptance Criteria

1. WHEN campaign data is created or updated THEN the system SHALL store it in MariaDB using Knex ORM
2. WHEN images are uploaded THEN the system SHALL store them to disk with proper file organization
3. WHEN database operations fail THEN the system SHALL handle errors gracefully and maintain data integrity
4. WHEN system backup is needed THEN the system SHALL support data export and recovery procedures

### Requirement 10

**User Story:** As a developer, I want a clean separation between frontend and backend, so that the system is maintainable and secure.

#### Acceptance Criteria

1. WHEN frontend requests data THEN the system SHALL validate all inputs on the server side
2. WHEN business logic is needed THEN the system SHALL implement it in the API layer, not the frontend
3. WHEN UI interactions occur THEN the React frontend SHALL only handle presentation and user experience
4. WHEN API endpoints are accessed THEN the system SHALL enforce authentication and authorization server-side

### Requirement 11

**User Story:** As a company employee, I want dashboard visibility of campaign status, so that I can quickly assess overall progress.

#### Acceptance Criteria

1. WHEN a company employee logs in THEN the system SHALL display a dashboard with new and current campaigns
2. WHEN viewing the dashboard THEN the system SHALL provide toggle options to filter by campaign status
3. WHEN campaign status changes THEN the system SHALL update dashboard displays in real-time
4. WHEN multiple campaigns exist THEN the system SHALL provide sorting and search capabilities