/**
 * Backend API base URL. Empty when frontend is same-origin with backend (dev proxy);
 * set PUBLIC_API_URL in production (e.g. https://auditor-api.fly.dev).
 */
declare const __PUBLIC_API_URL__: string | undefined;
const PUBLIC_API_URL =
  (typeof __PUBLIC_API_URL__ !== 'undefined' ? __PUBLIC_API_URL__ : null) ??
  import.meta.env.PUBLIC_API_URL ??
  '';

export const API_BASE = PUBLIC_API_URL + '/api/v1';

/**
 * Build full URL for screenshot/image paths returned by the API (e.g. /screenshots/...).
 * When PUBLIC_API_URL is set, prepends it so requests go to the backend origin.
 */
export function screenshotUrl(path: string): string {
  if (!path || typeof path !== 'string') return path;
  if (path.startsWith('http')) return path;
  return PUBLIC_API_URL ? PUBLIC_API_URL + path : path;
}
