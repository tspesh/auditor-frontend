# Auditor Frontend

Astro 5 + React 19 frontend for the Auditor digital audit tool. Deployed to Cloudflare Pages; connects to a FastAPI backend on Fly.io and Supabase for auth and data.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Astro 5 (SSR on Cloudflare Workers)                            │
│  ┌────────────────────────┐  ┌───────────────────────────────┐  │
│  │ Pages (Astro)          │  │ Components (React 19)         │  │
│  │  index.astro           │  │  App.tsx → auth gate          │  │
│  │  admin.astro           │  │  AuditPanel.tsx → audit UI    │  │
│  │  api/backend-config.ts │  │  PLGLanding.tsx → guest flow  │  │
│  │  api/supabase-config.ts│  │  AuthForm.tsx → login/signup  │  │
│  └────────────────────────┘  │  ProfileForm.tsx → onboarding │  │
│  ┌────────────────────────┐  │  AdminDashboard.tsx           │  │
│  │ Middleware              │  │  AuditPipeline.tsx            │  │
│  │  Cloudflare env inject  │  │  ReportProse.tsx → markdown   │  │
│  │  __PUBLIC_*__ replace   │  │  ErrorBoundary.tsx            │  │
│  └────────────────────────┘  │  ui/ → Card, ScoreRing, ...   │  │
│                               └───────────────────────────────┘  │
└────────┬────────────────────────────────┬────────────────────────┘
         │                                │
         ▼                                ▼
  Supabase (Auth)                  FastAPI Backend
  GoTrue JWT auth                  /api/v1/* endpoints
  Postgres via JS client           Fly.io
```

| Layer          | Technology                                              |
|----------------|---------------------------------------------------------|
| Framework      | Astro 5 (SSR mode via `@astrojs/cloudflare`)            |
| UI             | React 19 (`client:load` islands), Tailwind CSS 3        |
| Auth           | Supabase JS (`@supabase/supabase-js`)                   |
| Markdown       | marked + DOMPurify (audit report rendering)             |
| Deployment     | Cloudflare Pages/Workers (`wrangler.toml`)              |
| Dev proxy      | Vite proxy (`/api/v1` and `/screenshots` to backend)    |

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── App.tsx                # Root shell: auth flow, profile, audit panel
│   │   ├── AuditPanel.tsx         # Full audit workflow: URL input → report tabs
│   │   ├── AuditPipeline.tsx      # Pipeline progress UI + StatusBadge
│   │   ├── AuthForm.tsx           # Login / signup with optional profile fields
│   │   ├── ProfileForm.tsx        # Onboarding form (post-signup profile completion)
│   │   ├── PLGLanding.tsx         # Guest (anonymous) audit landing page
│   │   ├── ReportProse.tsx        # Markdown rendering with sanitization
│   │   ├── AdminDashboard.tsx     # Admin: audit/user tables with pagination
│   │   ├── ErrorBoundary.tsx      # React error boundary with reload button
│   │   └── ui/                    # Shared UI primitives
│   │       ├── Card.tsx           # Titled card container
│   │       ├── ScoreRing.tsx      # Circular score indicator (SVG)
│   │       ├── Stat.tsx           # Numeric stat display
│   │       ├── TagList.tsx        # Colored tag list
│   │       └── index.ts           # Barrel export
│   ├── layouts/
│   │   └── Layout.astro           # HTML shell: fonts, GTM, Supabase env injection
│   ├── lib/
│   │   ├── api.ts                 # API base URL resolution + screenshot helper
│   │   ├── apiClient.ts           # Typed fetch wrapper with auth and error handling
│   │   └── supabase.ts            # Supabase client init with async config support
│   ├── pages/
│   │   ├── index.astro            # Home page: hero + App component
│   │   ├── admin.astro            # Admin dashboard page
│   │   └── api/
│   │       ├── backend-config.ts  # SSR: returns backend API URL from Cloudflare env
│   │       └── supabase-config.ts # SSR: returns Supabase config from Cloudflare env
│   ├── middleware.ts              # Cloudflare: injects runtime env into HTML placeholders
│   └── styles/
│       └── global.css             # Tailwind base + CSS custom properties (design tokens)
├── astro.config.mjs               # Cloudflare adapter, React, Tailwind, Vite proxy
├── tailwind.config.mjs            # Custom palette, typography, shadows
├── wrangler.toml                  # Cloudflare Workers/Pages config
├── package.json
├── tsconfig.json
├── .env.example                   # Environment variable template
└── .env.production                # Empty values for production builds (placeholder injection)
```

## Prerequisites

- **Node.js 18+**
- **npm** (ships with Node)
- Backend running on `localhost:8000` (for local dev)
- Supabase running locally (`supabase start` from `backend/`)

## Setup

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env` with local Supabase credentials (from `supabase status -o env`):

```env
PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
PUBLIC_SUPABASE_ANON_KEY=eyJ...   # from supabase status -o env
PUBLIC_API_URL=                    # leave empty for local dev (Vite proxy handles it)
```

## Running Locally

Start the backend first (see root README), then:

```bash
npm run dev
```

Opens at **http://localhost:4321**. The Vite dev server proxies API calls:

| Pattern         | Target                  |
|-----------------|-------------------------|
| `/api/v1/*`     | `http://localhost:8000`  |
| `/screenshots/*`| `http://localhost:8000`  |

Astro's own SSR routes (`/api/backend-config`, `/api/supabase-config`) are handled directly by the Astro dev server and are not proxied.

## Environment Variables

| Variable                          | Required | Description                                          |
|-----------------------------------|----------|------------------------------------------------------|
| `PUBLIC_SUPABASE_URL`             | Yes      | Supabase API URL (`http://127.0.0.1:54321` locally)  |
| `PUBLIC_SUPABASE_ANON_KEY`        | Yes      | Supabase anon JWT key                                |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | No       | Modern publishable key (alternative to anon key)     |
| `PUBLIC_API_URL`                  | Prod     | Backend URL (e.g. `https://auditor.fly.dev`). Leave empty locally. |

### How env vars flow

**Local dev (`astro dev`):**
1. `loadEnv('development', ...)` reads `.env`
2. Values are injected via Vite `define` as `__PUBLIC_*__` globals
3. `PUBLIC_API_URL` is empty, so `getAPIBase()` returns `/api/v1` (relative)
4. Vite proxy forwards `/api/v1/*` to `localhost:8000`

**Production build (`astro build`):**
1. `loadEnv('production', ...)` reads `.env.production` (empty values)
2. `prodSafe()` strips any localhost URLs as a safety net
3. Vite `define` emits empty strings / `__PUBLIC_*__` placeholders
4. `Layout.astro` injects `window.__SUPABASE_ENV__` with placeholder values
5. `middleware.ts` replaces `__PUBLIC_SUPABASE_URL__` and `__PUBLIC_SUPABASE_ANON_KEY__` in HTML with Cloudflare runtime secrets
6. `/api/backend-config` SSR route returns `PUBLIC_API_URL` from Cloudflare env
7. `/api/supabase-config` SSR route returns Supabase config for client-side fallback

## Components

### App.tsx -- Root Shell

Entry point for all authenticated UI. Manages:
- Supabase config initialization (`ensureSupabaseConfig`)
- Backend URL discovery via `/api/backend-config`
- Auth session lifecycle (`getSession`, `onAuthStateChange`)
- Profile loading and completion gating
- Routes to `PLGLanding` (guest), `AuthForm`, `ProfileForm`, or `AuditPanel`

Admin users see an "Admin Dashboard" link in the header bar.

### AuditPanel.tsx -- Audit Workflow

The primary UI component (~1,900 lines). Manages the full audit lifecycle:

**Phases:** `idle` → `polling` → `reviewing` → `reviewing_identity` → `analyzing` → `completed` / `failed`

**Features:**
- URL input with domain validation
- Audit history sidebar (previous audits)
- URL discovery with directory-tree review UI (`DirectoryNode` / `UrlLeaf`)
- URL selection with role-based limits (admin: unlimited, paid: 50, free: 10)
- Identity review with optional feedback textarea
- Tabbed report display: Executive Summary, Crawl Summary, Identity, Messaging, UX, CRO, Core Web Vitals
- PDF export download
- Admin-only CWV audit mode (batch URL input)
- Force re-crawl for admin/paid users

**API calls:**
- `GET /audits` -- audit history
- `POST /audit` -- start audit
- `GET /audit/{id}/status` -- poll status (2s interval)
- `POST /audit/{id}/confirm` -- confirm URL selection
- `POST /audit/{id}/confirm-identity` -- confirm identity + feedback
- `POST /admin/cwv-audit` -- CWV-only audit (admin)
- `GET /audit/{id}/export/pdf` -- download PDF

### PLGLanding.tsx -- Guest Audit

Product-led growth flow for anonymous users:
- URL input (no auth required)
- Calls `POST /plg/audit` and polls `GET /plg/audit/{id}/status`
- Shows pipeline progress via `AuditPipeline`
- Displays executive summary only on completion
- CTA to sign up for full report access

### AuthForm.tsx -- Login / Signup

Dual-mode form with toggle between login and signup.

Signup includes extended profile fields: first/last name, phone, website, business name, agency toggle, industry select, ad spend toggle with budget select. On signup, submits profile data to HubSpot (`POST /hubspot/submit`). Fetches dropdown options from `GET /profile/options`.

### ProfileForm.tsx -- Onboarding

Shown when `profile_complete` is false (first_name not set). Same field set as signup, calls `PATCH /profile` with Bearer token.

### AuditPipeline.tsx -- Pipeline Progress

Shared pipeline visualization used by both `AuditPanel` and `PLGLanding`:
- `PIPELINE_STEPS` constant defines the step sequence
- `StatusBadge` -- colored status pill
- `PipelineProgress` -- vertical step list with done/active/pending icons
- Elapsed time counter
- Summary stats: pages crawled, URLs found, errors

### ReportProse.tsx -- Markdown Rendering

Renders audit report markdown using `marked` (parsing) and `DOMPurify` (sanitization). Applies Tailwind typography classes to headings, lists, links, tables. Supports `size` prop for default and small variants.

### AdminDashboard.tsx -- Admin Panel

Standalone admin page (mounted at `/admin`):
- Verifies admin role via `GET /audit/quota`
- Tab bar: Audits | Users
- Paginated tables with 20 items per page
- Audit table: target URL, status, user email, timestamps
- User table: email, role, audits used/max, join date
- Uses `StatusBadge` and `RoleBadge` components

### ErrorBoundary.tsx

React class component error boundary. Catches render errors and displays a styled error card with the error message and a "Reload page" button.

### UI Primitives (`ui/`)

| Component    | Props                                    | Description                              |
|--------------|------------------------------------------|------------------------------------------|
| `Card`       | `title`, `children`, `className?`        | Titled card with header and body sections|
| `ScoreRing`  | `score`, `max?` (default 10)             | Circular SVG score gauge (green/yellow/red) |
| `Stat`       | `label`, `value`, `alert?`               | Numeric stat with optional red highlight |
| `TagList`    | `items[]`, `color?` (growth/green/red/neutral) | Colored tag list or "None detected" fallback |

## Library (`lib/`)

### api.ts -- API Base URL Resolution

Determines the backend API base URL through a priority chain:

1. `_runtimeApiBase` -- set by `setBackendUrl()` after fetching `/api/backend-config`
2. `BUILD_API_URL` -- from Vite `define` (`__PUBLIC_API_URL__`) or `import.meta.env.PUBLIC_API_URL`
3. Production fallback -- hardcoded `https://auditor.fly.dev` when host is `audit.betteroffgrowth.com`
4. `/api/v1` (relative) -- local dev, handled by Vite proxy

Exports:
- `getAPIBase()` -- returns the resolved API base (e.g. `/api/v1` or `https://auditor.fly.dev/api/v1`)
- `setBackendUrl(baseUrl)` -- sets runtime backend URL
- `screenshotUrl(path)` -- prepends backend origin for screenshot paths
- `API_BASE` (deprecated) -- static build-time value

### apiClient.ts -- Typed Fetch Wrapper

`apiFetch<T>(path, opts)` -- wraps `fetch` with:
- Automatic `getAPIBase()` prefix
- Bearer token injection via `opts.token`
- Auto `Content-Type: application/json` when body is present
- Throws `ApiError` (with status and body) on non-ok responses
- Returns parsed JSON for `application/json` responses

### supabase.ts -- Supabase Client

Lazy-initialized Supabase client via a Proxy. Config resolution order:

1. `window.__SUPABASE_ENV__` -- injected by `Layout.astro` and replaced by `middleware.ts`
2. Vite `define` globals (`__PUBLIC_SUPABASE_URL__`, etc.)
3. `import.meta.env.PUBLIC_SUPABASE_URL`

When config contains placeholders (Cloudflare deploy before middleware runs), `ensureSupabaseConfig()` fetches `/api/supabase-config` to get real values from Cloudflare runtime env.

## Pages

### `index.astro` -- Home Page

- Hero section with tagline
- `App` component loaded as a React island (`client:load`) inside `ErrorBoundary`

### `admin.astro` -- Admin Dashboard

- `AdminDashboard` component loaded as React island (`client:load`)

### `api/backend-config.ts` -- Backend URL (SSR)

`GET /api/backend-config` -- returns `{ apiUrl: string }` from Cloudflare runtime env (`PUBLIC_API_URL`). `App.tsx` fetches this on mount to set the runtime API base when the build-time value is empty. Returns empty string in local dev (no Cloudflare runtime), which is correct since the Vite proxy handles routing.

### `api/supabase-config.ts` -- Supabase Config (SSR)

`GET /api/supabase-config` -- returns `{ url, anonKey }` from Cloudflare runtime env. Used by `supabase.ts` when the build-time env has placeholder values.

Both SSR routes use `prerender = false` to access Cloudflare bindings at request time.

## Middleware

`middleware.ts` runs on every HTML response in the Cloudflare Workers runtime. When `context.locals.runtime.env` is available, it replaces `__PUBLIC_SUPABASE_URL__` and `__PUBLIC_SUPABASE_ANON_KEY__` placeholders in the HTML with actual secret values. This enables a single build artifact to work across environments.

## Design System

Mirrors the [betteroffgrowth.com](https://betteroffgrowth.com) brand.

### Colors

| Token       | Value                    | Usage                    |
|-------------|--------------------------|--------------------------|
| `growth-500`| `#FF8200` (Volunteer Orange) | Primary action, brand  |
| `neutral-*` | 12-step greyscale (0-950)| Text, surfaces, borders  |
| `success-*` | Green scale (300-700)    | Positive indicators      |
| `warning-*` | Amber scale (300-700)    | Caution indicators       |
| `danger-*`  | Red scale (300-700)      | Error states             |

### Typography

| Family          | Token          | Usage              |
|-----------------|----------------|--------------------|
| Space Grotesk   | `font-heading` | Headings           |
| Inter           | `font-sans`    | Body text          |
| JetBrains Mono  | `font-mono`    | Code blocks        |

Responsive sizing via CSS `clamp()`: display (2.5-4rem), h2 (2-3rem), h3 (1.75-2.25rem), body (1.125rem), caption (0.875rem).

### Spacing

4px base unit. Scale: 4, 8, 12, 16, 24, 32, 48, 64, 80, 96, 128px.

### Shadows

Three-tier elevation system: `level-1` (subtle), `level-2` (card), `level-3` (modal). Plus `elevation-2` and `elevation-3` aliases.

### Custom Utilities

- `.bg-grid-white` -- subtle 40px grid background pattern (used on hero sections)

## Authentication Flow

```
Page load
  │
  ├─ ensureSupabaseConfig()     ← resolve Supabase URL/key
  ├─ fetch /api/backend-config  ← resolve backend API URL
  │
  ├─ supabase.auth.getSession()
  │   ├─ No session → PLGLanding (guest audit) or AuthForm
  │   └─ Session exists
  │       ├─ fetch /profile
  │       │   ├─ profile_complete=false → ProfileForm
  │       │   └─ profile_complete=true  → AuditPanel
  │       └─ onAuthStateChange listener for sign-out
  │
  └─ Admin users: link to /admin
```

All authenticated API calls pass the Supabase JWT as `Authorization: Bearer <token>`.

## Production Deployment (Cloudflare Pages)

### Build

```bash
npm run build
```

Produces `dist/` with a Cloudflare Worker (`dist/_worker.js/index.js`) and static assets.

### Deploy

```bash
npx wrangler deploy
```

### Secrets

Set once; persist across deploys:

```bash
npx wrangler secret put PUBLIC_API_URL            # e.g. https://auditor.fly.dev
npx wrangler secret put PUBLIC_SUPABASE_URL        # e.g. https://xxxxx.supabase.co
npx wrangler secret put PUBLIC_SUPABASE_ANON_KEY   # Supabase anon key
```

Do **not** rely on Cloudflare Dashboard "Variables" alone -- `wrangler deploy` overwrites the Worker config from `wrangler.toml`, which has an empty `[vars]` section. Use Secrets for values that must persist.

### Wrangler Config

| Key                  | Value                          |
|----------------------|--------------------------------|
| `name`               | `auditor`                      |
| `main`               | `dist/_worker.js/index.js`     |
| `compatibility_flags`| `nodejs_compat`                |
| `assets.directory`   | `dist`                         |
| `assets.binding`     | `ASSETS`                       |

## Scripts

| Command          | Description                              |
|------------------|------------------------------------------|
| `npm run dev`    | Astro dev server at `localhost:4321`      |
| `npm run build`  | Production build for Cloudflare          |
| `npm run preview`| Preview production build locally         |

## Troubleshooting

**Blank page in production:** Check that `PUBLIC_API_URL`, `PUBLIC_SUPABASE_URL`, and `PUBLIC_SUPABASE_ANON_KEY` are set as Cloudflare secrets. The middleware replaces placeholders at runtime.

**API calls fail locally:** Ensure the backend is running on port 8000. The Vite proxy forwards `/api/v1/*` to `localhost:8000`. Astro SSR routes (`/api/backend-config`, `/api/supabase-config`) are served directly.

**Supabase "not configured" error:** Run `supabase status -o env` from the `backend/` directory and copy the URL and anon key into `frontend/.env`.

**`PUBLIC_API_URL` leaking localhost in build:** The `prodSafe()` function in `astro.config.mjs` strips localhost URLs from production builds. Additionally, `.env.production` sets all `PUBLIC_*` values to empty so production builds emit placeholders.

**React hydration mismatch:** Components use `client:load` for full client-side rendering. Ensure SSR-safe patterns (no `window` access during SSR).

**SESSION binding error on deploy:** If Cloudflare deploy fails with "Invalid binding SESSION", create a KV namespace:
```bash
npx wrangler kv:namespace create SESSION
```
Then add the binding to `wrangler.toml`.
