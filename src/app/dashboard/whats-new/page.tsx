'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { getWhatsNew, deleteWhatsNew, createLogEntry, WhatsNew } from '@/lib/firestore-service';
import { useAuth } from '@/lib/auth-context';
import { hasPermission } from '@/lib/rbac';
import { formatDistanceToNow } from 'date-fns';
import LoadingSpinner from '@/components/LoadingSpinner';
import Image from 'next/image';
import { useToast } from '@/lib/toast-context';

export default function WhatsNewPage() {
  const [whatsNewItems, setWhatsNewItems] = useState<WhatsNew[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { userData } = useAuth();
  
  const userRole = useMemo(() => userData?.role || 'user', [userData?.role]);
  const canCreate = useMemo(() => hasPermission(userRole, 'create', 'whats_new'), [userRole]);
  const canDelete = useMemo(() => hasPermission(userRole, 'delete', 'whats_new'), [userRole]);

  const fetchWhatsNew = useCallback(async () => {
    if (!userRole) return;
    
    setLoading(true);
    try {
      if (hasPermission(userRole, 'read', 'whats_new')) {
        const data = await getWhatsNew();
        const sortedData = data.sort((a, b) => {
          if (!a.time || !b.time) return 0;
          return b.time.seconds - a.time.seconds;
        });
        setWhatsNewItems(sortedData);
      }
    } catch (error) {
      console.error('Error fetching whats new:', error);
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    fetchWhatsNew();
  }, [fetchWhatsNew]);

  const handleDelete = useCallback(async (id: string, name: string) => {
    const { showToast } = useToast();
    
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      await deleteWhatsNew(id);
      if (userData) {
        await createLogEntry({
          uid: userData.email,
          action: 'whats_new_deleted',
          details: { whatsNewId: id, whatsNewName: name }
        });
      }
      showToast('Item deleted successfully', 'success');
      await fetchWhatsNew();
    } catch (error) {
      console.error('Error deleting whats new item:', error);
      showToast('Failed to delete item. Please try again.', 'error');
    }
  }, [userData, fetchWhatsNew]);

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
  const totalPages = Math.ceil(whatsNewItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = whatsNewItems.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" message="Loading What's New..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">What's New</h1>
        {canCreate && (
          <Link href="/dashboard/whats-new/new" className="btn-primary">
            Create New Item
          </Link>
        )}
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {currentItems.length > 0 ? (
            currentItems.map((item) => (
              <li key={item.id}>
                <div className="px-4 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    {item.image && (
                      <div className="relative h-12 w-12 mr-4">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="rounded-lg object-cover"
                          sizes="48px"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.name}
                        </p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {formatDate(item.time)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex space-x-2">
                    <Link
                      href={`/dashboard/whats-new/view/${item.id}`}
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      View
                    </Link>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(item.id!, item.name)}
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
              No items found
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
                <span className="font-medium">{Math.min(endIndex, whatsNewItems.length)}</span> of{' '}
                <span className="font-medium">{whatsNewItems.length}</span> results
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
