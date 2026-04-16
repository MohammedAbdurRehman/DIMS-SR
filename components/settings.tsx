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
  const [showPassword, setShowPassword] = useState(false);

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
    setError('Email change feature is not yet implemented');
    setSuccess('');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const token = await getValidAccessToken();
      if (!token) {
        setError('Session expired. Please login again.');
        setLoading(false);
        return;
      }

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
        setSuccess(data.message);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setSuccess('');
        }, 3000);
      } else {
        setError(data.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  const handleMfaChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('MFA change feature is not yet implemented');
    setSuccess('');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card shadow-md border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-primary hover:text-secondary transition-colors font-semibold mb-4"
          >
            <ArrowLeft size={20} />
            Back to Home
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">Manage your account settings</p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('email')}
            className={`px-4 sm:px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${
              activeTab === 'email'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-foreground hover:border-primary'
            }`}
          >
            Change Email
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`px-4 sm:px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${
              activeTab === 'password'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-foreground hover:border-primary'
            }`}
          >
            Change Password
          </button>
          <button
            onClick={() => setActiveTab('mfa')}
            className={`px-4 sm:px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${
              activeTab === 'mfa'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-foreground hover:border-primary'
            }`}
          >
            Change MFA
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-lg border border-border">
          {/* Change Email Tab */}
          {activeTab === 'email' && (
            <form onSubmit={handleEmailChange}>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6">Change Email Address</h2>
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Current Email
                  </label>
                  <input
                    type="email"
                    value={userData.email}
                    disabled
                    className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-muted-foreground font-medium"
                  />
                </div>
                <div>
                  <label htmlFor="newEmail" className="block text-sm font-semibold text-foreground mb-2">
                    New Email Address
                  </label>
                  <input
                    id="newEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email"
                    className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="emailPassword" className="block text-sm font-semibold text-foreground mb-2">
                    Confirm Password
                  </label>
                  <input
                    id="emailPassword"
                    type="password"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    placeholder="Enter your password to confirm"
                    className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              {/* Messages */}
              {error && (
                <div className="mt-4 flex items-center gap-2 p-3 sm:p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <X size={20} className="text-destructive flex-shrink-0" />
                  <p className="text-destructive text-sm sm:text-base">{error}</p>
                </div>
              )}
              {success && (
                <div className="mt-4 flex items-center gap-2 p-3 sm:p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <Check size={20} className="text-green-500 flex-shrink-0" />
                  <p className="text-green-600 text-sm sm:text-base">{success}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 sm:mt-8 bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-secondary transition-colors disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Email'}
              </button>
            </form>
          )}

          {/* Change Password Tab */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordChange}>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6">Change Password</h2>
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-semibold text-foreground mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-semibold text-foreground mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 8 characters)"
                      className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-foreground mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              {error && (
                <div className="mt-4 flex items-center gap-2 p-3 sm:p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <X size={20} className="text-destructive flex-shrink-0" />
                  <p className="text-destructive text-sm sm:text-base">{error}</p>
                </div>
              )}
              {success && (
                <div className="mt-4 flex items-center gap-2 p-3 sm:p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <Check size={20} className="text-green-500 flex-shrink-0" />
                  <p className="text-green-600 text-sm sm:text-base">{success}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 sm:mt-8 bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-secondary transition-colors disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Change Password'}
              </button>
            </form>
          )}

          {/* Change MFA Tab */}
          {activeTab === 'mfa' && (
            <form onSubmit={handleMfaChange}>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6">Change MFA Settings</h2>
              <div className="space-y-4 sm:space-y-6 mb-8">
                <div className="p-4 sm:p-6 bg-primary/10 border border-primary/30 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">MFA Status</h3>
                  <p className="text-muted-foreground text-sm sm:text-base mb-3">
                    Your account is currently protected with Multi-Factor Authentication.
                  </p>
                  <div className="flex items-center gap-2 text-green-600 font-semibold">
                    <Check size={20} />
                    Authenticator App Enabled
                  </div>
                </div>
                <div className="p-4 sm:p-6 bg-muted rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">What will happen?</h3>
                  <ul className="text-muted-foreground text-sm sm:text-base space-y-2">
                    <li>You will be taken to the MFA setup screen</li>
                    <li>A new QR code will be generated</li>
                    <li>Scan the QR code with your authenticator app</li>
                    <li>Your old authenticator app setup will be replaced</li>
                  </ul>
                </div>
              </div>

              {/* Messages */}
              {error && (
                <div className="mb-4 flex items-center gap-2 p-3 sm:p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <X size={20} className="text-destructive flex-shrink-0" />
                  <p className="text-destructive text-sm sm:text-base">{error}</p>
                </div>
              )}
              {success && (
                <div className="mb-4 flex items-center gap-2 p-3 sm:p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <Check size={20} className="text-green-500 flex-shrink-0" />
                  <p className="text-green-600 text-sm sm:text-base">{success}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-secondary transition-colors disabled:opacity-50"
              >
                {loading ? 'Setting up...' : 'Re-configure MFA'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
