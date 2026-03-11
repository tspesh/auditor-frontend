globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BrMQsyWt.mjs';
import { s as supabase, g as getAPIBase, j as jsxRuntimeExports, $ as $$Layout } from '../chunks/Layout_DDTHaJdw.mjs';
import { A as AuthGuard } from '../chunks/AuthGuard_EZvGPp2R.mjs';
import { a as reactExports } from '../chunks/_@astro-renderers_Bk125N18.mjs';
export { r as renderers } from '../chunks/_@astro-renderers_Bk125N18.mjs';

function StatusBadge({ status }) {
  const map = {
    queued: "bg-neutral-200 text-neutral-700",
    running: "bg-growth-100 text-growth-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700"
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `inline-block px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? map.queued}`, children: status });
}
function RoleBadge({ role }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `inline-block px-2 py-0.5 rounded-full text-xs font-medium ${role === "admin" ? "bg-growth-100 text-growth-700" : "bg-neutral-200 text-neutral-600"}`, children: role });
}
function AdminDashboard() {
  const [session, setSession] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [authorized, setAuthorized] = reactExports.useState(false);
  const [tab, setTab] = reactExports.useState("audits");
  const [audits, setAudits] = reactExports.useState(null);
  const [users, setUsers] = reactExports.useState(null);
  const [page, setPage] = reactExports.useState(1);
  const [error, setError] = reactExports.useState(null);
  reactExports.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);
  reactExports.useEffect(() => {
    if (!session?.access_token) return;
    checkAdmin(session.access_token);
  }, [session?.access_token]);
  reactExports.useEffect(() => {
    if (!session?.access_token || !authorized) return;
    if (tab === "audits") fetchAudits(session.access_token, page);
    else fetchUsers(session.access_token, page);
  }, [session?.access_token, authorized, tab, page]);
  const checkAdmin = async (token) => {
    try {
      const resp = await fetch(`${getAPIBase()}/audit/quota`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error("Not authenticated");
      const data = await resp.json();
      if (data.role !== "admin") {
        setError("Admin access required");
        return;
      }
      setAuthorized(true);
    } catch {
      setError("Authentication failed");
    }
  };
  const fetchAudits = async (token, p) => {
    try {
      const resp = await fetch(`${getAPIBase()}/admin/audits?page=${p}&page_size=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error(`Failed: ${resp.status}`);
      setAudits(await resp.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };
  const fetchUsers = async (token, p) => {
    try {
      const resp = await fetch(`${getAPIBase()}/admin/users?page=${p}&page_size=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error(`Failed: ${resp.status}`);
      setUsers(await resp.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };
  if (loading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center py-16", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-8 w-8 border-4 border-growth-500 border-t-transparent rounded-full animate-spin" }) });
  }
  if (!session || !authorized) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-xl border border-neutral-200 p-8 text-center max-w-md mx-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-heading text-xl font-bold text-neutral-900 mb-2", children: "Access Denied" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-neutral-500 text-sm mb-4", children: error ?? "You must be an admin to view this page." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "/", className: "text-growth-600 hover:text-growth-700 font-medium text-sm", children: "Back to Home" })
    ] });
  }
  const totalPages = tab === "audits" ? Math.ceil((audits?.total ?? 0) / 20) : Math.ceil((users?.total ?? 0) / 20);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-heading text-2xl font-bold text-neutral-900", children: "Admin Dashboard" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "/", className: "text-sm text-growth-600 hover:text-growth-700 font-medium", children: "Back to Auditor" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-1 bg-neutral-100 rounded-lg p-1 w-fit", children: ["audits", "users"].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => {
          setTab(t);
          setPage(1);
        },
        className: `px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`,
        children: t === "audits" ? "All Audits" : "Users"
      },
      t
    )) }),
    tab === "audits" && audits && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-xl border border-neutral-200 overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-6 py-4 border-b border-neutral-200 bg-neutral-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-neutral-500", children: [
        audits.total,
        " total audits"
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-neutral-200 text-left text-neutral-500", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 font-medium", children: "URL" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 font-medium", children: "User" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 font-medium", children: "Status" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 font-medium", children: "Created" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          audits.items.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-neutral-100 last:border-0 hover:bg-neutral-50", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-3 font-mono text-xs text-growth-600 max-w-[250px] truncate", children: a.target_url }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-3 text-neutral-700", children: a.user_email }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: a.status }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-3 text-neutral-500", children: new Date(a.created_at).toLocaleDateString() })
          ] }, a.id)),
          audits.items.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 4, className: "px-6 py-8 text-center text-neutral-400", children: "No audits yet" }) })
        ] })
      ] }) })
    ] }),
    tab === "users" && users && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-xl border border-neutral-200 overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-6 py-4 border-b border-neutral-200 bg-neutral-50", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-neutral-500", children: [
        users.total,
        " total users"
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-neutral-200 text-left text-neutral-500", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 font-medium", children: "Email" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 font-medium", children: "Role" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 font-medium text-right", children: "Audits Used" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 font-medium text-right", children: "Quota" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-6 py-3 font-medium", children: "Joined" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: users.items.map((u) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-b border-neutral-100 last:border-0 hover:bg-neutral-50", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-3 text-neutral-700", children: u.email }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RoleBadge, { role: u.role }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-3 text-right text-neutral-700", children: u.audits_used }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-3 text-right text-neutral-700", children: u.max_audits }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-6 py-3 text-neutral-500", children: new Date(u.created_at).toLocaleDateString() })
        ] }, u.id)) })
      ] }) })
    ] }),
    totalPages > 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setPage(Math.max(1, page - 1)),
          disabled: page === 1,
          className: "px-3 py-1 rounded-md text-sm font-medium bg-white border border-neutral-200\n                       text-neutral-700 hover:bg-neutral-50\n                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
          children: "Previous"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "px-3 py-1 text-sm text-neutral-500", children: [
        "Page ",
        page,
        " of ",
        totalPages
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setPage(Math.min(totalPages, page + 1)),
          disabled: page === totalPages,
          className: "px-3 py-1 rounded-md text-sm font-medium bg-white border border-neutral-200\n                       text-neutral-700 hover:bg-neutral-50\n                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
          children: "Next"
        }
      )
    ] })
  ] });
}

function AdminPage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AuthGuard, { requireAdmin: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(AdminDashboard, {}) });
}

const $$Admin = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Admin | Auditor" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="container mx-auto px-6 py-12 max-w-5xl"> ${renderComponent($$result2, "AdminPage", AdminPage, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/timspeciale/Code/auditor/frontend/src/components/AdminPage", "client:component-export": "default" })} </section> ` })}`;
}, "/Users/timspeciale/Code/auditor/frontend/src/pages/admin.astro", void 0);

const $$file = "/Users/timspeciale/Code/auditor/frontend/src/pages/admin.astro";
const $$url = "/admin";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Admin,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
