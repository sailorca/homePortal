// User management endpoints for admins
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getAllUsers } from '@/lib/db';
import type { UserWithMeta } from '@/types/user';

/**
 * GET /api/admin/users
 * List all users
 */
export async function GET(request: NextRequest) {
  // Check admin access
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const usersData = await getAllUsers();

    // Convert to UserWithMeta (exclude password_hash)
    const users: UserWithMeta[] = usersData.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at
    }));

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error('Error listing users:', error);
    return NextResponse.json(
      { error: 'Failed to list users' },
      { status: 500 }
    );
  }
}
