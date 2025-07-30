"use client"
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { createCategory, createLogEntry, uploadFile } from '@/lib/firestore-service';
import { useAuth } from '@/lib/auth-context';

export default function NewCategoryPage() {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { userData } = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      description: '',
      image: null
    }
  });

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      const imageFile = data.image[0]; // Assuming single file upload
      const imageUrl = await uploadFile(imageFile, `categories/${imageFile.name}`);

        // Remove the image property and use the rest of the data
      const { image, ...categoryData } = data;
      
      const newCategoryId = await createCategory({
        ...categoryData,
        imageUrl, // Use the URL instead of the FileList
      });

      if (userData) {
        await createLogEntry({
          uid: userData.email,
          action: 'category_created',
          details: {
            categoryId: newCategoryId,
            categoryName: data.title,
          }
        });
      }
      router.push('/dashboard/categories');
    } catch (error) {
      console.error('Error creating category:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <div className="card">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Create New Category</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="name" className="form-label">Category Name</label>
            <input
              id="title"
              className="form-input"
              {...register('title', { required: 'Category title is required' })}
            />
            {errors.title && <p className="text-red-600 text-sm">{errors.title.message}</p>}
          </div>
          <div>
            <label htmlFor="description" className="form-label">Description</label>
            <textarea
              id="description"
              className="form-input"
              {...register('description', { required: 'Description is required' })}
            />
            {errors.description && <p className="text-red-600 text-sm">{errors.description.message}</p>}
          </div>
          <div>
            <label htmlFor="image" className="form-label">Category Image</label>
            <input
              id="image"
              type="file"
              className="form-input"
              {...register('image', { required: 'Category image is required' })}
            />
            {errors.image && <p className="text-red-600 text-sm">{errors.image.message}</p>}
          </div>

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Category'}
          </button>
        </form>
      </div>
    </div>
  );
}
