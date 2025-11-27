import * as jose from 'jose';
import type { TokenPayload } from '@/types/user';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

/**
 * Generate a signed JWT (JWS) token with HS256 algorithm
 * Note: Using JWS instead of JWE for first increment because lua-resty-jwt
 * only supports JWS out of the box. Migration to JWE planned for increment 1.5.
 */
export async function generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<string> {
  const jwt = await new jose.SignJWT({
    sub: payload.sub.toString(),  // Convert number to string for JWT standard
    email: payload.email,
    role: payload.role
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);

  return jwt;
}

/**
 * Verify and decode a signed JWT (JWS) token
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, secret);

    // Extract and validate required fields
    if (!payload.sub || !payload.email || !payload.role) {
      return null;
    }

    return {
      sub: parseInt(payload.sub as string),  // Convert string back to number
      email: payload.email as string,
      role: payload.role as string,
      iat: payload.iat as number,
      exp: payload.exp as number
    };
  } catch (error) {
    return null;
  }
}
