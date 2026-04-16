'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Shield } from 'lucide-react';
import { getValidAccessToken } from '../lib/utils';

interface MfaSetupProps {
  email: string;
  onComplete: (secret: string) => void;
}

export default function MfaSetup({ email, onComplete }: MfaSetupProps) {
  const [step, setStep] = useState<'display' | 'confirm'>('display');
  const [copied, setCopied] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    const fetchMfaSetup = async () => {
      try {
        const token = await getValidAccessToken();
        if (!token) {
          setError('Session expired. Please login again.');
          return;
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/mfa/setup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (response.ok) {
          setQrCodeUrl(data.qrCode);
        } else {
          setError(data.error || 'Failed to setup MFA');
        }
      } catch (error) {
        setError('Network error. Please try again.');
      }
    };

    fetchMfaSetup();
  }, []);

  const secret = 'JBSWY3DPEBLW64TMMQ======';
  const manualEntryKey = 'DIMS-SR-2024-' + Math.random().toString(36).substring(7).toUpperCase();

  const handleCopySecret = () => {
    navigator.clipboard.writeText(manualEntryKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleContinue = () => {
    onComplete(''); // No need for secret, backend handles it
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = await getValidAccessToken();
      if (!token) {
        setError('Session expired. Please login again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/mfa/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: verificationCode }),
      });

      const data = await response.json();

      if (response.ok) {
        onComplete(''); // MFA setup complete
      } else {
        setError(data.error || 'Verification failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-xl border border-border">
          {step === 'display' && (
            <>
              {/* Header */}
              <div className="flex justify-center mb-6 sm:mb-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center">
                  <Shield className="text-primary-foreground" size={32} />
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-2">
                Setup MFA
              </h1>
              <p className="text-muted-foreground text-center text-sm sm:text-base mb-6 sm:mb-8">
                Secure your account with Multi-Factor Authentication
              </p>

              {/* QR Code Section */}
              <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-muted rounded-lg border border-border">
                <p className="text-foreground text-sm font-semibold mb-4 text-center">
                  Scan with Authenticator App
                </p>
                <div className="flex justify-center mb-4">
                  <div className="w-56 h-56 bg-white border-2 border-border rounded-lg p-2 flex items-center justify-center">
                    {qrCodeUrl ? (
                      <img
                        src={qrCodeUrl || "/placeholder.svg"}
                        alt="QR Code for 2FA setup"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-muted-foreground">Loading QR code...</div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Use Google Authenticator, Microsoft Authenticator, or Authy
                </p>
              </div>

              {/* Manual Entry Section */}
              <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-secondary/10 rounded-lg border border-border">
                <p className="text-foreground text-sm font-semibold mb-3">
                  Can't scan? Enter manually:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs sm:text-sm font-mono bg-input text-foreground p-3 rounded border border-border break-all">
                    {manualEntryKey}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                  >
                    {copied ? (
                      <Check size={20} className="text-primary" />
                    ) : (
                      <Copy size={20} />
                    )}
                  </button>
                </div>
              </div>

              {/* Next Button */}
              <button
                onClick={() => setStep('confirm')}
                className="w-full bg-primary text-primary-foreground py-3 sm:py-3.5 rounded-lg font-semibold hover:bg-secondary transition-colors text-sm sm:text-base"
              >
                I've Scanned the QR Code
              </button>
            </>
          )}

          {step === 'confirm' && (
            <>
              {/* Header */}
              <div className="flex justify-center mb-6 sm:mb-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center">
                  <Shield className="text-primary-foreground" size={32} />
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-2">
                Verify Setup
              </h1>
              <p className="text-muted-foreground text-center text-sm sm:text-base mb-6 sm:mb-8">
                Enter the 6-digit code from your authenticator app
              </p>

              {error && (
                <div className="bg-destructive/10 border border-destructive rounded-lg p-3 mb-4 text-destructive text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleVerify}>
                <div className="mb-6 sm:mb-8">
                  <label className="block text-foreground text-sm font-medium mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-center text-lg sm:text-xl font-bold tracking-widest bg-input text-foreground placeholder-muted-foreground"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || verificationCode.length !== 6}
                  className="w-full bg-primary text-primary-foreground py-3 sm:py-3.5 rounded-lg font-semibold hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('display')}
                  className="w-full mt-3 text-primary hover:text-secondary font-semibold text-sm"
                >
                  Back
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
