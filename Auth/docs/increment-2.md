<!-- markdownlint-disable MD022 MD029 -->
<!-- markdownlint-disable MD031 MD032 MD034 -->
<!-- markdownlint-disable MD040 -->
# Increment 2: Admin Panel & User Management

**Completion Date:** November 27, 2025
**Status:** ✅ Complete and Tested

## Overview

Implemented admin panel with user management and one-time registration token system. Admins can now onboard new users by generating secure registration tokens, and manage existing users through a comprehensive admin interface.

## Architecture

### System Flow

```
Admin generates token → Shares URL → New user registers → Token marked as used
                                   ↓
                          User account created (role: user)
                                   ↓
                          User can login normally
```

### Database Schema Changes

**New Table: registration_tokens**
```sql
CREATE TABLE registration_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,           -- UUID v4
    expires_at TIMESTAMP NOT NULL,                -- Configurable expiry
    used BOOLEAN NOT NULL DEFAULT false,
    used_by INTEGER REFERENCES users(id),         -- Tracks who used it
    used_at TIMESTAMP,
    created_by INTEGER NOT NULL REFERENCES users(id),  -- Admin who created it
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Indexes:**
- `idx_registration_tokens_token` - Fast token lookup
- `idx_registration_tokens_created_by` - Admin audit queries
- `idx_registration_tokens_used` - Filter used/unused tokens

## Features Implemented

### 1. Token-Based User Registration

**Token Generation (Admin):**
- Admin generates UUID v4 token via admin panel
- Configurable expiry (default: 7 days)
- Token URL: `http://localhost:3010/register?token=xxx`
- Copy token URL or raw token to clipboard

**Token Validation (Public):**
- Public endpoint: `GET /api/auth/validate-token?token=xxx`
- Checks: token exists, not used, not expired
- Returns validation status without revealing details

**User Registration (Public):**
- Public endpoint: `POST /api/auth/register`
- Validates: email format, password strength, token validity
- Password requirements: 8+ chars, letter + number
- Creates user with role "user"
- Marks token as used
- Does NOT auto-login (user must go to /login)

### 2. Admin Panel

**Access Control:**
- Route: `/admin`
- Protected by admin role check (nginx + client-side)
- Redirects non-admins to dashboard

**Two-Tab Interface:**

**Users Tab:**
- List all users (email, role, created date)
- Change user role (admin ↔ user)
- Delete users
- Protections:
  - Cannot delete self
  - Cannot delete last admin
  - Cannot change own role
  - Cannot change last admin to user

**Registration Tokens Tab:**
- Generate new tokens with custom expiry
- Filter tokens: Active / Used / Expired / All
- Token table shows:
  - Token (truncated with copy buttons)
  - Status (badge: Active/Used/Expired)
  - Expiry date
  - Used by email (if used)
  - Created date
- Copy registration URL
- Copy raw token
- Revoke unused tokens

### 3. User Management APIs

**Admin Endpoints (require admin role):**

`GET /api/admin/users`
- List all users with metadata
- Response: `{ users: UserWithMeta[] }`

`PATCH /api/admin/users/[id]`
- Update user role
- Body: `{ role: 'admin' | 'user' }`
- Validates: not self, not last admin

`DELETE /api/admin/users/[id]`
- Delete user
- Validates: not self, not last admin

`POST /api/admin/tokens`
- Generate registration token
- Body: `{ expiresInDays?: number }` (default: 7)
- Returns: `{ token, expires_at, registration_url }`

`GET /api/admin/tokens?filter=active|used|expired|all`
- List tokens with filter
- Returns: `{ tokens: RegistrationTokenSafe[] }`

`DELETE /api/admin/tokens/[id]`
- Delete unused token
- Returns: `{ success: true }`

**Public Endpoints:**

`GET /api/auth/validate-token?token=xxx`
- Check if token is valid
- Returns: `{ valid: boolean, error?: string }`

`POST /api/auth/register`
- Register new user with token
- Body: `{ token, email, password }`
- Returns: `{ success: true, user: UserSafe }`

## Technical Implementation

### Library Functions

**src/lib/tokens.ts** - Token management
- `createToken(createdBy, expiresInDays)` - Generate UUID v4 token
- `getTokenByValue(token)` - Lookup token
- `markTokenAsUsed(token, usedBy)` - Mark as consumed
- `listTokens(filter)` - Query with filtering
- `deleteToken(id)` - Remove unused token
- `isTokenValid(token)` - Check validity

**src/lib/validation.ts** - Input validation
- `validatePassword(password)` - Min 8 chars, letter + number
- `validateEmail(email)` - Email format check

**src/lib/adminAuth.ts** - Admin middleware
- `requireAdmin(request)` - Check X-User-Role header
- `getUserFromHeaders(request)` - Extract user from nginx headers

**src/lib/db.ts** - Extended with user CRUD
- `getAllUsers()` - List all users
- `deleteUser(id)` - Delete user
- `updateUserRole(id, role)` - Change role
- `createUser(email, passwordHash, role)` - Create account
- `countAdmins()` - Count admins (for last admin protection)

### UI Components

