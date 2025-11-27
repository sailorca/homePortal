'use client';

import { useState, useEffect } from 'react';
import ConfirmDialog from './ConfirmDialog';
import type { UserWithMeta } from '@/types/user';

export default function UserManagement() {
  const [users, setUsers] = useState<UserWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; userId: number | null; email: string }>({
    open: false,
    userId: null,
    email: ''
  });
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  useEffect(() => {
    // Get current user
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setCurrentUserEmail(data.user?.email || ''));

    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users);
      } else {
        setError(data.error || 'Failed to load users');
      }
    } catch (error) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });

      if (res.ok) {
        loadUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update role');
      }
    } catch (error) {
      alert('Failed to update role');
    }
  };

  const handleDeleteClick = (user: UserWithMeta) => {
    setDeleteDialog({ open: true, userId: user.id, email: user.email });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.userId) return;

    try {
      const res = await fetch(`/api/admin/users/${deleteDialog.userId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        loadUsers();
        setDeleteDialog({ open: false, userId: null, email: '' });
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (error) {
      alert('Failed to delete user');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.email}
                  {user.email === currentUserEmail && (
                    <span className="ml-2 text-xs text-gray-500">(you)</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    disabled={user.email === currentUserEmail}
                    className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <button
                    onClick={() => handleDeleteClick(user)}
                    disabled={user.email === currentUserEmail}
                    className="text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed font-medium"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete User"
        message={`Are you sure you want to delete ${deleteDialog.email}? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialog({ open: false, userId: null, email: '' })}
      />
    </div>
  );
}
