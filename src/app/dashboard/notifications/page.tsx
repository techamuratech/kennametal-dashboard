'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { getNotifications, deleteNotification, createLogEntry, Notification } from '@/lib/firestore-service';
import { useAuth } from '@/lib/auth-context';
import { hasPermission } from '@/lib/rbac';
import { formatDistanceToNow } from 'date-fns';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useToast } from '@/lib/toast-context';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { userData } = useAuth();
  const { showToast } = useToast();
  
  const userRole = useMemo(() => userData?.role || 'user', [userData?.role]);
  const canCreate = useMemo(() => hasPermission(userRole, 'create', 'notifications'), [userRole]);
  const canDelete = useMemo(() => hasPermission(userRole, 'delete', 'notifications'), [userRole]);

  const fetchNotifications = useCallback(async () => {
    if (!userRole) return;
    
    setLoading(true);
    try {
      if (hasPermission(userRole, 'read', 'notifications')) {
        const data = await getNotifications();
        // Sort by time descending (latest first)
        const sortedData = data.sort((a, b) => {
          if (!a.time || !b.time) return 0;
          return b.time.seconds - a.time.seconds;
        });
        setNotifications(sortedData);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) return;
    
    try {
      await deleteNotification(id);
      if (userData) {
        await createLogEntry({
          uid: userData.email,
          action: 'notification_deleted',
          details: {
            notificationId: id,
            notificationName: name,
          }
        });
      }
      showToast('Notification deleted successfully', 'success');
      await fetchNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
      showToast('Failed to delete notification. Please try again.', 'error');
    }
  }, [userData, fetchNotifications]);

  const formatDate = useCallback((timestamp: any) => {
    if (!timestamp) return 'Unknown';
    
    let date;
    if (timestamp.toDate) {
      // Firestore Timestamp object
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      // Timestamp with seconds property
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      // Already a Date object
      date = timestamp;
    } else {
      // Try to parse as string or number
      date = new Date(timestamp);
    }
    
    return formatDistanceToNow(date, { addSuffix: true });
  }, []);

  // Pagination calculations
  const totalPages = Math.ceil(notifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = notifications.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" message="Loading Notifications..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
        {canCreate && (
          <Link href="/dashboard/notifications/new" className="btn-primary">
            Create New Notification
          </Link>
        )}
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {currentItems.length > 0 ? (
            currentItems.map((notification) => (
              <li key={notification.id}>
                <div className="px-4 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    {notification.image && (
                      <img
                        className="h-12 w-12 rounded-lg object-cover mr-4"
                        src={notification.image}
                        alt={notification.name}
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-start">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {notification.name}
                        </p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {formatDate(notification.time)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {notification.description}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex space-x-2">
                    <Link
                      href={`/dashboard/notifications/view/${notification.id}`}
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      View
                    </Link>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(notification.id!, notification.name)}
                        className="text-red-600 hover:text-red-900 text-sm font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li className="px-4 py-8 text-center text-gray-500">
              No notifications found
            </li>
          )}
        </ul>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                <span className="font-medium">{Math.min(endIndex, notifications.length)}</span> of{' '}
                <span className="font-medium">{notifications.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      page === currentPage
                        ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
