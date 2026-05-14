# widget-chatbot — Session Handoff Document

_Last updated: 2026-05-14. Verified against live codebase._

---

## 1. Project Overview

**widget-chatbot** is an embeddable chat widget that any website can install with a single `<script>` tag. A site admin pastes the snippet; a floating chat button appears in the bottom-right of their page — no build step, no framework requirement, no CSS conflicts with the host page.

The widget talks to an external workflow API (n8n / Dify / Flowise / custom RAG pipeline). The widget is workflow-agnostic; it just POSTs a message and renders the reply.

**Milestone status (as of last commit):**
- M1 done: plug-and-play snippet renders a floating chat button on any site.
- M2 done: chat UI wired to a workflow API; mock server ships canned responses for dev.
- M3 not started: admin dashboard (site registration, snippet generator, conversation review, analytics).

---

## 2. Architecture & Tech Stack

| Layer | Technology |
|---|---|
| Widget UI | React 18, TypeScript 5, inline styles (no CSS files) |
| Widget bundle | Vite 5, IIFE format (single self-contained `widget.js`) |
| Style isolation | Shadow DOM (`closed` mode) — host CSS cannot bleed in |
| Dev mock API | Express 4, Node `--watch` mode |
| Production API | Vercel serverless function (`api/chat.js`) |
| Hosting | Vercel (static `dist/` + serverless `api/`) |
| Monorepo | npm workspaces |
| Demo runner | `http-server` on port 4000 |

**Key architectural decision — Shadow DOM over iframe:**
- Host CSS stops at the shadow boundary; inline styles win unconditionally.
- No second hosted URL needed (iframe needs a separate deploy).
- Lighter than iframe (no separate document, no postMessage protocol).
- Trade-off: host JS can still observe rendered DOM via mutation observers — acceptable for chat content.

---

## 3. Project Structure

```
widget_bot/
├── packages/
│   ├── loader/                  # The widget.js — all customer-facing code
│   │   ├── src/
│   │   │   ├── main.tsx         # Entry: reads data-site-id, attaches Shadow Root, mounts App
│   │   │   ├── App.tsx          # Chat UI: floating button + panel, all inline styles
│   │   │   └── api.ts           # sendMessage() — only file that knows the API contract
│   │   ├── vite.config.ts       # IIFE build, outDir = packages/loader/dist
│   │   ├── tsconfig.json
│   │   └── .env.example         # Documents VITE_API_URL
│   └── mock-server/
│       ├── server.js            # Express POST /chat with canned replies + GET /health
│       └── package.json
├── api/
│   └── chat.js                  # Vercel serverless function — production stand-in for mock-server
├── demo/
│   └── index.html               # Fake "Acme Corp" site with the script tag; used in dev
├── scripts/
│   └── copy-loader-dist.mjs     # Post-build: copies packages/loader/dist → ./dist (for Vercel)
├── vercel.json                  # buildCommand, outputDirectory=dist, framework=null
├── package.json                 # Workspace root; defines dev/build scripts
└── .claude/
    ├── settings.local.json
    └── agents/track.md
```

---

## 4. Build & Deployment

### Local development

```bash
npm install
npm run dev
```

Three processes start concurrently (via `concurrently`):
- **widget** — Vite watch build of `packages/loader` → `packages/loader/dist/widget.js`
- **mock** — Express on `http://localhost:4002` (fake workflow API)
- **demo** — `http-server` on `http://localhost:4000` serving the project root

Open `http://localhost:4000/demo/` to see the widget on the fake Acme Corp page.

### Production build

```bash
npm run build
```

Two steps, run by the root `build` script:
1. `vite build` inside `packages/loader` → outputs to `packages/loader/dist/`
2. `node scripts/copy-loader-dist.mjs` → copies that dist to the project root `./dist/`

Vercel's `vercel.json` points `outputDirectory` at `./dist`, so after build Vercel serves `dist/widget.js` as a static asset and routes `api/chat.js` as a serverless function.

