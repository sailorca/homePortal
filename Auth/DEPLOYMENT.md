# Deployment Guide

## Current Status

✅ **Increment 1 Complete and Running**

All services are deployed and tested on `bigdog` at `http://localhost:3010`

## Services Running

```
CONTAINER NAME       IMAGE              STATUS
portal-nginx         auth-nginx         Running (52.8 MB)
portal-app           auth-nextjs-app    Running
portal-postgres      postgres:16        Running (Healthy)
```

**Network:** portal-network (Docker bridge)
**Exposed Port:** 3010 (nginx)

## What's Working

### Authentication Flow
1. ✅ User visits http://localhost:3010
2. ✅ Redirected to /login if not authenticated
3. ✅ Login with admin@anchoredtechnologies.net / changeme123
4. ✅ JWT cookie set (HTTP-only, secure)
5. ✅ nginx verifies JWT on every request via auth_request
6. ✅ User headers (X-User-Id, X-User-Email, X-User-Role) passed to Next.js
7. ✅ Access protected /dashboard
8. ✅ Logout clears cookie and redirects to /login

### Endpoints Tested
- ✅ POST /api/auth/login → 200 OK
- ✅ POST /api/auth/logout → 200 OK
- ✅ GET /api/auth/me → 200 OK
- ✅ GET /dashboard (authenticated) → 200 OK
- ✅ GET /dashboard (unauthenticated) → 302 /login
- ✅ GET /auth-verify (internal) → 200/401

## Next Deployment Steps

### Step 1: Test on bigdog Localhost
**Already Complete** ✅

The system is running on http://localhost:3010 and fully functional.

### Step 2: Configure FRP Tunnel on EC2

On your EC2 instance, update the FRP server configuration to route traffic to bigdog:3010.

**Current FRP Setup (from aws_demo_server_guide.md):**
- FRP server runs on EC2
- Tunnels to bigdog via encrypted connection
- nginx on EC2 proxies to FRP tunnel

**Update EC2 nginx configuration:**
```nginx
# On EC2: /etc/nginx/sites-available/portal
server {
    listen 443 ssl http2;
    server_name portal.anchoredtechnologies.net portal.donaldchisholm.ca;

    ssl_certificate /etc/letsencrypt/live/anchoredtechnologies.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/anchoredtechnologies.net/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3010;  # FRP tunnel endpoint
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name portal.anchoredtechnologies.net portal.donaldchisholm.ca;
    return 301 https://$server_name$request_uri;
}
```

**Update FRP client on bigdog:**
```ini
# /etc/frp/frpc.ini (on bigdog)
[portal]
type = tcp
local_ip = 127.0.0.1
local_port = 3010
remote_port = 3010
```

### Step 3: Verify SSL Certificates

**Check SSL certificates on EC2:**
```bash
sudo certbot certificates
```

**Renew if needed:**
```bash
sudo certbot renew --dry-run
```

### Step 4: Update DNS (if needed)

Ensure DNS records point to EC2:
```
portal.anchoredtechnologies.net  → EC2 IP
portal.donaldchisholm.ca         → EC2 IP
```

### Step 5: Test External Access

From external machine:
```bash
curl https://portal.anchoredtechnologies.net/login
```

Should return the login page HTML.

### Step 6: Security Hardening

**On bigdog:**
```bash
# Change default admin password
docker exec -it portal-postgres psql -U portal -d portal_db
# UPDATE users SET password_hash = '$2b$...' WHERE email = 'admin@anchoredtechnologies.net';

# Verify JWT_SECRET is strong
grep JWT_SECRET .env.production
# Should be 32+ characters, random
```

**On EC2:**
```bash
# Enable fail2ban for ssh
sudo apt install fail2ban
sudo systemctl enable fail2ban

# Configure firewall
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable

# Set up log rotation
sudo nano /etc/logrotate.d/nginx
```

## Architecture in Production

```
Internet
  ↓
EC2 nginx (443/80)
  ↓ SSL termination
  ↓
FRP Tunnel (encrypted)
  ↓
bigdog (127.0.0.1:3010)
  ↓
Docker: nginx container
  ↓ auth_request
  ↓
Docker: Next.js container (/api/auth/verify)
  ↓ (if authenticated)
  ↓
Docker: Next.js container (application)
  ↓
Docker: PostgreSQL container
```

## Monitoring

### Health Checks

**Check services:**
```bash
# On bigdog
docker compose --env-file .env.production ps
```

**Check logs:**
```bash
# On bigdog
docker logs portal-nginx --tail 50
docker logs portal-app --tail 50

# On EC2
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Set Up Alerts (Optional)

**Simple monitoring script on bigdog:**
```bash
#!/bin/bash
# /home/donald/scripts/monitor-portal.sh