**Pages:**
- `/admin` - Admin panel with tab interface
- `/register?token=xxx` - Public registration page

**Components:**
- `UserManagement.tsx` - User table with actions
- `TokenManagement.tsx` - Token generation and list
- `ConfirmDialog.tsx` - Reusable confirmation modal
- `CopyButton.tsx` - Copy-to-clipboard with feedback

**Layouts:**
- `admin/layout.tsx` - Admin-only layout wrapper

### nginx Configuration Updates

Added public routes for registration:
```nginx
# Registration routes - public access
location = /register { ... }
location = /api/auth/register { ... }
location = /api/auth/validate-token { ... }
```

All `/api/admin/*` routes remain protected by `auth_request`.

## Security Features

### Token Security
- **UUID v4**: Cryptographically secure random tokens
- **Single-use**: Token cannot be reused after registration
- **Expiration**: Configurable expiry (default 7 days, max 365)
- **Server-side validation**: All checks happen on backend

### Admin Protection
- **Role checking**: nginx layer + application layer + client UI
- **Self-protection**: Cannot delete or demote self
- **Last admin protection**: Cannot delete or demote last admin
- **Admin-only endpoints**: Middleware enforces role requirement

### Password Security
- **Minimum 8 characters**
- **At least one letter**
- **At least one number**
- **bcryptjs hashing** with 10 salt rounds

### Access Control
- **Defense in depth**: Multiple layers check permissions
- **Admin panel**: Checks role on mount, redirects non-admins
- **API endpoints**: Middleware validates admin role
- **User headers**: nginx auth_request provides user context

## Testing Results

All tests performed on localhost:3010:

✅ **Admin Login:**
```bash
curl -X POST http://localhost:3010/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@anchoredtechnologies.net","password":"changeme123"}' \
  -c cookies.txt
# Response: {"success":true,"user":{...}}
```

✅ **List Users:**
```bash
curl -b cookies.txt http://localhost:3010/api/admin/users
# Response: {"users":[{"id":1,"email":"admin@anchoredtechnologies.net",...}]}
```

✅ **Generate Token:**
```bash
curl -X POST -b cookies.txt http://localhost:3010/api/admin/tokens \
  -H "Content-Type: application/json" \
  -d '{"expiresInDays":7}'
# Response: {"token":"uuid","expires_at":"...","registration_url":"..."}
```

✅ **Validate Token:**
```bash
curl "http://localhost:3010/api/auth/validate-token?token=xxx"
# Response: {"valid":true} or {"valid":false,"error":"..."}
```

✅ **Register User:**
```bash
curl -X POST http://localhost:3010/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"token":"xxx","email":"user@example.com","password":"Test1234"}'
# Response: {"success":true,"user":{"id":2,"email":"user@example.com","role":"user"}}
```

✅ **Token Marked as Used:**
```bash
curl -b cookies.txt "http://localhost:3010/api/admin/tokens?filter=used"
# Shows token with used_by_email populated
```

✅ **Cannot Reuse Token:**
```bash
curl -X POST http://localhost:3010/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"token":"xxx","email":"another@example.com","password":"Test1234"}'
# Response: {"error":"Registration token has already been used"}
```

✅ **User Role Change:**
```bash
curl -X PATCH -b cookies.txt http://localhost:3010/api/admin/users/2 \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'
# Response: {"user":{"id":2,"role":"admin",...}}
```

✅ **Delete User:**
```bash
curl -X DELETE -b cookies.txt http://localhost:3010/api/admin/users/2
# Response: {"success":true}
```

✅ **Cannot Delete Self:**
```bash
curl -X DELETE -b cookies.txt http://localhost:3010/api/admin/users/1
# Response: {"error":"Cannot delete your own account"}
```

✅ **Cannot Change Own Role:**
```bash
curl -X PATCH -b cookies.txt http://localhost:3010/api/admin/users/1 \
  -H "Content-Type: application/json" \
  -d '{"role":"user"}'
# Response: {"error":"Cannot change your own role"}
```

## Environment Variables

Added to `.env.production` and `.env.local`:
```bash
# Registration tokens
REGISTRATION_TOKEN_EXPIRY_DAYS=7                # Default token expiry
NEXT_PUBLIC_BASE_URL=http://localhost:3010     # Base URL for token URLs
```

## File Structure

### New Files Created (20)

**Database:**
- `db/migrations/001_add_registration_tokens.sql`
- `db/migrations/README.md`

**Types:**
- `src/types/registration.ts`

**Libraries:**
- `src/lib/tokens.ts`
- `src/lib/validation.ts`
- `src/lib/adminAuth.ts`

**API Routes:**
- `src/app/api/admin/users/route.ts` (GET)
- `src/app/api/admin/users/[id]/route.ts` (PATCH, DELETE)
- `src/app/api/admin/tokens/route.ts` (GET, POST)
- `src/app/api/admin/tokens/[id]/route.ts` (DELETE)
- `src/app/api/auth/validate-token/route.ts` (GET)
- `src/app/api/auth/register/route.ts` (POST)

**Pages:**
- `src/app/register/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/layout.tsx`

