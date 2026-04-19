'use client';

import { useState } from 'react';
import { ChevronLeft, Mail, Lock, Eye, EyeOff, Shield } from 'lucide-react';
import { getApiUrl } from '../lib/utils';

interface ForgotPasswordProps {
  onBack: () => void;
  onSuccess: () => void;
}

function formatApiError(data: unknown): string {
  if (!data || typeof data !== 'object') return 'Request failed';
  const d = data as Record<string, unknown>;
  if (typeof d.message === 'string') return d.message;
  if (typeof d.error === 'string') return d.error;
  if (d.details && Array.isArray(d.details)) {
    const first = d.details[0] as { message?: string } | undefined;
    if (first?.message) return first.message;
  }
  return 'Request failed';
}

export default function ForgotPassword({ onBack, onSuccess }: ForgotPasswordProps) {
  const [step, setStep] = useState<'verify' | 'newpass'>('verify');
  const [cnic, setCnic] = useState('');
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${getApiUrl()}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnic, email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(formatApiError(data));
        return;
      }
      if (typeof data.resetToken !== 'string' || !data.resetToken) {
        setError('Unexpected response from server.');
        return;
      }
      setResetToken(data.resetToken);
      setStep('newpass');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${getApiUrl()}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToken,
          newPassword,
          confirmPassword,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(formatApiError(data));
        return;
      }
      try {
        sessionStorage.setItem(
          'loginNotice',
          typeof data.message === 'string' ? data.message : 'Password updated. Please sign in.'
        );
      } catch {
        /* ignore */
      }
      onSuccess();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-xl border border-border">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm"
          >
            <ChevronLeft size={20} />
            Back to sign in
          </button>

          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center">
              <Shield className="text-primary-foreground" size={28} />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-foreground mb-2">Forgot password</h1>
          <p className="text-muted-foreground text-center text-sm mb-6">
            {step === 'verify'
              ? 'Enter the CNIC and email registered on your account.'
              : 'Choose a strong new password (same rules as registration).'}
          </p>

          {error && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-3 mb-4 text-destructive text-sm">
              {error}
            </div>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-foreground text-sm font-medium mb-2">CNIC</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 text-muted-foreground" size={20} />
                  <input
                    type="text"
                    value={cnic}
                    onChange={(e) => setCnic(e.target.value.replace(/\D/g, ''))}
                    placeholder="13 digits or with dashes"
                    maxLength={15}
                    className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-input text-foreground text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-foreground text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Registered email"
                  className="w-full px-4 py-3 border border-border rounded-lg bg-input text-foreground text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold disabled:opacity-50"
              >
                {loading ? 'Checking…' : 'Continue'}
              </button>
            </form>
          )}

          {step === 'newpass' && (
            <form onSubmit={handleReset} className="space-y-4">
              <p className="text-xs text-muted-foreground">
                At least 12 characters with uppercase, lowercase, number, and special character (@$!%*?&).
              </p>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-muted-foreground" size={20} />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full pl-10 pr-10 py-3 border border-border rounded-lg bg-input text-foreground text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-3.5 text-muted-foreground"
                >
                  {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-muted-foreground" size={20} />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full pl-10 pr-10 py-3 border border-border rounded-lg bg-input text-foreground text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-3.5 text-muted-foreground"
                >
                  {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
