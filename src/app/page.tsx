'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login page
    router.push('/login');
  }, [router]);

  return (
    <div className="min-h-screen flex justify-center items-center">
      <LoadingSpinner size="lg" message="Redirecting..." />
    </div>
  );
}