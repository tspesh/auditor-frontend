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

// #region agent log
const DEBUG_LOG = (data: Record<string, unknown>) => {
  try {
    fetch('http://127.0.0.1:7696/ingest/26ff8251-de9e-4b58-8f6e-bb66153fe70f', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'eaf8c6' },
      body: JSON.stringify({
        sessionId: 'eaf8c6',
        location: 'supabase.ts:getSupabaseConfig',
        message: 'Supabase config source',
        data,
        timestamp: Date.now(),
        hypothesisId: data.hypothesisId as string,
      }),
    }).catch(() => {});
  } catch (_) {}
};
// #endregion

function getSupabaseConfig(): { url: string; key: string } {
  const hasWindow = typeof window !== 'undefined';
  const winEnv = hasWindow ? window.__SUPABASE_ENV__ : undefined;
  const hasWinUrl = Boolean(winEnv?.url);
  const hasWinKey = Boolean(winEnv?.anonKey);
  const winUrlIsPlaceholder = winEnv?.url === PLACEHOLDER_URL;
  const winKeyIsPlaceholder = winEnv?.anonKey === PLACEHOLDER_KEY;
  // #region agent log
  DEBUG_LOG({
    hypothesisId: 'A',
    hasWindow,
    hasWinUrl,
    hasWinKey,
    winUrlIsPlaceholder,
    winKeyIsPlaceholder,
  });
  // #endregion

  if (hasWindow && hasWinUrl && hasWinKey && !winUrlIsPlaceholder && !winKeyIsPlaceholder) {
    // #region agent log
    DEBUG_LOG({ hypothesisId: 'E', source: 'window', urlLen: winEnv!.url.length, keyLen: winEnv!.anonKey.length });
    // #endregion
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
  // #region agent log
  DEBUG_LOG({
    hypothesisId: 'C',
    defineUrlLen: defineUrl.length,
    defineKeyLen: defineKey.length,
  });
  DEBUG_LOG({
    hypothesisId: 'D',
    metaUrlLen: metaUrl.length,
    metaKeyLen: metaKey.length,
  });
  // #endregion

  const url = defineUrl || metaUrl;
  const key = defineKey || metaKey;
  const source = defineUrl ? 'define' : metaUrl ? 'meta' : 'none';
  // #region agent log
  DEBUG_LOG({ hypothesisId: 'E', source, finalUrlLen: url.length, finalKeyLen: key.length });
  // #endregion
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
  // #region agent log
  DEBUG_LOG({ hypothesisId: 'F', fetchStarting: true });
  // #endregion
  _configPromise = fetch('/api/supabase-config')
    .then((r) => {
      // #region agent log
      DEBUG_LOG({ hypothesisId: 'F', fetchStatus: r.status, fetchOk: r.ok });
      // #endregion
      return r.json();
    })
    .then((j: { url?: string; anonKey?: string }) => {
      const urlLen = j?.url?.length ?? 0;
      const keyLen = j?.anonKey?.length ?? 0;
      // #region agent log
      DEBUG_LOG({ hypothesisId: 'F', apiUrlLen: urlLen, apiKeyLen: keyLen, willSet: urlLen > 0 && keyLen > 0 });
      // #endregion
      if (j?.url && j?.anonKey) window.__SUPABASE_ENV__ = { url: j.url, anonKey: j.anonKey };
    })
    .catch((e) => {
      // #region agent log
      DEBUG_LOG({ hypothesisId: 'F', fetchError: String(e?.message ?? e) });
      // #endregion
    });
  return _configPromise;
}

function getClient(): SupabaseClient {
  if (_client) return _client;
  const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();
  if (!supabaseUrl || !supabaseKey) {
    // #region agent log
    DEBUG_LOG({
      hypothesisId: 'E',
      atThrow: true,
      missingUrl: !supabaseUrl,
      missingKey: !supabaseKey,
    });
    // #endregion
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
