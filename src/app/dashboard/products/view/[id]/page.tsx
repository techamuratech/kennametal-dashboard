'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getProduct } from '@/lib/firestore-service';
import { useAuth } from '@/lib/auth-context';
import { hasPermission } from '@/lib/rbac';
import LoadingSpinner from '@/components/LoadingSpinner';
import Link from 'next/link';
import Image from 'next/image';

export default function ViewProductPage() {
  const { id } = useParams();
  const productId = Array.isArray(id) ? id[0] : id;
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { userData } = useAuth();
  const userRole = userData?.role || 'user';

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        if (hasPermission(userRole, 'read', 'products')) {
          const productData = await getProduct(productId);
          if (productData) {
            setProduct(productData);
          } else {
            router.push('/dashboard/products');
          }
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        router.push('/dashboard/products');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId, userRole, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" message="Loading product..." />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Product not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto mt-8">
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Product Details</h1>
          <div className="flex space-x-3">
            <Link
              href="/dashboard/products"
              className="btn-secondary"
            >
              Back to Products
            </Link>
            {hasPermission(userRole, 'update', 'products') && (
              <Link
                href={`/dashboard/products/edit/${product.id}`}
                className="btn-primary"
              >
                Edit Product
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Images */}
          <div className="space-y-4">
            {product.product_img && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Product Image</h3>
                <img
                  src={product.product_img}
                  alt={product.title}
                  className="w-full h-64 object-cover rounded-lg border"
                />
              </div>
            )}
            
            {product.images && product.images.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Gallery Images</h3>
                <div className="grid grid-cols-2 gap-2">
                  {product.images.map((image: string, index: number) => (
                    <img
                      key={index}
                      src={image}
                      alt={`${product.title} ${index + 1}`}
                      className="w-full h-32 object-cover rounded border"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Product Information */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Basic Information</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p><span className="font-medium">Title:</span> {product.title}</p>
                {product.subtitle && <p><span className="font-medium">Subtitle:</span> {product.subtitle}</p>}
                <p><span className="font-medium">Category:</span> {product.categoryId}</p>
                <p><span className="font-medium">Featured:</span> {product.featured ? 'Yes' : 'No'}</p>
                {product.productPrice > 0 && <p><span className="font-medium">Price:</span> ${product.productPrice}</p>}
              </div>
            </div>

            {/* Specifications */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Specifications</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                {product.material_number && <p><span className="font-medium">Material Number:</span> {product.material_number}</p>}
                {product.iso && <p><span className="font-medium">ISO:</span> {product.iso}</p>}
                {product.shank_size && <p><span className="font-medium">Shank Size:</span> {product.shank_size}</p>}
                {product.abrasive && <p><span className="font-medium">Abrasive:</span> {product.abrasive}</p>}
                {product.machine_hp && <p><span className="font-medium">Machine HP:</span> {product.machine_hp}</p>}
                {product.cutting_material && <p><span className="font-medium">Cutting Material:</span> {product.cutting_material}</p>}
              </div>
            </div>

            {/* Applications */}
            {product.application && product.application.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Applications</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  {product.application.map((app: any, index: number) => (
                    <div key={index} className="flex items-center space-x-2">
                      {app.icon && <img src={app.icon} alt="" className="w-6 h-6" />}
                      <span>{app.uses}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Parts */}
            {product.related_parts && product.related_parts.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Related Parts</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <ul className="list-disc list-inside space-y-1">
                    {product.related_parts.map((part: string, index: number) => (
                      <li key={index}>{part}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Overview */}
        {product.overview && (
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Overview</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div dangerouslySetInnerHTML={{ __html: product.overview }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}