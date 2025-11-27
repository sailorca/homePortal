// Registration token management
import { randomUUID } from 'crypto';
import { getPool } from './db';
import type { RegistrationToken, RegistrationTokenSafe } from '@/types/registration';

/**
 * Create a new registration token
 * @param createdBy - User ID of the admin creating the token
 * @param expiresInDays - Number of days until token expires (default: 7)
 * @returns The created token
 */
export async function createToken(
  createdBy: number,
  expiresInDays: number = 7
): Promise<RegistrationToken> {
  const pool = getPool();
  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const result = await pool.query<RegistrationToken>(
    `INSERT INTO registration_tokens (token, expires_at, created_by)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [token, expiresAt, createdBy]
  );

  return result.rows[0];
}

/**
 * Get a token by its value
 * @param token - The token string (UUID)
 * @returns The token or null if not found
 */
export async function getTokenByValue(token: string): Promise<RegistrationToken | null> {
  const pool = getPool();
  const result = await pool.query<RegistrationToken>(
    'SELECT * FROM registration_tokens WHERE token = $1',
    [token]
  );
  return result.rows[0] || null;
}

/**
 * Mark a token as used
 * @param token - The token string (UUID)
 * @param usedBy - User ID who used the token
 */
export async function markTokenAsUsed(token: string, usedBy: number): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE registration_tokens
     SET used = true, used_by = $1, used_at = NOW()
     WHERE token = $2`,
    [usedBy, token]
  );
}

/**
 * List tokens with optional filtering
 * @param filter - Filter type: 'all', 'active', 'used', or 'expired'
 * @returns Array of tokens with user email information
 */
export async function listTokens(
  filter: 'all' | 'active' | 'used' | 'expired' = 'active'
): Promise<RegistrationTokenSafe[]> {
  const pool = getPool();

  let whereClause = '';
  switch (filter) {
    case 'active':
      whereClause = 'WHERE rt.used = false AND rt.expires_at > NOW()';
      break;
    case 'used':
      whereClause = 'WHERE rt.used = true';
      break;
    case 'expired':
      whereClause = 'WHERE rt.used = false AND rt.expires_at <= NOW()';
      break;
    // 'all' has no filter
  }

  const result = await pool.query<RegistrationTokenSafe>(
    `SELECT
       rt.id, rt.token, rt.expires_at, rt.used, rt.used_at, rt.created_at,
       u_created.email as created_by_email,
       u_used.email as used_by_email
     FROM registration_tokens rt
     LEFT JOIN users u_created ON rt.created_by = u_created.id
     LEFT JOIN users u_used ON rt.used_by = u_used.id
     ${whereClause}
     ORDER BY rt.created_at DESC`
  );

  return result.rows;
}

/**
 * Delete an unused token
 * @param id - Token ID
 * @returns true if deleted, false if not found or already used
 */
export async function deleteToken(id: number): Promise<boolean> {
  const pool = getPool();
  const result = await pool.query(
    'DELETE FROM registration_tokens WHERE id = $1 AND used = false RETURNING id',
    [id]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Check if a token is valid (not used and not expired)
 * @param token - The token object
 * @returns true if valid, false otherwise
 */
export function isTokenValid(token: RegistrationToken): boolean {
  return !token.used && new Date(token.expires_at) > new Date();
}
