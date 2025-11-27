# Quick Reference Guide

## Common Commands

### Docker Operations

**Start All Services**
```bash
docker compose --env-file .env.production up -d
```

**Stop All Services**
```bash
docker compose --env-file .env.production down
```

**Rebuild and Restart**
```bash
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d
```

**View Logs**
```bash
# All services
docker compose --env-file .env.production logs -f

# Specific service
docker logs portal-nginx -f
docker logs portal-app -f
docker logs portal-postgres -f
```

**Check Service Status**
```bash
docker compose --env-file .env.production ps
```

**Clean Up (WARNING: Deletes all data)**
```bash
docker compose --env-file .env.production down -v
```

### Database Operations

**Initialize Database Schema**
```bash
docker exec -i portal-postgres psql -U portal -d portal_db < db/init.sql
```

**Connect to Database**
```bash
docker exec -it portal-postgres psql -U portal -d portal_db
```

**Backup Database**
```bash
docker exec portal-postgres pg_dump -U portal portal_db > backup.sql
```

**Restore Database**
```bash
docker exec -i portal-postgres psql -U portal -d portal_db < backup.sql
```

**Query Users**
```bash
docker exec -it portal-postgres psql -U portal -d portal_db -c "SELECT id, email, role FROM users;"
```

### Testing Endpoints

**Login**
```bash
curl -X POST http://localhost:3010/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@anchoredtechnologies.net","password":"changeme123"}' \
  -c /tmp/cookies.txt -v
```

**Access Protected Dashboard**
```bash
curl -b /tmp/cookies.txt http://localhost:3010/dashboard -v
```

**Get User Info**
```bash
curl -b /tmp/cookies.txt http://localhost:3010/api/auth/me
```

**Logout**
```bash
curl -X POST -b /tmp/cookies.txt http://localhost:3010/api/auth/logout -v
```

**Test Unauthenticated Access (should redirect)**
```bash
curl -v http://localhost:3010/dashboard
```

### Development

**Install Dependencies**
```bash
npm install
```

**Run Development Server (without Docker)**
```bash
npm run dev
```

**Build Production**
```bash
npm run build
```

**Lint Code**
```bash
npm run lint
```

**Type Check**
```bash
npx tsc --noEmit
```

## Configuration Files

### Environment Files

**Development (.env.local)**
- Used for local development
- Contains development-specific settings
- Safe to use weak passwords

**Production (.env.production)**
- Used for production deployment
- **MUST use strong passwords**
- **NEVER commit to git**

**Key Variables:**
```bash
DATABASE_URL=postgresql://portal:PASSWORD@postgres:5432/portal_db
JWT_SECRET=your-secret-here  # Min 32 characters
POSTGRES_PASSWORD=your-db-password
NODE_ENV=production
```

### Generate Strong Secrets

**JWT Secret**
```bash
openssl rand -base64 32
```

**Database Password**
```bash
openssl rand -base64 24
```

## Service URLs

### Local Development
- **Portal**: http://localhost:3010
- **Next.js (direct)**: http://localhost:3000 (when running outside Docker)
- **PostgreSQL**: localhost:5432 (when port forwarded)

### Production (via FRP Tunnel)
- **Portal**: https://portal.anchoredtechnologies.net
- **Portal (alternate)**: https://portal.donaldchisholm.ca

## Default Credentials

### Admin User
- **Email**: admin@anchoredtechnologies.net
- **Password**: changeme123
- **Role**: admin

⚠️ **Change this password in production!**

### Database
- **User**: portal
- **Database**: portal_db
- **Password**: See .env.production

## Troubleshooting

### Container Won't Start

**Check logs:**
```bash
docker logs portal-nginx
docker logs portal-app
docker logs portal-postgres
```

**Verify port availability:**
```bash
sudo netstat -tulpn | grep 3010
# or
sudo ss -tulpn | grep 3010
```

### Database Connection Issues

**Check if database is healthy:**
```bash
docker exec portal-postgres pg_isready -U portal
```

**Test database connection:**
```bash
docker exec -it portal-postgres psql -U portal -d portal_db -c "SELECT 1;"
```

### nginx Configuration Errors

**Test nginx config:**
```bash
docker exec portal-nginx nginx -t
```

**Reload nginx:**
```bash
docker exec portal-nginx nginx -s reload
```

### JWT Token Issues

**Verify JWT_SECRET is set:**
```bash
docker exec portal-app printenv | grep JWT_SECRET
```

**Check token in cookie:**
```bash
# Login first, then check cookies
cat /tmp/cookies.txt
```

### Next.js Build Errors

**Clear build cache:**
```bash
rm -rf .next
npm run build
```

**Rebuild Docker image:**
```bash
docker compose --env-file .env.production build --no-cache nextjs-app
```

## Performance Monitoring

### Check Resource Usage

**All containers:**
```bash
docker stats
```

**Specific container:**
```bash
docker stats portal-app
```

### Check Disk Usage

**Docker volumes:**
```bash
docker system df
```

**Specific volume:**
```bash
docker volume inspect auth_postgres_data
```

## Security Checklist

Before deploying to production:

- [ ] Change admin password
- [ ] Generate strong JWT_SECRET (min 32 chars)
- [ ] Use strong database password
- [ ] Verify .env.production is not in git
- [ ] Enable HTTPS on EC2 nginx
- [ ] Review nginx access logs
- [ ] Set up log rotation
- [ ] Configure firewall rules
- [ ] Enable fail2ban (optional)
- [ ] Set up monitoring/alerts

## Adding New Users

**Via psql:**
```bash
docker exec -it portal-postgres psql -U portal -d portal_db
```

```sql
-- Generate password hash first (using bcryptjs with 10 rounds)
-- Use the /api/auth/login endpoint logic or a script

INSERT INTO users (email, password_hash, role)
VALUES ('user@example.com', '$2b$10$...hash...', 'user');
```

**Via API (when user registration is implemented in future increment):**
```bash
curl -X POST http://localhost:3010/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securepass","role":"user"}'
```

## nginx Routing

### Add New Protected Route

Edit `nginx.conf`:
```nginx
location /new-service {
    auth_request /auth-verify;
    auth_request_set $user_id $upstream_http_x_user_id;
    auth_request_set $user_email $upstream_http_x_user_email;
    auth_request_set $user_role $upstream_http_x_user_role;

    proxy_pass http://new-service:8080;
    proxy_set_header X-User-Id $user_id;
    proxy_set_header X-User-Email $user_email;
    proxy_set_header X-User-Role $user_role;
}
```

Rebuild nginx:
```bash
docker compose --env-file .env.production build nginx
docker compose --env-file .env.production up -d nginx
```

## Useful One-Liners

**Get container IPs:**
```bash
docker inspect -f '{{.Name}} - {{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $(docker ps -aq)
```

**Follow all logs:**
```bash
docker compose --env-file .env.production logs -f --tail=100
```

**Check database size:**
```bash
docker exec portal-postgres psql -U portal -d portal_db -c "SELECT pg_size_pretty(pg_database_size('portal_db'));"
```

**Count users:**
```bash
docker exec portal-postgres psql -U portal -d portal_db -c "SELECT COUNT(*) FROM users;"
```

**Check nginx access logs:**
```bash
docker exec portal-nginx cat /var/log/nginx/access.log | tail -20
```

## Next Steps

1. **Test thoroughly** on localhost:3010
2. **Update FRP tunnel configuration** on EC2 to route to bigdog:3010
3. **Configure SSL certificates** on EC2 nginx
4. **Set up monitoring** (optional: Prometheus, Grafana)
5. **Plan Increment 2** features
