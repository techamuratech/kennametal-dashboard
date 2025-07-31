'use client';

import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export default function Header() {
  const { user, userData, logout } = useAuth();
  const { isOnline } = useNetworkStatus();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="bg-white shadow-sm z-10">
      {!isOnline && (
        <div className="bg-red-600 text-white px-4 py-2 text-sm text-center">
          No internet connection - Some features may not work properly
        </div>
      )}
      <div className="mx-auto px-4 sm:px-6 lg:px-6">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Add space for mobile hamburger menu */}
            <div className="md:hidden w-12"></div>
            <h1 className="text-xl font-semibold text-gray-900">Kennametal Dashboard</h1>
          </div>
          <div className="flex items-center">
            <Menu as="div" className="ml-3 relative">
              <div>
                <Menu.Button className="max-w-xs bg-white flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                  <span className="sr-only">Open user menu</span>
                  <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white">
                    {userData?.name ? userData.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                  </div>
                </Menu.Button>
              </div>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="px-4 py-2 text-sm text-gray-700 border-b">
                    <p className="font-medium">{userData?.name || 'User'}</p>
                    <p className="text-gray-500">{user?.email}</p>
                    <p className="text-xs mt-1 capitalize bg-gray-100 inline-block px-2 py-1 rounded">
                      {userData?.role || 'User'}
                    </p>
                  </div>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleLogout}
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } block w-full text-left px-4 py-2 text-sm text-gray-700`}
                      >
                        Sign out
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>
    </header>
  );
}
