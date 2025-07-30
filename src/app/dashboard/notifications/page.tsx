'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getNotifications, deleteNotification, createLogEntry, Notification } from '@/lib/firestore-service';
import { useAuth } from '@/lib/auth-context';
import { hasPermission } from '@/lib/rbac';
import { formatDistanceToNow } from 'date-fns';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { userData } = useAuth();
  const userRole = userData?.role || 'pending';

  const canCreate = hasPermission(userRole, 'create', 'notifications');
  const canDelete = hasPermission(userRole, 'delete', 'notifications');

  useEffect(() => {
    fetchNotifications();
  }, [userRole]);

  const fetchNotifications = async () => {
    if (!userRole || userRole === 'pending') return;
    
    setLoading(true);
    try {
      if (hasPermission(userRole, 'read', 'notifications')) {
        const data = await getNotifications();
        // Sort by time descending
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
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm('Are you sure you want to delete this notification?')) {
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
        fetchNotifications();
      } catch (error) {
        console.error('Error deleting notification:', error);
      }
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return formatDistanceToNow(date, { addSuffix: true });
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
          {notifications.length > 0 ? (
            notifications.map((notification) => (
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
    </div>
  );
}
