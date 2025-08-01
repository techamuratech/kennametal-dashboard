'use client';
import { useEffect, useState } from 'react';
import { getLogs, LogEntry } from '@/lib/firestore-service';
import { useAuth } from '@/lib/auth-context';
import { hasPermission } from '@/lib/rbac';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage] = useState(10);
  const { userData } = useAuth();
  const userRole = userData?.role || 'user';

  const fetchLogs = async () => {
    setLoading(true);
    try {
      if (hasPermission(userRole, 'read', 'logs')) {
        // Fetch all logs for client-side pagination and search
        const { logs: newLogs } = await getLogs(1000); // Fetch a large number
        setAllLogs(newLogs);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const filteredLogs = allLogs.filter(log => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      log.uid?.toLowerCase().includes(searchLower) ||
      log.action?.toLowerCase().includes(searchLower) ||
      JSON.stringify(log.details).toLowerCase().includes(searchLower)
    );
  });

  // Pagination logic
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  useEffect(() => {
    fetchLogs();
  }, [userRole]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" message="Loading Logs..." />
      </div>
    );
  }

  return (
    <div className="card mx-auto mt-8 p-6">
      <h1 className="text-2xl font-bold mb-4">Activity Logs</h1>
      
      <div className="mb-4">
        <label htmlFor="searchLogs" className="block text-sm font-medium text-gray-700 mb-1">
          Search Logs
        </label>
        <input
          id="searchLogs"
          type="text"
          placeholder="Search by user, action, or details..."
          value={searchTerm}
          onChange={handleSearchChange}
          maxLength={150}
          className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        />
      </div>

      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {currentLogs.map(log => (
            <tr key={log.id}>
              <td className="px-6 py-4 whitespace-nowrap">{log.uid}</td>
              <td className="px-6 py-4 whitespace-nowrap">{log.action}</td>
              <td className="px-6 py-4 whitespace-nowrap">{JSON.stringify(log.details)}</td>
              <td className="px-6 py-4 whitespace-nowrap">{log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {filteredLogs.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          No logs found.
        </div>
      )}

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
                Showing <span className="font-medium">{indexOfFirstLog + 1}</span> to{' '}
                <span className="font-medium">{Math.min(indexOfLastLog, filteredLogs.length)}</span> of{' '}
                <span className="font-medium">{filteredLogs.length}</span> results
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
