import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// 1) From layout-injected script (set from process.env at build time on Cloudflare).
// 2) From Vite define globals. 3) From import.meta.env (local .env).
declare global {
  interface Window {
    __SUPABASE_ENV__?: { url: string; anonKey: string };
  }
}
declare const __PUBLIC_SUPABASE_URL__: string | undefined;
declare const __PUBLIC_SUPABASE_ANON_KEY__: string | undefined;
declare const __PUBLIC_SUPABASE_PUBLISHABLE_KEY__: string | undefined;

const PLACEHOLDER_URL = '__PUBLIC_SUPABASE_URL__';
const PLACEHOLDER_KEY = '__PUBLIC_SUPABASE_ANON_KEY__';

function getSupabaseConfig(): { url: string; key: string } {
  const hasWindow = typeof window !== 'undefined';
  const winEnv = hasWindow ? window.__SUPABASE_ENV__ : undefined;
  const hasWinUrl = Boolean(winEnv?.url);
  const hasWinKey = Boolean(winEnv?.anonKey);
  const winUrlIsPlaceholder = winEnv?.url === PLACEHOLDER_URL;
  const winKeyIsPlaceholder = winEnv?.anonKey === PLACEHOLDER_KEY;

  if (hasWindow && hasWinUrl && hasWinKey && !winUrlIsPlaceholder && !winKeyIsPlaceholder) {
    return { url: winEnv!.url, key: winEnv!.anonKey.trim() };
  }

  const defineUrl =
    typeof __PUBLIC_SUPABASE_URL__ !== 'undefined' && __PUBLIC_SUPABASE_URL__ !== ''
      ? __PUBLIC_SUPABASE_URL__
      : '';
  const defineKey =
    (typeof __PUBLIC_SUPABASE_ANON_KEY__ !== 'undefined' && __PUBLIC_SUPABASE_ANON_KEY__ !== ''
      ? __PUBLIC_SUPABASE_ANON_KEY__
      : '') ||
    (typeof __PUBLIC_SUPABASE_PUBLISHABLE_KEY__ !== 'undefined' && __PUBLIC_SUPABASE_PUBLISHABLE_KEY__ !== ''
      ? __PUBLIC_SUPABASE_PUBLISHABLE_KEY__
      : '');
  const metaUrl = String(import.meta.env.PUBLIC_SUPABASE_URL ?? '');
  const metaKey = String(
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''
  ).trim();

  const url = defineUrl || metaUrl;
  const key = defineKey || metaKey;
  return { url, key };
}

let _client: SupabaseClient | null = null;
let _configPromise: Promise<void> | null = null;

/** Call before using supabase when deploy has placeholders (runtime env only). Resolves when config is ready. */
export function ensureSupabaseConfig(): Promise<void> {
  const c = getSupabaseConfig();
  const hasRealConfig = c.url && c.key && c.url !== PLACEHOLDER_URL && c.key !== PLACEHOLDER_KEY;
  if (hasRealConfig) return Promise.resolve();
  if (_configPromise) return _configPromise;
  _configPromise = fetch('/api/supabase-config')
    .then((r) => r.json())
    .then((j: { url?: string; anonKey?: string }) => {
      if (j?.url && j?.anonKey) window.__SUPABASE_ENV__ = { url: j.url, anonKey: j.anonKey };
    })
    .catch(() => {});
  return _configPromise;
}

function getClient(): SupabaseClient {
  if (_client) return _client;
  const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();
  if (!supabaseUrl || !supabaseKey) {
    const missing = [
      !supabaseUrl && 'PUBLIC_SUPABASE_URL',
      !supabaseKey && '(PUBLIC_SUPABASE_ANON_KEY or PUBLIC_SUPABASE_PUBLISHABLE_KEY)',
    ].filter(Boolean);
    throw new Error(
      `Supabase is not configured: missing ${missing.join(', ')}. ` +
        'Local: set them in frontend/.env (see README; use `supabase status -o env` for local values). ' +
        'Production: set these as build-time environment variables in your host (e.g. Cloudflare Pages → Settings → Environment variables), then redeploy.'
    );
  }
  _client = createClient(supabaseUrl, supabaseKey);
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
