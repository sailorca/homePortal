'use client';

import { useState, useEffect } from 'react';
import CopyButton from './CopyButton';
import ConfirmDialog from './ConfirmDialog';
import type { RegistrationTokenSafe } from '@/types/registration';

export default function TokenManagement() {
  const [tokens, setTokens] = useState<RegistrationTokenSafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'active' | 'used' | 'expired' | 'all'>('active');
  const [generating, setGenerating] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; tokenId: number | null }>({
    open: false,
    tokenId: null
  });
  const [expiryDays, setExpiryDays] = useState('7');

  useEffect(() => {
    loadTokens();
  }, [filter]);

  const loadTokens = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tokens?filter=${filter}`);
      const data = await res.json();
      if (res.ok) {
        setTokens(data.tokens);
      } else {
        setError(data.error || 'Failed to load tokens');
      }
    } catch (error) {
      setError('Failed to load tokens');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/admin/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresInDays: parseInt(expiryDays) })
      });

      if (res.ok) {
        loadTokens();
        setExpiryDays('7'); // Reset to default
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to generate token');
      }
    } catch (error) {
      setError('Failed to generate token');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteClick = (tokenId: number) => {
    setDeleteDialog({ open: true, tokenId });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.tokenId) return;

    try {
      const res = await fetch(`/api/admin/tokens/${deleteDialog.tokenId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        loadTokens();
        setDeleteDialog({ open: false, tokenId: null });
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete token');
      }
    } catch (error) {
      alert('Failed to delete token');
    }
  };

  const getStatusBadge = (token: RegistrationTokenSafe) => {
    if (token.used) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Used</span>;
    }
    if (new Date(token.expires_at) <= new Date()) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Expired</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Active</span>;
  };

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;

  return (
    <div>
      {/* Generate Token Form */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate New Token</h3>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expires in (days)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={expiryDays}
              onChange={(e) => setExpiryDays(e.target.value)}
              className="w-32 px-3 py-2 border border-gray-300 rounded-md text-gray-900"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-6 py-2 rounded transition-colors"
          >
            {generating ? 'Generating...' : 'Generate Token'}
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 flex gap-2">
        {(['active', 'used', 'expired', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Tokens Table */}
      {loading ? (
        <div className="text-center py-8">Loading tokens...</div>
      ) : tokens.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
          No {filter !== 'all' && filter} tokens found
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Token</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Used By</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tokens.map(token => (
                <tr key={token.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <code className="text-xs">{token.token.substring(0, 8)}...</code>
                      <CopyButton text={`${baseUrl}/register?token=${token.token}`} label="Copy URL" className="text-xs" />
                      <CopyButton text={token.token} label="Copy Token" className="text-xs" />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(token)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(token.expires_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {token.used_by_email || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    {!token.used && (
                      <button
                        onClick={() => handleDeleteClick(token.id)}
                        className="text-red-600 hover:text-red-900 font-medium"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={deleteDialog.open}
        title="Revoke Token"
        message="Are you sure you want to revoke this token? This action cannot be undone."
        confirmText="Revoke"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialog({ open: false, tokenId: null })}
      />
    </div>
  );
}
