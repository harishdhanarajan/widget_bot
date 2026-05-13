# widget-chatbot

An embeddable chat widget. A site admin pastes one `<script>` tag and a floating chat button appears on their site — no build step, no framework requirement, no CSS conflicts with the host page.

## Mental model

```
┌─── HOST SITE (any website) ───────────────────────────┐
│                                                       │
│  <script src="https://cdn.you.com/widget.js"          │
│          data-site-id="abc123" async></script>        │
│                                                       │
│  widget.js (~60 KB gzip — React + chat UI inside):    │
│    1. Reads data-site-id from the script tag.         │
│    2. Inserts a host <div> on the page.               │
│    3. Attaches a Shadow Root to it.                   │
│    4. Mounts the React chat UI inside the Shadow Root.│
│                                                       │
│  ┌─ Shadow Root (chat UI lives here) ─┐               │
│  │  Floating button + chat panel.     │               │
│  │  Style-isolated: host CSS cannot   │               │
│  │  reach into the shadow tree.       │               │
│  │  Talks to your workflow over HTTP. │               │
│  └────────────────────────────────────┘               │
└───────────────────────────────────────────────────────┘
```

Why Shadow DOM (not iframe, not plain `<div>`):

- **Style isolation.** The host site's CSS resets (`* { box-sizing: border-box }`, `button { all: unset }`, etc.) and `!important` rules stop at the shadow boundary. Our inline styles win, always.
- **No second deploy URL.** One `<script>` tag, one file, one CDN. No "the iframe app needs to be hosted somewhere too."
- **Lighter than iframe.** No separate document, no postMessage protocol, no cross-origin handshake.
- **Less isolated than iframe** — host page JS can still observe rendered DOM through mutation observers. For chat content that isn't security-sensitive, that's an acceptable trade.

## Layout

```
widget_chatbot/
├── packages/
│   ├── loader/          # The widget.js — React + chat UI bundled as one IIFE
│   │   └── src/
│   │       ├── main.tsx   # Bootstrap: attaches Shadow Root, mounts App
│   │       ├── App.tsx    # Floating button + chat panel
│   │       └── api.ts     # sendMessage() — POSTs to workflow
│   └── mock-server/     # Stand-in for the real RAG workflow (dev only)
├── demo/
│   └── index.html       # A fake "customer site" with the script tag
└── package.json         # npm workspaces root
```

## Milestones

- **M1 ✅: plug-and-play install works end-to-end.** Snippet renders a floating button on any site; clicking opens the chat panel.
- **M2 ✅: chat UI wired to a workflow API.** The RAG/embedding/LLM pipeline lives in an external workflow (n8n / Dify / Flowise / custom). The widget POSTs each user message and renders the workflow's reply. `packages/mock-server/` ships canned responses so the UI can be developed before the real workflow exists.
- **M3: admin dashboard.** Site registration, snippet generator, conversation review, basic analytics.

## Run locally

```bash
npm install
npm run dev
```

Three things start concurrently:
- **widget** — Vite builds `packages/loader/dist/widget.js` in watch mode
- **mock** — Express server on http://localhost:4002 (pretends to be the workflow API)
- **demo** — static file server on http://localhost:4000

Open: **http://localhost:4000/demo/**

You should see a fake "Acme Corp" page with a blue chat bubble in the bottom-right. Click it → the chat panel slides up. Type a message → the mock workflow replies after ~1s.

## Wiring your real workflow

The widget POSTs to `${VITE_API_URL}/chat` with this body:

```json
{ "siteId": "acme-demo", "conversationId": "uuid", "message": "user text" }
```

and expects back:

```json
{ "conversationId": "uuid", "reply": "assistant text" }
```

To point at your real workflow (n8n / Dify / Flowise / custom):

1. `cp packages/loader/.env.example packages/loader/.env.local`
2. Set `VITE_API_URL=https://your-workflow.example.com`
3. Restart `npm run dev`

Only [packages/loader/src/api.ts](packages/loader/src/api.ts) knows the API shape — if your workflow uses a different contract, adapt it there. The rest of the UI is workflow-agnostic.

## Production build

```bash
npm run build
```

Produces `packages/loader/dist/widget.js` — host this on any static CDN (Cloudflare Pages, Netlify, Vercel, S3+CloudFront — all free for this kind of asset). Then any website on the internet can install your widget by pasting:

```html
<script src="https://your-cdn.com/widget.js" data-site-id="their-site-id" async></script>
```

That's the entire installation experience.
