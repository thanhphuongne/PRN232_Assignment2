'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const PaymentReturnContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'success' | 'failed' | 'error'>('loading');
  const [orderId, setOrderId] = useState<number | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [transactionId, setTransactionId] = useState<string>('');

  useEffect(() => {
    const handlePaymentReturn = async () => {
      try {
        // Get VNPay parameters from URL
        const vnpResponseCode = searchParams.get('vnp_ResponseCode');
        const vnpTxnRef = searchParams.get('vnp_TxnRef');
        const vnpAmount = searchParams.get('vnp_Amount');

        if (!vnpTxnRef) {
          setPaymentStatus('error');
          return;
        }

        // Convert amount from VNPay format (VND with 2 decimal places)
        if (vnpAmount) {
          setAmount(parseInt(vnpAmount) / 100);
        }

        setTransactionId(vnpTxnRef);

        // Call backend to verify payment
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://prn232-assignment2.onrender.com'}/api/orders/payment-return?${searchParams.toString()}`, {
          method: 'GET',
        });

        if (response.ok) {
          const data = await response.json();
          setPaymentStatus(data.Success ? 'success' : 'failed');
          setOrderId(data.OrderId);
        } else {
          setPaymentStatus('error');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setPaymentStatus('error');
      }
    };

    handlePaymentReturn();
  }, [searchParams]);

  const renderContent = () => {
    switch (paymentStatus) {
      case 'loading':
        return (
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Payment</h2>
            <p className="text-gray-600">Please wait while we confirm your payment...</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-4">
              Your payment has been processed successfully.
              {orderId && ` Order #${orderId} has been confirmed.`}
            </p>
            {amount && (
              <p className="text-lg font-semibold text-gray-900 mb-6">
                Amount Paid: ${amount.toFixed(2)}
              </p>
            )}
            <div className="space-x-4">
              <Link
                href="/orders"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                View My Orders
              </Link>
              <Link
                href="/products"
                className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        );

      case 'failed':
        return (
          <div className="text-center">
            <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
            <p className="text-gray-600 mb-4">
              Your payment could not be processed. Please try again or contact support.
            </p>
            {transactionId && (
              <p className="text-sm text-gray-500 mb-6">
                Transaction ID: {transactionId}
              </p>
            )}
            <div className="space-x-4">
              <Link
                href="/cart"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Try Again
              </Link>
              <Link
                href="/products"
                className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Error</h2>
            <p className="text-gray-600 mb-4">
              There was an error verifying your payment. Please contact support if the issue persists.
            </p>
            <div className="space-x-4">
              <Link
                href="/cart"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Back to Cart
              </Link>
              <Link
                href="/products"
                className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="bg-white rounded-lg shadow-md p-8">
        {renderContent()}
      </div>
    </div>
  );
};

const PaymentReturnPage = () => {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h2>
          </div>
        </div>
      </div>
    }>
      <PaymentReturnContent />
    </Suspense>
  );
};

export default PaymentReturnPage;