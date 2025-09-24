# Poster Campaign Management System

A full-stack web application for managing poster advertising campaigns with role-based access control.

## Features

- **Role-based Access Control**: Company Employees, Clients, and Contractors
- **Campaign Management**: Create, track, and manage poster campaigns
- **Image Upload & Approval**: Contractors upload proof images, employees approve/reject
- **Real-time Dashboard**: Monitor campaign progress and status
- **Secure Authentication**: JWT-based authentication with refresh tokens

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development and building
- Tailwind CSS for styling
- React Router for navigation

### Backend
- Node.js with Express.js
- TypeScript for type safety
- MariaDB with Knex.js ORM
- JWT authentication
- File upload handling

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MariaDB
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies for all packages:
   ```bash
   npm run install:all
   ```

3. Set up environment variables:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Edit `backend/.env` with your database credentials and other configuration.

4. Start the development servers:
   ```bash
   npm run dev
   ```

This will start:
- Frontend development server on http://localhost:5173
- Backend API server on http://localhost:3001

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both frontend and backend for production
- `npm run start` - Start both frontend and backend in production mode
- `npm run test` - Run backend tests
- `npm run clean` - Clean build directories

### Project Structure

```
├── frontend/          # React frontend application
├── backend/           # Express.js backend API
├── .kiro/            # Kiro specifications and configuration
└── package.json      # Root package.json for workspace management
```

## Development

The project uses a monorepo structure with separate frontend and backend applications. Both applications are configured with TypeScript for type safety and include development tools for hot reloading.

## License

ISC