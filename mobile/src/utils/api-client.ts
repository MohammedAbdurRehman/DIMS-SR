import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'react-native-secure-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

/**
 * API Client for DIMS-SR Mobile App
 * Handles authentication, token refresh, and secure communication
 */

const API_URL = process.env.REACT_APP_API_URL || 'https://localhost:3001/api';

let apiClient: AxiosInstance;

/**
 * Initialize API Client
 */
export const initializeAPIClient = async () => {
  apiClient = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add request interceptor for authentication
  apiClient.interceptors.request.use(
    async (config) => {
      try {
        const token = await SecureStore.getItem('accessToken');
        const csrfToken = await AsyncStorage.getItem('csrfToken');

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        if (csrfToken) {
          config.headers['X-CSRF-Token'] = csrfToken;
        }

        return config;
      } catch (error) {
        console.error('[API] Request interceptor error:', error);
        return config;
      }
    },
    (error) => Promise.reject(error)
  );

  // Add response interceptor for token refresh
  apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config;

      // Token expired - try to refresh
      if (error.response?.status === 401 && !originalRequest?.headers['X-Retry']) {
        try {
          const refreshToken = await SecureStore.getItem('refreshToken');

          if (refreshToken) {
            const response = await axios.post(`${API_URL}/auth/refresh-token`, {
              refreshToken,
            });

            const { token } = response.data;
            await SecureStore.setItem('accessToken', token);

            // Retry original request
            if (originalRequest?.headers) {
              originalRequest.headers['X-Retry'] = 'true';
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }

            return apiClient(originalRequest!);
          }
        } catch (refreshError) {
          console.error('[API] Token refresh failed:', refreshError);
          // Force logout
          await handleLogout();
        }
      }

      return Promise.reject(error);
    }
  );
};

/**
 * Authentication API Calls
 */

export const authAPI = {
  signup: async (userData: any) => {
    try {
      const response = await apiClient.post('/auth/signup', userData);
      return response.data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  login: async (cnic: string, password: string) => {
    try {
      const response = await apiClient.post('/auth/login', {
        cnic,
        password,
      });

      const { token, refreshToken } = response.data;

      // Store tokens securely
      await SecureStore.setItem('accessToken', token);
      await SecureStore.setItem('refreshToken', refreshToken);

      return response.data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  verifyMFA: async (code: string, cnic: string) => {
    try {
      const response = await apiClient.post('/auth/verify-mfa', {
        code,
        cnic,
      });

      const { token } = response.data;
      await SecureStore.setItem('accessToken', token);
      await AsyncStorage.setItem('mfaVerified', 'true');

      return response.data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
      await handleLogout();
    } catch (error) {
      await handleLogout();
    }
  },
};

/**
 * SIM Registration API Calls
 */

export const simAPI = {
  register: async (simData: any) => {
    try {
      const csrfToken = await AsyncStorage.getItem('csrfToken');
      const response = await apiClient.post('/sim/register', {
        ...simData,
        csrfToken,
      });
      return response.data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  deactivate: async (simId: string) => {
    try {
      const csrfToken = await AsyncStorage.getItem('csrfToken');
      const response = await apiClient.post('/sim/deactivate', {
        simId,
        csrfToken,
      });
      return response.data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  getRegistered: async () => {
    try {
      const response = await apiClient.get('/sim/registered');
      return response.data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  trackOrder: async (trackingNumber: string) => {
    try {
      const response = await apiClient.get(`/sim/track/${trackingNumber}`);
      return response.data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  getActiveCount: async () => {
    try {
      const response = await apiClient.get('/sim/active-count');
      return response.data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },
};

/**
 * User API Calls
 */

export const userAPI = {
  getProfile: async () => {
    try {
      const response = await apiClient.get('/user/profile');
      return response.data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  changeEmail: async (newEmail: string, password: string) => {
    try {
      const response = await apiClient.post('/user/change-email', {
        newEmail,
        password,
      });
      return response.data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  changePassword: async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    try {
      const response = await apiClient.post('/user/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      return response.data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  setupMFA: async () => {
    try {
      const response = await apiClient.post('/user/setup-mfa', {});
      return response.data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  confirmMFA: async (code: string) => {
    try {
      const response = await apiClient.post('/user/confirm-mfa', { code });
      return response.data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },

  disableMFA: async (password: string) => {
    try {
      const response = await apiClient.post('/user/disable-mfa', { password });
      return response.data;
    } catch (error) {
      handleError(error);
      throw error;
    }
  },
};

/**
 * Get CSRF Token
 */
export const getCSRFToken = async () => {
  try {
    const response = await apiClient.get('/csrf-token');
    const { csrfToken } = response.data;
    await AsyncStorage.setItem('csrfToken', csrfToken);
    return csrfToken;
  } catch (error) {
    handleError(error);
    throw error;
  }
};

/**
 * Handle Logout
 */
export const handleLogout = async () => {
  try {
    await SecureStore.removeItem('accessToken');
    await SecureStore.removeItem('refreshToken');
    await AsyncStorage.removeItem('mfaVerified');
    await AsyncStorage.removeItem('csrfToken');
  } catch (error) {
    console.error('[API] Logout error:', error);
  }
};

/**
 * Error Handler
 */
const handleError = (error: any) => {
  let message = 'An error occurred';

  if (error.response) {
    message = error.response.data?.error || error.response.statusText;
  } else if (error.message) {
    message = error.message;
  }

  Toast.show({
    type: 'error',
    text1: 'Error',
    text2: message,
    duration: 3000,
  });

  console.error('[API Error]', message);
};

export default apiClient;
