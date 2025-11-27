# Authenticated Portal System

A secure, multi-service portal with JWT-based authentication, built with Next.js, nginx, and PostgreSQL.

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Ports 3010 available on host

### Start the System
```bash
# Production mode
docker compose --env-file .env.production up -d

# Development mode
docker compose --env-file .env.local up -d
```

### Access the Portal
- **URL**: http://localhost:3010
- **Admin Login**:
  - Email: `admin@anchoredtechnologies.net`
  - Password: `changeme123`

### Stop the System
```bash
docker compose --env-file .env.production down
```

## Architecture

```
Client → nginx (auth_request) → JWT Verifier → Next.js App → PostgreSQL
```

**Key Features:**
- JWT authentication verified at nginx layer
- HTTP-only secure cookies
- Protected routes with automatic redirect
- User info passed via headers to backend services

## Current Status

**Increment 1: Complete** ✅
- Basic authentication system
- Login/logout functionality
- Protected dashboard
- JWT session management
- See [docs/increment-1.md](docs/increment-1.md) for details

## Project Structure

```
Auth/
├── docker-compose.yml       # Service orchestration
├── Dockerfile              # Next.js app container
├── Dockerfile.openresty    # nginx container (legacy name)
├── nginx.conf              # nginx configuration
├── package.json            # Node.js dependencies
├── next.config.js          # Next.js config
├── db/
│   └── init.sql           # Database schema
├── src/
│   ├── app/               # Next.js pages and API routes
│   ├── lib/               # Utilities (auth, db, password)
│   └── types/             # TypeScript types
└── docs/
    └── increment-1.md     # Increment 1 documentation
```

## Services

### nginx (port 3010)
- Reverse proxy
- JWT verification via auth_request
- Routes requests to Next.js app

### Next.js App (port 3000, internal)
- Web application
- API endpoints (login, logout, verify, user info)
- Protected pages

### PostgreSQL (port 5432, internal)
- User data storage
- Persistent volume: postgres_data

## API Endpoints

### Public
- `POST /api/auth/login` - Authenticate user
- `GET /login` - Login page

### Protected (require valid JWT)
- `POST /api/auth/logout` - End session
- `GET /dashboard` - User dashboard
- `GET /api/auth/me` - Get current user info

### Internal (nginx only)
- `GET /api/auth/verify` - JWT verification endpoint

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT signing (min 32 characters)
- `POSTGRES_PASSWORD` - Database password

### Optional
- `NODE_ENV` - Environment (development/production)
- `NEXT_PUBLIC_API_URL` - Public API URL

See `.env.production` and `.env.local` for examples.

## Development

### Install Dependencies
```bash
npm install
```

### Run Locally (without Docker)
```bash
# Start PostgreSQL
docker run -d -p 5432:5432 \
  -e POSTGRES_USER=portal \
  -e POSTGRES_PASSWORD=changeme \
  -e POSTGRES_DB=portal_db \
  postgres:16-alpine

# Initialize database
psql -U portal -d portal_db -f db/init.sql

# Start Next.js dev server
npm run dev
```

### Build
```bash
npm run build
```

### Lint
```bash
npm run lint
```

## Testing

### Test Login
```bash
curl -X POST http://localhost:3010/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@anchoredtechnologies.net","password":"changeme123"}' \
  -c /tmp/cookies.txt
```

### Test Protected Route
```bash
# With authentication
curl -b /tmp/cookies.txt http://localhost:3010/dashboard

# Without authentication (should redirect)
curl -v http://localhost:3010/dashboard
```

### Test User Info
```bash
curl -b /tmp/cookies.txt http://localhost:3010/api/auth/me
```

## Troubleshooting

### Database Not Initialized
```bash
docker exec -i portal-postgres psql -U portal -d portal_db < db/init.sql
```

### View Logs
```bash
docker logs portal-nginx
docker logs portal-app
docker logs portal-postgres
```

### Rebuild Containers
```bash
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d
```

### Clear Everything
```bash
docker compose --env-file .env.production down -v
# -v removes volumes (WARNING: deletes database data)
```

## Security Notes

### Production Deployment
1. **Change default passwords** in `.env.production`
2. **Generate strong JWT_SECRET**: `openssl rand -base64 32`
3. **Use HTTPS** in production (configure on AWS EC2)
4. **Rotate secrets** regularly
5. **Review nginx access logs** for suspicious activity

### Current Security Features
- Bcrypt password hashing (10 rounds)
- HTTP-only cookies (JavaScript cannot access)
- Secure flag in production (HTTPS only)
- SameSite: strict (CSRF protection)
- JWT expiration (24 hours)
- Authentication at proxy layer

## Future Roadmap

### Increment 1.5 (Potential)
- [ ] Migrate from JWS to JWE (encrypted JWT)
- [ ] Refresh token support
- [ ] Extract JWT verifier to separate microservice

### Increment 2
- [ ] Additional service containers
- [ ] Role-based routing to different services
- [ ] Service-specific authentication

### Increment 3+
- [ ] User registration UI
- [ ] Password reset flow
- [ ] Multi-factor authentication
- [ ] OAuth integration

## Documentation

- [Increment 1 Details](docs/increment-1.md) - Complete documentation of architecture, decisions, and implementation

## Tech Stack

- **Frontend/Backend**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL 16
- **Proxy**: nginx (Alpine)
- **Authentication**: JWT (jose library)
- **Password Hashing**: bcryptjs
- **Containerization**: Docker & Docker Compose

## License

Private project - Anchored Technologies

## Contact

For questions or issues, refer to the documentation or contact the development team.
