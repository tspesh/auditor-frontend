globalThis.process ??= {}; globalThis.process.env ??= {};
import { r as renderers } from './chunks/_@astro-renderers_Bk125N18.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_Db6-fZyN.mjs';
import { manifest } from './manifest_CbtzYJQd.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/admin.astro.mjs');
const _page2 = () => import('./pages/api/backend-config.astro.mjs');
const _page3 = () => import('./pages/api/supabase-config.astro.mjs');
const _page4 = () => import('./pages/audit/_id_.astro.mjs');
const _page5 = () => import('./pages/dashboard.astro.mjs');
const _page6 = () => import('./pages/login.astro.mjs');
const _page7 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/@astrojs/cloudflare/dist/entrypoints/image-endpoint.js", _page0],
    ["src/pages/admin.astro", _page1],
    ["src/pages/api/backend-config.ts", _page2],
    ["src/pages/api/supabase-config.ts", _page3],
    ["src/pages/audit/[id].astro", _page4],
    ["src/pages/dashboard.astro", _page5],
    ["src/pages/login.astro", _page6],
    ["src/pages/index.astro", _page7]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./noop-entrypoint.mjs'),
    middleware: () => import('./_astro-internal_middleware.mjs')
});
const _args = undefined;
const _exports = createExports(_manifest);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) {
	serverEntrypointModule[_start](_manifest, _args);
}

export { __astrojsSsrVirtualEntry as default, pageMap };
