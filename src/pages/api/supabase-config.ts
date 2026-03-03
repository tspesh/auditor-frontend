import type { APIRoute } from 'astro';

/**
 * Returns Supabase URL and anon key from Cloudflare Worker runtime env (Variables and Secrets).
 * Used when the client receives placeholders (HTML not replaced at serve time).
 */
export const GET: APIRoute = ({ locals }) => {
  const env = (locals as { runtime?: { env?: Record<string, string> } }).runtime?.env ?? {};
  const url = env.PUBLIC_SUPABASE_URL ?? '';
  const anonKey = env.PUBLIC_SUPABASE_ANON_KEY ?? env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
  return new Response(JSON.stringify({ url, anonKey }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
