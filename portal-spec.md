<!-- markdownlint-disable MD022 MD029 -->
<!-- markdownlint-disable MD031 MD032 MD034 -->
<!-- markdownlint-disable MD040 -->
# Authenticated Portal Specification

## Overview

An authenticated web portal for providing clients, resales, and demos with secure access to internal Docker services running on a private server (bigdog). The portal manages authentication and dynamically routes users to services they have permission to access.

## Architecture

**Infrastructure:**
- AWS EC2 (public): nginx + frps
- bigdog (private): frpc + Docker containers
- Traffic flow: Internet → HTTPS → nginx (EC2) → encrypted FRP tunnel → bigdog containers

**Security:**
- HTTPS terminates at EC2 nginx
- FRP tunnel encrypted with TLS
- Internal Docker services use HTTP (not exposed via FRP)
- Services only accessible through authenticated portal

## Core Features

### Authentication
- Login page with username/password
- JWT-based authentication using JWE (encrypted tokens)
- JWT payload contains:
  - User metadata (id, email, expiry)
  - Service routing map: `{ "serviceName": "http://internal.docker:port" }`
- Token-based session management
- Logout with token invalidation

### User Management
- Admin generates one-time registration tokens
- New users access registration URL with token to create account
- Two roles: admin and user
- Admin has full system access

### Dashboard
- Shows available services as clickable cards/links
- Services displayed based on user's JWT permissions
- Service cards include icons and descriptions
- Clean, simple UI

### Reverse Proxy (OpenResty + Lua)
- Clean URLs: `portal.domain/servicename`
- Dynamic routing based on JWT validation
- No nginx reloads needed for permission changes
- Lua extracts JWT, validates, checks service access, proxies to internal URL
- All service access requires valid JWT

### Admin Panel
- User management:
  - List all users
  - View user permissions
  - Generate one-time registration tokens
- Service management:
  - Add/edit/remove service definitions
  - Configure: name, internal URL, icon, description
- Permission management:
  - Assign services to users
  - Remove service access

## Technical Stack

- **Frontend:** Next.js 14+, TypeScript, React
- **Backend:** Next.js API routes
- **Database:** PostgreSQL (or SQLite for simplicity)
- **Reverse Proxy:** OpenResty (nginx + Lua)
- **Authentication:** JWT (JWE - encrypted)
- **Deployment:** Docker containers

## URL Structure

```
portal.domain/                  → Login page / Dashboard (if authenticated)
portal.domain/servicename       → Proxied to internal service (requires auth)
portal.domain/admin             → Admin panel (admin role only)
portal.domain/register?token=X  → Registration page with one-time token
```

## Data Model

### Users Table
- id
- email
- password_hash
- role (admin | user)
- created_at

### Services Table
- id
- name (used in URL)
- internal_url (e.g., http://grafana.docker:3000)
- icon (URL or identifier)
- description
- active (boolean)

### UserServices Table (Permissions)
- user_id
- service_id

### RegistrationTokens Table
- token (UUID)
- expires_at
- used (boolean)
- created_by (admin user_id)
- created_at

## OpenResty Proxy Logic

1. User accesses `portal.domain/grafana`
2. Lua extracts JWT from cookie/header
3. Validate and decrypt JWT
4. Extract service name from URL path (`grafana`)
5. Check if `services.grafana` exists in JWT payload
6. If authorized, proxy to internal URL from JWT
7. If unauthorized, return 403

## Authentication Flow

### Login
1. User submits credentials
2. Backend validates against database
3. Query user's permitted services from database
4. Generate JWT with user info + service routing map
5. Return encrypted JWT to client (stored as HTTP-only cookie)

### Service Access
1. User clicks service link or navigates to `/servicename`
2. OpenResty Lua validates JWT
3. Checks if service exists in JWT payload
4. Proxies request to internal Docker URL
5. Response returned to user

### Registration
1. Admin generates one-time token via admin panel
2. Admin shares registration URL with new user
3. User accesses URL, token validated
4. User creates account (email, password)
5. Token marked as used
6. User can log in

## Security Considerations

- Passwords hashed with bcrypt/argon2
- JWE encryption hides routing information from clients
- HTTP-only cookies prevent XSS token theft
- Internal Docker services not exposed via FRP
- All external traffic over HTTPS
- FRP tunnel encrypted with TLS
- Token expiration enforced
- One-time registration tokens with expiration

## Future Enhancements (Optional)

- Audit logging (track who accessed what and when)
- Service health checks (show status on dashboard)
- Password reset functionality
- Multi-factor authentication
- Role-based access control beyond admin/user
- Service usage analytics
