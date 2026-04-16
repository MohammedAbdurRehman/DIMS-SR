'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, Shield } from 'lucide-react';
import { getApiUrl } from '../lib/utils';

interface MfaVerificationProps {
  email: string;
  onVerify: () => void;
  onBack: () => void;
}

export default function MfaVerification({
  email,
  onVerify,
  onBack,
}: MfaVerificationProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(300);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const otpValue = otp.join('');

      if (otpValue.length !== 6) {
        setError('Please enter a valid 6-digit code');
        setLoading(false);
        return;
      }

      // Make API call to verify MFA
      const tempToken = localStorage.getItem('tempToken');
      const response = await fetch(`${getApiUrl()}/api/auth/mfa/verify-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tempToken, code: otpValue }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'MFA verification failed');
        setLoading(false);
        return;
      }

      // Store tokens
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.removeItem('tempToken');

      onVerify();
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-xl border border-border">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 sm:mb-8 text-sm sm:text-base"
          >
            <ChevronLeft size={20} />
            Back
          </button>

          {/* Header */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center">
              <Shield className="text-primary-foreground" size={32} />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-2">
            Enter Code
          </h1>
          <p className="text-muted-foreground text-center text-sm sm:text-base mb-2">
            Enter the 6-digit code from your authenticator app
          </p>

          {error && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-3 mb-4 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* OTP Input */}
            <div className="flex justify-between gap-2 sm:gap-3 mb-6 sm:mb-8">
              {otp.map((value, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={value}
                  onChange={(e) => handleChange(e.target.value, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-border rounded-lg text-center font-bold text-lg sm:text-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-input text-foreground"
                />
              ))}
            </div>

            {/* Timer */}
            <div className="text-center mb-6 sm:mb-8">
              <p className="text-muted-foreground text-sm">
                Code expires in{' '}
                <span className="font-bold text-foreground">
                  {formatTime(timeLeft)}
                </span>
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || otp.some((val) => !val)}
              className="w-full bg-primary text-primary-foreground py-3 sm:py-3.5 rounded-lg font-semibold hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4 text-sm sm:text-base"
            >
              {loading ? 'Verifying...' : 'VERIFY'}
            </button>
          </form>

          {/* Resend Code */}
          <div className="text-center">
            <p className="text-muted-foreground text-xs sm:text-sm">
              Didn't receive any code?{' '}
              <button
                onClick={() => {
                  setTimeLeft(300);
                  setError('Code resent to your email');
                }}
                className="text-primary hover:text-secondary font-semibold"
              >
                Resend
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
