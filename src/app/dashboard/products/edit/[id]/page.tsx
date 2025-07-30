'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProductForm from '@/components/ProductForm';
import { getProduct } from '@/lib/firestore-service';
import { useAuth } from '@/lib/auth-context';
import { hasPermission } from '@/lib/rbac';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function EditProductPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { userData, loading: authLoading } = useAuth();
  
  useEffect(() => {
    // Check if user has permission to update products
    if (!authLoading && userData) {
      const canUpdate = hasPermission(userData.role, 'update', 'products');
      if (!canUpdate) {
        router.push('/dashboard/products');
        return;
      }
      
      // Fetch product data
      const fetchProduct = async () => {
        try {
          const data = await getProduct(params.id);
          if (data) {
            setProduct(data);
          } else {
            // Product not found
            router.push('/dashboard/products');
          }
        } catch (error) {
          console.error('Error fetching product:', error);
          router.push('/dashboard/products');
        } finally {
          setLoading(false);
        }
      };
      
      fetchProduct();
    }
  }, [params.id, userData, authLoading, router]);

  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" message="Loading..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Edit Product</h1>
      </div>
      
      {product && <ProductForm productData={product} isEditing={true} />}
    </div>
  );
}
