import type { APIRoute } from 'astro';

/**
 * Returns backend API base URL from Cloudflare Worker runtime env (Variables and Secrets).
 * Lets the client use the correct Fly.io URL when PUBLIC_API_URL was not set at build time.
 */
export const GET: APIRoute = ({ locals }) => {
  const env = (locals as { runtime?: { env?: Record<string, string> } }).runtime?.env ?? {};
  const apiUrl = (env.PUBLIC_API_URL ?? '').replace(/\/$/, '');
  return new Response(JSON.stringify({ apiUrl }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
