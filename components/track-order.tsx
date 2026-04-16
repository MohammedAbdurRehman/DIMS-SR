'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, Package, Truck, CheckCircle, Clock } from 'lucide-react';
import { getApiUrl } from '../lib/utils';

interface TrackOrderProps {
  onBack: () => void;
}

interface OrderData {
  trackingNumber: string;
  transactionId: string;
  network: string;
  mobileNumber: string;
  status: 'Processing' | 'Shipped' | 'In Transit' | 'Delivered';
  date: string;
  lastUpdate?: string;
}

export default function TrackOrder({ onBack }: TrackOrderProps) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load last tracking number if available
    const lastTracking = localStorage.getItem('lastTrackingNumber');
    if (lastTracking) {
      setTrackingNumber(lastTracking);
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOrderData(null);

    if (!trackingNumber.trim()) {
      setError('Please enter a tracking number');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${getApiUrl()}/api/user/track-order/${trackingNumber.trim()}`);
      const data = await response.json();

      if (response.ok) {
        setOrderData({
          trackingNumber: data.order.trackingNumber,
          transactionId: data.order.transactionId,
          network: data.order.network,
          mobileNumber: data.order.mobileNumber,
          status: data.order.status,
          date: data.order.date?.split('T')[0] || new Date().toLocaleDateString(),
          lastUpdate: data.order.timeline?.[data.order.timeline.length - 1]?.timestamp?.split('T')[0],
        });
      } else {
        setError(data.error || 'Order not found');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusSteps = (currentStatus: string) => {
    const steps = ['Processing', 'Shipped', 'In Transit', 'Delivered'];
    return steps.map((step, index) => ({
      label: step,
      completed: steps.indexOf(step) <= steps.indexOf(currentStatus),
      current: step === currentStatus,
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Processing':
        return <Clock className="text-yellow-500" size={24} />;
      case 'Shipped':
        return <Package className="text-blue-500" size={24} />;
      case 'In Transit':
        return <Truck className="text-purple-500" size={24} />;
      case 'Delivered':
        return <CheckCircle className="text-green-500" size={24} />;
      default:
        return <Clock className="text-gray-500" size={24} />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm sm:text-base"
      >
        <ChevronLeft size={20} />
        Back
      </button>

      <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-lg border border-border">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          Track Your Order
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base mb-6 sm:mb-8">
          Enter your tracking number to check the status of your SIM registration
        </p>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number (e.g., TRACK-ABC123)"
              className="flex-1 px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-sm sm:text-base bg-input text-foreground placeholder-muted-foreground"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm sm:text-base"
            >
              {loading ? 'Searching...' : 'Track'}
            </button>
          </div>
        </form>

        {error && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-6 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Order Details */}
        {orderData && (
          <div className="space-y-6">
            {/* Status Overview */}
            <div className="bg-primary/10 rounded-lg p-6 border border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Current Status</p>
                  <p className="text-2xl font-bold text-foreground flex items-center gap-2">
                    {getStatusIcon(orderData.status)}
                    {orderData.status}
                  </p>
                </div>
                <p className="text-right">
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-semibold text-foreground">{orderData.lastUpdate}</p>
                </p>
              </div>
            </div>

            {/* Progress Timeline */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-4">Shipment Progress</p>
              <div className="space-y-3">
                {getStatusSteps(orderData.status).map((step, index) => (
                  <div key={step.label} className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          step.completed
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {step.completed ? '✓' : index + 1}
                      </div>
                      {index < 3 && (
                        <div
                          className={`w-1 h-12 ${
                            step.completed ? 'bg-primary' : 'bg-muted'
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${
                        step.current ? 'text-primary' : step.completed ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {step.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {step.current ? 'In progress' : step.completed ? 'Completed' : 'Pending'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Tracking Number</p>
                <p className="font-mono font-bold text-foreground break-all">{orderData.trackingNumber}</p>
              </div>

              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Transaction ID</p>
                <p className="font-mono font-bold text-foreground break-all">{orderData.transactionId}</p>
              </div>

              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Network Provider</p>
                <p className="font-bold text-foreground">{orderData.network}</p>
              </div>

              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Mobile Number</p>
                <p className="font-mono font-bold text-foreground">{orderData.mobileNumber}</p>
              </div>

              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Order Date</p>
                <p className="font-bold text-foreground">{orderData.date}</p>
              </div>
            </div>

            <div className="bg-secondary/10 rounded-lg p-4 border border-secondary/20">
              <p className="text-sm text-foreground">
                <strong>Note:</strong> You will receive a notification once your SIM is delivered. Keep your tracking number safe for reference.
              </p>
            </div>
          </div>
        )}

        {!orderData && !error && (
          <div className="text-center py-8">
            <Package className="mx-auto mb-4 text-muted-foreground" size={48} />
            <p className="text-muted-foreground text-sm">Enter a tracking number to view order details</p>
          </div>
        )}
      </div>
    </div>
  );
}
