'use client';

import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Check, X, ShieldCheck, ArrowRight } from 'lucide-react';
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

  // The "Prompt" state - controls if we show the form or the MFA input
  const [showMfaPrompt, setShowMfaPrompt] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  // Form States
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const resetAll = () => {
    setError('');
    setSuccess('');
    setShowMfaPrompt(false);
    setMfaCode('');
  };

  // Triggered when user clicks "Update" on the main forms
  const handleInitiateUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Basic validation before showing MFA prompt
    if (activeTab === 'password' && newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    // Show the MFA input "page/prompt"
    setShowMfaPrompt(true);
  };

  const handleFinalVerifyAndSubmit = async () => {
    if (mfaCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = await getValidAccessToken();
      const endpoint = activeTab === 'email' ? '/api/user/change-email' : '/api/user/change-password';
      
      const payload = activeTab === 'email' 
        ? { newEmail, password: emailPassword, mfaCode }
        : { currentPassword, newPassword, mfaCode };

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
        setSuccess(`${activeTab === 'email' ? 'Email' : 'Password'} updated successfully!`);
        setTimeout(() => resetAll(), 2000);
      } else {
        setError(data.error || 'Verification failed. Please try again.');
        // Don't hide prompt so they can try the code again
      }
    } catch (err) {
      setError('Network error. Connection failed.');
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
          <div className="w-20"></div>
        </div>
      </div>

      <main className="max-w-xl mx-auto px-4 py-10">
        {/* Tab Selection (Only show if not in MFA prompt) */}
        {!showMfaPrompt && (
          <div className="flex bg-muted p-1 rounded-xl mb-8">
            {['email', 'password', 'mfa'].map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab as any); resetAll(); }}
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
            /* THE MFA PROMPT "PAGE" */
            <div className="space-y-6 text-center animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={40} className="text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Two-Step Verification</h2>
              <p className="text-muted-foreground text-sm">
                To complete this {activeTab} update, please enter the 6-digit code from your Authenticator app.
              </p>
              
              <input
                type="text"
                maxLength={6}
                value={mfaCode}
                autoFocus
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000 000"
                className="w-full text-center text-4xl tracking-[0.5em] font-mono py-4 border-2 border-primary/20 rounded-2xl focus:border-primary outline-none bg-muted/30"
              />

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setShowMfaPrompt(false)}
                  className="flex-1 py-4 font-bold text-muted-foreground hover:bg-muted rounded-2xl"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleFinalVerifyAndSubmit}
                  disabled={loading || mfaCode.length < 6}
                  className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                  {loading ? 'Verifying...' : 'Confirm & Update'}
                </button>
              </div>
            </div>
          ) : (
            /* THE STANDARD FORMS */
            <div className="space-y-6">
              {activeTab === 'email' && (
                <form onSubmit={handleInitiateUpdate} className="space-y-5">
                  <h2 className="text-xl font-bold">Change Email</h2>
                  <input
                    type="email"
                    placeholder="New Email Address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full p-4 border rounded-2xl bg-background"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Current Password"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    className="w-full p-4 border rounded-2xl bg-background"
                    required
                  />
                  <button className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2">
                    Continue <ArrowRight size={18} />
                  </button>
                </form>
              )}

              {activeTab === 'password' && (
                <form onSubmit={handleInitiateUpdate} className="space-y-5">
                  <h2 className="text-xl font-bold">Change Password</h2>
                  <input
                    type="password"
                    placeholder="Current Password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full p-4 border rounded-2xl bg-background"
                    required
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-4 border rounded-2xl bg-background"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-4 border rounded-2xl bg-background"
                    required
                  />
                  <button className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2">
                    Continue <ArrowRight size={18} />
                  </button>
                </form>
              )}

              {activeTab === 'mfa' && (
                <div className="space-y-6 text-center">
                  <Check size={48} className="mx-auto text-green-500 bg-green-500/10 p-2 rounded-full" />
                  <p className="font-bold">MFA is currently active.</p>
                  <button onClick={onMfaChange} className="w-full bg-secondary py-4 rounded-2xl font-bold">
                    Re-configure App
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Error/Success Overlay */}
          {error && (
            <div className="mt-6 p-4 bg-destructive/10 text-destructive rounded-xl flex items-center gap-2 border border-destructive/20 font-medium text-sm">
              <X size={16} /> {error}
            </div>
          )}
          {success && (
            <div className="mt-6 p-4 bg-green-500/10 text-green-600 rounded-xl flex items-center gap-2 border border-green-500/20 font-medium text-sm">
              <Check size={16} /> {success}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}