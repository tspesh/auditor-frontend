import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * Returns the backend API URL from Cloudflare Worker runtime env.
 * The frontend fetches this on mount to set the runtime API base when the
 * build-time PUBLIC_API_URL was empty.
 *
 * In local dev the Vite proxy handles /api/v1 -> localhost:8000 so we
 * must NOT return a remote URL. .dev.vars should keep PUBLIC_API_URL
 * empty, but as a safety net we also strip any value when the request
 * originates from localhost/127.x.
 */
export const GET: APIRoute = ({ locals, request }) => {
  const rt = (locals as Record<string, unknown>).runtime as Record<string, unknown> | undefined;
  const env = (rt?.env ?? {}) as Record<string, unknown>;
  let apiUrl = String(env.PUBLIC_API_URL ?? '');

  const host = new URL(request.url).hostname;
  const isLocal = host === 'localhost' || host.startsWith('127.');
  if (isLocal) {
    apiUrl = '';
  }

  return new Response(JSON.stringify({ apiUrl }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
