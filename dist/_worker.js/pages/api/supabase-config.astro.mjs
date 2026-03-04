globalThis.process ??= {}; globalThis.process.env ??= {};
export { r as renderers } from '../../chunks/_@astro-renderers_ByCCE3Nj.mjs';

const prerender = false;
const GET = ({ locals }) => {
  const rt = locals.runtime;
  const env = rt?.env ?? {};
  const url = String(env.PUBLIC_SUPABASE_URL ?? "");
  const anonKey = String(env.PUBLIC_SUPABASE_ANON_KEY ?? env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "");
  return new Response(JSON.stringify({ url, anonKey }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
