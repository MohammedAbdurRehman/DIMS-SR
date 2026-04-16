'use client';

import axios from 'axios';
import { useCallback } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'https://localhost:3001/api';

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  withCredentials: true,
  httpsAgent: {
    rejectUnauthorized: false // Only for development
  }
});

// Add token to requests
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const useFirebase = () => {
  // SIM Registration
  const registerSIM = useCallback(async (simData: {
    networkProvider: string;
    mobileNumber: string;
    paymentMethod: string;
    deliveryAddress: string;
    paymentAddress: string;
    sameAddressForPayment: boolean;
  }) => {
    try {
      const response = await axiosInstance.post('/sim/register', simData);
      return response.data.transaction;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to register SIM');
    }
  }, []);

  // Get My SIMs
  const getRegisteredSIMs = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/sim/my-sims');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch SIMs');
    }
  }, []);

  // Deactivate SIM
  const deactivateSIM = useCallback(async (transactionId: string) => {
    try {
      const response = await axiosInstance.post(`/sim/deactivate/${transactionId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to deactivate SIM');
    }
  }, []);

  // Track Order
  const trackOrder = useCallback(async (trackingNumber: string) => {
    try {
      const response = await axiosInstance.get(`/sim/track/${trackingNumber}`);
      return response.data.order;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to track order');
    }
  }, []);

  // Update User Profile
  const updateProfile = useCallback(async (profileData: {
    name?: string;
    email?: string;
  }) => {
    try {
      const response = await axiosInstance.put('/user/profile', profileData);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data.user;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update profile');
    }
  }, []);

  // Change Password
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      await axiosInstance.post('/user/change-password', {
        currentPassword,
        newPassword
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to change password');
    }
  }, []);

  // Change Email
  const changeEmail = useCallback(async (newEmail: string, password: string) => {
    try {
      const response = await axiosInstance.post('/user/change-email', {
        newEmail,
        password
      });
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data.user;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to change email');
    }
  }, []);

  // Setup MFA
  const setupMFA = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/user/mfa/setup');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to setup MFA');
    }
  }, []);

  // Verify MFA Setup
  const verifyMFASetup = useCallback(async (code: string) => {
    try {
      await axiosInstance.post('/user/mfa/verify', { code });
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to verify MFA');
    }
  }, []);

  // Disable MFA
  const disableMFA = useCallback(async (code: string) => {
    try {
      await axiosInstance.post('/user/mfa/disable', { code });
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to disable MFA');
    }
  }, []);

  return {
    registerSIM,
    getRegisteredSIMs,
    deactivateSIM,
    trackOrder,
    updateProfile,
    changePassword,
    changeEmail,
    setupMFA,
    verifyMFASetup,
    disableMFA
  };
};
