'use client';

import React, { createContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export interface User {
  uid: string;
  email: string;
  name: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSignout: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  signup: (email: string, password: string, name: string, fatherName: string, cnic: string, cnicIssueDate: string) => Promise<void>;
  login: (cnic: string, password: string) => Promise<void>;
  verifyMFA: (tempToken: string, code: string) => Promise<void>;
  setupMFA: () => Promise<{ qrCode: string; manualEntry: string }>;
  verifyMFASetup: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.REACT_APP_API_URL || 'https://localhost:3001/api';

// Configure axios with SSL bypass for development (remove in production)
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  withCredentials: true,
  httpsAgent: {
    rejectUnauthorized: false // Only for development!
  }
});

// Add token to requests
axiosInstance.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useState({
    isLoading: true,
    isSignout: false,
    user: null as User | null,
    accessToken: null as string | null,
    refreshToken: null as string | null
  });

  // Restore token on app start
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const savedAccessToken = await AsyncStorage.getItem('accessToken');
        const savedRefreshToken = await AsyncStorage.getItem('refreshToken');
        const savedUser = await AsyncStorage.getItem('user');

        if (savedAccessToken && savedUser) {
          dispatch(prev => ({
            ...prev,
            accessToken: savedAccessToken,
            refreshToken: savedRefreshToken,
            user: JSON.parse(savedUser),
            isLoading: false
          }));
        } else {
          dispatch(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Failed to restore token:', error);
        dispatch(prev => ({ ...prev, isLoading: false }));
      }
    };

    bootstrapAsync();
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string, fatherName: string, cnic: string, cnicIssueDate: string) => {
    try {
      const response = await axiosInstance.post('/auth/signup', {
        email,
        password,
        name,
        fatherName,
        cnic,
        cnicIssueDate
      });

      const { accessToken, refreshToken, user } = response.data;

      await AsyncStorage.multiSet([
        ['accessToken', accessToken],
        ['refreshToken', refreshToken],
        ['user', JSON.stringify(user)]
      ]);

      dispatch(prev => ({
        ...prev,
        accessToken,
        refreshToken,
        user
      }));
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Signup failed');
    }
  }, []);

  const login = useCallback(async (cnic: string, password: string) => {
    try {
      const response = await axiosInstance.post('/auth/login', { cnic, password });

      const { accessToken, refreshToken, user, mfaRequired, tempToken } = response.data;

      if (mfaRequired) {
        // Store temp token for MFA verification
        await AsyncStorage.setItem('tempToken', tempToken);
        return; // User needs to verify MFA
      }

      await AsyncStorage.multiSet([
        ['accessToken', accessToken],
        ['refreshToken', refreshToken],
        ['user', JSON.stringify(user)]
      ]);

      dispatch(prev => ({
        ...prev,
        accessToken,
        refreshToken,
        user,
        isSignout: false
      }));
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  }, []);

  const verifyMFA = useCallback(async (tempToken: string, code: string) => {
    try {
      const response = await axiosInstance.post('/auth/mfa/verify-login', {
        tempToken,
        code
      });

      const { accessToken, refreshToken, user } = response.data;

      await AsyncStorage.multiSet([
        ['accessToken', accessToken],
        ['refreshToken', refreshToken],
        ['user', JSON.stringify(user)]
      ]);

      await AsyncStorage.removeItem('tempToken');

      dispatch(prev => ({
        ...prev,
        accessToken,
        refreshToken,
        user,
        isSignout: false
      }));
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'MFA verification failed');
    }
  }, []);

  const setupMFA = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/auth/mfa/setup');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'MFA setup failed');
    }
  }, []);

  const verifyMFASetup = useCallback(async (code: string) => {
    try {
      await axiosInstance.post('/auth/mfa/verify', { code });
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'MFA verification failed');
    }
  }, []);

  const refreshAccessToken = useCallback(async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token');

      const response = await axiosInstance.post('/auth/refresh', { refreshToken });
      const { accessToken } = response.data;

      await AsyncStorage.setItem('accessToken', accessToken);
      dispatch(prev => ({ ...prev, accessToken }));
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Force logout if refresh fails
      await logout();
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        await axiosInstance.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user', 'tempToken']);
      dispatch(prev => ({
        ...prev,
        accessToken: null,
        refreshToken: null,
        user: null,
        isSignout: true
      }));
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        isLoading: state.isLoading,
        isSignout: state.isSignout,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        signup,
        login,
        verifyMFA,
        setupMFA,
        verifyMFASetup,
        logout,
        refreshAccessToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