### Vercel configuration (`vercel.json`)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": null
}
```

**Why two dist locations?** The recent commits (`fix: output dist to project root for vercel`, `fixes dist`) resolved a Vercel deployment issue: the package build outputs to `packages/loader/dist`, but Vercel needs `dist` at the project root. The copy script bridges this. Do not change `outDir` in `vite.config.ts` to the root directly — Vite's path resolution inside the workspace package made that error-prone.

### Wiring a real workflow

1. `cp packages/loader/.env.example packages/loader/.env.local`
2. Set `VITE_API_URL=https://your-workflow.example.com`
3. Restart dev server.

Only `packages/loader/src/api.ts` encodes the contract. Adapt there if the workflow uses a different shape.

---

## 5. Key Components

### `packages/loader/src/main.tsx`
Bootstrap IIFE. Reads `data-site-id` from the `<script>` tag (with async-safe fallback to `querySelector`), guards against double-loading via `window.__widgetChatbotLoaded`, creates a `<div id="widget-chatbot-host">` on `<body>`, attaches a closed Shadow Root, and mounts `<App>`.

### `packages/loader/src/App.tsx`
The entire chat UI. State: `open`, `messages[]`, `input`, `pending`. Conversation ID is persisted in `localStorage` keyed by `wcb:conversation:{siteId}` so a page refresh resumes the same conversation. All styles are inline `CSSProperties` objects defined at the bottom of the file. No CSS files, no CSS-in-JS library.

### `packages/loader/src/api.ts`
Single exported function `sendMessage({ siteId, conversationId, message })`. Reads `VITE_API_URL` at build time (default `http://localhost:4002`). POSTs to `{base}/chat`, expects `{ conversationId, reply }` back.

### `api/chat.js`
Vercel serverless handler. Same canned-reply logic as the mock server. Has wide-open CORS (`*`) — comment in the file notes this must be restricted in production. **This is the file to replace with a real workflow fetch when going live.**

### `packages/mock-server/server.js`
Dev-only Express server. Identical contract to `api/chat.js`. Adds simulated latency (500–1200 ms) so loading states are visible. Includes `GET /health` for CI liveness checks.

---

## 6. Configuration

| File | Purpose |
|---|---|
| `packages/loader/.env.example` | Documents `VITE_API_URL`; copy to `.env.local` to override |
| `packages/loader/.env.local` | Gitignored; set `VITE_API_URL` for local real-workflow testing |
| `vercel.json` | Vercel build/output config |
| `.claude/settings.local.json` | Claude Code permission allowlist for dev commands |

**No other environment variables are required.** `VITE_API_URL` is the only runtime knob; if unset, the widget defaults to the mock server at `localhost:4002`.

---

## 7. Current State (as of 2026-05-14)

**Recent commits:**
- `e6899b0 fixes dist` — minor correction to the dist copy/output setup
- `4211b01 fix: output dist to project root for vercel` — resolved Vercel deployment issue where the build output was inside the workspace package, not at the root
- `753de94 first commit` — initial project

**What works:** Full dev loop (widget + mock + demo). Production build pipeline. Vercel deployment config. End-to-end chat flow with mock API.

**What is not yet built (M3):**
- Admin dashboard
- Site registration / multi-tenancy (currently `data-site-id` is just passed through; there is no server-side registry)
- Real RAG/LLM workflow integration (the `api/chat.js` still returns canned replies)
- CORS lockdown in `api/chat.js` (currently `*`)
- Analytics / conversation review

**Known rough edges:**
- `api/chat.js` uses `require()` (CommonJS) while all other files use ESM — Vercel handles this fine but it is inconsistent.
- `packages/loader/.env.example` path comment says `packages/app/.env.local` (stale copy from an earlier structure, now `app` → `loader`). The correct path is `packages/loader/.env.local`.

---

## 8. Non-Technical Context

The project is a product in early development — essentially a startup-style SaaS widget. The goal is to enable any website to add AI-powered chat by pasting a single `<script>` tag, with the heavy LLM/RAG work offloaded to an external workflow tool. The initial milestones are focused on the client-side embed; the admin/multi-tenant layer (M3) is the next major phase.

The user (Harish Dhanarajan, `harishdhanarajan` on git) is building this as a side or commercial project. There is no team collaboration evident from the git history.
