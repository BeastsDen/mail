# Email Management Platform

## Overview

This is an email management platform built for sales teams and administrators to manage email campaigns, track engagement, and convert leads. The application enables bulk email sending using Microsoft Outlook integration, dataset management for contact lists, customizable email templates, and comprehensive analytics for tracking campaign performance.

The platform supports two user roles:
- **Admin**: Full access to user management, templates, datasets, email tracking, and system-wide analytics
- **Sales**: Access to send emails, view their own analytics, and manage their campaigns

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**Routing**: Wouter for client-side routing with role-based page access

**UI Components**: shadcn/ui component library built on Radix UI primitives, styled with Tailwind CSS following a custom design system that blends Linear's modern aesthetic with Fluent Design patterns

**State Management**: TanStack Query (React Query) for server state management with custom query client configuration, implementing automatic error handling and authentication state tracking

**Styling**: Tailwind CSS with custom design tokens for colors, spacing, and typography. Uses CSS variables for theming support and includes custom utility classes for elevation effects

**Form Handling**: React Hook Form with Zod schema validation for type-safe form inputs

**Charts**: Recharts library for data visualization in dashboard views

### Backend Architecture

**Server Framework**: Express.js with TypeScript in ESM module format

**Authentication**: Passport.js with dual authentication strategies:
- Local Strategy: Email/password authentication with bcrypt password hashing (used in production)
- OpenID Connect Strategy: Replit Auth integration for development environments

**Session Management**: Express-session with PostgreSQL session store (connect-pg-simple), configured for 7-day session persistence

**Role-Based Access Control**: Middleware-based authorization checking user roles (admin/sales) stored in database, with route-level protection

**Email Integration**: Microsoft Graph API client for Outlook email sending, using Replit connector system for OAuth token management with automatic token refresh

**File Processing**: Multer for handling Excel/CSV file uploads, XLSX library for parsing spreadsheet data into contact datasets

### Database Architecture

**ORM**: Drizzle ORM with PostgreSQL driver (@neondatabase/serverless)

**Database Provider**: Neon serverless PostgreSQL with WebSocket support

**Schema Design**:
- Users table with role-based access (admin/sales), password hashing, account blocking capabilities
- Datasets and DatasetContacts for contact list management with relationship tracking
- EmailTemplates for reusable campaign templates with variable substitution
- SentEmails and ReceivedEmails for campaign tracking and lead scoring
- ActivityLogs for audit trail of all system actions
- Sessions table for authentication state persistence

**Migrations**: Drizzle Kit for schema migrations and database push commands

### Key Design Decisions

**Monorepo Structure**: Client and server code in single repository with shared schema types, enabling type safety across full stack using TypeScript path aliases

**Email Sending Architecture**: Microsoft Graph API chosen over SMTP for better deliverability and OAuth2 security. Replit connector handles token refresh automatically to prevent authentication failures during long-running campaigns

**Lead Scoring System**: Emails are categorized as Hot/Cold/Dead leads based on reply status, enabling sales teams to prioritize follow-ups

**Dataset Management**: Excel/CSV upload with in-memory parsing allows bulk contact import without temporary file storage, improving security and simplifying deployment

**Session Storage**: PostgreSQL-backed sessions chosen over in-memory or file-based storage for scalability and persistence across server restarts

**Role-Based UI**: Different dashboard views and navigation menus for admin vs sales roles, with backend authorization enforcement on all API endpoints

**Authentication Flow**: Custom password-based auth for production with @hackure.in email domain restriction, falling back to Replit Auth in development for easier testing

### External Dependencies

**Microsoft Graph API**: Used for sending emails via Outlook, requires OAuth2 authentication through Replit connector system

**Replit Connectors**: Provides OAuth token management for Microsoft Graph API with automatic refresh

**Neon Database**: Serverless PostgreSQL database with WebSocket connection support

**Google Fonts**: Inter for UI text and JetBrains Mono for monospace elements (emails, data tables)

**shadcn/ui**: Component library providing accessible, customizable UI primitives

**Radix UI**: Headless UI component primitives for accessibility compliance

**TanStack Query**: Server state management with caching and automatic refetching

**Recharts**: Charting library for dashboard analytics visualization

**Drizzle ORM**: Type-safe database queries with automatic TypeScript inference

**Zod**: Runtime type validation for API inputs and form data

**bcrypt**: Password hashing for secure credential storage