if ! curl -s http://localhost:3010/login > /dev/null; then
    echo "Portal is DOWN" | mail -s "Portal Alert" admin@anchoredtechnologies.net
fi
```

**Add to crontab:**
```bash
crontab -e
# */5 * * * * /home/donald/scripts/monitor-portal.sh
```

## Rollback Plan

If issues occur:

**Option 1: Restart services**
```bash
docker compose --env-file .env.production restart
```

**Option 2: Rollback to previous image**
```bash
docker tag auth-nginx:latest auth-nginx:backup
docker compose --env-file .env.production down
# Restore previous image
docker compose --env-file .env.production up -d
```

**Option 3: Disable FRP tunnel on EC2**
```bash
# On EC2
sudo systemctl stop frps
```

This will stop traffic to bigdog, allowing time to fix issues.

## Backup Strategy

### Database Backup

**Automated backup script:**
```bash
#!/bin/bash
# /home/donald/scripts/backup-portal-db.sh

BACKUP_DIR="/home/donald/backups/portal"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/portal_db_$DATE.sql"

mkdir -p $BACKUP_DIR
docker exec portal-postgres pg_dump -U portal portal_db > $BACKUP_FILE
gzip $BACKUP_FILE

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

**Add to crontab (daily at 2 AM):**
```bash
0 2 * * * /home/donald/scripts/backup-portal-db.sh
```

### Configuration Backup

**Backup critical files:**
```bash
tar -czf portal-config-$(date +%Y%m%d).tar.gz \
    docker-compose.yml \
    nginx.conf \
    Dockerfile* \
    .env.production \
    db/init.sql
```

## Performance Tuning

### nginx

**Edit nginx.conf for production:**
```nginx
events {
    worker_connections 2048;  # Increase from 1024
}

http {
    # Enable compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Connection timeouts
    keepalive_timeout 65;
    client_max_body_size 10M;

    # ... rest of config
}
```

### PostgreSQL

**Tune PostgreSQL (if needed):**
```bash
docker exec -it portal-postgres psql -U portal -d portal_db

-- Increase connection pool
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_buffers = '256MB';

-- Reload config
SELECT pg_reload_conf();
```

### Next.js

Already optimized with:
- ✅ Standalone build (minimal footprint)
- ✅ Static page generation where possible
- ✅ Production mode enabled

## Troubleshooting Production Issues

### Can't access from external network

1. **Check FRP tunnel:**
   ```bash
   # On EC2
   sudo systemctl status frps

   # On bigdog
   sudo systemctl status frpc
   ```

2. **Check EC2 nginx:**
   ```bash
   # On EC2
   sudo nginx -t
   sudo systemctl status nginx
   ```

3. **Check DNS:**
   ```bash
   nslookup portal.anchoredtechnologies.net
   ```

### Slow performance

1. **Check resource usage:**
   ```bash
   docker stats
   htop
   ```

2. **Check database connections:**
   ```bash
   docker exec portal-postgres psql -U portal -d portal_db -c "SELECT count(*) FROM pg_stat_activity;"
   ```

3. **Check nginx access patterns:**
   ```bash
   docker exec portal-nginx cat /var/log/nginx/access.log | awk '{print $7}' | sort | uniq -c | sort -rn | head -20
   ```

### Authentication not working

1. **Verify JWT_SECRET matches:**
   ```bash
   docker exec portal-app printenv | grep JWT_SECRET
   ```

2. **Check cookie settings:**
   ```bash
   # Should have secure=true in production
   curl -v https://portal.anchoredtechnologies.net/api/auth/login
   ```

3. **Check nginx auth_request:**
   ```bash
   docker logs portal-nginx | grep auth-verify
   ```

## Production Checklist

Before going live:

- [ ] Change admin password
- [ ] Generate strong JWT_SECRET (32+ chars)
- [ ] Use strong database password
- [ ] Verify SSL certificates are valid
- [ ] Test login from external network
- [ ] Test logout functionality
- [ ] Test protected routes
- [ ] Configure FRP tunnel
- [ ] Update EC2 nginx config
- [ ] Enable firewall rules
- [ ] Set up database backups
- [ ] Set up log rotation
- [ ] Configure monitoring (optional)
- [ ] Document admin procedures
- [ ] Test rollback procedure

## Support

For issues:
1. Check [docs/quick-reference.md](docs/quick-reference.md)
2. Check [docs/increment-1.md](docs/increment-1.md)
3. Review logs: `docker logs portal-nginx`
4. Contact development team

## Success Criteria

System is production-ready when:
- ✅ Accessible via https://portal.anchoredtechnologies.net
- ✅ Login works with admin credentials
- ✅ Dashboard displays user information
- ✅ Logout clears session
- ✅ Unauthenticated users redirected to login
- ✅ No errors in nginx/app logs
- ✅ Database backups configured
- ✅ SSL certificates valid and auto-renewing
