import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * Returns Supabase URL and anon key from Cloudflare Worker runtime env (Variables and Secrets).
 * Must be SSR (prerender=false) to access Cloudflare bindings at runtime.
 */
export const GET: APIRoute = ({ locals }) => {
  const rt = (locals as Record<string, unknown>).runtime as Record<string, unknown> | undefined;
  const env = (rt?.env ?? {}) as Record<string, unknown>;
  const url = String(env.PUBLIC_SUPABASE_URL ?? '');
  const anonKey = String(env.PUBLIC_SUPABASE_ANON_KEY ?? env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '');
  return new Response(JSON.stringify({ url, anonKey }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
