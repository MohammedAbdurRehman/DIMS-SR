'use client';

import { useState, useRef } from 'react';
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

  // MFA Flow States - Matching your mfa-verification.tsx logic
  const [showMfaPrompt, setShowMfaPrompt] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  
  // Form States
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const resetStatus = () => { setError(''); setSuccess(''); };

  // Handle OTP input changes (from your mfa-verification.tsx)
  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleUpdateAction = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    resetStatus();

    if (activeTab === 'password' && newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    const mfaCodeString = otp.join('');

    try {
      const token = await getValidAccessToken();
      const endpoint = activeTab === 'email' ? '/api/user/change-email' : 
                       activeTab === 'password' ? '/api/user/change-password' : '/api/user/reset-mfa';
      
      // Payload structure: Include mfaCode only if we are in that state
      const payload = {
        ...(activeTab === 'email' ? { newEmail, password: emailPassword } : 
           activeTab === 'password' ? { currentPassword, newPassword } : { password: currentPassword }),
        ...(showMfaPrompt ? { mfaCode: mfaCodeString, code: mfaCodeString } : {})
      };

      const response = await fetch(`${getApiUrl()}${endpoint}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Updated successfully!');
        setShowMfaPrompt(false);
        setOtp(['', '', '', '', '', '']);
        if (activeTab === 'mfa' && onMfaChange) onMfaChange();
      } 
      // This is the trigger: if backend sees correct password but no MFA, it returns 403
      else if (response.status === 403 || data.mfaRequired) {
        setShowMfaPrompt(true);
      } else {
        setError(data.error || 'Operation failed');
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
          <div className="flex bg-muted p-1 rounded-xl mb-8 border border-border">
            {(['email', 'password', 'mfa'] as const).map((tab) => (
              <button key={tab} onClick={() => { setActiveTab(tab); resetStatus(); }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg capitalize transition-all ${activeTab === tab ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}>
                {tab === 'mfa' ? 'Security' : tab}
              </button>
            ))}
          </div>
        )}

        <div className="bg-card rounded-[2rem] p-8 border border-border shadow-xl">
          {showMfaPrompt ? (
            /* MFA UI - Integrated with your mfa-verification logic */
            <div className="space-y-6 text-center animate-in fade-in zoom-in">
              <ShieldCheck size={48} className="text-primary mx-auto" />
              <h2 className="text-2xl font-bold">Security Verification</h2>
              <p className="text-muted-foreground text-sm">Enter the 6-digit code to authorize this change.</p>
              
              <div className="flex justify-center gap-2 sm:gap-4 mb-6">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, index)}
                    className="w-10 h-12 sm:w-12 sm:h-14 text-center text-2xl font-bold border-2 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-muted/20"
                  />
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowMfaPrompt(false)} className="flex-1 py-3 font-bold text-muted-foreground">Cancel</button>
                <button 
                  onClick={() => handleUpdateAction()}
                  disabled={loading || otp.some(v => !v)}
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-bold disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify & Save'}
                </button>
              </div>
            </div>
          ) : (
            /* Standard Forms */
            <div className="space-y-6">
              {activeTab === 'email' && (
                <form onSubmit={handleUpdateAction} className="space-y-4">
                  <h2 className="text-xl font-bold">Update Email</h2>
                  <input type="email" placeholder="New Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full p-4 border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary/20" required />
                  <input type="password" placeholder="Current Password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} className="w-full p-4 border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary/20" required />
                  <button className="w-full bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2">Update Email <ArrowRight size={18}/></button>
                </form>
              )}

              {activeTab === 'password' && (
                <form onSubmit={handleUpdateAction} className="space-y-4">
                  <h2 className="text-xl font-bold">Change Password</h2>
                  <div className="relative">
                    <input type={showCurrentPassword ? 'text' : 'password'} placeholder="Current Password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full p-4 border rounded-xl bg-background pr-12 outline-none focus:ring-2 focus:ring-primary/20" required />
                    <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-4 top-4 text-muted-foreground">{showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                  </div>
                  <div className="relative">
                    <input type={showNewPassword ? 'text' : 'password'} placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-4 border rounded-xl bg-background pr-12 outline-none focus:ring-2 focus:ring-primary/20" required />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-4 text-muted-foreground">{showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                  </div>
                  <div className="relative">
                    <input type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-4 border rounded-xl bg-background pr-12 outline-none focus:ring-2 focus:ring-primary/20" required />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-4 text-muted-foreground">{showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                  </div>
                  <button className="w-full bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2">Change Password <ArrowRight size={18}/></button>
                </form>
              )}

              {activeTab === 'mfa' && (
                <form onSubmit={handleUpdateAction} className="text-center py-6 space-y-6">
                  <Check size={40} className="mx-auto text-green-600" />
                  <p className="font-bold">MFA Protection Enabled</p>
                  <input type="password" placeholder="Account Password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full p-4 border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary/20" required />
                  <button className="w-full bg-secondary text-white py-4 rounded-xl font-bold">Re-configure MFA</button>
                </form>
              )}
            </div>
          )}

          {error && <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20 flex items-center gap-2 text-sm font-semibold"><X size={16} /> {error}</div>}
          {success && <div className="mt-4 p-3 bg-green-500/10 text-green-600 rounded-lg border border-green-500/20 flex items-center gap-2 text-sm font-semibold"><Check size={16} /> {success}</div>}
        </div>
      </main>
    </div>
  );
}