'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { createNotification, createLogEntry, uploadFile } from '@/lib/firestore-service';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';

export default function NewNotificationPage() {
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const router = useRouter();
  const { userData } = useAuth();
  const { showToast } = useToast();

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
      let notificationData = { ...data };

      // Upload image if provided
      if (imageFile) {
        const imageUrl = await uploadFile(imageFile, `notifications/${imageFile.name}`);
        notificationData.image = imageUrl;
      }

      const newNotificationId = await createNotification(notificationData);

      if (userData) {
        await createLogEntry({
          uid: userData.email,
          action: 'notification_created',
          details: {
            notificationId: newNotificationId,
            notificationName: data.name,
          }
        });
      }
      showToast('Notification created successfully', 'success');
      router.push('/dashboard/notifications');
    } catch (error) {
      console.error('Error creating notification:', error);
      showToast('Failed to create notification. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <div className="card">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Create New Notification</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="name" className="form-label">Notification Title</label>
            <input
              id="name"
              maxLength={150}
              className="form-input"
              {...register('name', { 
                required: 'Notification title is required',
                maxLength: { value: 150, message: 'Notification title must be 150 characters or less' }
              })}
            />
            {errors.name && <p className="text-red-600 text-sm">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="description" className="form-label">Description</label>
            <textarea
              id="description"
              rows={4}
              maxLength={350}
              className="form-input"
              {...register('description', { 
                required: 'Description is required',
                maxLength: { value: 350, message: 'Description must be 350 characters or less' }
              })}
            />
            {errors.description && <p className="text-red-600 text-sm">{errors.description.message}</p>}
          </div>

          <div>
            <label htmlFor="link" className="form-label">Link (Optional)</label>
            <input
              id="link"
              type="url"
              maxLength={150}
              className="form-input"
              placeholder="https://example.com"
              {...register('link', {
                maxLength: { value: 150, message: 'Link must be 150 characters or less' }
              })}
            />
            {errors.link && <p className="text-red-600 text-sm">{errors.link.message}</p>}
          </div>

          <div>
            <label htmlFor="image" className="form-label">Notification Image (Optional)</label>
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
              onClick={() => router.push('/dashboard/notifications')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Notification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
