/**
 * Backend API base URL. Empty when frontend is same-origin with backend (dev proxy);
 * set PUBLIC_API_URL in production (e.g. https://auditor-api.fly.dev).
 * The backend origin is inlined into the HTML by Layout.astro (as
 * window.__BACKEND_API_URL__) and replaced at runtime by the Cloudflare
 * middleware, so no per-page /api/backend-config fetch is needed.
 * When on production host and no env is set, PRODUCTION_BACKEND_ORIGIN is used.
 */
declare const __PUBLIC_API_URL__: string | undefined;
declare global {
  interface Window {
    __BACKEND_API_URL__?: string;
  }
}
const API_PLACEHOLDER = '__PUBLIC_API_URL__';
const BUILD_API_URL =
  (typeof __PUBLIC_API_URL__ !== 'undefined' ? __PUBLIC_API_URL__ : null) ??
  (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_API_URL) ??
  '';

/** Fallback when PUBLIC_API_URL is not available from build or runtime injection. Update if your Fly app URL differs. */
const PRODUCTION_BACKEND_ORIGIN = 'https://auditor.fly.dev';

let _runtimeApiBase = '';

/** Set by the app after fetching backend config when BUILD_API_URL is empty. */
export function setBackendUrl(baseUrl: string): void {
  const base = (baseUrl ?? '').replace(/\/$/, '');
  _runtimeApiBase = base ? base + '/api/v1' : '';
}

/** Origin inlined into the HTML by Layout.astro, ignoring unreplaced placeholder / local-dev values. */
function getInjectedApiBase(): string {
  if (typeof window === 'undefined') return '';
  const raw = (window.__BACKEND_API_URL__ ?? '').replace(/\/$/, '');
  if (!raw || raw === API_PLACEHOLDER) return '';
  if (/^https?:\/\/(localhost|127\.\d)/i.test(raw)) return '';
  return raw + '/api/v1';
}

function getProductionFallback(): string {
  if (typeof window === 'undefined') return '';
  const host = window.location?.hostname ?? '';
  if (host === 'audit.betteroffgrowth.com') return PRODUCTION_BACKEND_ORIGIN + '/api/v1';
  return '';
}

/** Use this for all API requests so the resolved backend URL is used. */
export function getAPIBase(): string {
  return (
    _runtimeApiBase ||
    getInjectedApiBase() ||
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
  // Derive the backend origin from the resolved API base (strip the /api/v1 suffix).
  const apiBase = getAPIBase();
  const base = apiBase === '/api/v1' ? '' : apiBase.replace(/\/api\/v1$/, '');
  return base ? base + path : path;
}
