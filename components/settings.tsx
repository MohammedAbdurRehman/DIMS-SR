'use client';

import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Check, X, ShieldCheck } from 'lucide-react';
import { getValidAccessToken, getApiUrl } from '../lib/utils';

interface SettingsProps {
  userData: { cnic: string; email: string };
  onBack: () => void;
  onMfaChange?: () => void;
}

type SettingsTab = 'email' | 'password' | 'mfa';

export default function Settings({ userData, onBack, onMfaChange }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('email');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Critical: MFA State
  const [mfaCode, setMfaCode] = useState('');

  // Form States
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Helper to clear messages
  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (mfaCode.length !== 6) {
      setError('Please enter a complete 6-digit MFA code');
      return;
    }

    setLoading(true);
    try {
      const token = await getValidAccessToken();
      const response = await fetch(`${getApiUrl()}/api/user/change-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          newEmail,
          password: emailPassword,
          mfaCode: mfaCode.trim(), // Ensure no whitespace
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess('Email updated successfully');
        setNewEmail('');
        setEmailPassword('');
        setMfaCode('');
      } else {
        setError(data.error || 'Failed to update email');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (mfaCode.length !== 6) {
      setError('MFA code must be 6 digits');
      return;
    }

    setLoading(true);
    try {
      const token = await getValidAccessToken();
      const response = await fetch(`${getApiUrl()}/api/user/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          mfaCode: mfaCode.trim(),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setMfaCode('');
      } else {
        setError(data.error || 'MFA verification failed');
      }
    } catch (error) {
      setError('An error occurred during password change.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card shadow-md border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button onClick={onBack} className="flex items-center gap-2 text-primary font-semibold mb-4">
            <ArrowLeft size={20} /> Back to Home
          </button>
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex gap-2 mb-8 border-b border-border">
          {['email', 'password', 'mfa'].map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab as SettingsTab); clearMessages(); }}
              className={`px-6 py-3 font-semibold capitalize border-b-2 transition-colors ${
                activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
              }`}
            >
              {tab === 'mfa' ? 'Security' : tab}
            </button>
          ))}
        </div>

        <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
          {/* Unified MFA verification block that is always visible in forms */}
          {activeTab !== 'mfa' && (
            <div className="mb-10 p-5 bg-primary/5 border border-primary/20 rounded-xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Security Verification</h3>
                  <p className="text-xs text-muted-foreground">Verification is required for sensitive account changes.</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Authenticator Code</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full sm:w-64 text-center text-2xl tracking-[0.5em] font-mono py-3 border-2 border-primary/20 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                />
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <form onSubmit={handleEmailChange} className="space-y-6">
              <h2 className="text-2xl font-bold mb-4">Update Email Address</h2>
              <div>
                <label className="block text-sm font-semibold mb-2">Current Email</label>
                <input type="text" value={userData.email} disabled className="w-full px-4 py-3 bg-muted border rounded-lg text-muted-foreground" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">New Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg bg-background"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Confirm Identity (Password)</label>
                <input
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg bg-background"
                  required
                />
              </div>
              <button disabled={loading || mfaCode.length < 6} className="w-full bg-primary text-white py-4 rounded-xl font-bold disabled:opacity-50 transition-all hover:shadow-lg">
                {loading ? 'Processing...' : 'Update Email Address'}
              </button>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handlePasswordChange} className="space-y-6">
              <h2 className="text-2xl font-bold mb-4">Security: Change Password</h2>
              <div className="space-y-4">
                {[
                  { label: 'Current Password', val: currentPassword, set: setCurrentPassword, show: showCurrentPassword, setShow: setShowCurrentPassword },
                  { label: 'New Password', val: newPassword, set: setNewPassword, show: showNewPassword, setShow: setShowNewPassword },
                  { label: 'Confirm New Password', val: confirmPassword, set: setConfirmPassword, show: showConfirmPassword, setShow: setShowConfirmPassword }
                ].map((field, idx) => (
                  <div key={idx}>
                    <label className="block text-sm font-semibold mb-2">{field.label}</label>
                    <div className="relative">
                      <input
                        type={field.show ? 'text' : 'password'}
                        value={field.val}
                        onChange={(e) => field.set(e.target.value)}
                        className="w-full px-4 py-3 border rounded-lg bg-background"
                        required
                      />
                      <button type="button" onClick={() => field.setShow(!field.show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {field.show ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button disabled={loading || mfaCode.length < 6} className="w-full bg-primary text-white py-4 rounded-xl font-bold disabled:opacity-50 transition-all hover:shadow-lg">
                {loading ? 'Verifying...' : 'Change Password'}
              </button>
            </form>
          )}

          {activeTab === 'mfa' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Manage MFA</h2>
              <div className="p-6 bg-green-500/5 border border-green-500/20 rounded-xl flex items-center gap-4">
                <Check className="text-green-600" size={32} />
                <p className="text-sm font-medium">Your account is currently protected by an Authenticator App.</p>
              </div>
              <button onClick={() => onMfaChange?.()} className="w-full bg-secondary text-secondary-foreground py-4 rounded-xl font-bold">
                Re-configure Authenticator App
              </button>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-destructive/10 text-destructive rounded-xl flex items-center gap-2 border border-destructive/20 animate-in fade-in slide-in-from-top-1">
              <X size={18} /> <span className="text-sm font-bold">{error}</span>
            </div>
          )}
          {success && (
            <div className="mt-6 p-4 bg-green-500/10 text-green-600 rounded-xl flex items-center gap-2 border border-green-500/20">
              <Check size={18} /> <span className="text-sm font-bold">{success}</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}