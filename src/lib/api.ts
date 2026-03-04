/**
 * Backend API base URL. Empty when frontend is same-origin with backend (dev proxy);
 * set PUBLIC_API_URL in production (e.g. https://auditor-api.fly.dev).
 * Runtime value from /api/backend-config is used when build-time value is missing.
 * When on production host and no env is set, PRODUCTION_BACKEND_ORIGIN is used.
 */
declare const __PUBLIC_API_URL__: string | undefined;
const BUILD_API_URL =
  (typeof __PUBLIC_API_URL__ !== 'undefined' ? __PUBLIC_API_URL__ : null) ??
  (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_API_URL) ??
  '';

/** Fallback when PUBLIC_API_URL is not available from build or /api/backend-config. Update if your Fly app URL differs. */
const PRODUCTION_BACKEND_ORIGIN = 'https://auditor.fly.dev';

let _runtimeApiBase = '';

/** Set by the app after fetching /api/backend-config when BUILD_API_URL is empty. */
export function setBackendUrl(baseUrl: string): void {
  const base = (baseUrl ?? '').replace(/\/$/, '');
  _runtimeApiBase = base ? base + '/api/v1' : '';
}

function getProductionFallback(): string {
  if (typeof window === 'undefined') return '';
  const host = window.location?.hostname ?? '';
  if (host === 'audit.betteroffgrowth.com') return PRODUCTION_BACKEND_ORIGIN + '/api/v1';
  return '';
}

/** Use this for all API requests so runtime backend URL is used when set. */
export function getAPIBase(): string {
  return (
    _runtimeApiBase ||
    (BUILD_API_URL ? BUILD_API_URL + '/api/v1' : '') ||
    getProductionFallback() ||
    '/api/v1'
  );
}

/** @deprecated Use getAPIBase() so runtime config is used. */
export const API_BASE = BUILD_API_URL ? BUILD_API_URL + '/api/v1' : '/api/v1';

/**
 * Build full URL for screenshot/image paths returned by the API (e.g. /screenshots/...).
 * When PUBLIC_API_URL is set, prepends it so requests go to the backend origin.
 */
export function screenshotUrl(path: string): string {
  if (!path || typeof path !== 'string') return path;
  if (path.startsWith('http')) return path;
  const withSlash = _runtimeApiBase ? _runtimeApiBase.replace(/\/api\/v1$/, '') : BUILD_API_URL;
  const base = withSlash || (typeof window !== 'undefined' && window.location?.hostname === 'audit.betteroffgrowth.com' ? PRODUCTION_BACKEND_ORIGIN : '');
  return base ? base + path : path;
}
