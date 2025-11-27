<!-- markdownlint-disable MD022 MD029 -->
<!-- markdownlint-disable MD031 MD032 MD034 -->
<!-- markdownlint-disable MD040 -->
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An authenticated web portal that provides secure access to internal Docker services running on a private server (bigdog). The portal manages JWT-based authentication and dynamically routes users to services they have permission to access.

**Infrastructure:**
- AWS EC2 (public): nginx + frps (FRP server)
- bigdog (private): frpc (FRP client) + Docker containers
- Traffic flow: Internet → HTTPS → nginx (EC2) → encrypted FRP tunnel → bigdog containers

## Development Commands

### Auth Service (Main Application)

All commands should be run from the `/Auth` directory:

```bash
# Development
npm run dev              # Start Next.js dev server (port 3000)
npm run build           # Build Next.js application
npm run lint            # Run ESLint

# Docker Compose
docker compose --env-file .env.local up -d          # Start in dev mode
docker compose --env-file .env.production up -d     # Start in production mode
docker compose --env-file .env.production down      # Stop all services
docker compose --env-file .env.production down -v   # Stop and remove volumes (deletes DB)
docker compose --env-file .env.production restart   # Restart all services
docker compose --env-file .env.production build     # Rebuild containers

# Database operations
docker exec -i portal-postgres psql -U portal -d portal_db < db/init.sql    # Initialize database
docker exec portal-postgres pg_dump -U portal portal_db > backup.sql        # Backup database

# Logs
docker logs portal-nginx     # nginx logs
docker logs portal-app       # Next.js application logs
docker logs portal-postgres  # PostgreSQL logs
```

### Local Development (without Docker)

```bash
# Start PostgreSQL container
docker run -d -p 5432:5432 \
  -e POSTGRES_USER=portal \
  -e POSTGRES_PASSWORD=changeme \
  -e POSTGRES_DB=portal_db \
  postgres:16-alpine

# Initialize database
psql -U portal -h localhost -d portal_db -f db/init.sql

# Start Next.js
npm run dev
```

## Architecture

### Multi-Container System

The Auth service runs three Docker containers orchestrated by docker-compose:

1. **portal-nginx** (port 3010): nginx reverse proxy with auth_request module
   - Validates JWT on every request via `/auth-verify` endpoint
   - Passes user headers (X-User-Id, X-User-Email, X-User-Role) to Next.js
   - Redirects unauthenticated requests to `/login`

2. **portal-app**: Next.js 14 application (App Router)
   - Provides authentication API endpoints and UI
   - Handles JWT generation and verification using `jose` library
   - Uses standalone build for minimal Docker image

3. **portal-postgres**: PostgreSQL 16 database
   - Stores user accounts with bcrypt-hashed passwords
   - Volume: `postgres_data` for persistence

**Network:** All containers communicate via `portal-network` bridge network using Docker's internal DNS.

### Authentication Flow

The system uses a two-layer authentication pattern:

1. **nginx Layer (auth_request):**
   - Every request (except `/login` and `/api/auth/login`) triggers auth_request to `/auth-verify`
   - nginx extracts JWT from HTTP-only cookie and forwards to Next.js
   - Next.js validates JWT and returns 200 (authenticated) or 401 (unauthenticated)
   - On success, nginx captures user info headers and forwards them to the application
   - On failure, nginx redirects to `/login`

2. **Application Layer:**
   - Login endpoint validates credentials against PostgreSQL
   - Generates JWT (JWS with HS256) containing user id, email, and role
   - Sets HTTP-only, Secure, SameSite=strict cookie
   - JWT expires in 24 hours

**Important:** Currently using JWS (signed JWT) instead of JWE (encrypted JWT) for increment 1. Migration to JWE planned for increment 1.5.

### URL Structure

- `/` - Redirects to `/dashboard` if authenticated, else `/login`
- `/login` - Public login page
- `/dashboard` - Protected dashboard (requires authentication)
- `/api/auth/login` - Public endpoint for authentication
- `/api/auth/logout` - Protected endpoint for session termination
- `/api/auth/verify` - Internal endpoint (called by nginx auth_request)
- `/api/auth/me` - Protected endpoint for user info

### Database Schema

**users table:**
- id (SERIAL PRIMARY KEY)
- email (VARCHAR, UNIQUE)
- password_hash (VARCHAR) - bcrypt hashed
- role (VARCHAR) - 'admin' or 'user'
- created_at, updated_at (TIMESTAMP)

Default admin account:
- Email: `admin@anchoredtechnologies.net`
- Password: `changeme123` (should be changed in production)

