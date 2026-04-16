'use client';

import { useState, useEffect } from 'react';
import Login from '@/components/login';
import Signup from '@/components/signup';
import MfaSetup from '@/components/mfa-setup';
import MfaVerification from '@/components/mfa-verification';
import Home from '@/components/home';

type AuthStep = 'login' | 'signup' | 'mfa-setup' | 'mfa-verify' | 'home';

export default function Page() {
  const [currentStep, setCurrentStep] = useState<AuthStep>('login');
  const [userData, setUserData] = useState<{ cnic: string; email: string } | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string>('');

  const handleSignupSubmit = (data: { name: string; fatherName: string; cnic: string; cnicIssueDate: string; email: string; password: string }) => {
    setUserData({ cnic: data.cnic, email: data.email });
    setCurrentStep('mfa-setup');
  };

  const handleMfaSetupComplete = (secret: string) => {
    setMfaSecret(secret);
    setCurrentStep('login');
  };

  const handleLoginSubmit = (cnic: string, email: string, tempToken?: string) => {
    setUserData({ cnic, email });
    if (tempToken) {
      // MFA required, store temp token
      localStorage.setItem('tempToken', tempToken);
    }
    setCurrentStep('mfa-verify');
  };

  const handleMfaVerify = () => {
    setCurrentStep('home');
  };

  const handleLogout = () => {
    setCurrentStep('login');
    setUserData(null);
    setMfaSecret('');
  };

  return (
    <main className="min-h-screen bg-background">
      {currentStep === 'login' && (
        <Login
          onSubmit={handleLoginSubmit}
          onSignupClick={() => setCurrentStep('signup')}
        />
      )}
      {currentStep === 'signup' && (
        <Signup
          onSubmit={handleSignupSubmit}
          onLoginClick={() => setCurrentStep('login')}
        />
      )}
      {currentStep === 'mfa-setup' && userData && (
        <MfaSetup
          email={userData.email}
          onComplete={handleMfaSetupComplete}
        />
      )}
      {currentStep === 'mfa-verify' && userData && (
        <MfaVerification
          email={userData.email}
          onVerify={handleMfaVerify}
          onBack={() => setCurrentStep('login')}
        />
      )}
      {currentStep === 'home' && userData && (
        <Home
          userData={userData}
          onLogout={handleLogout}
        />
      )}
    </main>
  );
}
