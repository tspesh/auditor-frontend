globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BrMQsyWt.mjs';
import { j as jsxRuntimeExports, g as getAPIBase, u as useAuth, $ as $$Layout } from '../chunks/Layout_DDTHaJdw.mjs';
import { a as reactExports } from '../chunks/_@astro-renderers_Bk125N18.mjs';
export { r as renderers } from '../chunks/_@astro-renderers_Bk125N18.mjs';
import { S as StatusBadge, P as PipelineProgress, R as ReportProse } from '../chunks/ReportProse_C7dbM42U.mjs';

const GUEST_REPORT_TABS = [
  { id: "executive", label: "Executive Summary" },
  { id: "crawl", label: "Crawl Summary" },
  { id: "identity", label: "Business Identity" },
  { id: "messaging", label: "Messaging" },
  { id: "ux", label: "UX" },
  { id: "cro", label: "CRO" },
  { id: "performance", label: "Core Web Vitals" }
];
function plgStatusToPipelineResult(s) {
  return {
    status: s.status,
    current_step: s.current_step,
    pages_crawled: s.pages_crawled ?? 0,
    total_urls: s.total_urls ?? 0,
    errors: s.errors ?? [],
    created_at: s.created_at ?? null,
    executive_summary: s.executive_summary
  };
}
function PLGLanding({ onShowAuth }) {
  const [url, setUrl] = reactExports.useState("");
  const [phase, setPhase] = reactExports.useState("idle");
  const [summary, setSummary] = reactExports.useState(null);
  const [targetUrl, setTargetUrl] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(null);
  const [auditId, setAuditId] = reactExports.useState(null);
  const [guestStatus, setGuestStatus] = reactExports.useState(null);
  const pollRef = reactExports.useRef(null);
  const [csvUrls, setCsvUrls] = reactExports.useState([]);
  const csvFileRef = reactExports.useRef(null);
  const stopPolling = reactExports.useCallback(() => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);
  reactExports.useEffect(() => () => stopPolling(), [stopPolling]);
  const handleCsvFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result ?? "";
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const parsed = [];
      for (const line of lines) {
        const cell = line.includes(",") ? line.split(",")[0].trim() : line;
        if (/^https?:\/\//i.test(cell)) parsed.push(cell);
      }
      setCsvUrls([...new Set(parsed)]);
    };
    reader.readAsText(file);
    e.target.value = "";
  };
  const clearCsv = () => {
    setCsvUrls([]);
    if (csvFileRef.current) csvFileRef.current.value = "";
  };
  const startAudit = async (e) => {
    e.preventDefault();
    const target = url.trim();
    if (!target) return;
    setError(null);
    setSummary(null);
    setTargetUrl(null);
    setGuestStatus(null);
    setAuditId(null);
    setPhase("running");
    try {
      const parsed = target.startsWith("http") ? target : `https://${target}`;
      const payload = { url: parsed };
      if (csvUrls.length > 0) {
        payload.urls = csvUrls;
      }
      const resp = await fetch(`${getAPIBase()}/plg/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(body || `Request failed: ${resp.status}`);
      }
      const data = await resp.json();
      setTargetUrl(data.target_url);
      if (data.cached && data.executive_summary) {
        setSummary(data.executive_summary);
        setPhase("completed");
        return;
      }
      if (data.audit_id) {
        setAuditId(data.audit_id);
        pollRef.current = setInterval(async () => {
          try {
            const sResp = await fetch(`${getAPIBase()}/plg/audit/${data.audit_id}/status`);
            if (!sResp.ok) return;
            const s = await sResp.json();
            setGuestStatus(s);
            if (s.status === "completed" && s.executive_summary) {
              stopPolling();
              setSummary(s.executive_summary);
              setPhase("completed");
            } else if (s.status === "failed") {
              stopPolling();
              setError(s.errors?.[s.errors.length - 1] || "Audit failed");
              setPhase("failed");
            }
          } catch {
          }
        }, 2e3);
        return;
      }
      setPhase("idle");
      setError("No audit started");
    } catch (err) {
      setPhase("failed");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };
  const reset = () => {
    stopPolling();
    setPhase("idle");
    setSummary(null);
    setTargetUrl(null);
    setError(null);
    setAuditId(null);
    setGuestStatus(null);
    setCsvUrls([]);
  };
  const pipelineResult = guestStatus ? plgStatusToPipelineResult(guestStatus) : auditId ? {
    status: "running",
    current_step: "discovering",
    pages_crawled: 0,
    total_urls: 0,
    errors: [],
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  } : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-3xl mx-auto px-4 py-10 space-y-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center space-y-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold text-neutral-900", children: "See how your site performs" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-neutral-600", children: "Run a free audit and get an executive summary. Sign up for the full report." })
    ] }),
    phase === "idle" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: startAudit, className: "flex flex-col sm:flex-row gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            value: url,
            onChange: (e) => setUrl(e.target.value),
            placeholder: "https://yoursite.com",
            className: "flex-1 px-4 py-3 rounded-lg border border-neutral-300 bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-growth-500 focus:border-growth-500 text-sm"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "submit",
            className: "px-6 py-3 rounded-lg bg-growth-600 text-white font-medium text-sm hover:bg-growth-700 focus:outline-none focus:ring-2 focus:ring-growth-500 focus:ring-offset-2 disabled:opacity-50",
            children: "Run free audit"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "px-4 py-3 rounded-lg font-medium text-sm text-neutral-700 border border-neutral-300\n                              hover:bg-neutral-50 cursor-pointer whitespace-nowrap transition-colors\n                              inline-flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { className: "w-4 h-4 text-neutral-500", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" }) }),
          "Upload CSV",
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              ref: csvFileRef,
              type: "file",
              accept: ".csv,.txt",
              className: "sr-only",
              onChange: handleCsvFile
            }
          )
        ] })
      ] }),
      csvUrls.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 p-3 bg-growth-50 border border-growth-200 rounded-lg", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { className: "w-5 h-5 text-growth-600 flex-shrink-0", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex-1 text-sm text-growth-800 font-medium", children: [
          csvUrls.length,
          " URL",
          csvUrls.length !== 1 ? "s" : "",
          " loaded from CSV"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: clearCsv,
            className: "text-sm text-neutral-500 hover:text-red-600 font-medium transition-colors",
            children: "Clear"
          }
        )
      ] })
    ] }),
    phase === "running" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
      auditId && pipelineResult && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 bg-white rounded-xl border border-neutral-200 px-6 py-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: pipelineResult.status }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-neutral-500 font-mono", children: auditId })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm text-neutral-500", children: [
              pipelineResult.pages_crawled,
              " / ",
              pipelineResult.total_urls,
              " pages crawled"
            ] })
          ] }),
          guestStatus?.status_message && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-neutral-600", children: guestStatus.status_message })
        ] }),
        (pipelineResult.status === "running" || pipelineResult.status === "queued") && /* @__PURE__ */ jsxRuntimeExports.jsx(PipelineProgress, { result: pipelineResult })
      ] }),
      !auditId && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-neutral-200 bg-neutral-50 px-6 py-8 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-8 w-8 border-4 border-growth-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-neutral-600 text-sm", children: "Starting audit…" })
      ] })
    ] }),
    phase === "failed" && error && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-red-800 text-sm", children: [
      error,
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: reset,
          className: "mt-3 block text-growth-600 font-medium hover:underline",
          children: "Try again"
        }
      )
    ] }),
    phase === "completed" && summary && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white rounded-xl border border-neutral-200 overflow-hidden", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-b border-neutral-200 bg-neutral-50 px-2 pt-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "flex flex-wrap gap-0.5", "aria-label": "Report sections", children: GUEST_REPORT_TABS.map((tab, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              disabled: true,
              className: `px-4 py-3 text-sm font-medium rounded-t-md transition-colors -mb-px cursor-not-allowed
                        ${i === 0 ? "bg-white text-neutral-900 border border-neutral-200 border-b-transparent" : "bg-neutral-100 text-neutral-400 border border-neutral-200 border-b-transparent"}`,
              children: tab.label
            },
            tab.id
          )) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "span",
            {
              className: "inline-flex items-center gap-2 px-4 py-2 mb-1 mr-1 rounded-md text-sm font-medium\n                    text-neutral-400 border border-neutral-200 bg-neutral-50 cursor-not-allowed",
              title: "Sign up to download PDF",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" }) }),
                "Download PDF"
              ]
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-6 py-6 min-h-[200px]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-6 rounded-lg border border-growth-200 bg-growth-50 px-4 py-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-growth-800 font-medium", children: "Create an account to get the full report and download the PDF." }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => onShowAuth("signup"),
                className: "mt-3 inline-flex items-center px-5 py-2.5 rounded-lg bg-growth-600 text-white font-medium text-sm hover:bg-growth-700 focus:outline-none focus:ring-2 focus:ring-growth-500 focus:ring-offset-2",
                children: "Sign up free"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-heading font-semibold text-lg text-neutral-900 mb-2", children: "Executive Summary" }),
            targetUrl && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-neutral-500 mb-2", children: targetUrl }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ReportProse, { content: summary })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: reset,
          className: "text-sm text-neutral-500 hover:text-neutral-700",
          children: "Run another audit"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center gap-4 pt-4 border-t border-neutral-200", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => onShowAuth("login"),
          className: "text-sm font-medium text-growth-600 hover:text-growth-700",
          children: "Sign in"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-neutral-300", children: "|" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          onClick: () => onShowAuth("signup"),
          className: "text-sm font-medium text-growth-600 hover:text-growth-700",
          children: "Sign up"
        }
      )
    ] })
  ] });
}

function LandingApp() {
  const { session, profile, loading } = useAuth();
  reactExports.useEffect(() => {
    if (loading) return;
    if (session && profile?.profile_complete) {
      window.location.href = "/dashboard";
    }
  }, [loading, session, profile]);
  if (loading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-center py-16", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-8 w-8 border-4 border-growth-500 border-t-transparent rounded-full animate-spin" }) });
  }
  if (session) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    PLGLanding,
    {
      onShowAuth: (mode) => {
        window.location.href = `/login${mode === "signup" ? "?mode=signup" : ""}`;
      }
    }
  );
}

class ErrorBoundary extends reactExports.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-lg mx-auto mt-16 bg-white rounded-xl border border-red-200 p-8 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { className: "w-6 h-6 text-red-500", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "font-heading text-xl font-bold text-neutral-900 mb-2", children: "Something went wrong" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-neutral-500 mb-4", children: this.state.error?.message ?? "An unexpected error occurred." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            },
            className: "px-6 py-2 rounded-md font-semibold text-white bg-growth-500 hover:bg-growth-600 transition-colors",
            children: "Reload page"
          }
        )
      ] });
    }
    return this.props.children;
  }
}

const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Auditor | Digital Audit Tool" }, { "default": ($$result2) => renderTemplate`  ${maybeRenderHead()}<section class="bg-neutral-900 text-neutral-0 py-16 lg:py-24 bg-grid-white"> <div class="container mx-auto px-6 text-center max-w-3xl"> <p class="text-growth-400 font-medium text-sm tracking-widest uppercase mb-4">
Automated Digital Audit
</p> <h1 class="text-neutral-0 mb-6">
See Your Website<br> <span class="text-growth-500">Through Your Customer's Eyes.</span> </h1> <p class="text-neutral-400 text-lg max-w-2xl mx-auto">
Sign up for a free analysis of your business positioning,
        messaging quality, and crawl performance.
</p> </div> </section>  <section class="container mx-auto px-6 -mt-8 relative z-10 pb-16 max-w-4xl"> ${renderComponent($$result2, "ErrorBoundary", ErrorBoundary, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/timspeciale/Code/auditor/frontend/src/components/ErrorBoundary", "client:component-export": "ErrorBoundary" }, { "default": ($$result3) => renderTemplate` ${renderComponent($$result3, "LandingApp", LandingApp, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/timspeciale/Code/auditor/frontend/src/components/LandingApp", "client:component-export": "default" })} ` })} </section> ` })}`;
}, "/Users/timspeciale/Code/auditor/frontend/src/pages/index.astro", void 0);

const $$file = "/Users/timspeciale/Code/auditor/frontend/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