## Code Organization

```
Auth/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/auth/          # Authentication API routes
│   │   │   ├── login/         # POST /api/auth/login
│   │   │   ├── logout/        # POST /api/auth/logout
│   │   │   ├── verify/        # GET /api/auth/verify (internal)
│   │   │   └── me/            # GET /api/auth/me
│   │   ├── dashboard/         # Protected dashboard page
│   │   ├── login/             # Public login page
│   │   └── page.tsx           # Root redirect logic
│   ├── lib/
│   │   ├── auth.ts            # JWT generation and verification (jose)
│   │   ├── db.ts              # PostgreSQL connection pool and queries
│   │   └── password.ts        # bcrypt password hashing utilities
│   └── types/
│       └── user.ts            # TypeScript type definitions
├── db/
│   └── init.sql               # Database schema and seed data
├── docs/
│   ├── increment-1.md         # Detailed increment 1 documentation
│   └── quick-reference.md     # Quick reference guide
├── nginx.conf                 # nginx auth_request configuration
├── docker-compose.yml         # Service orchestration
├── Dockerfile                 # Next.js application image
├── Dockerfile.openresty       # nginx image (legacy name, actually uses nginx:alpine)
└── .env.production / .env.local  # Environment variables

Proxy/
├── README.md                  # Obsolete proxy framework documentation
└── [FRP configurations]       # Legacy demo system configs
```

## Key Implementation Details

### JWT Implementation (src/lib/auth.ts)

- Uses `jose` library for JWS (JSON Web Signature)
- Algorithm: HS256 (HMAC with SHA-256)
- Secret: From `JWT_SECRET` environment variable (min 32 chars)
- Payload: `{ sub: userId, email, role, iat, exp }`
- Token lifetime: 24 hours
- Note: `sub` is stored as string in JWT (standard) but converted to number in application

### Database Connection (src/lib/db.ts)

- Uses `pg` library with connection pooling
- Pool settings: max 20 connections, 30s idle timeout, 2s connection timeout
- Singleton pattern: pool created once and reused
- Query functions: `queryUser(email)`, `queryUserById(id)`

### nginx Auth Request Pattern (nginx.conf)

The `auth_request` directive is key to the architecture:
- `auth_request /auth-verify` - triggers subrequest for every protected route
- `auth_request_set $variable $upstream_http_header` - captures response headers
- `error_page 401 = @error401` - redirects authentication failures to login
- `internal` directive on `/auth-verify` - prevents external access

Public routes bypass auth_request:
- `/login` (login page)
- `/api/auth/login` (authentication endpoint)
- `/api/auth/logout` (logout endpoint)

### Environment Variables

Required in `.env.production` or `.env.local`:
- `DATABASE_URL` - PostgreSQL connection string (e.g., `postgresql://portal:password@postgres:5432/portal_db`)
- `JWT_SECRET` - Secret for JWT signing (min 32 chars, generate with `openssl rand -base64 32`)
- `POSTGRES_PASSWORD` - Database password
- `NODE_ENV` - Set to `production` for production builds

## Testing

### Manual Testing with cURL

```bash
# Test login
curl -X POST http://localhost:3010/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@anchoredtechnologies.net","password":"changeme123"}' \
  -c /tmp/cookies.txt

# Test protected route (authenticated)
curl -b /tmp/cookies.txt http://localhost:3010/dashboard

# Test protected route (unauthenticated - should redirect)
curl -v http://localhost:3010/dashboard

# Test user info endpoint
curl -b /tmp/cookies.txt http://localhost:3010/api/auth/me

# Test logout
curl -X POST -b /tmp/cookies.txt http://localhost:3010/api/auth/logout
```

## Deployment

System is deployed on bigdog (home server) at `http://localhost:3010`. For production deployment via FRP tunnel and EC2, see `Auth/DEPLOYMENT.md`.

Key production steps:
1. Change default admin password in database
2. Generate strong `JWT_SECRET` (32+ characters)
3. Configure FRP tunnel from EC2 to bigdog:3010
4. Set up SSL certificates on EC2 nginx
5. Configure database backups
6. Set up log rotation

## Current Status

**Increment 1: Complete** - Basic authentication system with login, logout, protected routes, and JWT session management.

Future increments will add:
- Service management (Increment 2)
- User registration with one-time tokens (Increment 2)
- Admin panel for user and service management (Increment 2)
- Dynamic service routing via JWT payload (Increment 2)
- Migration to JWE (encrypted JWT) (Increment 1.5)

See `portal-spec.md` for full system specification.
