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

  // MFA Flow States
  const [showMfaPrompt, setShowMfaPrompt] = useState(false);
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

  const resetStatus = () => {
    setError('');
    setSuccess('');
  };

  const handleUpdateSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    resetStatus();

    // Front-end validation for passwords
    if (activeTab === 'password' && newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const token = await getValidAccessToken();
      const endpoint = activeTab === 'email' ? '/api/user/change-email' : '/api/user/change-password';
      
      // Payload only includes mfaCode if we are currently in the prompt state
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
        setSuccess(data.message || 'Update successful');
        setShowMfaPrompt(false);
        setMfaCode('');
        // Reset forms
        if (activeTab === 'password') {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        } else {
          setNewEmail('');
          setEmailPassword('');
        }
      } 
      // Handle 403 or explicit MFA required flag (Mirrors login.tsx)
      else if (response.status === 403 || data.mfaRequired || data.error?.includes('MFA')) {
        setShowMfaPrompt(true);
        setError(''); // Clear errors to focus on the MFA prompt
      } else {
        setError(data.error || 'Update failed');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-primary font-bold hover:opacity-80 transition-opacity">
            <ArrowLeft size={20} /> Back to Dashboard
          </button>
          <h1 className="text-xl font-bold">Account Settings</h1>
          <div className="w-10"></div>
        </div>
      </div>

      <main className="max-w-xl mx-auto px-4 py-10">
        {/* Navigation Tabs - Hidden during MFA verification */}
        {!showMfaPrompt && (
          <div className="flex bg-muted/50 p-1.5 rounded-2xl mb-8 border border-border">
            {(['email', 'password', 'mfa'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); resetStatus(); }}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl capitalize transition-all ${
                  activeTab === tab ? 'bg-background shadow-md text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'mfa' ? 'Security' : tab}
              </button>
            ))}
          </div>
        )}

        <div className="bg-card rounded-[2.5rem] p-8 sm:p-10 border border-border shadow-2xl shadow-primary/5">
          {showMfaPrompt ? (
            /* PHASE 2: MFA VERIFICATION PROMPT */
            <div className="space-y-6 text-center animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <ShieldCheck size={40} className="text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Verify Identity</h2>
                <p className="text-muted-foreground text-sm mt-2">
                  A code is required to authorize this {activeTab} change.
                </p>
              </div>
              
              <div className="space-y-4">
                <input
                  type="text"
                  maxLength={6}
                  value={mfaCode}
                  autoFocus
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center text-4xl tracking-[0.4em] font-mono py-5 border-2 border-primary/20 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none bg-muted/20 transition-all"
                />
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => { setShowMfaPrompt(false); setMfaCode(''); }}
                    className="flex-1 py-4 font-bold text-muted-foreground hover:bg-muted rounded-2xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleUpdateSubmit()}
                    disabled={loading || mfaCode.length < 6}
                    className="flex-1 bg-primary text-primary-foreground py-4 rounded-2xl font-bold disabled:opacity-50 shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
                  >
                    {loading ? 'Verifying...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* PHASE 1: STANDARD FORMS */
            <div className="space-y-6">
              {activeTab === 'email' && (
                <form onSubmit={handleUpdateSubmit} className="space-y-5">
                  <h2 className="text-2xl font-bold mb-2">Change Email</h2>
                  <div className="space-y-4">
                    <input
                      type="email"
                      placeholder="New Email Address"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full p-4 border border-border rounded-2xl bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                      required
                    />
                    <input
                      type="password"
                      placeholder="Account Password"
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      className="w-full p-4 border border-border rounded-2xl bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                      required
                    />
                  </div>
                  <button disabled={loading} className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all">
                    Update Email <ArrowRight size={18} />
                  </button>
                </form>
              )}

              {activeTab === 'password' && (
                <form onSubmit={handleUpdateSubmit} className="space-y-5">
                  <h2 className="text-2xl font-bold mb-2">Update Password</h2>
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        placeholder="Current Password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full p-4 border border-border rounded-2xl bg-background pr-12 outline-none focus:ring-2 focus:ring-primary/20"
                        required
                      />
                      <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
                        {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    <div className="relative border-t border-border/50 pt-4 mt-2">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="New Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full p-4 border border-border rounded-2xl bg-background pr-12 outline-none focus:ring-2 focus:ring-primary/20"
                        required
                      />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-8 text-muted-foreground hover:text-foreground">
                        {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm New Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full p-4 border border-border rounded-2xl bg-background pr-12 outline-none focus:ring-2 focus:ring-primary/20"
                        required
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                  <button disabled={loading} className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all">
                    {loading ? 'Processing...' : 'Change Password'} <ArrowRight size={18} />
                  </button>
                </form>
              )}

              {activeTab === 'mfa' && (
                <div className="text-center py-6 space-y-6">
                  <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                    <Check size={40} className="text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">MFA is Active</p>
                    <p className="text-sm text-muted-foreground mt-2 px-4">
                      Your account is currently protected with a linked authenticator app.
                    </p>
                  </div>
                  <button onClick={onMfaChange} className="w-full bg-secondary text-secondary-foreground py-4 rounded-2xl font-bold hover:opacity-90 transition-opacity">
                    Re-configure Authenticator
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Feedback Notifications */}
          {error && (
            <div className="mt-6 p-4 bg-destructive/10 text-destructive rounded-2xl flex items-center gap-3 border border-destructive/20 text-sm font-semibold animate-in fade-in slide-in-from-bottom-2">
              <X size={18} className="flex-shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="mt-6 p-4 bg-green-500/10 text-green-600 rounded-2xl flex items-center gap-3 border border-green-500/20 text-sm font-semibold animate-in fade-in slide-in-from-bottom-2">
              <Check size={18} className="flex-shrink-0" /> {success}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}