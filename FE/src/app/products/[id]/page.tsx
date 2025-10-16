'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { ArrowLeftIcon, PencilIcon, TrashIcon } from 'lucide-react';

// Custom notification hook
const useNotification = () => {
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info'; visible: boolean } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type, visible: true });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  return { notification, showNotification };
};

// Custom confirm dialog hook
const useConfirmDialog = () => {
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; visible: boolean; resolve: (value: boolean) => void } | null>(null);

  const showCustomConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmDialog({ message, visible: true, resolve });
    });
  };

  const handleConfirm = (confirmed: boolean) => {
    if (confirmDialog) {
      confirmDialog.resolve(confirmed);
      setConfirmDialog(null);
    }
  };

  return { confirmDialog, showCustomConfirm, handleConfirm };
};

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

const ProductDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { user, token } = useAuth();
  const { addToCart } = useCart();
  const { notification, showNotification } = useNotification();
  const { confirmDialog, showCustomConfirm, handleConfirm } = useConfirmDialog();

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

  const handleDelete = async () => {
    const confirmed = await showCustomConfirm('Are you sure you want to delete this product?');
    if (!confirmed) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://prn232-assignment2.onrender.com'}/api/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        showNotification('Product deleted successfully!', 'success');
        setTimeout(() => router.push('/products'), 1000); // Delay redirect to show notification
      } else {
        const errorText = await response.text();
        showNotification(`Failed to delete product: ${errorText}`, 'error');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('An error occurred while deleting the product');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (product) {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
      });
      showNotification('Product added to cart successfully!', 'success');
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Custom Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
          notification.type === 'success' ? 'bg-green-500 text-white' :
          notification.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          <div className="flex items-center">
            <span className="mr-2">
              {notification.type === 'success' ? '✓' :
               notification.type === 'error' ? '✕' : 'ℹ'}
            </span>
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Custom Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-900/40 via-gray-800/30 to-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-gray-200/50">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Confirm Delete</h3>
                <p className="text-sm text-gray-500 mt-1">{confirmDialog.message}</p>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => handleConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirm(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <Link
          href="/products"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Products
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Image */}
        <div className="aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              width={600}
              height={600}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-gray-500 text-lg">No Image</span>
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
            <p className="text-2xl font-bold text-blue-600">${product.price.toFixed(2)}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Description</h2>
            <p className="text-gray-600 leading-relaxed">{product.description}</p>
          </div>

          <div className="text-sm text-gray-500 space-y-1">
            <p>Product ID: {product.id}</p>
            <p>Created: {new Date(product.createdAt).toLocaleDateString()}</p>
            <p>Last Updated: {new Date(product.updatedAt).toLocaleDateString()}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleAddToCart}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Add to Cart
            </button>

            {user && (
              <div className="flex gap-2">
                <Link
                  href={`/products/${product.id}/edit`}
                  className="flex-1 bg-yellow-500 text-white px-4 py-3 rounded-lg font-semibold hover:bg-yellow-600 transition-colors flex items-center justify-center"
                >
                  <PencilIcon className="h-5 w-5 mr-2" />
                  Edit
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <TrashIcon className="h-5 w-5 mr-2" />
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;