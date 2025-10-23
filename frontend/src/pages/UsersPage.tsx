import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserList } from '../components/users/UserList';
import { UserForm } from '../components/users/UserForm';
import type { User } from '../types/user';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const isCompanyEmployee = currentUser?.role === 'company_employee';

  // Redirect if not authorized
  if (!isCompanyEmployee) {
    return (
      <div className="text-center py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md inline-block">
          You don't have permission to access user management.
        </div>
      </div>
    );
  }

  const handleCreateUser = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleSaveUser = () => {
    setShowForm(false);
    setEditingUser(null);
    // Trigger refresh of user list
    setRefreshKey(prev => prev + 1);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingUser(null);
  };

  return (
    <div className="space-y-6">
      {showForm ? (
        <UserForm
          user={editingUser}
          onSave={handleSaveUser}
          onCancel={handleCancel}
        />
      ) : (
        <UserList
          key={refreshKey}
          onCreateUser={handleCreateUser}
          onEditUser={handleEditUser}
        />
      )}
    </div>
  );
};