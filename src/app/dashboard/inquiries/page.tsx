'use client';

import { useEffect, useState } from 'react';
import { getInquiries, getAppUsers, Inquiry, AppUser, InquirySubmission } from '@/lib/firestore-service';
import { useAuth } from '@/lib/auth-context';
import { hasPermission } from '@/lib/rbac';
import LoadingSpinner from '@/components/LoadingSpinner';
import * as XLSX from 'xlsx';

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
  const userRole = userData?.role || 'user';

  useEffect(() => {
    fetchInquiries();
  }, [userRole]);

  const fetchInquiries = async () => {
    if (!userRole) return;
    
    setLoading(true);
    try {
      if (hasPermission(userRole, 'read', 'inquiries')) {
        const [inquiriesData, appUsersData] = await Promise.all([
          getInquiries(),
          getAppUsers()
        ]);

        const usersMap = new Map(appUsersData.map(user => [user.id!, user]));

        const inquiriesWithUsers = inquiriesData
          .map(inquiry => ({
            ...inquiry,
            user: usersMap.get(inquiry.user_id)
          }))
          // Filter to only show inquiries that have actual submissions (not just cart items)
          .filter(inquiry => inquiry.inquiry && inquiry.inquiry.length > 0);

        const sortedInquiries = inquiriesWithUsers.sort((a, b) => {
          // Get the latest submission date for each inquiry
          const getLatestSubmissionDate = (inquiry: any) => {
            if (!inquiry.inquiry || inquiry.inquiry.length === 0) {
              return new Date(inquiry.created_at).getTime();
            }
            
            const latestSubmission = inquiry.inquiry.reduce((latest: any, current: any) => {
              const currentTime = new Date(current.submitted_at).getTime();
              const latestTime = new Date(latest.submitted_at).getTime();
              return currentTime > latestTime ? current : latest;
            });
            
            return new Date(latestSubmission.submitted_at).getTime();
          };

          const aLatestTime = getLatestSubmissionDate(a);
          const bLatestTime = getLatestSubmissionDate(b);
          
          return bLatestTime - aLatestTime; // Sort by latest submission first
        });

        setInquiries(sortedInquiries);
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

  const exportToExcel = () => {
    const exportData = filteredInquiries.map(inquiry => {
      // Format submissions with product details
      const submissionsText = inquiry.inquiry?.map((submission, index) => {
        const submissionItems = submission.items?.map(item => 
          `${item.product_name || 'Unknown Product'}: ${item.quantity || 1}`
        ).join(', ') || 'No items';
        
        return `Submission ${index + 1}: ${submissionItems}`;
      }).join(' | ') || 'No submissions';

      return {
        'User Name': inquiry.user?.displayName || 'Unknown User',
        'Email': inquiry.user?.email || 'No email',
        'Phone': inquiry.user?.phoneNumber || 'No phone',
        'Company': inquiry.user?.companyName || 'N/A',
        'GST Number': inquiry.user?.companyGSTNumber || 'N/A',
        'Created At': formatDate(inquiry.created_at),
        'Total Submissions': inquiry.inquiry?.length || 0,
        'Total Items': inquiry.inquiry?.reduce((total, submission) => total + (submission.items?.length || 0), 0) || 0,
        'Inquiry Submissions': submissionsText
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inquiries');
    
    const fileName = `inquiries_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Inquiries</h1>
        <button
          onClick={exportToExcel}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Export to Excel
        </button>
      </div>
      
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
              <th className="py-3 px-6 text-left text-sm font-semibold text-white uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentInquiries.length > 0 ? (
              currentInquiries.map((inquiry) => (
                <>
                  <tr key={inquiry.id} className="hover:bg-gray-50">
                    <td className="py-4 px-6 border-r-2">
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
                      <td colSpan={5} className="py-4 px-6 bg-gray-50">
                        <div>
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
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-4 px-6 text-center text-gray-500">
                  No inquiries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination remains the same */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4">
          {/* ... existing pagination code ... */}
        </div>
      )}
    </div>
  );
}
