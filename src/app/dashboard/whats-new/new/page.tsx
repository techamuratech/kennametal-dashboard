'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { createWhatsNew, createLogEntry, uploadFile, getProducts, getCategories } from '@/lib/firestore-service';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';

export default function NewWhatsNewPage() {
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string>('');
  const [linkType, setLinkType] = useState<'screen' | 'url'>('url');
  const [screenPath, setScreenPath] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

  const router = useRouter();
  const { userData } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [productsData, categoriesData] = await Promise.all([
          getProducts(),
          getCategories()
        ]);
        setProducts(productsData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
      let whatsNewData = { ...data };

      // Upload image if provided
      if (imageFile) {
        const imageUrl = await uploadFile(imageFile, `whats-new/${imageFile.name}`);
        whatsNewData.image = imageUrl;
      }

      // Handle link structure
      if (linkType === 'url' && externalUrl) {
        whatsNewData.link = {
          type: 'url',
          url: externalUrl
        };
      } else if (linkType === 'screen' && screenPath) {
        const linkData: any = {
          type: 'screen',
          screen: screenPath
        };

        // Add params for category listing
        if (screenPath === '/ProductListing' && selectedCategory) {
          const category = categories.find(cat => cat.id === selectedCategory);
          linkData.params = { categoryId: category?.id || selectedCategory };
        }
        // Add product ID to screen path for product detail
        else if (screenPath === '/ProductDetail' && selectedProduct) {
          const product = products.find(prod => prod.id === selectedProduct);
          linkData.screen = `/ProductDetail?id=${product?.id || selectedProduct}`;
        }

        whatsNewData.link = linkData;
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
      showToast("What's New item created successfully", 'success');
      router.push('/dashboard/whats-new');
    } catch (error) {
      console.error('Error creating whats new item:', error);
      showToast('Failed to create item. Please try again.', 'error');
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
              maxLength={150}
              className="form-input"
              {...register('name', { 
                required: 'Title is required',
                maxLength: { value: 150, message: 'Title must be 150 characters or less' }
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
                  onChange={(e) => {
                    setScreenPath(e.target.value);
                    setSelectedProduct('');
                    setSelectedCategory('');
                  }}
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
                  <label htmlFor="categorySelect" className="form-label">Select Category</label>
                  <select
                    id="categorySelect"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="form-input"
                    disabled={loading}
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {screenPath === '/ProductDetail' && (
                <div>
                  <label htmlFor="productSelect" className="form-label">Select Product</label>
                  <select
                    id="productSelect"
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="form-input"
                    disabled={loading}
                  >
                    <option value="">Select Product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          <div>
            <label htmlFor="image" className="form-label">Image (Recommended: 716x716px, JPG/PNG, Max 2MB)</label>
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
