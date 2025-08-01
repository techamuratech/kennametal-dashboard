'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { hasPermission } from '@/lib/rbac';
import { useState } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  requiredPermission: {
    action: 'create' | 'read' | 'update' | 'delete';
    resource: 'products' | 'categories' | 'users' | 'logs' | 'inquiries' | 'app_users' | 'notifications' | 'whats_new';
  };
}

// Import icons from heroicons
import {
  HomeIcon,
  CubeIcon,
  TagIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  InboxIcon,
  UsersIcon,
  BellIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const navigation: NavItem[] = [
  { 
    name: 'Products', 
    href: '/dashboard/products', 
    icon: CubeIcon,
    requiredPermission: { action: 'read', resource: 'products' }
  },
  { 
    name: 'Categories', 
    href: '/dashboard/categories', 
    icon: TagIcon,
    requiredPermission: { action: 'read', resource: 'categories' }
  },
  { 
    name: 'Users', 
    href: '/dashboard/users', 
    icon: UserGroupIcon,
    requiredPermission: { action: 'read', resource: 'users' }
  },
  { 
    name: 'App Users', 
    href: '/dashboard/app-users', 
    icon: UsersIcon,
    requiredPermission: { action: 'read', resource: 'app_users' }
  },
  { 
    name: 'Logs', 
    href: '/dashboard/logs', 
    icon: ClipboardDocumentListIcon,
    requiredPermission: { action: 'read', resource: 'logs' }
  },
  { 
    name: 'Inquiries', 
    href: '/dashboard/inquiries', 
    icon: InboxIcon,
    requiredPermission: { action: 'read', resource: 'inquiries' }
  },
  { 
    name: 'Notifications', 
    href: '/dashboard/notifications', 
    icon: BellIcon,
    requiredPermission: { action: 'read', resource: 'notifications' }
  },
  { 
    name: "What's New", 
    href: '/dashboard/whats-new', 
    icon: SparklesIcon,
    requiredPermission: { action: 'read', resource: 'whats_new' }
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { userData } = useAuth();
  const userRole = userData?.role || 'user'; // Change from 'pending' to 'user'
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filter navigation items based on user permissions
  const filteredNavigation = navigation.filter(item => 
    hasPermission(userRole, item.requiredPermission.action, item.requiredPermission.resource)
  );

  return (
    <>
      {/* Mobile menu button - positioned within header area */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          type="button"
          className="bg-gray-800 p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
          onClick={() => setSidebarOpen(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-gray-800">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4 ml-12">
                <Link href={'/dashboard'} onClick={() => setSidebarOpen(false)}>
                  <span className="text-white text-xl font-bold">Kennametal</span>
                </Link>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {filteredNavigation.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`${
                        isActive
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                    >
                      <item.icon
                        className={`${
                          isActive ? 'text-gray-300' : 'text-gray-400 group-hover:text-gray-300'
                        } mr-3 flex-shrink-0 h-6 w-6`}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 bg-gray-800">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <Link href={'/dashboard'}>
                  <span className="text-white text-xl font-bold">Kennametal</span>
                </Link>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {filteredNavigation.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`${
                        isActive
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                    >
                      <item.icon
                        className={`${
                          isActive ? 'text-gray-300' : 'text-gray-400 group-hover:text-gray-300'
                        } mr-3 flex-shrink-0 h-6 w-6`}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
