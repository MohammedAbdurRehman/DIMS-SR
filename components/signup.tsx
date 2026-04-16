'use client';

import { useState } from 'react';
import { User, FileText, Calendar, Lock, Eye, EyeOff, Shield } from 'lucide-react';
import { getApiUrl } from '../lib/utils';

interface SignupProps {
  onSubmit: (data: { name: string; fatherName: string; cnic: string; cnicIssueDate: string; email: string; password: string }) => void;
  onLoginClick: () => void;
}

export default function Signup({ onSubmit, onLoginClick }: SignupProps) {
  const [formData, setFormData] = useState({
    name: '',
    fatherName: '',
    cnic: '',
    cnicIssueDate: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'cnic') {
      setFormData(prev => ({ ...prev, [name]: value.replace(/\D/g, '') }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.name || !formData.fatherName || !formData.cnic || !formData.cnicIssueDate || !formData.email || !formData.password || !formData.confirmPassword) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      if (!agreed) {
        setError('Please agree to terms and conditions');
        setLoading(false);
        return;
      }

      if (formData.cnic.length < 13 || formData.cnic.length > 15) {
        setError('CNIC must be 13 digits or XXXXX-XXXXXXX-X format');
        setLoading(false);
        return;
      }

      // Make API call to backend
      const response = await fetch(`${getApiUrl()}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          fatherName: formData.fatherName,
          cnic: formData.cnic,
          cnicIssueDate: formData.cnicIssueDate,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Signup failed');
        setLoading(false);
        return;
      }

      // Store tokens
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);

      onSubmit({
        name: formData.name,
        fatherName: formData.fatherName,
        cnic: formData.cnic,
        cnicIssueDate: formData.cnicIssueDate,
        email: formData.email,
        password: formData.password,
      });
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
            Create Account
          </h1>
          <p className="text-muted-foreground text-center text-sm sm:text-base mb-6 sm:mb-8">
            Register for DIMS-SR
          </p>

          {error && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-3 mb-4 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* Name */}
            <div>
              <label className="block text-foreground text-sm font-medium mb-2">
                Full Name
              </label>
              <div className="relative">
                <User
                  className="absolute left-3 top-3.5 text-muted-foreground"
                  size={20}
                />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-sm sm:text-base bg-input text-foreground placeholder-muted-foreground"
                />
              </div>
            </div>

            {/* Father Name */}
            <div>
              <label className="block text-foreground text-sm font-medium mb-2">
                Father's Name
              </label>
              <div className="relative">
                <User
                  className="absolute left-3 top-3.5 text-muted-foreground"
                  size={20}
                />
                <input
                  type="text"
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleChange}
                  placeholder="Enter father's name"
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-sm sm:text-base bg-input text-foreground placeholder-muted-foreground"
                />
              </div>
            </div>

            {/* CNIC */}
            <div>
              <label className="block text-foreground text-sm font-medium mb-2">
                CNIC Number
              </label>
              <div className="relative">
                <FileText
                  className="absolute left-3 top-3.5 text-muted-foreground"
                  size={20}
                />
                <input
                  type="text"
                  name="cnic"
                  value={formData.cnic}
                  onChange={handleChange}
                  placeholder="XXXXX-XXXXXXX-X or 13 digits"
                  maxLength={15}
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-sm sm:text-base bg-input text-foreground placeholder-muted-foreground"
                />
              </div>
            </div>

            {/* CNIC Issue Date */}
            <div>
              <label className="block text-foreground text-sm font-medium mb-2">
                CNIC Issue Date
              </label>
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-3.5 text-muted-foreground"
                  size={20}
                />
                <input
                  type="date"
                  name="cnicIssueDate"
                  value={formData.cnicIssueDate}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-sm sm:text-base bg-input text-foreground placeholder-muted-foreground"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-foreground text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-sm sm:text-base bg-input text-foreground placeholder-muted-foreground"
              />
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
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimum 6 characters"
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

            {/* Confirm Password */}
            <div>
              <label className="block text-foreground text-sm font-medium mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-3.5 text-muted-foreground"
                  size={20}
                />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  className="w-full pl-10 pr-10 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-sm sm:text-base bg-input text-foreground placeholder-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2 pt-2">
              <input
                type="checkbox"
                id="terms"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 text-primary border-border rounded focus:ring-ring accent-primary"
              />
              <label htmlFor="terms" className="text-muted-foreground text-xs sm:text-sm">
                I agree to the Terms & Conditions and Privacy Policy
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-3 sm:py-3.5 rounded-lg font-semibold hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base mt-6"
            >
              {loading ? 'Creating account...' : 'Next'}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 sm:mt-8 text-center">
            <p className="text-muted-foreground text-sm sm:text-base">
              Already registered?{' '}
              <button
                onClick={onLoginClick}
                className="text-primary hover:text-secondary font-semibold"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
