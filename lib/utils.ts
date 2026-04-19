import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Base URL for backend API calls from the browser.
 * - Localhost: defaults to http://localhost:3001 (or NEXT_PUBLIC_API_URL).
 * - Production: returns '' so requests go to the same origin as the Next app; configure
 *   `next.config.mjs` rewrites using NEXT_PUBLIC_API_URL (or BACKEND_PROXY_URL) to proxy `/api/*` to the real API.
 * - If NEXT_PUBLIC_API_URL is set on any host, use it directly (requires CORS on the API).
 */
export function getApiUrl(): string {
  const fromEnv = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL?.trim()) || ''
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '')
  }
  if (typeof window !== 'undefined') {
    const h = window.location.hostname
    if (h === 'localhost' || h === '127.0.0.1') {
      return 'http://localhost:3001'
    }
    return ''
  }
  return ''
}

function base64UrlDecode(base64Url: string): string {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
  try {
    return decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join('')
    );
  } catch {
    return atob(padded);
  }
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
