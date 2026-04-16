'use client';

import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Shield } from 'lucide-react';
import { getApiUrl } from '../lib/utils';

interface LoginProps {
  onSubmit: (cnic: string, email: string, tempToken?: string) => void;
  onSignupClick: () => void;
}

export default function Login({ onSubmit, onSignupClick }: LoginProps) {
  const [cnic, setCnic] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!cnic || !password) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }

      if (cnic.length < 13 || cnic.length > 15) {
        setError('Invalid CNIC format. Use XXXXX-XXXXXXX-X or 13 digits');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('Invalid password');
        setLoading(false);
        return;
      }

      // Make API call to backend
      const response = await fetch(`${getApiUrl()}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cnic, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      if (data.mfaRequired) {
        // Handle MFA
        localStorage.setItem('tempToken', data.tempToken);
        onSubmit(cnic, data.user.email, data.tempToken);
      } else {
        // Successful login
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        onSubmit(cnic, data.user.email);
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-xl border border-border">
          {/* Header */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center">
              <Shield className="text-primary-foreground" size={32} />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-2">
            DIMS-SR
          </h1>
          <p className="text-muted-foreground text-center text-sm sm:text-base mb-2">
            Digital Identity Management System
          </p>
          <p className="text-muted-foreground text-center text-xs sm:text-sm mb-6 sm:mb-8">
            Sign in to access your account
          </p>

          {error && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-3 mb-4 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* CNIC */}
            <div>
              <label className="block text-foreground text-sm font-medium mb-2">
                CNIC Number
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-3.5 text-muted-foreground"
                  size={20}
                />
                <input
                  type="text"
                  value={cnic}
                  onChange={(e) => setCnic(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter your CNIC (XXXXX-XXXXXXX-X or 13 digits)"
                  maxLength={15}
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-sm sm:text-base bg-input text-foreground placeholder-muted-foreground"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-foreground text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-3.5 text-muted-foreground"
                  size={20}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-sm sm:text-base bg-input text-foreground placeholder-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-3 sm:py-3.5 rounded-lg font-semibold hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {loading ? 'Signing in...' : 'Next'}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 sm:mt-8 text-center">
            <p className="text-muted-foreground text-sm sm:text-base">
              New user?{' '}
              <button
                onClick={onSignupClick}
                className="text-primary hover:text-secondary font-semibold"
              >
                Register here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
