'use client';

import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Check, X, ShieldCheck } from 'lucide-react';
import { getValidAccessToken, getApiUrl } from '../lib/utils';

interface SettingsProps {
  userData: { cnic: string; email: string };
  onBack: () => void;
  onMfaChange?: () => void;
}

export default function Settings({ userData, onBack, onMfaChange }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<'email' | 'password' | 'mfa'>('email');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // MFA Flow States
  const [showMfaPrompt, setShowMfaPrompt] = useState(false);
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

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleUpdateSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    resetMessages();

    // Client-side validation
    if (activeTab === 'password' && newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const token = await getValidAccessToken();
      const endpoint = activeTab === 'email' ? '/api/user/change-email' : '/api/user/change-password';
      
      const payload = activeTab === 'email' 
        ? { newEmail, password: emailPassword, mfaCode: showMfaPrompt ? mfaCode : undefined }
        : { currentPassword, newPassword, mfaCode: showMfaPrompt ? mfaCode : undefined };

      const response = await fetch(`${getApiUrl()}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Updated successfully');
        setShowMfaPrompt(false);
        setMfaCode('');
        // Clear forms on success
        if (activeTab === 'password') { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }
      } else if (data.mfaRequired || response.status === 403 || data.error?.includes('MFA')) {
        // Trigger the MFA Prompt UI if the backend demands it
        setShowMfaPrompt(true);
      } else {
        setError(data.error || 'Update failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
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
          <div className="flex bg-muted p-1 rounded-xl mb-8">
            {(['email', 'password', 'mfa'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); resetMessages(); }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg capitalize transition-all ${
                  activeTab === tab ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        <div className="bg-card rounded-3xl p-8 border border-border shadow-xl">
          {showMfaPrompt ? (
            /* MFA Verification View */
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck size={32} className="text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Two-Step Verification</h2>
              <p className="text-muted-foreground text-sm px-4">
                Enter the 6-digit code from your app to authorize this change.
              </p>
              
              <input
                type="text"
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full text-center text-3xl tracking-[0.3em] font-mono py-4 border-2 rounded-2xl focus:border-primary outline-none bg-muted/30"
              />

              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowMfaPrompt(false)} className="flex-1 py-3 font-bold text-muted-foreground">
                  Cancel
                </button>
                <button 
                  onClick={() => handleUpdateSubmit()}
                  disabled={loading || mfaCode.length < 6}
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-bold disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Confirm & Update'}
                </button>
              </div>
            </div>
          ) : (
            /* Main Form View */
            <div className="space-y-6">
              {activeTab === 'email' && (
                <form onSubmit={handleUpdateSubmit} className="space-y-4">
                  <h2 className="text-xl font-bold mb-4">Change Email</h2>
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
                    placeholder="Confirm Password"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    className="w-full p-4 border rounded-xl bg-background"
                    required
                  />
                  <button disabled={loading} className="w-full bg-primary text-white py-4 rounded-xl font-bold">
                    {loading ? 'Processing...' : 'Update Email'}
                  </button>
                </form>
              )}

              {activeTab === 'password' && (
                <form onSubmit={handleUpdateSubmit} className="space-y-4">
                  <h2 className="text-xl font-bold mb-4">Change Password</h2>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder="Current Password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full p-4 border rounded-xl bg-background pr-12"
                      required
                    />
                    <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-4 top-4 text-muted-foreground">
                      {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-4 border rounded-xl bg-background pr-12"
                      required
                    />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-4 text-muted-foreground">
                      {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm New Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full p-4 border rounded-xl bg-background pr-12"
                      required
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-4 text-muted-foreground">
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <button disabled={loading} className="w-full bg-primary text-white py-4 rounded-xl font-bold">
                    {loading ? 'Processing...' : 'Update Password'}
                  </button>
                </form>
              )}

              {activeTab === 'mfa' && (
                <div className="text-center py-4">
                  <ShieldCheck size={48} className="mx-auto text-primary mb-4" />
                  <p className="font-bold mb-6">MFA Protection is Active</p>
                  <button onClick={onMfaChange} className="w-full bg-muted py-4 rounded-xl font-bold">
                    Re-configure Authenticator
                  </button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2 border border-destructive/20 text-sm">
              <X size={16} /> {error}
            </div>
          )}
          {success && (
            <div className="mt-4 p-3 bg-green-500/10 text-green-600 rounded-lg flex items-center gap-2 border border-green-500/20 text-sm">
              <Check size={16} /> {success}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}