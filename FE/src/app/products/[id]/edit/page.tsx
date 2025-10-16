'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeftIcon } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
}

const EditProductPage = () => {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const { token } = useAuth();

  const productId = params.id as string;

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://prn232-assignment2.onrender.com'}/api/products/${productId}`);
      if (response.ok) {
        const data = await response.json();
        setProduct(data);
        setName(data.name);
        setDescription(data.description);
        setPrice(data.price.toString());
        setImageUrl(data.imageUrl || '');
      } else {
        router.push('/products');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      router.push('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Please enter a valid price');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://prn232-assignment2.onrender.com'}/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: parseInt(productId),
          name,
          description,
          price: priceNum,
          imageUrl: imageUrl || null,
        }),
      });

      if (response.ok) {
        router.push(`/products/${productId}`);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update product');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
          <Link
            href="/products"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href={`/products/${productId}`}
          className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Product
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Product</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Product Name *
            </label>
            <input
              type="text"
              id="name"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter product name"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description *
            </label>
            <textarea
              id="description"
              required
              rows={4}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter product description"
            />
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700">
              Price *
            </label>
            <input
              type="number"
              id="price"
              required
              min="0"
              step="0.01"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">
              Image URL (optional)
            </label>
            <input
              type="url"
              id="imageUrl"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Updating...' : 'Update Product'}
            </button>
            <Link
              href={`/products/${productId}`}
              className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductPage;