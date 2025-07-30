'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getWhatsNew, WhatsNew } from '@/lib/firestore-service';
import { useAuth } from '@/lib/auth-context';
import { hasPermission } from '@/lib/rbac';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export default function ViewWhatsNewPage() {
  const { id } = useParams();
  const whatsNewId = Array.isArray(id) ? id[0] : id;
  const [whatsNewItem, setWhatsNewItem] = useState<WhatsNew | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { userData } = useAuth();
  const userRole = userData?.role || 'pending';

  useEffect(() => {
    const fetchWhatsNewItem = async () => {
      setLoading(true);
      try {
        if (hasPermission(userRole, 'read', 'whats_new')) {
          const whatsNewItems = await getWhatsNew();
          const foundItem = whatsNewItems.find(item => item.id === whatsNewId);
          if (foundItem) {
            setWhatsNewItem(foundItem);
          } else {
            router.push('/dashboard/whats-new');
          }
        }
      } catch (error) {
        console.error('Error fetching whats new item:', error);
        router.push('/dashboard/whats-new');
      } finally {
        setLoading(false);
      }
    };

    fetchWhatsNewItem();
  }, [whatsNewId, userRole, router]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading item...</div>
      </div>
    );
  }

  if (!whatsNewItem) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Item not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">What's New Details</h1>
          <Link
            href="/dashboard/whats-new"
            className="btn-secondary"
          >
            Back to What's New
          </Link>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <p className="text-lg font-medium text-gray-900">{whatsNewItem.name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Created
            </label>
            <p className="text-sm text-gray-600">{formatDate(whatsNewItem.time)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-900 whitespace-pre-wrap">{whatsNewItem.description}</p>
            </div>
          </div>

          {whatsNewItem.link && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link
              </label>
              <a
                href={whatsNewItem.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline break-all"
              >
                {whatsNewItem.link}
              </a>
            </div>
          )}

          {whatsNewItem.image && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image
              </label>
              <div className="mt-2">
                <img
                  src={whatsNewItem.image}
                  alt={whatsNewItem.name}
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
