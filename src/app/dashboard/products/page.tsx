'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getProducts, getCategories, deleteProduct, createLogEntry } from '@/lib/firestore-service';
import { useAuth } from '@/lib/auth-context';
import { hasPermission } from '@/lib/rbac';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useToast } from '@/lib/toast-context';

export default function ProductsPage() {
  const { showToast } = useToast();
  
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(10);
  
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
      // Sort by creation date descending (newest first)
      const sortedData = data.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
      setProducts(sortedData);
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
            productName: products.find(p => p.id === id)?.title || ''
          }
        });
      }
      
      // Refresh the list
      fetchProducts();
      setDeleteConfirm(null);
      showToast('Product deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting product:', error);
      showToast('Failed to delete product. Please try again.', 'error');
    }
  };

  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(event.target.value);
    setCurrentPage(1);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory ? product.categoryId === selectedCategory : true;
    const matchesSearch = searchTerm ? product.title.toLowerCase().includes(searchTerm.toLowerCase()) : true;
    return matchesCategory && matchesSearch;
  });

  // Pagination logic
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

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

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="w-[25%]">
          <label htmlFor="searchProducts" className="block text-sm font-medium text-gray-700 mb-1">
            Search Products
          </label>
          <input
            id="searchProducts"
            type="text"
            placeholder="Search by product title..."
            value={searchTerm}
            onChange={handleSearchChange}
            maxLength={150}
            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>
        <div className="w-[25%]">
          <label htmlFor="categoryFilter" className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Category
          </label>
          <select
            id="categoryFilter"
            value={selectedCategory}
            onChange={handleCategoryChange}
            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {currentProducts.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {currentProducts.map((product) => (
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
                      <div className="mt-1 text-xs text-gray-400">
                        {/* {console.log("produc updated", product.updatedAt)} */}
                        {product.updatedAt ? `Updated: ${formatDate(product.updatedAt)}` : 
                         product.createdAt ? `Created: ${formatDate(product.createdAt)}` : ''}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
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
                Showing <span className="font-medium">{indexOfFirstProduct + 1}</span> to{' '}
                <span className="font-medium">{Math.min(indexOfLastProduct, filteredProducts.length)}</span> of{' '}
                <span className="font-medium">{filteredProducts.length}</span> results
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
