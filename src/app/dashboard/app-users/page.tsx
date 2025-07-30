'use client';
import { useEffect, useState } from 'react';
import { getAppUsers, updateAppUser, resetPassword } from '@/lib/firestore-service';
import { useAuth } from '@/lib/auth-context';
import { hasPermission } from '@/lib/rbac';
import LoadingSpinner from '@/components/LoadingSpinner';

interface AppUser {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  companyName: string;
  companyGSTNumber: string;
  displayName: string;
  isActive: boolean;
  emailVerified: boolean;
  isAuthenticated: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export default function AppUsersPage() {
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const { userData } = useAuth();
  const userRole = userData?.role || 'pending';

  // Remove handleResetPassword function

  useEffect(() => {
    const fetchAppUsers = async () => {
      setLoading(true);
      try {
        if (hasPermission(userRole, 'read', 'app_users')) {
          const appUsersList = await getAppUsers();
          setAppUsers(appUsersList);
        }
      } catch (error) {
        console.error('Error fetching app users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppUsers();
  }, [userRole]);

  const handleAuthenticationChange = async (userId: string, isAuthenticated: boolean) => {
    if (!hasPermission(userRole, 'update', 'app_users')) return;

    try {
      await updateAppUser(userId, { isAuthenticated });
      setAppUsers(appUsers.map(user => 
        user.id === userId ? { ...user, isAuthenticated } : user
      ));
    } catch (error) {
      console.error('Error updating user authentication status:', error);
    }
  };

  const formatDate = (dateValue: any) => {
  if (!dateValue) return 'N/A';

  // Handle Firestore timestamp objects (with seconds and nanoseconds)
  if (dateValue.seconds !== undefined && dateValue.nanoseconds !== undefined) {
    const date = new Date(dateValue.seconds * 1000 + dateValue.nanoseconds / 1000000);
    return date.toLocaleDateString();
  }

  // Handle string dates
  if (typeof dateValue === 'string') {
    return new Date(dateValue).toLocaleDateString();
  }

  return 'N/A';
};

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const filteredAppUsers = appUsers.filter(user => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.companyName?.toLowerCase().includes(searchLower)
    );
  });

  // Pagination logic
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentAppUsers = filteredAppUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredAppUsers.length / usersPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" message="Loading App Users..." />
        </div>
      );
    }

  if (!hasPermission(userRole, 'read', 'app_users')) {
    return (
      <div className="card mx-auto mt-8 p-6">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Access Denied</h1>
        <p>You don't have permission to view app users.</p>
      </div>
    );
  }

  return (
    <div className="card mx-auto mt-8 p-6">
      <h1 className="text-2xl font-bold mb-4">App Users</h1>
      
      <div className="mb-4">
        <label htmlFor="searchAppUsers" className="block text-sm font-medium text-gray-700 mb-1">
          Search App Users
        </label>
        <input
          id="searchAppUsers"
          type="text"
          placeholder="Search by name, email, or company..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="block w-1/2 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GST Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
              {hasPermission(userRole, 'update', 'app_users') && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Authentication</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentAppUsers.map(user => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.phoneNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.companyName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.companyGSTNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(user.createdAt)}
                </td>
                {hasPermission(userRole, 'update', 'app_users') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      className="form-select text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 form-input"
                      value={user.isAuthenticated ? 'true' : 'false'}
                      onChange={(e) => handleAuthenticationChange(user.id!, e.target.value === 'true')}
                    >
                      <option value="true">Authenticated</option>
                      <option value="false">Not Authenticated</option>
                    </select>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredAppUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No app users found.
          </div>
        )}
      </div>

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
                <span className="font-medium">{Math.min(indexOfLastUser, filteredAppUsers.length)}</span> of{' '}
                <span className="font-medium">{filteredAppUsers.length}</span> results
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
