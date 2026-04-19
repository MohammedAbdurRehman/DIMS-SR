'use client';

import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Check, X, ShieldCheck, ArrowRight } from 'lucide-react';
import { getValidAccessToken, getApiUrl } from '../lib/utils';

interface SettingsProps {
  userData: { cnic: string; email: string };
  onBack: () => void;
  onMfaChange?: () => void;
}

function formatApiError(data: unknown): string {
  if (!data || typeof data !== 'object') return 'Request failed';
  const d = data as Record<string, unknown>;
  if (typeof d.error === 'string') return d.error;
  if (d.details && Array.isArray(d.details)) {
    const first = d.details[0] as { message?: string } | undefined;
    if (first?.message) return first.message;
  }
  return 'Request failed';
}

export default function Settings({ userData, onBack, onMfaChange }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<'email' | 'password' | 'mfa'>('email');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [showMfaPrompt, setShowMfaPrompt] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const resetStatus = () => {
    setError('');
    setSuccess('');
  };

  const buildRequest = (includeMfa: boolean) => {
    const mfa = includeMfa && mfaCode.length === 6 ? { mfaCode } : {};
    switch (activeTab) {
      case 'email':
        return {
          endpoint: '/api/user/change-email',
          body: { newEmail, password: emailPassword, ...mfa },
        };
      case 'password':
        return {
          endpoint: '/api/user/change-password',
          body: {
            currentPassword,
            newPassword,
            confirmPassword,
            ...mfa,
          },
        };
      case 'mfa':
        return {
          endpoint: '/api/user/reset-mfa',
          body: { password: currentPassword, ...mfa },
        };
    }
  };

  const submitChange = async (includeMfa: boolean) => {
    const token = await getValidAccessToken();
    if (!token) {
      setError('Session expired. Please log in again.');
      return;
    }

    const { endpoint, body } = buildRequest(includeMfa);

    const response = await fetch(`${getApiUrl()}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    let data: Record<string, unknown> = {};
    try {
      data = (await response.json()) as Record<string, unknown>;
    } catch {
      setError('Invalid response from server');
      return;
    }

    if (response.status === 403 && data.mfaRequired) {
      setShowMfaPrompt(true);
      setError('');
      return;
    }

    if (response.ok) {
      const msg =
        (typeof data.message === 'string' && data.message) ||
        'Action successful';
      setSuccess(msg);
      setShowMfaPrompt(false);
      setMfaCode('');
      setNewEmail('');
      setEmailPassword('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (activeTab === 'mfa' && onMfaChange) {
        onMfaChange();
      }
      return;
    }

    setError(formatApiError(data));
  };

  const handleInitiateChange = async (e: React.FormEvent) => {
    e.preventDefault();
    resetStatus();

    if (activeTab === 'password' && newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await submitChange(false);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalVerify = async () => {
    if (mfaCode.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      await submitChange(true);
    } catch {
      setError('MFA verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card shadow-sm border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-primary font-bold">
            <ArrowLeft size={20} /> Back
          </button>
          <h1 className="text-xl font-bold">Account Settings</h1>
          <div className="w-10"></div>
        </div>
      </div>

      <main className="max-w-xl mx-auto px-4 py-10">
        {!showMfaPrompt && (
          <div className="flex bg-muted p-1 rounded-xl mb-8 border border-border">
            {(['email', 'password', 'mfa'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  resetStatus();
                }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg capitalize transition-all ${
                  activeTab === tab ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'
                }`}
              >
                {tab === 'mfa' ? 'Security' : tab}
              </button>
            ))}
          </div>
        )}

        <div className="bg-card rounded-[2.5rem] p-8 border border-border shadow-xl">
          {showMfaPrompt ? (
            <div className="space-y-6 text-center animate-in fade-in zoom-in duration-300">
              <ShieldCheck size={48} className="text-primary mx-auto" />
              <h2 className="text-2xl font-bold">Verification Required</h2>
              <p className="text-muted-foreground text-sm">
                Enter the code from your app to authorize this {activeTab} change.
              </p>

              <input
                type="text"
                maxLength={6}
                value={mfaCode}
                autoFocus
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full text-center text-4xl tracking-[0.3em] font-mono py-4 border-2 rounded-2xl focus:border-primary outline-none bg-muted/20"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowMfaPrompt(false);
                    setMfaCode('');
                    resetStatus();
                  }}
                  className="flex-1 py-3 font-bold text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFinalVerify}
                  disabled={loading || mfaCode.length < 6}
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-bold disabled:opacity-50 shadow-lg"
                >
                  {loading ? 'Verifying...' : 'Verify & Confirm'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {activeTab === 'email' && (
                <form onSubmit={handleInitiateChange} className="space-y-4">
                  <h2 className="text-xl font-bold">Change Registered Email</h2>
                  <input
                    type="email"
                    placeholder="New Email Address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full p-4 border rounded-xl bg-background"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Current Password"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    className="w-full p-4 border rounded-xl bg-background"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    Continue <ArrowRight size={18} />
                  </button>
                </form>
              )}

              {activeTab === 'password' && (
                <form onSubmit={handleInitiateChange} className="space-y-4">
                  <h2 className="text-xl font-bold">Update Password</h2>
                  <p className="text-sm text-muted-foreground">
                    At least 12 characters with uppercase, lowercase, number, and a special character (@$!%*?&).
                  </p>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder="Current Password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full p-4 pr-12 border rounded-xl bg-background"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-4 pr-12 border rounded-xl bg-background"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm New Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full p-4 pr-12 border rounded-xl bg-background"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    Continue <ArrowRight size={18} />
                  </button>
                </form>
              )}

              {activeTab === 'mfa' && (
                <div className="text-center py-6 space-y-6">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                    <Check size={32} className="text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">MFA is Active</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      To re-configure your authenticator app, we must first verify your password.
                    </p>
                  </div>
                  <form onSubmit={handleInitiateChange} className="space-y-4 text-left">
                    <input
                      type="password"
                      placeholder="Enter Account Password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full p-4 border rounded-xl bg-background"
                      required
                    />
                    <button
                      type="submit"
                      className="w-full bg-secondary text-secondary-foreground py-4 rounded-xl font-bold"
                    >
                      Verify & Re-configure
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20 text-sm font-semibold flex items-center gap-2">
              <X size={16} /> {error}
            </div>
          )}
          {success && (
            <div className="mt-4 p-3 bg-green-500/10 text-green-600 rounded-lg border border-green-500/20 text-sm font-semibold flex items-center gap-2">
              <Check size={16} /> {success}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
