-- Migration: Add registration_tokens table
-- Created: 2025-11-27
-- Description: Adds table for one-time registration tokens used in user onboarding

CREATE TABLE registration_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    used_by INTEGER REFERENCES users(id),
    used_at TIMESTAMP,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_registration_tokens_token ON registration_tokens(token);
CREATE INDEX idx_registration_tokens_created_by ON registration_tokens(created_by);
CREATE INDEX idx_registration_tokens_used ON registration_tokens(used);

-- Comments for documentation
COMMENT ON TABLE registration_tokens IS 'One-time tokens for user registration';
COMMENT ON COLUMN registration_tokens.token IS 'UUID v4 token value';
COMMENT ON COLUMN registration_tokens.expires_at IS 'Token expiration timestamp';
COMMENT ON COLUMN registration_tokens.used IS 'Whether token has been used';
COMMENT ON COLUMN registration_tokens.used_by IS 'User ID who used the token';
COMMENT ON COLUMN registration_tokens.used_at IS 'Timestamp when token was used';
COMMENT ON COLUMN registration_tokens.created_by IS 'Admin user ID who created the token';
