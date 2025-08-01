'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getNotifications, Notification } from '@/lib/firestore-service';
import { useAuth } from '@/lib/auth-context';
import { hasPermission } from '@/lib/rbac';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export default function ViewNotificationPage() {
  const { id } = useParams();
  const notificationId = Array.isArray(id) ? id[0] : id;
  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { userData } = useAuth();
  const userRole = userData?.role || 'pending';

  useEffect(() => {
    const fetchNotification = async () => {
      setLoading(true);
      try {
        if (hasPermission(userRole, 'read', 'notifications')) {
          const notifications = await getNotifications();
          const foundNotification = notifications.find(n => n.id === notificationId);
          if (foundNotification) {
            setNotification(foundNotification);
          } else {
            router.push('/dashboard/notifications');
          }
        }
      } catch (error) {
        console.error('Error fetching notification:', error);
        router.push('/dashboard/notifications');
      } finally {
        setLoading(false);
      }
    };

    fetchNotification();
  }, [notificationId, userRole, router]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading notification...</div>
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Notification not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Notification Details</h1>
          <Link
            href="/dashboard/notifications"
            className="btn-secondary"
          >
            Back to Notifications
          </Link>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notification Title
            </label>
            <p className="text-lg font-medium text-gray-900">
              {typeof notification.name === 'object' && notification.name !== null
                ? JSON.stringify(notification.name)
                : String(notification.name || 'Untitled')
              }
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Created
            </label>
            <p className="text-sm text-gray-600">{formatDate(notification.time)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-900 whitespace-pre-wrap">
                {typeof notification.description === 'object' && notification.description !== null
                  ? JSON.stringify(notification.description, null, 2)
                  : String(notification.description || 'No description available')
                }
              </p>
            </div>
          </div>

          {notification.link && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link
              </label>
              <a
                href={notification.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline break-all"
              >
                {notification.link}
              </a>
            </div>
          )}

          {notification.image && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notification Image
              </label>
              <div className="mt-2">
                <img
                  src={notification.image}
                  alt={notification.name}
                  className="max-w-md h-auto rounded-lg border shadow-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