**Components:**
- `src/components/UserManagement.tsx`
- `src/components/TokenManagement.tsx`
- `src/components/ConfirmDialog.tsx`
- `src/components/CopyButton.tsx`

**Documentation:**
- `docs/increment-2.md` (this file)

### Files Modified (4)

- `src/lib/db.ts` - Added user CRUD functions
- `src/types/user.ts` - Added UserWithMeta type
- `src/app/dashboard/page.tsx` - Added admin panel link
- `nginx.conf` - Added public routes for registration

## Usage Guide

### For Admins: Onboarding New Users

1. **Login to Admin Panel:**
   - Navigate to http://localhost:3010/login
   - Login: `admin@anchoredtechnologies.net` / `changeme123`
   - Click "Admin Panel" button

2. **Generate Registration Token:**
   - Go to "Registration Tokens" tab
   - Set expiry days (default: 7)
   - Click "Generate Token"
   - Copy the registration URL using "Copy URL" button

3. **Share with New User:**
   - Send the registration URL to the new user
   - Example: `http://localhost:3010/register?token=8d7e4a7a-...`

4. **Monitor Token Usage:**
   - Check "Used" filter to see consumed tokens
   - View who used each token
   - Revoke unused tokens if needed

### For New Users: Registration

1. **Access Registration URL:**
   - Click the link provided by admin
   - Token validation happens automatically

2. **Create Account:**
   - Enter email address
   - Create password (min 8 chars, letter + number)
   - Confirm password
   - Click "Create Account"

3. **Login:**
   - Redirected to login page after successful registration
   - Login with created credentials
   - Access dashboard

### For Admins: Managing Users

1. **View All Users:**
   - Go to "Users" tab in admin panel
   - See email, role, created date

2. **Change User Role:**
   - Use dropdown to select Admin or User
   - Changes take effect immediately
   - Cannot change own role

3. **Delete User:**
   - Click "Delete" button
   - Confirm in dialog
   - Cannot delete self or last admin

## Migration Instructions

### Running the Migration

```bash
# Ensure containers are running
docker compose --env-file .env.production up -d

# Run migration
docker exec -i portal-postgres psql -U portal -d portal_db < db/migrations/001_add_registration_tokens.sql

# Verify table created
docker exec portal-postgres psql -U portal -d portal_db -c "\d registration_tokens"
```

### Rollback (if needed)

```sql
-- To rollback this migration
DROP TABLE IF EXISTS registration_tokens CASCADE;
```

## Known Limitations & Future Enhancements

### Current Limitations
- No email notification when token is generated
- No bulk token generation
- No token usage analytics
- No password reset functionality
- No user activity logs

### Planned Enhancements (Future Increments)

**Increment 2.5 (Optional):**
- Email token delivery (requires SMTP setup)
- Bulk token generation
- Token usage analytics dashboard
- Password reset flow

**Increment 3+:**
- User activity logs
- Advanced password complexity rules
- Session management (view/revoke active sessions)
- Audit logs for admin actions
- Two-factor authentication
- OAuth integration

## Lessons Learned

### 1. Next.js Dynamic Routes in App Router
- Route endpoints like `/api/auth/validate-token` that use `request.url` need proper dynamic rendering
- Build warnings about `Dynamic server usage` are informational, not errors
- API routes are correctly marked as dynamic (`ƒ`) in build output

### 2. UUID v4 for Tokens
- `randomUUID()` from Node's crypto module is perfect for secure tokens
- Much better than manually generating random strings
- Standard UUID format makes tokens recognizable

### 3. Admin Protection Patterns
- Multiple layers of protection (nginx + middleware + UI) provide defense in depth
- "Last admin" protection prevents orphaning the system
- Cannot delete/demote self prevents accidental lockout

### 4. Token Lifecycle Management
- Single-use tokens prevent abuse
- Expiration prevents old tokens from being valid indefinitely
- Tracking who used each token provides audit trail
- Keeping used tokens in database maintains history

### 5. Copy-to-Clipboard UX
- Providing both "Copy URL" and "Copy Token" buttons is helpful
- Visual feedback (button changes to "Copied!") confirms action
- 2-second timeout for feedback is appropriate

## Performance Considerations

### Database Queries
- Indexes on `token`, `created_by`, and `used` fields optimize common queries
- Filter queries use WHERE clauses efficiently
- JOIN queries for token list include user emails without N+1 queries

### Token Validation
- Single database query to validate token
- Early returns for invalid states
- No unnecessary data fetching

### Admin Panel
- Client-side tab switching (no page reloads)
- API calls only when needed (on mount, after actions)
- Loading states prevent duplicate requests

## Conclusion

Increment 2 successfully delivers a complete user management system with:
- ✅ Secure token-based user registration
- ✅ Comprehensive admin panel with dual-tab interface
- ✅ Full user CRUD operations with safety protections
- ✅ Token lifecycle management (generate, validate, use, revoke)
- ✅ Clean, intuitive UI with proper feedback
- ✅ Strong security controls and validations

The system is production-ready for onboarding users and provides a solid foundation for future service management features in Increment 3.
