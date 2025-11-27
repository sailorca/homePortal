// Delete registration token endpoint
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { deleteToken } from '@/lib/tokens';

/**
 * DELETE /api/admin/tokens/[id]
 * Delete an unused registration token
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check admin access
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const tokenId = parseInt(params.id);

    if (isNaN(tokenId)) {
      return NextResponse.json(
        { error: 'Invalid token ID' },
        { status: 400 }
      );
    }

    const deleted = await deleteToken(tokenId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Token not found or already used' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting token:', error);
    return NextResponse.json(
      { error: 'Failed to delete token' },
      { status: 500 }
    );
  }
}
