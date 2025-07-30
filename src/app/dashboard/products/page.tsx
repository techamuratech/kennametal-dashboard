'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getProducts, getCategories, deleteProduct, createLogEntry } from '@/lib/firestore-service';
import { useAuth } from '@/lib/auth-context';
import { hasPermission } from '@/lib/rbac';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  const { userData } = useAuth();
  const userRole = userData?.role || 'pending';
  
  const canCreate = hasPermission(userRole, 'create', 'products');
  const canUpdate = hasPermission(userRole, 'update', 'products');
  const canDelete = hasPermission(userRole, 'delete', 'products');

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }
    
    try {
      await deleteProduct(id);
      
      // Log the action
      if (userData) {
        await createLogEntry({
          uid: userData.email,
          action: 'product_deleted',
          details: {
            productId: id,
          }
        });
      }
      
      // Refresh the list
      fetchProducts();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(event.target.value);
  };

  const filteredProducts = selectedCategory
    ? products.filter(product => product.categoryId === selectedCategory)
    : products;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" message="Loading Products..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
        {canCreate && (
          <Link href="/dashboard/products/new" className="btn-primary">
            Add New Product
          </Link>
        )}
      </div>

      <div className="flex justify-between items-center mb-4">
        <label htmlFor="categoryFilter" className="block text-md font-medium text-gray-700">
          Filter by Category:
        </label>
        <select
          id="categoryFilter"
          value={selectedCategory}
          onChange={handleCategoryChange}
          className="mt-1 block w-auto py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        >
          <option value="">All Categories</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.title}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredProducts.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {filteredProducts.map((product) => (
              <li key={product.id}>
                <div className="px-4 py-4 flex items-center sm:px-6">
                  <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <div className="flex text-sm">
                        <p className="font-medium text-primary-600 truncate">{product.title}</p>
                        <p className="ml-1 flex-shrink-0 font-normal text-gray-500">
                          in {product.categoryId}
                        </p>
                      </div>
                      <div className="mt-2 flex">
                        <div className="flex items-center text-sm text-gray-500">
                          <div dangerouslySetInnerHTML={{ __html: product.description }}></div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex-shrink-0 sm:mt-0 sm:ml-5">
                      <div className="flex overflow-hidden">
                        {product.images && product.images[0] && (
                          <img 
                            className="h-12 w-12 rounded-md object-cover" 
                            src={product.images[0]} 
                            alt={product.name} 
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="ml-5 flex-shrink-0 flex space-x-2">
                    {canUpdate && (
                      <Link
                        href={`/dashboard/products/edit/${product.id}`}
                        className="text-primary-600 hover:text-primary-900 text-sm font-medium"
                      >
                        Edit
                      </Link>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(product.id)}
                        className={`${
                          deleteConfirm === product.id
                            ? 'text-red-600 font-bold'
                            : 'text-red-600'
                        } hover:text-red-900 text-sm font-medium`}
                      >
                        {deleteConfirm === product.id ? 'Confirm' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
            No products found. {canCreate && 'Add your first product!'}
          </div>
        )}
      </div>
    </div>
  );
}
