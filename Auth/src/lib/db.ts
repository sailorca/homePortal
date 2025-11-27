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
