'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, Package, Truck, CheckCircle, Clock } from 'lucide-react';
import { getApiUrl } from '../lib/utils';

interface TrackOrderProps {
  onBack: () => void;
}

type DisplayStatus = 'Processing' | 'Shipped' | 'In Transit' | 'Delivered';

interface OrderData {
  trackingNumber: string;
  fabricTxId: string;
  transactionId?: string;
  network: string;
  mobileNumber: string;
  status: DisplayStatus;
  date: string;
  lastUpdate?: string;
}

function normalizeStatus(raw: string | undefined): DisplayStatus {
  const key = String(raw || 'processing')
    .toLowerCase()
    .replace(/\s+/g, '-');
  const map: Record<string, DisplayStatus> = {
    confirmed: 'Processing',
    processing: 'Processing',
    shipped: 'Shipped',
    'in-transit': 'In Transit',
    intransit: 'In Transit',
    delivered: 'Delivered',
  };
  return map[key] || 'Processing';
}

function formatDatePart(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value.split('T')[0];
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const s = (value as { seconds: number }).seconds;
    return new Date(s * 1000).toISOString().split('T')[0];
  }
  return undefined;
}

export default function TrackOrder({ onBack }: TrackOrderProps) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const lastTracking = localStorage.getItem('lastTrackingNumber');
    if (lastTracking) {
      setTrackingNumber(lastTracking);
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOrderData(null);

    const trimmed = trackingNumber.trim();
    if (!trimmed) {
      setError('Please enter a tracking number');
      return;
    }

    setLoading(true);
    try {
      const base = getApiUrl();
      const path = `${base}/api/user/track-order/${encodeURIComponent(trimmed)}`;
      const response = await fetch(path);

      const ct = response.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        setError(
          'Could not reach the tracking service. If you are on production, set NEXT_PUBLIC_API_URL to your API base URL (or configure Next.js rewrites to proxy /api to the backend).'
        );
        return;
      }

      let data: Record<string, unknown> = {};
      try {
        data = (await response.json()) as Record<string, unknown>;
      } catch {
        setError('Invalid response from server.');
        return;
      }

      if (!response.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Order not found');
        return;
      }

      const order = data.order as Record<string, unknown> | undefined;
      if (!order || typeof order !== 'object') {
        setError('Unexpected response: missing order data');
        return;
      }

      const timeline = Array.isArray(order.timeline) ? order.timeline : [];
      const lastTs = timeline.length
        ? (timeline[timeline.length - 1] as Record<string, unknown>)?.timestamp
        : undefined;

      const rawStatus = typeof order.status === 'string' ? order.status : 'processing';
      setOrderData({
        trackingNumber: String(order.trackingNumber ?? trimmed),
        fabricTxId: String(order.fabricTxId ?? order.transactionId ?? ''),
        transactionId: String(order.transactionId ?? ''),
        network: String(order.network ?? 'Unknown'),
        mobileNumber: String(order.mobileNumber ?? ''),
        status: normalizeStatus(rawStatus),
        date:
          formatDatePart(order.date) ||
          (typeof order.date === 'string' ? order.date.split('T')[0] : new Date().toLocaleDateString()),
        lastUpdate: formatDatePart(lastTs),
      });
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusSteps = (currentStatus: DisplayStatus) => {
    const steps: DisplayStatus[] = ['Processing', 'Shipped', 'In Transit', 'Delivered'];
    const idx = steps.indexOf(currentStatus);
    const safeIdx = idx >= 0 ? idx : 0;
    return steps.map((step, index) => ({
      label: step,
      completed: index <= safeIdx,
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
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Track Your Order</h1>
        <p className="text-muted-foreground text-sm sm:text-base mb-6 sm:mb-8">
          Enter your tracking number from your order confirmation (e.g. TRK-…)
        </p>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Paste tracking number"
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

        {orderData && (
          <div className="space-y-6">
            <div className="bg-primary/10 rounded-lg p-6 border border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Current Status</p>
                  <p className="text-2xl font-bold text-foreground flex items-center gap-2">
                    {getStatusIcon(orderData.status)}
                    {orderData.status}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-semibold text-foreground">{orderData.lastUpdate ?? '—'}</p>
                </div>
              </div>
            </div>

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
                        <div className={`w-1 h-12 ${step.completed ? 'bg-primary' : 'bg-muted'}`} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`font-semibold ${
                          step.current
                            ? 'text-primary'
                            : step.completed
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                        }`}
                      >
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Tracking Number</p>
                <p className="font-mono font-bold text-foreground break-all">{orderData.trackingNumber}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Fabric TX ID</p>
                <p className="font-mono font-bold text-foreground break-all">{orderData.fabricTxId}</p>
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
                <strong>Note:</strong> Keep your tracking number for reference. Status updates when the order is
                updated in the system.
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
