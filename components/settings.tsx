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

  // Common MFA Verification State
  const [mfaCode, setMfaCode] = useState('');

  // Email Change State
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
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
          mfaCode, // Required for security
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
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
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
          mfaCode, // Required for security
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
        setError(data.error || 'Failed to change password');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaResetInitiation = (e: React.FormEvent) => {
    e.preventDefault();
    if (onMfaChange) {
      onMfaChange(); // Triggers the parent's MFA setup flow
    } else {
      setError('MFA configuration service is unavailable');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card shadow-md border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
          <button onClick={onBack} className="flex items-center gap-2 text-primary hover:underline font-semibold mb-4">
            <ArrowLeft size={20} /> Back to Home
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Account Settings</h1>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {(['email', 'password', 'mfa'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); resetMessages(); }}
              className={`px-6 py-3 rounded-lg font-semibold capitalize transition-all ${
                activeTab === tab ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'
              }`}
            >
              {tab === 'mfa' ? 'Security' : tab}
            </button>
          ))}
        </div>

        <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-lg border border-border">
          {/* Common MFA Input for sensitive changes */}
          {(activeTab === 'email' || activeTab === 'password') && (
            <div className="mb-8 p-4 bg-primary/5 border border-primary/20 rounded-xl flex flex-col sm:flex-row items-center gap-4">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <ShieldCheck size={24} />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h4 className="font-bold text-sm">Identity Verification Required</h4>
                <p className="text-xs text-muted-foreground">Enter the 6-digit code from your Authenticator app to authorize changes.</p>
              </div>
              <input
                type="text"
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-32 text-center tracking-widest text-lg font-mono py-2 border-2 border-primary/30 rounded-lg focus:border-primary outline-none"
              />
            </div>
          )}

          {activeTab === 'email' && (
            <form onSubmit={handleEmailChange} className="space-y-6">
              <h2 className="text-xl font-bold">Update Email Address</h2>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">New Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-lg bg-background"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Confirm Identity (Password)</label>
                  <input
                    type="password"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-lg bg-background"
                    required
                  />
                </div>
              </div>
              <button disabled={loading || mfaCode.length < 6} className="w-full bg-primary text-white py-3 rounded-lg font-bold disabled:opacity-50">
                {loading ? 'Updating...' : 'Update Email'}
              </button>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handlePasswordChange} className="space-y-6">
              <h2 className="text-xl font-bold">Update Password</h2>
              <div className="space-y-4">
                {[
                  { id: 'curr', label: 'Current Password', val: currentPassword, set: setCurrentPassword, show: showCurrentPassword, toggle: setShowCurrentPassword },
                  { id: 'new', label: 'New Password', val: newPassword, set: setNewPassword, show: showNewPassword, toggle: setShowNewPassword },
                  { id: 'conf', label: 'Confirm New Password', val: confirmPassword, set: setConfirmPassword, show: showConfirmPassword, toggle: setShowConfirmPassword }
                ].map((field) => (
                  <div key={field.id}>
                    <label className="block text-sm font-semibold mb-2">{field.label}</label>
                    <div className="relative">
                      <input
                        type={field.show ? 'text' : 'password'}
                        value={field.val}
                        onChange={(e) => field.set(e.target.value)}
                        className="w-full px-4 py-3 border border-border rounded-lg bg-background"
                        required
                      />
                      <button type="button" onClick={() => field.toggle(!field.show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {field.show ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button disabled={loading || mfaCode.length < 6} className="w-full bg-primary text-white py-3 rounded-lg font-bold disabled:opacity-50">
                {loading ? 'Processing...' : 'Change Password'}
              </button>
            </form>
          )}

          {activeTab === 'mfa' && (
            <form onSubmit={handleMfaResetInitiation} className="space-y-6">
              <div className="p-6 bg-green-500/5 border border-green-500/20 rounded-xl">
                <div className="flex items-center gap-3 text-green-600 font-bold mb-2">
                  <Check size={24} /> MFA is Active
                </div>
                <p className="text-sm text-muted-foreground">Your account is secured with two-factor authentication.</p>
              </div>
              <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
                <p className="font-bold">Re-configuring MFA will:</p>
                <ul className="list-disc list-inside opacity-70">
                  <li>Invalidate your current authenticator app link</li>
                  <li>Generate a new secret key and QR code</li>
                  <li>Require you to re-scan with your mobile device</li>
                </ul>
              </div>
              <button type="submit" className="w-full bg-primary text-white py-3 rounded-lg font-bold">
                Re-configure Authenticator
              </button>
            </form>
          )}

          {/* Response Feedback */}
          {error && (
            <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-center gap-2">
              <X size={18} /> {error}
            </div>
          )}
          {success && (
            <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 text-green-600 rounded-lg flex items-center gap-2">
              <Check size={18} /> {success}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}