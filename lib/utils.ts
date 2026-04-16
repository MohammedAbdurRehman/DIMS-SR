import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Get API URL - works for both local development and Vercel deployment
export function getApiUrl(): string {
  // In Vercel/production, API routes are on the same domain
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return '';
  }
  // In local development, use the configured API URL
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}

// Function to check if JWT token is expired
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(base64UrlDecode(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch {
    return true;
  }
}

// Function to refresh access token
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${getApiUrl()}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();
    if (response.ok && data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      return data.accessToken;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
  }
  return null;
}

// Function to get valid access token (refreshes if needed)
export async function getValidAccessToken(): Promise<string | null> {
  let token = localStorage.getItem('accessToken');
  if (!token) return null;

  if (isTokenExpired(token)) {
    token = await refreshAccessToken();
  }

  return token;
}
