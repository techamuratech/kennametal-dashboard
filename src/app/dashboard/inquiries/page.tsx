'use client';

import { useEffect, useState } from 'react';
import { getInquiries, getAppUsers, Inquiry, AppUser, InquirySubmission } from '@/lib/firestore-service';
import { useAuth } from '@/lib/auth-context';
import { hasPermission } from '@/lib/rbac';
import LoadingSpinner from '@/components/LoadingSpinner';

interface InquiryWithUser extends Inquiry {
  user?: AppUser;
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<InquiryWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { userData } = useAuth();
  const userRole = userData?.role || 'pending';

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
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

        setInquiries(inquiriesWithUsers);
      }
    } catch (error) {
      console.error('Error fetching inquiries:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRowExpansion = (inquiryId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(inquiryId)) {
      newExpandedRows.delete(inquiryId);
    } else {
      newExpandedRows.add(inquiryId);
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
            {inquiries.length > 0 ? (
              inquiries.map((inquiry) => (
                <>
                  <tr key={inquiry.id} className="hover:bg-gray-50">
                    <td className="py-4 px-6 border-r-2">
                      <div className="text-sm font-medium text-gray-900">
                        {inquiry.user ? inquiry.user.displayName : 'Unknown User'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {inquiry.user?.email || 'No email'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {inquiry.user?.phoneNumber || 'No phone'}
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
                        {inquiry.inquiry?.length || 0} submissions
                      </div>
                      {inquiry.inquiry && inquiry.inquiry.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {inquiry.inquiry.reduce((total, submission) => total + (submission.items?.length || 0), 0)} total items
                        </div>
                      )}
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
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
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
                                          <div className="text-sm text-gray-500">ID: {item.product_id || 'N/A'}</div>
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
              ))
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
    </div>
  );
}
