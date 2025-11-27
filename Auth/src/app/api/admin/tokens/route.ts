// Token management endpoints for admins
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getUserFromHeaders } from '@/lib/adminAuth';
import { createToken, listTokens } from '@/lib/tokens';
import type { CreateTokenRequest, CreateTokenResponse } from '@/types/registration';

/**
 * POST /api/admin/tokens
 * Generate a new registration token
 */
export async function POST(request: NextRequest) {
  // Check admin access
  const authError = requireAdmin(request);
  if (authError) return authError;

  const user = getUserFromHeaders(request);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  try {
    const body: CreateTokenRequest = await request.json();
    const expiresInDays = body.expiresInDays || parseInt(process.env.REGISTRATION_TOKEN_EXPIRY_DAYS || '7');

    // Validate expiry days
    if (expiresInDays < 1 || expiresInDays > 365) {
      return NextResponse.json(
        { error: 'Token expiry must be between 1 and 365 days' },
        { status: 400 }
      );
    }

    // Create token
    const token = await createToken(user.id, expiresInDays);

    // Build registration URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3010';
    const registrationUrl = `${baseUrl}/register?token=${token.token}`;

    const response: CreateTokenResponse = {
      token: token.token,
      expires_at: token.expires_at,
      registration_url: registrationUrl
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating token:', error);
    return NextResponse.json(
      { error: 'Failed to create token' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/tokens?filter=active|used|expired|all
 * List registration tokens
 */
export async function GET(request: NextRequest) {
  // Check admin access
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const filter = (searchParams.get('filter') as 'all' | 'active' | 'used' | 'expired') || 'active';

    // Validate filter
    if (!['all', 'active', 'used', 'expired'].includes(filter)) {
      return NextResponse.json(
        { error: 'Invalid filter. Must be: all, active, used, or expired' },
        { status: 400 }
      );
    }

    const tokens = await listTokens(filter);

    return NextResponse.json({ tokens }, { status: 200 });
  } catch (error) {
    console.error('Error listing tokens:', error);
    return NextResponse.json(
      { error: 'Failed to list tokens' },
      { status: 500 }
    );
  }
}
