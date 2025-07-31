'use client';

import { useEffect, useState } from 'react';
import { getInquiries, getAppUsers, markInquiryAsRead, Inquiry, AppUser, InquirySubmission } from '@/lib/firestore-service';
import { useAuth } from '@/lib/auth-context';
import { hasPermission } from '@/lib/rbac';
import LoadingSpinner from '@/components/LoadingSpinner';

interface InquiryWithUser extends Inquiry {
  user?: AppUser;
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<InquiryWithUser[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [inquiriesPerPage] = useState(10);

  const { userData } = useAuth();
  const userRole = userData?.role || 'pending';

  useEffect(() => {
    fetchInquiries();
  }, [userRole]); // Add userRole as dependency

  const fetchInquiries = async () => {
    if (!userRole || userRole === 'pending') return; // Add early return
    
    setLoading(true);
    try {
      if (hasPermission(userRole, 'read', 'inquiries')) {
        const [inquiriesData, appUsersData] = await Promise.all([
          getInquiries(),
          getAppUsers()
        ]);

        // Create a map of app users for quick lookup
        const usersMap = new Map(appUsersData.map(user => [user.id!, user]));

        // Combine inquiries with user data
        const inquiriesWithUsers = inquiriesData.map(inquiry => ({
          ...inquiry,
          user: usersMap.get(inquiry.user_id)
        }));

        // Sort by creation date descending (newest first)
        const sortedInquiries = inquiriesWithUsers.sort((a, b) => {
          const aTime = new Date(a.created_at).getTime();
          const bTime = new Date(b.created_at).getTime();
          return bTime - aTime;
        });

        setInquiries(sortedInquiries);
      }
    } catch (error) {
      console.error('Error fetching inquiries:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRowExpansion = async (inquiryId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(inquiryId)) {
      newExpandedRows.delete(inquiryId);
    } else {
      newExpandedRows.add(inquiryId);
      
      // Mark inquiry as read when expanding details
      try {
        await markInquiryAsRead(inquiryId);
        // Update local state to reflect read status
        setInquiries(prevInquiries => 
          prevInquiries.map(inquiry => 
            inquiry.id === inquiryId 
              ? { ...inquiry, isRead: true, readAt: new Date().toISOString() }
              : inquiry
          )
        );
      } catch (error) {
        console.error('Error marking inquiry as read:', error);
      }
    }
    setExpandedRows(newExpandedRows);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const filteredInquiries = inquiries.filter(inquiry => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      inquiry.user?.displayName?.toLowerCase().includes(searchLower) ||
      inquiry.user?.email?.toLowerCase().includes(searchLower) ||
      inquiry.user?.companyName?.toLowerCase().includes(searchLower) ||
      inquiry.user?.phoneNumber?.toLowerCase().includes(searchLower)
    );
  });

  // Pagination logic
  const indexOfLastInquiry = currentPage * inquiriesPerPage;
  const indexOfFirstInquiry = indexOfLastInquiry - inquiriesPerPage;
  const currentInquiries = filteredInquiries.slice(indexOfFirstInquiry, indexOfLastInquiry);
  const totalPages = Math.ceil(filteredInquiries.length / inquiriesPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" message="Loading Inquiries..." />
        </div>
      );
    }

