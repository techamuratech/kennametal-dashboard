'use client';
import { useEffect, useState } from 'react';
import { getAppUsers, updateAppUser } from '@/lib/firestore-service';
import { useAuth } from '@/lib/auth-context';
import { hasPermission } from '@/lib/rbac';
import LoadingSpinner from '@/components/LoadingSpinner';

interface AppUser {
  id: string;
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
  const [loading, setLoading] = useState(true);
  const { userData } = useAuth();
  const userRole = userData?.role || 'pending';

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
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GST Number</th>
              {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th> */}
              {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email Verified</th> */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
              {hasPermission(userRole, 'update', 'app_users') && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Authentication</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {appUsers.map(user => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  {/* <div className="text-sm font-medium text-gray-900">{user.displayName}</div> */}
                  {/* {console.log("user",user)} */}
                  <div className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.phoneNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.companyName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.companyGSTNumber}</td>
                {/* <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td> */}
                {/* <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.emailVerified 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {user.emailVerified ? 'Verified' : 'Unverified  '}
                  </span>
                </td> */}
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
        {appUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No app users found.
          </div>
        )}
      </div>
    </div>
  );
}