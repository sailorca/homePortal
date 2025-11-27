// User update and delete endpoints
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getUserFromHeaders } from '@/lib/adminAuth';
import { deleteUser, updateUserRole, countAdmins, queryUserById } from '@/lib/db';
import type { UpdateUserRequest, UserWithMeta } from '@/types/user';

/**
 * PATCH /api/admin/users/[id]
 * Update user role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check admin access
  const authError = requireAdmin(request);
  if (authError) return authError;

  const currentUser = getUserFromHeaders(request);
  if (!currentUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  try {
    const userId = parseInt(params.id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Prevent changing own role
    if (userId === currentUser.id) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 403 }
      );
    }

    const body: UpdateUserRequest = await request.json();
    const { role } = body;

    if (!role || !['admin', 'user'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "admin" or "user"' },
        { status: 400 }
      );
    }

    // Get target user
    const targetUser = await queryUserById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If changing admin to user, check if this is the last admin
    if (targetUser.role === 'admin' && role === 'user') {
      const adminCount = await countAdmins();
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot change the last admin to user' },
          { status: 403 }
        );
      }
    }

    // Update role
    const updatedUser = await updateUserRole(userId, role);
    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    // Return UserWithMeta (exclude password_hash)
    const user: UserWithMeta = {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at
    };

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Delete a user
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check admin access
  const authError = requireAdmin(request);
  if (authError) return authError;

  const currentUser = getUserFromHeaders(request);
  if (!currentUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  try {
    const userId = parseInt(params.id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Prevent deleting self
    if (userId === currentUser.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 403 }
      );
    }

    // Get target user
    const targetUser = await queryUserById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If deleting an admin, check if this is the last admin
    if (targetUser.role === 'admin') {
      const adminCount = await countAdmins();
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last admin user' },
          { status: 403 }
        );
      }
    }

    // Delete user
    const deleted = await deleteUser(userId);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
