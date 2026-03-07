globalThis.process ??= {}; globalThis.process.env ??= {};
import { d as defineMiddleware, s as sequence } from './chunks/index_JQC2q37V.mjs';
import './chunks/astro-designed-error-pages_CIg0Mjq1.mjs';
import './chunks/astro/server_C4O8OynV.mjs';

const onRequest$2 = defineMiddleware(async (context, next) => {
  const response = await next();
  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.includes("text/html")) return response;
  const runtime = context.locals.runtime;
  const env = runtime?.env;
  const url = env?.PUBLIC_SUPABASE_URL;
  const key = env?.PUBLIC_SUPABASE_ANON_KEY || env?.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;
  const html = await response.text();
  const safeUrl = url.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const safeKey = key.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const out = html.replace(/__PUBLIC_SUPABASE_URL__/g, safeUrl).replace(/__PUBLIC_SUPABASE_ANON_KEY__/g, safeKey);
  return new Response(out, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
});

const onRequest$1 = (context, next) => {
  if (context.isPrerendered) {
    context.locals.runtime ??= {
      env: process.env
    };
  }
  return next();
};

const onRequest = sequence(
	onRequest$1,
	onRequest$2
	
);

export { onRequest };