  if (!hasPermission(userRole, 'read', 'inquiries')) {
    return (
      <div className="card mx-auto mt-8 p-6">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Access Denied</h1>
        <p>You don't have permission to view inquiries.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Inquiries</h1>
      
      <div className="mb-4">
        <label htmlFor="searchInquiries" className="block text-sm font-medium text-gray-700 mb-1">
          Search Inquiries
        </label>
        <input
          id="searchInquiries"
          type="text"
          placeholder="Search by user name, email, company, or phone..."
          value={searchTerm}
          onChange={handleSearchChange}
          maxLength={150}
          className="block w-1/2 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full shadow-xl rounded-lg overflow-hidden bg-white">
          <thead className="bg-[#3785C7]">
            <tr>
              <th className="py-3 px-6 text-left text-sm font-semibold text-white uppercase tracking-wider border-r-2">User Info</th>
              <th className="py-3 px-6 text-left text-sm font-semibold text-white uppercase tracking-wider border-r-white border-r-2">Company</th>
              <th className="py-3 px-6 text-left text-sm font-semibold text-white uppercase tracking-wider border-r-white border-r-2">Created At</th>
              <th className="py-3 px-6 text-left text-sm font-semibold text-white uppercase tracking-wider border-r-white border-r-2">Inquiries</th>
              <th className="py-3 px-6 text-left text-sm font-semibold text-white uppercase tracking-wider border-r-white border-r-2">Cart Items</th>
              <th className="py-3 px-6 text-left text-sm font-semibold text-white uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentInquiries.length > 0 ? (
              currentInquiries.map((inquiry) => {
                const isUnread = !inquiry.isRead; // Check once and reuse
                return (
                <>
                  <tr key={inquiry.id} className={`hover:bg-gray-50 ${isUnread ? 'bg-blue-50' : ''}`}>
                    <td className="py-4 px-6 border-r-2">
                      <div className="flex items-center">
                        {isUnread && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 flex-shrink-0"></div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {inquiry.user ? inquiry.user.displayName : 'Unknown User'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {inquiry.user?.email || 'No email'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {inquiry.user?.phoneNumber || 'No phone'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 border-r-2">
                      <div className="text-sm text-gray-900">
                        {inquiry.user?.companyName || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        GST: {inquiry.user?.companyGSTNumber || 'N/A'}
                      </div>
                    </td>
                    <td className="py-4 px-6 border-r-2 text-sm text-gray-900">
                      {formatDate(inquiry.created_at)}
                    </td>
                    <td className="py-4 px-6 border-r-2">
                      <div className="text-sm text-gray-900">
                        {inquiry.inquiry?.length || 0} submissions ({inquiry.inquiry?.reduce((total, submission) => total + (submission.items?.length || 0), 0) || 0} items)
                      </div>
                    </td>
                    <td className="py-4 px-6 border-r-2">
                      <div className="text-sm text-gray-900">
                        {inquiry.cart_items?.length || 0} items
                      </div>
                      {inquiry.cart_items && inquiry.cart_items.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {inquiry.cart_items.slice(0, 2).map(item => `${item.product_name} (${item.quantity})`).join(', ')}
                          {inquiry.cart_items.length > 2 && '...'}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => toggleRowExpansion(inquiry.id!)}
                        className={`text-sm font-medium ${
                          isUnread 
                            ? 'text-blue-600 hover:text-blue-900 font-semibold' 
                            : 'text-blue-600 hover:text-blue-900'
                        }`}
                      >
                        {expandedRows.has(inquiry.id!) ? 'Hide Details' : 'View Details'}
                      </button>
                    </td>
                  </tr>
                  {expandedRows.has(inquiry.id!) && (
                    <tr>
                      <td colSpan={6} className="py-4 px-6 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Inquiry Submissions */}
                          {inquiry.inquiry && inquiry.inquiry.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">Product Inquiry Submissions</h4>
                              <div className="space-y-4">
                                {inquiry.inquiry.map((submission, submissionIndex) => (
                                  <div key={submissionIndex} className="bg-white p-4 rounded border">
                                    <div className="flex justify-between items-center mb-3">
                                      <h5 className="font-medium text-gray-900">
                                        Submission {submissionIndex + 1}
                                      </h5>
                                      <div className="text-xs text-gray-400">
                                        {formatDate(submission.submitted_at)}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      {(submission.items || []).map((item, itemIndex) => (
                                        <div key={itemIndex} className="bg-gray-50 p-2 rounded">
                                          <div className="font-medium text-gray-900">{item.product_name || 'Unknown Product'}</div>
                                          <div className="text-sm text-gray-500">
                                            ID: {item.product_id || 'N/A'} | Quantity: {item.quantity || 1}
                                          </div>
                                          <div className="text-xs text-gray-400">
                                            Added: {item.timestamp ? formatDate(item.timestamp) : 'N/A'}
                                          </div>
                                        </div>
                                      ))}
                                      {(!submission.items || submission.items.length === 0) && (
                                        <div className="text-sm text-gray-500 italic">No items in this submission</div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Cart Items */}
                          {inquiry.cart_items && inquiry.cart_items.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">Cart Items</h4>
                              <div className="space-y-2">
                                {inquiry.cart_items.map((item, index) => (
                                  <div key={index} className="bg-white p-3 rounded border">
                                    <div className="font-medium text-gray-900">{item.product_name}</div>
                                    <div className="text-sm text-gray-500">
                                      ID: {item.product_id} | Quantity: {item.quantity}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      {formatDate(item.timestamp)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )})
            ) : (
              <tr>
                <td colSpan={6} className="py-4 px-6 text-center text-gray-500">
                  No inquiries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
                Showing <span className="font-medium">{indexOfFirstInquiry + 1}</span> to{' '}
                <span className="font-medium">{Math.min(indexOfLastInquiry, filteredInquiries.length)}</span> of{' '}
                <span className="font-medium">{filteredInquiries.length}</span> results
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
