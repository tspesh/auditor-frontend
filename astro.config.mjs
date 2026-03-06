import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import { loadEnv } from 'vite';

// Load env from .env files and process.env so Cloudflare Pages build gets dashboard vars.
// .env.production overrides .env in production builds, clearing local-dev values so
// Layout.astro emits __PUBLIC_SUPABASE_URL__ placeholders that the Cloudflare middleware
// replaces at runtime from wrangler secrets.
const mode = process.env.MODE ?? process.env.NODE_ENV ?? 'production';
const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };

// Safety net: never bake local-dev URLs into a production build.
function prodSafe(val) {
  if (!val) return '';
  if (/^https?:\/\/(localhost|127\.\d)/i.test(val)) return '';
  return val;
}
const isProd = mode === 'production';

export default defineConfig({
  adapter: cloudflare(),
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
  ],
  vite: {
    // Use React's edge server renderer in production so Cloudflare Workers don't hit MessageChannel (not available in Workers runtime).
    resolve: {
      alias:
        process.env.NODE_ENV === 'production'
          ? { 'react-dom/server': 'react-dom/server.edge' }
          : {},
    },
    // Expose PUBLIC_* from process.env so Cloudflare Pages build has them in import.meta.env.
    envPrefix: ['PUBLIC_', 'VITE_'],
    define: {
      __PUBLIC_SUPABASE_URL__: JSON.stringify(isProd ? prodSafe(env.PUBLIC_SUPABASE_URL) : (env.PUBLIC_SUPABASE_URL ?? '')),
      __PUBLIC_SUPABASE_ANON_KEY__: JSON.stringify(env.PUBLIC_SUPABASE_ANON_KEY ?? ''),
      __PUBLIC_SUPABASE_PUBLISHABLE_KEY__: JSON.stringify(env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''),
      __PUBLIC_API_URL__: JSON.stringify(isProd ? prodSafe(env.PUBLIC_API_URL) : (env.PUBLIC_API_URL ?? '')),
    },
    server: {
      proxy: {
        '/api/v1': 'http://localhost:8000',
        '/screenshots': 'http://localhost:8000',
      },
    },
  },
});
