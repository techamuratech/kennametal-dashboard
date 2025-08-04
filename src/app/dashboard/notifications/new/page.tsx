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
  const [imageError, setImageError] = useState<string>('');
  const [linkType, setLinkType] = useState<'screen' | 'url'>('url');
  const [screenPath, setScreenPath] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [productId, setProductId] = useState('');
  const router = useRouter();
  const { userData } = useAuth();
  const { showToast } = useToast();
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

  const validateImageSize = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      setImageError(`Image size must be less than 2MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      return false;
    }
    setImageError('');
    return true;
  };

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      description: '',
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

      // Handle link structure
      if (linkType === 'url' && externalUrl) {
        notificationData.link = {
          type: 'url',
          url: externalUrl
        };
      } else if (linkType === 'screen' && screenPath) {
        const linkData: any = {
          type: 'screen',
          screen: screenPath
        };

        // Add params for category listing
        if (screenPath === '/ProductListing' && categoryId) {
          linkData.params = { categoryId };
        }
        // Add product ID to screen path for product detail
        else if (screenPath === '/ProductDetail' && productId) {
          linkData.screen = `/ProductDetail?id=${productId}`;
        }

        notificationData.link = linkData;
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

          {/* Link Configuration */}
          <div>
            <label className="form-label">Link Type</label>
            <select
              value={linkType}
              onChange={(e) => setLinkType(e.target.value as 'screen' | 'url')}
              className="form-input"
            >
              <option value="url">External URL</option>
              <option value="screen">Internal Screen</option>
            </select>
          </div>

          {linkType === 'url' ? (
            <div>
              <label htmlFor="externalUrl" className="form-label">External URL</label>
              <input
                id="externalUrl"
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                className="form-input"
                placeholder="https://kennametal.com"
              />
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="screenPath" className="form-label">Screen Path</label>
                <select
                  id="screenPath"
                  value={screenPath}
                  onChange={(e) => setScreenPath(e.target.value)}
                  className="form-input"
                >
                  <option value="">Select Screen</option>
                  <option value="/Profile">Profile</option>
                  <option value="/ProductListing">Product Listing</option>
                  <option value="/ProductDetail">Product Detail</option>
                </select>
              </div>

              {screenPath === '/ProductListing' && (
                <div>
                  <label htmlFor="categoryId" className="form-label">Category ID</label>
                  <input
                    id="categoryId"
                    type="text"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="form-input"
                    placeholder="foundation-drilling"
                  />
                </div>
              )}

              {screenPath === '/ProductDetail' && (
                <div>
                  <label htmlFor="productId" className="form-label">Product ID</label>
                  <input
                    id="productId"
                    type="text"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="form-input"
                    placeholder="89yONLImQmxoexBM8vK"
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label htmlFor="image" className="form-label">Notification Image (Recommended: 716x716px, JPG/PNG, Max 2MB)</label>
            <input
              id="image"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="form-input"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (file && validateImageSize(file)) {
                  setImageFile(file);
                } else if (!file) {
                  setImageFile(null);
                  setImageError('');
                }
              }}
            />
            {imageError && (
              <p className="mt-1 text-sm text-red-600">{imageError}</p>
            )}
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
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? 'Creating...' : 'Create Notification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
