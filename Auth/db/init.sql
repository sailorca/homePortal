-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);

-- Initial admin user (password: changeme123)
INSERT INTO users (email, password_hash, role)
VALUES ('admin@anchoredtechnologies.net', '$2b$10$CsWpGMsh9F/yLNZnzmCzwO4QPSUQ0jfnLLddpaqvZ9fEx8o9yJU1W', 'admin');
