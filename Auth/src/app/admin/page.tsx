'use client';

// Admin panel with user and token management
import { useState } from 'react';
import UserManagement from '@/components/UserManagement';
import TokenManagement from '@/components/TokenManagement';

type Tab = 'users' | 'tokens';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('users');

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Portal Management</h2>
        <p className="text-gray-600">Manage users and registration tokens</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('tokens')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'tokens'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Registration Tokens
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'tokens' && <TokenManagement />}
      </div>
    </div>
  );
}
