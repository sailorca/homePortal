import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

/**
 * JWT Verification Endpoint for OpenResty auth_request
 *
 * This endpoint is called by OpenResty for every protected request.
 * Returns 200 with user headers if token is valid, 401 if invalid.
 */
export async function GET(request: NextRequest) {
  const authToken = request.cookies.get('auth_token')?.value;

  if (!authToken) {
    return new NextResponse(null, { status: 401 });
  }

  const payload = await verifyToken(authToken);

  if (!payload) {
    return new NextResponse(null, { status: 401 });
  }

  // Return 200 with user info headers for OpenResty to forward
  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-User-Id': payload.sub.toString(),
      'X-User-Email': payload.email,
      'X-User-Role': payload.role,
    },
  });
}
