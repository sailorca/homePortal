// Admin authentication middleware for API routes
import { NextRequest, NextResponse } from 'next/server';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: string;
}

/**
 * Middleware to check if user is an admin
 * Uses X-User-Role header set by nginx auth_request
 * @param request - Next.js request object
 * @returns NextResponse with error if not admin, null if admin
 */
export function requireAdmin(request: NextRequest): NextResponse | null {
  const userRole = request.headers.get('x-user-role');
  const userId = request.headers.get('x-user-id');

  if (!userId || !userRole) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  if (userRole !== 'admin') {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  return null; // No error, proceed
}

/**
 * Extract user information from nginx headers
 * @param request - Next.js request object
 * @returns User object or null if not authenticated
 */
export function getUserFromHeaders(request: NextRequest): AuthenticatedUser | null {
  const userId = request.headers.get('x-user-id');
  const userEmail = request.headers.get('x-user-email');
  const userRole = request.headers.get('x-user-role');

  if (!userId || !userEmail || !userRole) {
    return null;
  }

  return {
    id: parseInt(userId),
    email: userEmail,
    role: userRole
  };
}
