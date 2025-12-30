/**
 * API Utility for Native Platform Support
 *
 * When running on native platforms (iOS/Android via Capacitor),
 * the app loads bundled assets locally but needs to make API calls
 * to the production server.
 *
 * On web, API calls go to the same origin (relative paths).
 */

import { isNative, getPlatform as getPlatformFromLib } from './platform';

/**
 * Production API base URL - used when running on native platforms
 */
export const PRODUCTION_URL = 'https://journalmate.ai';

/**
 * Get the API base URL based on platform
 * Uses robust platform detection that handles Android WebView timing issues
 * - Native platforms: Use production URL
 * - Web: Use relative paths (empty string)
 */
function getApiBaseUrl(): string {
  return isNative() ? PRODUCTION_URL : '';
}

// Note: This is evaluated at module load time, but isNative() has fallback detection
export const API_BASE_URL = getApiBaseUrl();

/**
 * Prefix a path with the appropriate base URL
 * Dynamically checks platform to handle late-detection scenarios
 *
 * @example
 * // On native: returns 'https://journalmate.ai/api/user'
 * // On web: returns '/api/user'
 * apiUrl('/api/user')
 */
export function apiUrl(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // Dynamically check platform each time for robustness
  const baseUrl = isNative() ? PRODUCTION_URL : '';
  return `${baseUrl}${normalizedPath}`;
}

/**
 * Check if we're running on a native platform
 * Uses robust detection with fallback for Android WebView timing issues
 */
export function isNativePlatform(): boolean {
  return isNative();
}

/**
 * Get the current platform
 * Uses robust detection with fallback for Android WebView timing issues
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  return getPlatformFromLib();
}

/**
 * Enhanced fetch that automatically prefixes API URLs on native
 * and includes credentials for session handling
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = apiUrl(path);

  // Always include credentials for session cookies
  const fetchOptions: RequestInit = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  return fetch(url, fetchOptions);
}

/**
 * Helper for GET requests
 */
export async function apiGet<T>(path: string): Promise<T> {
  const response = await apiFetch(path, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`API GET ${path} failed: ${response.status}`);
  }
  return response.json();
}

/**
 * Helper for POST requests
 */
export async function apiPost<T>(path: string, data?: any): Promise<T> {
  const response = await apiFetch(path, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!response.ok) {
    throw new Error(`API POST ${path} failed: ${response.status}`);
  }
  return response.json();
}

export default {
  API_BASE_URL,
  PRODUCTION_URL,
  apiUrl,
  apiFetch,
  apiGet,
  apiPost,
  isNativePlatform,
  getPlatform,
};
