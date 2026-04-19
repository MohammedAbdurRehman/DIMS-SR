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

  // MFA Flow States (Mirrors login.tsx logic)
  const [showMfaPrompt, setShowMfaPrompt] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [tempToken, setTempToken] = useState<string | null>(null);

  // Form States
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

  /**
   * STEP 1: INITIATE CHANGE
   * Hits the specific endpoint (email, password, or mfa-reset).
   * Expects a 403 status to trigger the MFA prompt.
   */
  const handleInitiateChange = async (e: React.FormEvent) => {
    e.preventDefault();
    resetStatus();

    if (activeTab === 'password' && newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const token = await getValidAccessToken();
      let endpoint = '';
      let body = {};

      // Determine endpoint based on active tab
      switch (activeTab) {
        case 'email':
          endpoint = '/api/user/change-email';
          body = { newEmail, password: emailPassword };
          break;
        case 'password':
          endpoint = '/api/user/change-password';
          body = { currentPassword, newPassword };
          break;
        case 'mfa':
          endpoint = '/api/user/reset-mfa'; // Hypothetical endpoint for MFA re-config
          body = { password: currentPassword };
          break;
      }

      const response = await fetch(`${getApiUrl()}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      // If the backend requires MFA (Status 403 or explicit flag)
      if (response.status === 403 || data.mfaRequired) {
        setTempToken(data.tempToken || null);
        setShowMfaPrompt(true);
      } else if (response.ok) {
        setSuccess(data.message || 'Action successful');
      } else {
        setError(data.error || 'Request failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * STEP 2: VERIFY MFA
   * Calls the global verify-mfa endpoint to finalize the change.
   * Mirrors the login.tsx logic exactly.
   */
  const handleFinalVerify = async () => {
    if (mfaCode.length !== 6) return;
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${getApiUrl()}/api/auth/verify-mfa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: mfaCode,
          token: tempToken,
          cnic: userData.cnic
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Identity verified. Your changes have been applied.');
        setShowMfaPrompt(false);
        setMfaCode('');
        
        // Custom logic after success based on tab
        if (activeTab === 'mfa' && onMfaChange) {
          onMfaChange(); // Trigger the parent callback to show the QR setup
        }

        // Reset inputs
        setNewEmail(''); setEmailPassword('');
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      } else {
        setError(data.error || 'Invalid MFA code');
      }
    } catch (err) {
      setError('MFA verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
        {/* Navigation Tabs */}
        {!showMfaPrompt && (
          <div className="flex bg-muted p-1 rounded-xl mb-8 border border-border">
            {(['email', 'password', 'mfa'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); resetStatus(); }}
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
            /* VERIFICATION UI */
            <div className="space-y-6 text-center animate-in fade-in zoom-in duration-300">
              <ShieldCheck size={48} className="text-primary mx-auto" />
              <h2 className="text-2xl font-bold">Verification Required</h2>
              <p className="text-muted-foreground text-sm">Enter the code from your app to authorize this {activeTab} change.</p>
              
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
                <button onClick={() => setShowMfaPrompt(false)} className="flex-1 py-3 font-bold text-muted-foreground">Cancel</button>
                <button 
                  onClick={handleFinalVerify}
                  disabled={loading || mfaCode.length < 6}
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-bold disabled:opacity-50 shadow-lg"
                >
                  {loading ? 'Verifying...' : 'Verify & Confirm'}
                </button>
              </div>
            </div>
          ) : (
            /* FORM UI */
            <div className="space-y-6">
              {activeTab === 'email' && (
                <form onSubmit={handleInitiateChange} className="space-y-4">
                  <h2 className="text-xl font-bold">Change Registered Email</h2>
                  <input type="email" placeholder="New Email Address" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full p-4 border rounded-xl bg-background" required />
                  <input type="password" placeholder="Current Password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} className="w-full p-4 border rounded-xl bg-background" required />
                  <button className="w-full bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2">Continue <ArrowRight size={18}/></button>
                </form>
              )}

              {activeTab === 'password' && (
                <form onSubmit={handleInitiateChange} className="space-y-4">
                  <h2 className="text-xl font-bold">Update Password</h2>
                  <input type={showCurrentPassword ? 'text' : 'password'} placeholder="Current Password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full p-4 border rounded-xl bg-background" required />
                  <input type={showNewPassword ? 'text' : 'password'} placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-4 border rounded-xl bg-background" required />
                  <input type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-4 border rounded-xl bg-background" required />
                  <button className="w-full bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2">Continue <ArrowRight size={18}/></button>
                </form>
              )}

              {activeTab === 'mfa' && (
                <div className="text-center py-6 space-y-6">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                    <Check size={32} className="text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">MFA is Active</p>
                    <p className="text-sm text-muted-foreground mt-2">To re-configure your authenticator app, we must first verify your password.</p>
                  </div>
                  <form onSubmit={handleInitiateChange} className="space-y-4 text-left">
                    <input type="password" placeholder="Enter Account Password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full p-4 border rounded-xl bg-background" required />
                    <button className="w-full bg-secondary text-secondary-foreground py-4 rounded-xl font-bold">
                      Verify & Re-configure
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {error && <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20 text-sm font-semibold flex items-center gap-2"><X size={16} /> {error}</div>}
          {success && <div className="mt-4 p-3 bg-green-500/10 text-green-600 rounded-lg border border-green-500/20 text-sm font-semibold flex items-center gap-2"><Check size={16} /> {success}</div>}
        </div>
      </main>
    </div>
  );
}