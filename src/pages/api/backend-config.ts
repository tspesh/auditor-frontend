import type { APIRoute } from 'astro';

/**
 * Returns the backend API URL from Cloudflare Worker runtime env (Secrets).
 * The client uses this to discover the Fly backend origin at runtime
 * when the build-time PUBLIC_API_URL is not baked into the bundle.
 */
export const GET: APIRoute = ({ locals }) => {
  const env = (locals as { runtime?: { env?: Record<string, string> } }).runtime?.env ?? {};
  const apiUrl = env.PUBLIC_API_URL ?? '';
  return new Response(JSON.stringify({ apiUrl }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
