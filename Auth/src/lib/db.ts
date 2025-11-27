import { Pool } from 'pg';
import type { User } from '@/types/user';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

export async function queryUser(email: string): Promise<User | null> {
  const pool = getPool();
  const result = await pool.query<User>(
    'SELECT id, email, password_hash, role, created_at, updated_at FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

export async function queryUserById(id: number): Promise<User | null> {
  const pool = getPool();
  const result = await pool.query<User>(
    'SELECT id, email, password_hash, role, created_at, updated_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Get all users (for admin panel)
 */
export async function getAllUsers(): Promise<User[]> {
  const pool = getPool();
  const result = await pool.query<User>(
    'SELECT id, email, password_hash, role, created_at, updated_at FROM users ORDER BY created_at DESC'
  );
  return result.rows;
}

/**
 * Delete a user by ID
 * @returns true if deleted, false if not found
 */
export async function deleteUser(id: number): Promise<boolean> {
  const pool = getPool();
  const result = await pool.query(
    'DELETE FROM users WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Update a user's role
 * @returns The updated user or null if not found
 */
export async function updateUserRole(id: number, role: string): Promise<User | null> {
  const pool = getPool();
  const result = await pool.query<User>(
    `UPDATE users
     SET role = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, email, password_hash, role, created_at, updated_at`,
    [role, id]
  );
  return result.rows[0] || null;
}

/**
 * Create a new user
 * @param email - User email
 * @param passwordHash - bcrypt hashed password
 * @param role - User role (default: 'user')
 * @returns The created user
 */
export async function createUser(
  email: string,
  passwordHash: string,
  role: string = 'user'
): Promise<User> {
  const pool = getPool();
  const result = await pool.query<User>(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, $3)
     RETURNING id, email, password_hash, role, created_at, updated_at`,
    [email, passwordHash, role]
  );
  return result.rows[0];
}

/**
 * Count the number of admin users
 * Used to prevent deleting or demoting the last admin
 */
export async function countAdmins(): Promise<number> {
  const pool = getPool();
  const result = await pool.query<{ count: string }>(
    "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
  );
  return parseInt(result.rows[0].count);
}
