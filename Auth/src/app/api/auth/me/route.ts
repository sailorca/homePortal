import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // OpenResty sets these headers after JWT verification
  const userId = request.headers.get('x-user-id');
  const userEmail = request.headers.get('x-user-email');
  const userRole = request.headers.get('x-user-role');

  // If headers are not present, user is not authenticated
  // (though OpenResty should have redirected to /login already)
  if (!userId || !userEmail || !userRole) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    user: {
      id: parseInt(userId),
      email: userEmail,
      role: userRole
    }
  });
}
