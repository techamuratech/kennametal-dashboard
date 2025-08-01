'use client';
import { useEffect, useState } from 'react';
import { getUsers, updateUser, resetPassword, createLogEntry, User } from '@/lib/firestore-service';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import { hasPermission } from '@/lib/rbac';
import LoadingSpinner from '@/components/LoadingSpinner';
import { db } from '@/lib/firebase';
import { useToast } from '@/lib/toast-context';

export default function UsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const { userData, refreshUserData } = useAuth();
  const userRole = userData?.role || 'pending';

  const [showAddUser, setShowAddUser] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        if (hasPermission(userRole, 'read', 'users')) {
          const usersList = await getUsers();
          setUsers(usersList);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [userRole]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userRole !== 'master') return;

    try {
      await updateUser(userId, { role: newRole as 'master' | 'admin' | 'user' | 'pending' });
      setUsers(users.map(user => user.id === userId ? { ...user, role: newRole as 'master' | 'admin' | 'user' | 'pending' } : user));
      
      // Log the role change
      if (userData) {
        const user = users.find(u => u.id === userId);
        await createLogEntry({
          uid: userData.email,
          action: 'user_role_changed',
          details: {
            userId: userId,
            userEmail: user?.email || 'Unknown',
            oldRole: user?.role || 'unknown',
            newRole: newRole,
            changedBy: userData.email
          }
        });
      }
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    if (userRole !== 'master') return;

    try {
      const user = users.find(u => u.id === userId);
      await updateUser(userId, { status: newStatus as 'active' | 'disabled' });
      setUsers(users.map(user => user.id === userId ? { ...user, status: newStatus as 'active' | 'disabled' } : user));
      
      // Log the status change
      if (userData && user) {
        await createLogEntry({
          uid: userData.email,
          action: 'user_status_changed',
          details: {
            userId: userId,
            userEmail: user.email,
            oldStatus: user.status || 'active',
            newStatus: newStatus,
            changedBy: userData.email
          }
        });
      }
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const filteredUsers = users.filter(user => 
    searchTerm ? user.email.toLowerCase().includes(searchTerm.toLowerCase()) : true
  );

  // Pagination logic
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'master') return;

    // Validate passwords
    if (newUserPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (newUserPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setPasswordError('');
    setIsAddingUser(true);

    try {
      // Check if email already exists
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', newUserEmail));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setPasswordError('User with this email already exists');
        return;
      }

      // Hash password before storing
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(newUserPassword, 10);
      
      // Create user document directly in Firestore
      await addDoc(collection(db, 'users'), {
        email: newUserEmail,
        role: newUserRole,
        status: 'active',
        hashedPassword,
        name: null,
        phone: null,
        createdAt: serverTimestamp()
      });
      
      // Reset form and refresh list
      setNewUserEmail('');
      setNewUserRole('user');
      setNewUserPassword('');
      setConfirmPassword('');
      setShowAddUser(false);
      
      const usersList = await getUsers();
      setUsers(usersList);
      
      // Log the user creation
      if (userData) {
        await createLogEntry({
          uid: userData.email,
          action: 'user_created',
          details: {
            userEmail: newUserEmail,
            userRole: newUserRole
          }
        });
      }
      
      showToast('User created successfully', 'success');
    } catch (error) {
      console.error('Error adding user:', error);
      setPasswordError('Failed to create user. Please try again.');
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (userRole !== 'master') return;

    // Validate passwords
    if (newPassword !== confirmNewPassword) {
      setResetPasswordError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setResetPasswordError('Password must be at least 6 characters');
      return;
    }

    if (!window.confirm('Are you sure you want to reset this user\'s password?')) {
      return;
    }

    try {
      // Hash new password
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update user with new hashed password
      await updateUser(userId, { 
        hashedPassword,
        password: newPassword // Store plain text for master view
      });
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, hashedPassword, password: newPassword }
          : user
      ));
      
      // Reset form
      setShowResetPassword(null);
      setNewPassword('');
      setConfirmNewPassword('');
      setResetPasswordError('');
      
      // Log the password reset
      if (userData) {
        const user = users.find(u => u.id === userId);
        await createLogEntry({
          uid: userData.email,
          action: 'user_password_reset',
          details: {
            userId: userId,
            userEmail: user?.email || 'Unknown',
            resetBy: userData.email
          }
        });
      }
      
      showToast('Password updated successfully', 'success');
    } catch (error) {
      console.error('Error updating password:', error);
      setResetPasswordError('Failed to update password. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" message="Loading Users..." />
      </div>
    );
  }

  return (
    <div className="card mx-auto mt-8 p-6">
      <h1 className="text-2xl font-bold mb-4">Users</h1>
      
      <div className="mb-4">
        <label htmlFor="searchUsers" className="block text-sm font-medium text-gray-700 mb-1">
          Search Users
        </label>
        <input
          id="searchUsers"
          type="text"
          placeholder="Search by email..."
          value={searchTerm}
          onChange={handleSearchChange}
          maxLength={150}
          className="block w-1/2 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        />
      </div>

      {userRole === 'master' && (
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setShowAddUser(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            Add New User
          </button>
          <button
            onClick={async () => {
              setLoading(true);
              try {
                const usersList = await getUsers();
                setUsers(usersList);
              } catch (error) {
                console.error('Error refreshing users:', error);
              } finally {
                setLoading(false);
              }
            }}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            Refresh List
          </button>
        </div>
      )}

      {showAddUser && (
        <div className="mb-6 p-4 bg-gray-50 rounded-md">
          <h3 className="text-lg font-medium mb-4">Add New User</h3>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                required
                maxLength={50}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                required
                minLength={6}
                maxLength={50}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                maxLength={50}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            {passwordError && (
              <div className="text-red-600 text-sm">{passwordError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="master">Master</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isAddingUser}
                className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingUser ? 'Adding User...' : 'Add User'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddUser(false);
                  setPasswordError('');
                  setNewUserEmail('');
                  setNewUserPassword('');
                  setConfirmPassword('');
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showResetPassword && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-md border border-yellow-200">
          <h3 className="text-lg font-medium mb-4">Reset User Password</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                maxLength={50}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                minLength={6}
                maxLength={50}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            {resetPasswordError && (
              <div className="text-red-600 text-sm">{resetPasswordError}</div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => handleResetPassword(showResetPassword)}
                className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700"
              >
                Update Password
              </button>
              <button
                onClick={() => {
                  setShowResetPassword(null);
                  setNewPassword('');
                  setConfirmNewPassword('');
                  setResetPasswordError('');
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            {/* {userRole === 'master' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Password</th>} */}
            {userRole === 'master' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {currentUsers.map(user => (
            <tr key={user.id} className={user.status === 'disabled' ? 'bg-red-50' : ''}>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={user.status === 'disabled' ? 'line-through text-red-500' : ''}>
                  {user.email}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap uppercase">
                <span className={user.status === 'disabled' ? 'line-through text-red-500' : ''}>
                  {user.role == 'pending' ? 'Approval Pending': user.role }
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`capitalize px-2 py-1 text-xs font-semibold rounded-full ${
                  user.status !== 'disabled' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {user.status || 'active'}
                </span>
              </td>
              {/* {userRole === 'master' && (
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-600">
                    {user.password || '••••••••'}
                  </span>
                </td>
              )} */}
              {userRole === 'master' && (
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex gap-2">
                    <select
                      className="form-input text-sm"
                      value={user.status || 'active'}
                      onChange={(e) => user.id && handleStatusChange(user.id, e.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="disabled">Inactive</option>
                    </select>
                    <select
                      className="form-input text-sm"
                      value={user.role}
                      onChange={(e) => user.id && handleRoleChange(user.id, e.target.value)}
                    >
                      <option value="master">Master</option>
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                      <option value="pending">Approval Pending</option>
                    </select>
                    <button
                      onClick={() => user.id && setShowResetPassword(user.id)}
                      className="text-sm bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
                    >
                      Reset Password
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {filteredUsers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No users found.
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{indexOfFirstUser + 1}</span> to{' '}
                <span className="font-medium">{Math.min(indexOfLastUser, filteredUsers.length)}</span> of{' '}
                <span className="font-medium">{filteredUsers.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                  <button
                    key={number}
                    onClick={() => paginate(number)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentPage === number
                        ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {number}
                  </button>
                ))}
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
