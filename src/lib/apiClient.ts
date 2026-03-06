import { getAPIBase } from './api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`API error ${status}: ${body}`);
    this.name = 'ApiError';
  }
}

interface FetchOptions extends Omit<RequestInit, 'headers'> {
  token?: string;
  headers?: Record<string, string>;
}

/**
 * Typed wrapper around fetch that prefixes getAPIBase(), injects auth,
 * and throws ApiError on non-ok responses.
 *
 * @param path  - API path relative to /api/v1 (e.g. "/audit" or "/profile")
 * @param opts  - Standard fetch options plus `token` for auth
 */
export async function apiFetch<T = unknown>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { token, headers: extra, ...fetchOpts } = opts;
  const headers: Record<string, string> = { ...extra };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (fetchOpts.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const url = `${getAPIBase()}${path}`;
  const resp = await fetch(url, { ...fetchOpts, headers });

  if (!resp.ok) {
    const body = await resp.text();
    throw new ApiError(resp.status, body);
  }

  const contentType = resp.headers.get('Content-Type') ?? '';
  if (contentType.includes('application/json')) {
    return resp.json() as Promise<T>;
  }
  return resp as unknown as T;
}
