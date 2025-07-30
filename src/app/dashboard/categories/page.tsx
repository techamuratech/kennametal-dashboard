'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCategories, deleteCategory, createLogEntry } from '@/lib/firestore-service';
import { useAuth } from '@/lib/auth-context';
import { hasPermission } from '@/lib/rbac';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  const { userData } = useAuth();
  const userRole = userData?.role || 'pending';
  
  const canCreate = hasPermission(userRole, 'create', 'categories');
  const canUpdate = hasPermission(userRole, 'update', 'categories');
  const canDelete = hasPermission(userRole, 'delete', 'categories');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
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
      await deleteCategory(id);
      
      // Log the action
      if (userData) {

        // console.log("userData", userData);
        await createLogEntry({
          uid: userData.email,
          action: 'category_deleted',
          details: {
            categoryId: id,
          }
        });
      }
      
      // Refresh the list
      fetchCategories();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" message="Loading Categories..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Categories</h1>
        {canCreate && (
          <Link href="/dashboard/categories/new" className="btn-primary">
            Add New Category
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.length > 0 ? (
          categories.map((category) => (
            <div key={category.id} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    {category.imageUrl ? (
                      <img
                        className="h-10 w-10 rounded-full"
                        src={category.imageUrl}
                        alt={category.title}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 font-bold">
                          {category.title.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">{category.title}</h3>
                    <p className="text-sm text-gray-500">{category.description}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3 flex justify-end space-x-3">
                {canUpdate && (
                  <Link
                    href={`/dashboard/categories/edit/${category.id}`}
                    className="text-primary-600 hover:text-primary-900 text-sm font-medium"
                  >
                    Edit
                  </Link>
                )}
                {canDelete && (
                  <button
                    onClick={() => handleDelete(category.id)}
                    className={`${
                      deleteConfirm === category.id
                        ? 'text-red-600 font-bold'
                        : 'text-red-600'
                    } hover:text-red-900 text-sm font-medium`}
                  >
                    {deleteConfirm === category.id ? 'Confirm' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-white overflow-hidden shadow rounded-lg p-6 text-center text-gray-500">
            No categories found. {canCreate && 'Add your first category!'}
          </div>
        )}
      </div>
    </div>
  );
}
