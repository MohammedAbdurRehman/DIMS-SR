'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, Smartphone, Phone, MapPin, CreditCard, AlertCircle, Fingerprint, CheckCircle } from 'lucide-react';
import { getValidAccessToken, getApiUrl } from '../lib/utils';
import FingerprintCapture from './fingerprint-capture';

interface SimRegistrationProps {
  cnic: string;
  onBack: () => void;
}

type Step = 'select-network' | 'select-number' | 'payment' | 'address' | 'fingerprint' | 'confirmation' | 'success';

export default function SimRegistration({ cnic, onBack }: SimRegistrationProps) {
  const [currentStep, setCurrentStep] = useState<Step>('select-network');
  const [registeredSimCount, setRegisteredSimCount] = useState(0);
  const [simsBlocked, setSimsBlocked] = useState(false);
  const [showFingerprintCapture, setShowFingerprintCapture] = useState(false);
  const [fingerprintVerified, setFingerprintVerified] = useState(false);
  const [fingerprintImages, setFingerprintImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    network: '',
    mobileNumber: '',
    paymentMethod: 'cod',
    deliveryAddress: '',
    paymentAddress: '',
    sameAddress: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationData, setConfirmationData] = useState<{
    transactionId: string;
    fabricTxId: string | null;
    trackingNumber: string;
  } | null>(null);

  useEffect(() => {
    const sims = JSON.parse(localStorage.getItem('registeredSims') || '[]');
    const count = sims.filter((sim: any) => sim.status !== 'inactive').length;
    setRegisteredSimCount(count);
    setSimsBlocked(count >= 5);
  }, []);

  const networks = ['Jazz', 'Zong', 'Telenor', 'Warid'];
  
  const getMobileNumbers = () => {
    const numbers: { [key: string]: string[] } = {
      'Jazz': ['03001234567', '03011234567', '03021234567', '03031234567'],
      'Zong': ['03101234567', '03111234567', '03121234567', '03131234567'],
      'Telenor': ['03201234567', '03211234567', '03221234567', '03231234567'],
      'Warid': ['03301234567', '03311234567', '03321234567', '03331234567'],
    };
    return numbers[formData.network] || [];
  };

  if (simsBlocked) {
    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm sm:text-base"
        >
          <ChevronLeft size={20} />
          Back to Dashboard
        </button>

        <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-lg border border-destructive">
          <div className="text-center mb-6">
            <AlertCircle size={48} className="mx-auto text-destructive mb-4" />
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              SIM Registration Limit Reached
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              You have reached the maximum limit of 5 active SIMs per CNIC
            </p>
          </div>

          <div className="bg-destructive/10 rounded-lg p-6 mb-6 border border-destructive/20">
            <h2 className="font-bold text-foreground mb-3 text-lg">Active SIMs: {registeredSimCount}/5</h2>
            <p className="text-muted-foreground text-sm mb-4">
              To register a new SIM, you must first deactivate one of your existing SIMs.
            </p>
            <div className="bg-card rounded p-4 border border-border">
              <p className="text-sm text-foreground">
                Steps to follow:
              </p>
              <ol className="list-decimal list-inside text-sm text-muted-foreground mt-2 space-y-1">
                <li>Go to "View Registered SIMs"</li>
                <li>Click "Deactivate" on any active SIM</li>
                <li>Return to register a new SIM</li>
              </ol>
            </div>
          </div>

          <button
            onClick={onBack}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-secondary transition-colors"
          >
            Go Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (confirmationData) {
    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => {
            setConfirmationData(null);
            setFormData({ network: '', mobileNumber: '', paymentMethod: 'cod', deliveryAddress: '', paymentAddress: '', sameAddress: true });
            setCurrentStep('select-network');
            onBack();
          }}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm sm:text-base"
        >
          <ChevronLeft size={20} />
          Back to Dashboard
        </button>

        <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-lg border border-border">
          <div className="text-center mb-8">
            <div className="text-6xl sm:text-7xl mb-4">✓</div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Order Confirmed!
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Your SIM registration request has been submitted
            </p>
          </div>

          <div className="bg-primary/10 rounded-lg p-6 mb-6 border border-primary/20 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Fabric TX ID:</span>
              <span className="font-mono font-bold text-foreground text-sm sm:text-base break-all">{confirmationData.fabricTxId || confirmationData.transactionId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Tracking Number:</span>
              <span className="font-mono font-bold text-foreground text-sm sm:text-base break-all">{confirmationData.trackingNumber}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Network:</span>
              <span className="font-bold text-foreground">{formData.network}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Mobile Number:</span>
              <span className="font-bold text-foreground">{formData.mobileNumber}</span>
            </div>
          </div>

          <div className="bg-secondary/10 rounded-lg p-4 mb-6 border border-secondary/20">
            <p className="text-sm text-foreground">
              You can track your order using the tracking number. A confirmation email has been sent to your registered email.
            </p>
          </div>

          <button
            onClick={() => {
              setConfirmationData(null);
              setFormData({ network: '', mobileNumber: '', paymentMethod: 'cod', deliveryAddress: '', paymentAddress: '', sameAddress: true });
              setCurrentStep('select-network');
              onBack();
            }}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-secondary transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleNetworkSelect = (network: string) => {
    setFormData(prev => ({ ...prev, network, mobileNumber: '' }));
    setCurrentStep('select-number');
  };

  const handleNumberSelect = (number: string) => {
    setFormData(prev => ({ ...prev, mobileNumber: number }));
    setCurrentStep('payment');
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = () => {
    setFormData(prev => ({
      ...prev,
      sameAddress: !prev.sameAddress,
      paymentAddress: !prev.sameAddress ? '' : prev.deliveryAddress,
    }));
  };

  const handleAddressSubmit = async () => {
    setError('');
    if (!formData.deliveryAddress.trim()) {
      setError('Delivery address is required');
      return;
    }
    if (!formData.sameAddress && !formData.paymentAddress.trim()) {
      setError('Payment address is required');
      return;
    }
    
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCurrentStep('fingerprint'); // Go to fingerprint step before confirmation
    } finally {
      setLoading(false);
    }
  };

  const handleFingerprintVerification = (verified: boolean, images: string[]) => {
    setShowFingerprintCapture(false);
    if (verified) {
      setFingerprintVerified(true);
      setFingerprintImages(images);
      setCurrentStep('confirmation');
    } else {
      setError('Fingerprint verification failed. Please try again.');
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getValidAccessToken();
      if (!token) {
        setError('Session expired. Please login again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${getApiUrl()}/api/sim/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mobileNetwork: formData.network.toLowerCase(),
          mobileNumber: formData.mobileNumber,
          deliveryAddress: formData.deliveryAddress,
          paymentAddress: formData.sameAddress ? formData.deliveryAddress : formData.paymentAddress,
          sameAsDelivery: formData.sameAddress,
          fingerprintImages: fingerprintImages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'SIM registration failed');
        setLoading(false);
        return;
      }

      setConfirmationData({
        transactionId: data.transaction.transactionId,
        fabricTxId: data.transaction.fabricTxId || null,
        trackingNumber: data.transaction.trackingNumber,
      });
      setCurrentStep('success');
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Fingerprint capture modal */}
      {showFingerprintCapture && (
        <FingerprintCapture
          cnic={cnic}
          onVerificationComplete={handleFingerprintVerification}
          onCancel={() => setShowFingerprintCapture(false)}
        />
      )}

      <button
        onClick={() => {
          if (currentStep === 'select-network') {
            onBack();
          } else if (currentStep === 'select-number') {
            setCurrentStep('select-network');
          } else if (currentStep === 'payment') {
            setCurrentStep('select-number');
          } else if (currentStep === 'address') {
            setCurrentStep('payment');
          } else if (currentStep === 'fingerprint') {
            setCurrentStep('address');
          } else {
            setCurrentStep('fingerprint');
          }
        }}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm sm:text-base"
      >
        <ChevronLeft size={20} />
        Back
      </button>

      {/* Step 1: Select Network */}
      {currentStep === 'select-network' && (
        <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-lg border border-border">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Select Network Provider
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mb-6 sm:mb-8">
            Choose your preferred mobile network operator
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {networks.map(network => (
              <button
                key={network}
                onClick={() => handleNetworkSelect(network)}
                className="p-6 border-2 border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <Smartphone className="text-primary" size={24} />
                  <div>
                    <p className="font-bold text-foreground">{network}</p>
                    <p className="text-sm text-muted-foreground">Network Operator</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Select Mobile Number */}
      {currentStep === 'select-number' && (
        <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-lg border border-border">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Select Mobile Number
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mb-6 sm:mb-8">
            Choose a mobile number from available options
          </p>

          <div className="space-y-3">
            {getMobileNumbers().map(number => (
              <button
                key={number}
                onClick={() => handleNumberSelect(number)}
                className="w-full p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left flex items-center gap-3"
              >
                <Phone className="text-primary flex-shrink-0" size={20} />
                <span className="font-mono font-bold text-foreground">{number}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Payment Method */}
      {currentStep === 'payment' && (
        <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-lg border border-border">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Payment Method
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mb-6 sm:mb-8">
            Selected: {formData.network} - {formData.mobileNumber}
          </p>

          <div className="bg-secondary/10 rounded-lg p-4 mb-6 border border-secondary/20">
            <div className="flex items-center gap-3">
              <CreditCard className="text-secondary" size={24} />
              <div>
                <p className="font-bold text-foreground">Cash on Delivery</p>
                <p className="text-sm text-muted-foreground">Pay when you receive your SIM</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setCurrentStep('address')}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-secondary transition-colors"
          >
            Continue to Address
          </button>
        </div>
      )}

      {/* Step 4: Delivery Address */}
      {currentStep === 'address' && (
        <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-lg border border-border">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Delivery Information
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mb-6 sm:mb-8">
            Enter your delivery and payment addresses
          </p>

          {error && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-3 mb-4 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Delivery Address */}
            <div>
              <label className="block text-foreground text-sm font-medium mb-2">
                Delivery Address
              </label>
              <textarea
                name="deliveryAddress"
                value={formData.deliveryAddress}
                onChange={handleAddressChange}
                placeholder="Street address, city, postal code"
                rows={4}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-sm sm:text-base bg-input text-foreground placeholder-muted-foreground"
              />
            </div>

            {/* Same Address Checkbox */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="sameAddress"
                checked={formData.sameAddress}
                onChange={handleCheckboxChange}
                className="mt-1 w-4 h-4 rounded border-border bg-input cursor-pointer"
              />
              <label htmlFor="sameAddress" className="text-sm text-foreground cursor-pointer">
                Payment address is same as delivery address
              </label>
            </div>

            {/* Payment Address */}
            {!formData.sameAddress && (
              <div>
                <label className="block text-foreground text-sm font-medium mb-2">
                  Payment Address
                </label>
                <textarea
                  name="paymentAddress"
                  value={formData.paymentAddress}
                  onChange={handleAddressChange}
                  placeholder="Street address, city, postal code"
                  rows={4}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-sm sm:text-base bg-input text-foreground placeholder-muted-foreground"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => setCurrentStep('payment')}
                className="flex-1 px-4 py-3 border border-border rounded-lg font-semibold text-foreground hover:bg-muted transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleAddressSubmit}
                disabled={loading}
                className="flex-1 bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Review Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Fingerprint Verification */}
      {currentStep === 'fingerprint' && (
        <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-lg border border-border">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Biometric Verification
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mb-6">
            NADRA requires fingerprint verification to complete SIM registration
          </p>

          {error && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-3 mb-4 text-destructive text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="bg-primary/5 rounded-xl p-6 border border-primary/20 mb-6 text-center">
            {fingerprintVerified ? (
              <>
                <div className="text-green-500 mb-3">✓</div>
                <p className="font-semibold text-green-600 dark:text-green-400">Fingerprint Verified!</p>
                <p className="text-xs text-muted-foreground mt-1">Identity confirmed by NADRA</p>
              </>
            ) : (
              <>
                <Fingerprint size={48} className="mx-auto text-primary mb-3 opacity-70" />
                <p className="font-semibold text-foreground mb-1">Fingerprint Required</p>
                <p className="text-xs text-muted-foreground">
                  Your biometric data will be verified against NADRA's database before SIM issuance
                </p>
              </>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setCurrentStep('address')}
              className="flex-1 px-4 py-3 border border-border rounded-lg font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Back
            </button>
            {fingerprintVerified ? (
              <button
                onClick={() => setCurrentStep('confirmation')}
                className="flex-1 bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-secondary transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={() => setShowFingerprintCapture(true)}
                className="flex-1 bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-secondary transition-colors flex items-center justify-center gap-2"
              >
                <Fingerprint size={18} />
                Scan Fingerprint
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 6: Confirmation */}
      {currentStep === 'confirmation' && (
        <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-lg border border-border">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">
            Order Summary
          </h1>

          <div className="space-y-4 mb-6">
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Network Provider</p>
              <p className="font-bold text-foreground text-lg">{formData.network}</p>
            </div>

            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Mobile Number</p>
              <p className="font-bold text-foreground text-lg font-mono">{formData.mobileNumber}</p>
            </div>

            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Delivery Address</p>
              <p className="font-bold text-foreground whitespace-pre-wrap">{formData.deliveryAddress}</p>
            </div>

            {!formData.sameAddress && (
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Payment Address</p>
                <p className="font-bold text-foreground whitespace-pre-wrap">{formData.paymentAddress}</p>
              </div>
            )}

            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Payment Method</p>
              <p className="font-bold text-foreground">Cash on Delivery</p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setCurrentStep('address')}
              className="flex-1 px-4 py-3 border border-border rounded-lg font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Confirm Order'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
