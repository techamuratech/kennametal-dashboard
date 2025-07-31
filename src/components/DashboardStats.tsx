'use client';

import { useEffect, useState, useCallback } from 'react';
import { getProducts, getCategories, getUsers, getLogs, getNotifications, getWhatsNew, getInquiries, getAppUsers, LogEntry } from '@/lib/firestore-service';
import { hasPermission, UserRole } from '@/lib/rbac';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import dynamic from 'next/dynamic';

// Lazy load icons
const CubeIcon = dynamic(() => import('@heroicons/react/24/outline').then(mod => ({ default: mod.CubeIcon })));
const TagIcon = dynamic(() => import('@heroicons/react/24/outline').then(mod => ({ default: mod.TagIcon })));
const UserGroupIcon = dynamic(() => import('@heroicons/react/24/outline').then(mod => ({ default: mod.UserGroupIcon })));
const ClipboardDocumentListIcon = dynamic(() => import('@heroicons/react/24/outline').then(mod => ({ default: mod.ClipboardDocumentListIcon })));
const InboxIcon = dynamic(() => import('@heroicons/react/24/outline').then(mod => ({ default: mod.InboxIcon })));
const UsersIcon = dynamic(() => import('@heroicons/react/24/outline').then(mod => ({ default: mod.UsersIcon })));
const SparklesIcon = dynamic(() => import('@heroicons/react/24/outline').then(mod => ({ default: mod.SparklesIcon })));

interface DashboardStatsProps {
  userRole: string | null;
}

interface StatsData {
  productCount: number;
  categoryCount: number;
  userCount: number;
  notificationCount: number;
  whatsNewCount: number;
  inquiryCount: number;
  appUserCount: number;
  recentLogs: LogEntry[];
}

export default function DashboardStats({ userRole }: DashboardStatsProps) {
  const [stats, setStats] = useState<StatsData>({
    productCount: 0,
    categoryCount: 0,
    userCount: 0,
    notificationCount: 0,
    whatsNewCount: 0,
    inquiryCount: 0,
    appUserCount: 0,
    recentLogs: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!userRole || userRole === 'pending') return;
    
    setLoading(true);
    try {
      // Batch all API calls for better performance
      const promises = [];
      
      if (hasPermission(userRole as UserRole, 'read', 'products')) {
        promises.push(getProducts().then(data => ({ type: 'products', data })));
      }
      if (hasPermission(userRole as UserRole, 'read', 'categories')) {
        promises.push(getCategories().then(data => ({ type: 'categories', data })));
      }
      if (hasPermission(userRole as UserRole, 'read', 'users')) {
        promises.push(getUsers().then(data => ({ type: 'users', data })));
      }
      if (hasPermission(userRole as UserRole, 'read', 'notifications')) {
        promises.push(getNotifications().then(data => ({ type: 'notifications', data })));
      }
      if (hasPermission(userRole as UserRole, 'read', 'whats_new')) {
        promises.push(getWhatsNew().then(data => ({ type: 'whats_new', data })));
      }
      if (hasPermission(userRole as UserRole, 'read', 'inquiries')) {
        promises.push(getInquiries().then(data => ({ type: 'inquiries', data })));
      }
      if (hasPermission(userRole as UserRole, 'read', 'app_users')) {
        promises.push(getAppUsers().then(data => ({ type: 'app_users', data })));
      }
      if (hasPermission(userRole as UserRole, 'read', 'logs')) {
        promises.push(getLogs(5, null).then(result => ({ type: 'logs', data: result.logs })));
      }

      const results = await Promise.allSettled(promises);
      
      const newStats = { ...stats };
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { type, data } = result.value;
          switch (type) {
            case 'products':
              newStats.productCount = data.length;
              break;
            case 'categories':
              newStats.categoryCount = data.length;
              break;
            case 'users':
              newStats.userCount = data.length;
              break;
            case 'notifications':
              newStats.notificationCount = data.length;
              break;
            case 'whats_new':
              newStats.whatsNewCount = data.length;
              break;
            case 'inquiries':
              newStats.inquiryCount = data.length;
              break;
            case 'app_users':
              newStats.appUserCount = data.length;
              break;
            case 'logs':
              newStats.recentLogs = data as LogEntry[];
              break;
          }
        }
      });
      
      setStats(newStats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" message="Loading Dashboard Data..." />
      </div>
    );
  }

  const statCards: Array<{
    title: string;
    value: number;
    icon: any;
    color: string;
    link: string;
    permission: 'products' | 'categories' | 'users' | 'logs' | 'inquiries' | 'app_users' | 'notifications' | 'whats_new';
  }> = [
    {
      title: 'Total Products',
      value: stats.productCount,
      icon: CubeIcon,
      color: 'primary',
      link: '/dashboard/products',
      permission: 'products'
    },
    {
      title: 'Total Categories', 
      value: stats.categoryCount,
      icon: TagIcon,
      color: 'green',
      link: '/dashboard/categories',
      permission: 'categories'
    },
    {
      title: 'Total Users',
      value: stats.userCount,
      icon: UserGroupIcon,
      color: 'indigo',
      link: '/dashboard/users',
      permission: 'users'
    },
    {
      title: 'App Users',
      value: stats.appUserCount,
      icon: UsersIcon,
      color: 'teal',
      link: '/dashboard/app-users',
      permission: 'app_users'
    },
    {
      title: 'Inquiries',
      value: stats.inquiryCount,
      icon: InboxIcon,
      color: 'orange',
      link: '/dashboard/inquiries',
      permission: 'inquiries'
    },
    {
      title: "What's New",
      value: stats.whatsNewCount,
      icon: SparklesIcon,
      color: 'purple',
      link: '/dashboard/whats-new',
      permission: 'whats_new'
    }
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {statCards.map((card) => {
          if (!hasPermission(userRole as UserRole, 'read', card.permission as 'products' | 'categories' | 'users' | 'logs' | 'inquiries' | 'app_users' | 'notifications' | 'whats_new')) return null;
          
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 bg-${card.color}-100 rounded-md p-3`}>
                    <Icon className={`h-6 w-6 text-${card.color}-600`} />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">{card.title}</dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">
                          {card.value}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-4 sm:px-6">
                <div className="text-sm">
                  <Link href={card.link} className="font-medium text-primary-600 hover:text-primary-500">
                    View all
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      {hasPermission(userRole as UserRole, 'read', 'logs') && stats.recentLogs.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Activity</h3>
            <div className="flow-root">
              <ul className="-mb-8">
                {stats.recentLogs.map((log, logIdx) => (
                  <li key={log.id}>
                    <div className="relative pb-8">
                      {logIdx !== stats.recentLogs.length - 1 && (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />
                      )}
                      <div className="relative flex space-x-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-400">
                          <ClipboardDocumentListIcon className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5">
                          <div>
                            <p className="text-sm text-gray-500">
                              <span className="font-medium text-gray-900">{log.uid}</span> {log.action}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-400">
                              {log.timestamp?.toDate?.()?.toLocaleString() || 'Unknown time'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
