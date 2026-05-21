import { defineMiddleware } from 'astro:middleware';

/**
 * When running on Cloudflare (adapter), inject runtime env (Variables and Secrets)
 * into HTML by replacing placeholders. Only runs when context.locals.runtime.env exists.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.includes('text/html')) return response;

  const runtime = (context.locals as { runtime?: { env?: Record<string, string> } }).runtime;
  const env = runtime?.env;
  const url = env?.PUBLIC_SUPABASE_URL;
  const key = env?.PUBLIC_SUPABASE_ANON_KEY || env?.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const apiUrl = env?.PUBLIC_API_URL;
  if (!url && !key && !apiUrl) return response;

  const esc = (v: string) => v.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  let out = await response.text();
  if (url) out = out.replace(/__PUBLIC_SUPABASE_URL__/g, esc(url));
  if (key) out = out.replace(/__PUBLIC_SUPABASE_ANON_KEY__/g, esc(key));
  if (apiUrl) out = out.replace(/__PUBLIC_API_URL__/g, esc(apiUrl));

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(out, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
