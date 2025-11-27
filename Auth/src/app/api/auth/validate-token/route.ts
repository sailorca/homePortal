// Token validation endpoint (public)
import { NextRequest, NextResponse } from 'next/server';
import { getTokenByValue, isTokenValid } from '@/lib/tokens';
import type { TokenValidationResponse } from '@/types/registration';

/**
 * GET /api/auth/validate-token?token=xxx
 * Validate a registration token (public endpoint)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenValue = searchParams.get('token');

    if (!tokenValue) {
      const response: TokenValidationResponse = {
        valid: false,
        error: 'Token parameter is required'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Look up token
    const token = await getTokenByValue(tokenValue);

    if (!token) {
      const response: TokenValidationResponse = {
        valid: false,
        error: 'Invalid registration token'
      };
      return NextResponse.json(response, { status: 200 });
    }

    // Check if token is already used
    if (token.used) {
      const response: TokenValidationResponse = {
        valid: false,
        error: 'Registration token has already been used'
      };
      return NextResponse.json(response, { status: 200 });
    }

    // Check if token is expired
    if (new Date(token.expires_at) <= new Date()) {
      const response: TokenValidationResponse = {
        valid: false,
        error: 'Registration token has expired'
      };
      return NextResponse.json(response, { status: 200 });
    }

    // Token is valid
    const response: TokenValidationResponse = {
      valid: true
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error validating token:', error);
    const response: TokenValidationResponse = {
      valid: false,
      error: 'Failed to validate token'
    };
    return NextResponse.json(response, { status: 500 });
  }
}
