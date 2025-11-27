# Database Migrations

This directory contains SQL migration scripts for the homePortal database schema.

## Migration Strategy

We use manual SQL migrations for simplicity and explicit control. Each migration is a numbered SQL file that should be run in order.

## Running Migrations

### Apply a migration

```bash
# Make sure the Docker containers are running
cd /home/donald/Projects/homePortal/Auth
docker compose --env-file .env.production up -d

# Run the migration
docker exec -i portal-postgres psql -U portal -d portal_db < db/migrations/001_add_registration_tokens.sql
```

### Verify migration

```bash
# Connect to database
docker exec -it portal-postgres psql -U portal -d portal_db

# List tables
\dt

# Describe registration_tokens table
\d registration_tokens

# Exit psql
\q
```

## Migration History

| Migration | Date | Description |
|-----------|------|-------------|
| 001 | 2025-11-27 | Add registration_tokens table for user onboarding |

## Creating New Migrations

1. Create a new file with sequential number: `00X_description.sql`
2. Write SQL for schema changes
3. Add comments for documentation
4. Test migration on dev database
5. Update this README with migration details
6. Run migration on production database

## Rollback Strategy

To rollback a migration, create a corresponding down migration file:
- Up: `001_add_registration_tokens.sql`
- Down: `001_add_registration_tokens_down.sql`

Down migrations should reverse the changes made in the up migration.
