'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProductForm from '@/components/ProductForm';
import { useAuth } from '@/lib/auth-context';
import { hasPermission } from '@/lib/rbac';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function NewProductPage() {
  const router = useRouter();
  const { userData, loading } = useAuth();
  
  useEffect(() => {
    // Check if user has permission to create products
    if (!loading && userData) {
      const canCreate = hasPermission(userData.role, 'create', 'products');
      if (!canCreate) {
        router.push('/dashboard/products');
      }
    }
  }, [userData, loading, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" message="Loading..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Create New Product</h1>
      </div>
      
      <ProductForm />
    </div>
  );
}
