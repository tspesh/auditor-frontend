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
  if (!url || !key) return response;

  const html = await response.text();
  const safeUrl = url.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const safeKey = key.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const out = html
    .replace(/__PUBLIC_SUPABASE_URL__/g, safeUrl)
    .replace(/__PUBLIC_SUPABASE_ANON_KEY__/g, safeKey);

  return new Response(out, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
});
