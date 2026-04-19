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

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.length !== 6) {
      setError('Please enter a valid 6-digit MFA code');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

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
          mfaCode, 
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
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (mfaCode.length !== 6) {
      setError('MFA code is required');
      return;
    }

    setLoading(true);
    setError('');

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
          mfaCode,
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
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card shadow-md border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button onClick={onBack} className="flex items-center gap-2 text-primary hover:underline font-semibold mb-4">
            <ArrowLeft size={20} /> Back to Home
          </button>
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex gap-2 mb-8">
          {['email', 'password', 'mfa'].map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab as SettingsTab); setError(''); setSuccess(''); }}
              className={`px-6 py-3 rounded-lg font-semibold capitalize ${
                activeTab === tab ? 'bg-primary text-white' : 'bg-card border'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
          {activeTab !== 'mfa' && (
            <div className="mb-8 p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-4">
              <ShieldCheck className="text-primary" size={24} />
              <div className="flex-1">
                <p className="text-sm font-bold">2FA Verification</p>
                <p className="text-xs text-muted-foreground">Enter code from your app to authorize changes.</p>
              </div>
              <input
                type="text"
                maxLength={6}
                placeholder="000000"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                className="w-28 text-center text-lg font-mono py-2 border-2 rounded-lg focus:border-primary outline-none"
              />
            </div>
          )}

          {activeTab === 'email' && (
            <form onSubmit={handleEmailChange} className="space-y-6">
              <h2 className="text-2xl font-bold">Change Email Address</h2>
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
                <label className="block text-sm font-semibold mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg bg-background"
                  required
                />
              </div>
              <button disabled={loading} className="w-full bg-primary text-white py-3 rounded-lg font-bold disabled:opacity-50">
                {loading ? 'Updating...' : 'Update Email'}
              </button>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handlePasswordChange} className="space-y-6">
              <h2 className="text-2xl font-bold">Change Password</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Current Password</label>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 border rounded-lg bg-background"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">New Password</label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 border rounded-lg bg-background"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Confirm New Password</label>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border rounded-lg bg-background"
                    required
                  />
                </div>
              </div>
              <button disabled={loading} className="w-full bg-primary text-white py-3 rounded-lg font-bold disabled:opacity-50">
                {loading ? 'Changing Password...' : 'Update Password'}
              </button>
            </form>
          )}

          {activeTab === 'mfa' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Security Settings</h2>
              <p className="text-muted-foreground">Manage your Multi-Factor Authentication.</p>
              <button 
                onClick={() => onMfaChange?.()} 
                className="w-full bg-primary text-white py-3 rounded-lg font-bold"
              >
                Re-configure Authenticator App
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2 border border-destructive/20">
              <X size={18} /> {error}
            </div>
          )}
          {success && (
            <div className="mt-4 p-4 bg-green-500/10 text-green-600 rounded-lg flex items-center gap-2 border border-green-500/20">
              <Check size={18} /> {success}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}