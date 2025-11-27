-- JWT Authentication Script for OpenResty
-- This script validates JWS tokens and extracts user information

local jwt = require "resty.jwt"

-- Get JWT secret from environment variable
local jwt_secret = os.getenv("JWT_SECRET")

if not jwt_secret then
    ngx.log(ngx.ERR, "JWT_SECRET environment variable not set")
    return ngx.exit(ngx.HTTP_INTERNAL_SERVER_ERROR)
end

-- Extract auth_token cookie
local cookie_header = ngx.var.http_cookie
if not cookie_header then
    ngx.log(ngx.WARN, "No cookie header found, redirecting to login")
    return ngx.redirect("/login")
end

-- Parse cookies to find auth_token
local auth_token = nil
for cookie in string.gmatch(cookie_header, "[^;]+") do
    local name, value = string.match(cookie, "^%s*(.-)%s*=%s*(.-)%s*$")
    if name == "auth_token" then
        auth_token = value
        break
    end
end

if not auth_token then
    ngx.log(ngx.WARN, "auth_token cookie not found, redirecting to login")
    return ngx.redirect("/login")
end

-- Verify JWT (JWS with HS256)
local jwt_obj = jwt:verify(jwt_secret, auth_token)

if not jwt_obj.verified then
    ngx.log(ngx.WARN, "JWT verification failed: ", jwt_obj.reason, ", redirecting to login")
    return ngx.redirect("/login")
end

-- Extract payload
local payload = jwt_obj.payload

if not payload then
    ngx.log(ngx.ERR, "JWT payload is empty")
    return ngx.redirect("/login")
end

-- Check expiration
local now = ngx.time()
if payload.exp and tonumber(payload.exp) < now then
    ngx.log(ngx.WARN, "JWT token expired, redirecting to login")
    return ngx.redirect("/login")
end

-- Set user info headers for Next.js
if payload.sub then
    ngx.req.set_header("X-User-Id", tostring(payload.sub))
end

if payload.email then
    ngx.req.set_header("X-User-Email", payload.email)
end

if payload.role then
    ngx.req.set_header("X-User-Role", payload.role)
end

-- Allow request to proceed to Next.js with user headers
