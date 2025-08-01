'use client';

import { useEffect, useState } from 'react';
import { getProducts, getCategories, getUsers, getLogs, getNotifications, getWhatsNew, getInquiries, getAppUsers, LogEntry } from '@/lib/firestore-service';
import { useAuth } from '@/lib/auth-context';
import { hasPermission } from '@/lib/rbac';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  CubeIcon,
  TagIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  InboxIcon,
  UsersIcon,
  BellIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

export default function Dashboard() {
  const [productCount, setProductCount] = useState(0);
  const [categoryCount, setCategoryCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [whatsNewCount, setWhatsNewCount] = useState(0);
  const [inquiryCount, setInquiryCount] = useState(0);
  const [appUserCount, setAppUserCount] = useState(0);
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { user, userData, loading: authLoading } = useAuth();
  const { isOnline, wasOffline } = useNetworkStatus();

  const userRole = authLoading ? null : (userData?.role || 'user'); // Change from 'pending' to 'user'

  // Show offline message if no internet connection
  if (!isOnline) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="text-red-600 text-2xl mb-2">No Internet Connection</div>
          <div className="text-gray-500">Please check your internet connection and try again.</div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (authLoading || !userRole) return;
      
      setLoading(true);
      try {
        // Fetch data based on permissions
        if (hasPermission(userRole, 'read', 'products')) {
          const products = await getProducts();
          setProductCount(products.length);
        }
        
        if (hasPermission(userRole, 'read', 'categories')) {
          const categories = await getCategories();
          setCategoryCount(categories.length);
        }
        
        if (hasPermission(userRole, 'read', 'users')) {
          const users = await getUsers();
          setUserCount(users.length);
        }

        if (hasPermission(userRole, 'read', 'notifications')) {
          const notifications = await getNotifications();
          setNotificationCount(notifications.length);
        }

        if (hasPermission(userRole, 'read', 'whats_new')) {
          const whatsNew = await getWhatsNew();
          setWhatsNewCount(whatsNew.length);
        }

        if (hasPermission(userRole, 'read', 'inquiries')) {
          const inquiries = await getInquiries();
          setInquiryCount(inquiries.length);
        }

        if (hasPermission(userRole, 'read', 'app_users')) {
          const appUsers = await getAppUsers();
          setAppUserCount(appUsers.length);
        }
        
        if (hasPermission(userRole, 'read', 'logs')) {
          const logs = await getLogs(5, null);
          setRecentLogs(logs.logs);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userRole, authLoading]);

  // Show loading while auth is initializing OR during logout
  if (authLoading || !user) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" message="Loading Dashboard Data..." />
      </div>
    );
  }

  // Show loading while fetching dashboard data for authorized users
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" message="Loading Dashboard Data..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Product Stats */}
        {userRole && hasPermission(userRole, 'read', 'products') && (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                  <CubeIcon className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Products</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900 flex items-center">
                        {authLoading ? <LoadingSpinner size="sm" message="" /> : productCount}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6">
              <div className="text-sm">
                <Link href="/dashboard/products" className="font-medium text-primary-600 hover:text-primary-500">
                  View all products
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Category Stats */}
        {userRole && hasPermission(userRole, 'read', 'categories') && (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                  <TagIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Categories</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900 flex items-center">
                        {authLoading ? <LoadingSpinner size="sm" message="" /> : categoryCount}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6">
              <div className="text-sm">
                <Link href="/dashboard/categories" className="font-medium text-primary-600 hover:text-primary-500">
                  View all categories
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* User Stats */}
        {userRole && hasPermission(userRole, 'read', 'users') && (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
                  <UserGroupIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900 flex items-center">
                        {authLoading ? <LoadingSpinner size="sm" message="" /> : userCount}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6">
              <div className="text-sm">
                <Link href="/dashboard/users" className="font-medium text-primary-600 hover:text-primary-500">
                  View all users
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* App Users Stats */}
        {userRole && hasPermission(userRole, 'read', 'app_users') && (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-teal-100 rounded-md p-3">
                  <UsersIcon className="h-6 w-6 text-teal-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">App Users</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900 flex items-center">
                        {authLoading ? <LoadingSpinner size="sm" message="" /> : appUserCount}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6">
              <div className="text-sm">
                <Link href="/dashboard/app-users" className="font-medium text-primary-600 hover:text-primary-500">
                  View app users
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Logs Stats */}
        {/* {hasPermission(userRole, 'read', 'logs') && (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gray-100 rounded-md p-3">
                  <ClipboardDocumentListIcon className="h-6 w-6 text-gray-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Recent Logs</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900 flex items-center">
                        {authLoading ? <LoadingSpinner size="sm" message="" /> : recentLogs.length}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6">
              <div className="text-sm">
                <Link href="/dashboard/logs" className="font-medium text-primary-600 hover:text-primary-500">
                  View all logs
                </Link>
              </div>
            </div>
          </div>
        )} */}

        {/* Inquiries Stats */}
        {userRole && hasPermission(userRole, 'read', 'inquiries') && (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-orange-100 rounded-md p-3">
                  <InboxIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Inquiries</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900 flex items-center">
                        {authLoading ? <LoadingSpinner size="sm" message="" /> : inquiryCount}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6">
              <div className="text-sm">
                <Link href="/dashboard/inquiries" className="font-medium text-primary-600 hover:text-primary-500">
                  View all inquiries
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Stats */}
        {userRole && hasPermission(userRole, 'read', 'notifications') && (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                  <BellIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Notifications</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900 flex items-center">
                        {authLoading ? <LoadingSpinner size="sm" message="" /> : notificationCount}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6">
              <div className="text-sm">
                <Link href="/dashboard/notifications" className="font-medium text-primary-600 hover:text-primary-500">
                  View all notifications
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* What's New Stats */}
        {userRole && hasPermission(userRole, 'read', 'whats_new') && (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                  <SparklesIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">What's New</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900 flex items-center">
                        {authLoading ? <LoadingSpinner size="sm" message="" /> : whatsNewCount}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6">
              <div className="text-sm">
                <Link href="/dashboard/whats-new" className="font-medium text-primary-600 hover:text-primary-500">
                  View what's new
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {userRole && hasPermission(userRole, 'read', 'logs') && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {authLoading ? (
              <li className="px-4 py-4 sm:px-6 flex justify-center">
                <LoadingSpinner size="sm" message="Loading recent activity..." />
              </li>
            ) : recentLogs.length > 0 ? (
              recentLogs.map((log) => (
                <li key={log.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-primary-600 truncate">{log.action}</p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {log.timestamp && new Date(log.timestamp.seconds * 1000).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          User: {log.uid}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-4 py-4 sm:px-6 text-gray-500 text-sm">No recent activity</li>
            )}
          </ul>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <div className="text-sm">
              <Link href="/dashboard/logs" className="font-medium text-primary-600 hover:text-primary-500">
                View all logs
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
