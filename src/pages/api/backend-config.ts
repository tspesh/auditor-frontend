import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * Returns the backend API URL from Cloudflare Worker runtime env.
 * App.tsx fetches this on mount to set the runtime API base when the
 * build-time PUBLIC_API_URL was empty.
 */
export const GET: APIRoute = ({ locals }) => {
  const rt = (locals as Record<string, unknown>).runtime as Record<string, unknown> | undefined;
  const env = (rt?.env ?? {}) as Record<string, unknown>;
  const apiUrl = String(env.PUBLIC_API_URL ?? '');
  return new Response(JSON.stringify({ apiUrl }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
