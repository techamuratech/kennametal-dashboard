'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { createWhatsNew, createLogEntry, uploadFile } from '@/lib/firestore-service';
import { useAuth } from '@/lib/auth-context';

export default function NewWhatsNewPage() {
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const router = useRouter();
  const { userData } = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      description: '',
      link: '',
    }
  });

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      let whatsNewData = { ...data };

      // Upload image if provided
      if (imageFile) {
        const imageUrl = await uploadFile(imageFile, `whats-new/${imageFile.name}`);
        whatsNewData.image = imageUrl;
      }

      const newWhatsNewId = await createWhatsNew(whatsNewData);

      if (userData) {
        await createLogEntry({
          uid: userData.email,
          action: 'whats_new_created',
          details: {
            whatsNewId: newWhatsNewId,
            whatsNewName: data.name,
          }
        });
      }
      router.push('/dashboard/whats-new');
    } catch (error) {
      console.error('Error creating whats new item:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <div className="card">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Create New What's New Item</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="name" className="form-label">Title</label>
            <input
              id="name"
              className="form-input"
              {...register('name', { required: 'Title is required' })}
            />
            {errors.name && <p className="text-red-600 text-sm">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="description" className="form-label">Description</label>
            <textarea
              id="description"
              rows={4}
              className="form-input"
              {...register('description', { required: 'Description is required' })}
            />
            {errors.description && <p className="text-red-600 text-sm">{errors.description.message}</p>}
          </div>

          <div>
            <label htmlFor="link" className="form-label">Link (Optional)</label>
            <input
              id="link"
              type="url"
              className="form-input"
              placeholder="https://example.com"
              {...register('link')}
            />
            {errors.link && <p className="text-red-600 text-sm">{errors.link.message}</p>}
          </div>

          <div>
            <label htmlFor="image" className="form-label">Image (Optional)</label>
            <input
              id="image"
              type="file"
              accept="image/*"
              className="form-input"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
            {imageFile && (
              <div className="mt-2">
                <p className="text-sm text-gray-600 mb-2">Selected image:</p>
                <img 
                  src={URL.createObjectURL(imageFile)} 
                  alt="Preview" 
                  className="h-20 w-20 object-cover rounded border"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.push('/dashboard/whats-new')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
