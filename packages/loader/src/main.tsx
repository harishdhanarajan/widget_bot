// Entry point. The customer loads this file via <script src=".../widget.js">.
//
// It:
//   1. Reads `data-site-id` from the script tag.
//   2. Inserts a host <div> into the page and attaches a closed Shadow Root.
//   3. Mounts the React chat UI inside the Shadow Root.
//
// Why Shadow DOM (not iframe, not plain DOM)?
//   - The host page's CSS cannot reach into the shadow tree, so our styles
//     can't be broken by the customer's `* { box-sizing: border-box }`,
//     `button { all: unset }`, etc.
//   - No iframe means: no separate document, no cross-origin postMessage
//     dance, no second deploy URL to host. One <script> tag is the whole thing.

import { createRoot } from 'react-dom/client';
import { App } from './App';

(function bootstrap() {
  const w = window as unknown as { __widgetChatbotLoaded?: boolean };
  if (w.__widgetChatbotLoaded) return;
  w.__widgetChatbotLoaded = true;

  // `document.currentScript` is reliable for sync scripts; async/defer scripts
  // can be null by the time this runs, so fall back to a query.
  const currentScript =
    (document.currentScript as HTMLScriptElement | null) ??
    document.querySelector<HTMLScriptElement>('script[data-site-id]');

  const siteId = currentScript?.dataset.siteId;
  if (!siteId) {
    console.error('[widget-chatbot] missing data-site-id on script tag');
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mount(siteId));
  } else {
    mount(siteId);
  }
})();

function mount(siteId: string) {
  const host = document.createElement('div');
  host.id = 'widget-chatbot-host';
  document.body.appendChild(host);

  // `closed` mode = host page JS cannot access the shadow root via host.shadowRoot.
  // Best-effort isolation; not a security boundary (anything in the page can
  // still introspect rendered DOM via mutation observers).
  const shadow = host.attachShadow({ mode: 'closed' });
  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);

  createRoot(mountPoint).render(<App siteId={siteId} />);
}
