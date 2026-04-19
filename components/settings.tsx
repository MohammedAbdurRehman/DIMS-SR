'use client';

import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Check, X } from 'lucide-react';
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
      // Identity is verified here via the imported utility
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
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess('Email updated successfully');
        setNewEmail('');
        setEmailPassword('');
      } else {
        setError(data.error || 'Failed to update email');
      }
    } catch (err) {
      setError('Verification failed or session expired.');
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

    resetMessages();
    setLoading(true);

    try {
      // Prompting for valid access/re-auth token
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
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.error || 'Failed to change password');
      }
    } catch (err) {
      setError('Identity verification failed.');
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
              onClick={() => { setActiveTab(tab as SettingsTab); resetMessages(); }}
              className={`px-6 py-3 rounded-lg font-semibold capitalize transition-all ${
                activeTab === tab ? 'bg-primary text-white shadow-md' : 'bg-card border border-border text-muted-foreground'
              }`}
            >
              {tab === 'mfa' ? 'Security' : tab}
            </button>
          ))}
        </div>

        <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-lg border border-border">
          {activeTab === 'email' && (
            <form onSubmit={handleEmailChange} className="space-y-6">
              <h2 className="text-2xl font-bold">Change Email Address</h2>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-foreground/70">New Email Address</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Enter your new email"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-foreground/70">Account Password</label>
                  <input
                    type="password"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Confirm current password"
                    required
                  />
                </div>
              </div>
              <button disabled={loading} className="w-full bg-primary text-white py-4 rounded-xl font-bold disabled:opacity-50 transition-all hover:brightness-110">
                {loading ? 'Verifying Identity...' : 'Update Email'}
              </button>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handlePasswordChange} className="space-y-6">
              <h2 className="text-2xl font-bold">Security: Change Password</h2>
              <div className="space-y-4">
                {[
                  { label: 'Current Password', val: currentPassword, set: setCurrentPassword, show: showCurrentPassword, toggle: setShowCurrentPassword },
                  { label: 'New Password', val: newPassword, set: setNewPassword, show: showNewPassword, toggle: setShowNewPassword },
                  { label: 'Confirm New Password', val: confirmPassword, set: setConfirmPassword, show: showConfirmPassword, toggle: setShowConfirmPassword }
                ].map((field, idx) => (
                  <div key={idx}>
                    <label className="block text-sm font-semibold mb-2 text-foreground/70">{field.label}</label>
                    <div className="relative">
                      <input
                        type={field.show ? 'text' : 'password'}
                        value={field.val}
                        onChange={(e) => field.set(e.target.value)}
                        className="w-full px-4 py-3 border border-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary/20"
                        required
                      />
                      <button type="button" onClick={() => field.toggle(!field.show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {field.show ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button disabled={loading} className="w-full bg-primary text-white py-4 rounded-xl font-bold disabled:opacity-50 transition-all hover:brightness-110">
                {loading ? 'Processing...' : 'Update Password'}
              </button>
            </form>
          )}

          {activeTab === 'mfa' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Multi-Factor Authentication</h2>
              <div className="p-6 bg-green-500/5 border border-green-500/10 rounded-xl flex items-center gap-4">
                <div className="p-2 bg-green-500/20 rounded-lg text-green-600">
                  <Check size={24} />
                </div>
                <div>
                  <p className="font-bold">MFA Protection Enabled</p>
                  <p className="text-sm text-muted-foreground">Your account is using an authenticator app for verification.</p>
                </div>
              </div>
              <button 
                onClick={() => onMfaChange?.()} 
                className="w-full bg-primary/10 text-primary py-4 rounded-xl font-bold hover:bg-primary/20 transition-colors"
              >
                Re-configure Authenticator
              </button>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-destructive/10 text-destructive rounded-xl flex items-center gap-2 border border-destructive/20 animate-in fade-in slide-in-from-top-1">
              <X size={18} /> <span className="font-medium">{error}</span>
            </div>
          )}
          {success && (
            <div className="mt-6 p-4 bg-green-500/10 text-green-600 rounded-xl flex items-center gap-2 border border-green-500/20">
              <Check size={18} /> <span className="font-medium">{success}</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}