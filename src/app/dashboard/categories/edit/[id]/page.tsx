'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useParams } from 'next/navigation';
import { getCategoryById, updateCategory, createLogEntry, uploadFile, Category } from '@/lib/firestore-service';
import { useAuth } from '@/lib/auth-context';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function EditCategoryPage() {
  const { id } = useParams();
  const category_id = Array.isArray(id) ? id[0] : id;
  // console.log("edit category page", typeof category_id)
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const router = useRouter();
  const { userData } = useAuth();

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      // description: '',
    }
  });

  useEffect(() => {
    const fetchCategory = async () => {
      setLoading(true);
      try {
        const data = await getCategoryById(category_id);

        // console.log("fetching category by id", data);
        setCategory(data);
        setValue('title', data.title);
        // setValue('description', data.description);
      } catch (error) {
        console.error('Error fetching category:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [category_id, setValue]);

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      let updateData = { ...data };
      
      // Upload new image if provided
      if (imageFile) {
        const imageUrl = await uploadFile(imageFile, `categories/${imageFile.name}`);
        updateData.imageUrl = imageUrl;
      }
      
      await updateCategory(category_id, updateData);
      if (userData) {
        await createLogEntry({
          uid: userData.email,
          action: 'category_updated',
          details: {
            categoryId: category_id,
            categoryName: data.title,
          }
        });
      }
      router.push('/dashboard/categories');
    } catch (error) {
      console.error('Error updating category:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" message="Loading..." />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <div className="card">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Edit Category</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="name" className="form-label">Category Name</label>
            <input
              id="title"
              maxLength={150}
              className="form-input"
              {...register('title', { 
                required: 'Category title is required',
                maxLength: { value: 150, message: 'Category title must be 150 characters or less' }
              })}
            />
            {errors.title && <p className="text-red-600 text-sm">{errors.title.message}</p>}
          </div>
          {/* <div>
            <label htmlFor="description" className="form-label">Description</label>
            <textarea
              id="description"
              className="form-input"
              {...register('description', { required: 'Description is required' })}
            />
            {errors.description && <p className="text-red-600 text-sm">{errors.description.message}</p>}
          </div> */}
          <div>
            <label htmlFor="image" className="form-label">Category Image (Recommended: 716x380px, JPG/PNG, Max 2MB)</label>
            <input
              id="image"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="form-input"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
            {category?.imageUrl && (
              <div className="mt-2">
                <p className="text-sm text-gray-600 mb-2">Current image:</p>
                <img 
                  src={category.imageUrl} 
                  alt="Current category" 
                  className="h-20 w-20 object-cover rounded border"
                />
              </div>
            )}
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
