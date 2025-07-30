'use client';
import { useEffect, useState } from 'react';
import { getLogs } from '@/lib/firestore-service';
import { useAuth } from '@/lib/auth-context';
import { hasPermission } from '@/lib/rbac';
import LoadingSpinner from '@/components/LoadingSpinner';

interface LogEntry {
  id: string;
  uid: string;
  action: string;
  details: any; // Adjust the type as necessary
  timestamp: { seconds: number }; // Adjust the type as necessary
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const [firstVisible, setFirstVisible] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { userData } = useAuth();
  const userRole = userData?.role || 'pending';
  const pageSize = 10;

  const fetchLogs = async (reset = false, direction: 'next' | 'prev' = 'next') => {
    setLoading(true);
    try {
      if (hasPermission(userRole, 'read', 'logs')) {
        const { logs: newLogs, lastVisible: newLastVisible } = await getLogs(pageSize, reset ? null : (direction === 'next' ? lastVisible : firstVisible));
        setLogs(newLogs);
        setFirstVisible(newLogs[0]);
        setLastVisible(newLastVisible);
        if (reset) {
          setCurrentPage(1);
        } else {
          setCurrentPage(prev => direction === 'next' ? prev + 1 : prev - 1);
        }
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(true);
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
          {logs.map(log => (
            <tr key={log.id}>
              <td className="px-6 py-4 whitespace-nowrap">{log.uid}</td>
              <td className="px-6 py-4 whitespace-nowrap">{log.action}</td>
              <td className="px-6 py-4 whitespace-nowrap">{JSON.stringify(log.details)}</td>
              <td className="px-6 py-4 whitespace-nowrap">{new Date(log.timestamp.seconds * 1000).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-between items-center mt-8">
        <button
          onClick={() => fetchLogs(false, 'prev')}
          disabled={loading || currentPage === 1}
          className={`px-4 py-2 bg-blue-500 text-white rounded ${loading || currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Previous
        </button>
        <span>Page {currentPage}</span>
        <button
          onClick={() => fetchLogs(false, 'next')}
          disabled={loading || logs.length < pageSize}
          className={`px-4 py-2 bg-blue-500 text-white rounded ${loading || logs.length < pageSize ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
