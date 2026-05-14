// The chat React app. Renders the floating launcher button at all times,
// and the chat panel when open. Everything lives inside a Shadow Root, so
// these inline styles are not at risk from host-site CSS.

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { sendMessage } from './api';

type Role = 'user' | 'assistant';

interface Message {
  id: string;
  role: Role;
  content: string;
}

export function App({ siteId }: { siteId: string }) {
  const [open, setOpen] = useState(false);
  const [renderPanel, setRenderPanel] = useState(false);
  const [closing, setClosing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your assistant. Ask me anything about this site.",
    },
  ]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const conversationIdRef = useRef<string>(getOrCreateConversationId(siteId));
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setRenderPanel(true);
      setClosing(false);
      return;
    }

    if (!renderPanel) return;

    setClosing(true);
    const hideTimer = window.setTimeout(() => {
      setRenderPanel(false);
      setClosing(false);
    }, PANEL_ANIMATION_MS);

    return () => window.clearTimeout(hideTimer);
  }, [open, renderPanel]);

  useEffect(() => {
    if (!renderPanel || closing) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, pending, renderPanel, closing]);

  useEffect(() => {
    if (!renderPanel || closing) return;
    inputRef.current?.focus();
  }, [renderPanel, closing, pending]);

  const send = async () => {
    const text = input.trim();
    if (!text || pending) return;

    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: 'user', content: text },
    ]);
    setInput('');
    setPending(true);

    try {
      const { reply, conversationId } = await sendMessage({
        siteId,
        conversationId: conversationIdRef.current,
        message: text,
      });
      conversationIdRef.current = conversationId;
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: 'assistant', content: reply },
      ]);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'unknown error';
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Sorry — I couldn't reach the server (${detail}).`,
        },
      ]);
    } finally {
      setPending(false);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!pending) send();
    }
  };

  return (
    <>
      <style>{widgetAnimationStyles}</style>

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close chat' : 'Open chat'}
        style={launcherStyle}
      >
        {open ? '×' : '💬'}
      </button>

      {renderPanel && (
        <div
          data-wcb-panel={closing ? 'closing' : 'open'}
          style={{
            ...panelStyle,
            animation: closing
              ? `wcb-panel-out ${PANEL_ANIMATION_MS}ms cubic-bezier(0.4, 0, 1, 1) both`
              : `wcb-panel-in ${PANEL_ANIMATION_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1) both`,
            pointerEvents: closing ? 'none' : 'auto',
          }}
          role="dialog"
          aria-label="Chat assistant"
        >
          <header style={headerStyle}>
            <strong>Chat assistant</strong>
          </header>

          <div ref={scrollRef} style={bodyStyle}>
            {messages.map((m) => (
              <Bubble key={m.id} role={m.role} content={m.content} />
            ))}
            {pending && <Bubble role="assistant" content="…" />}
          </div>

          <footer style={footerStyle}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              onBlur={() => {
                window.setTimeout(() => {
                  if (renderPanel && !closing) inputRef.current?.focus();
                }, 0);
              }}
              placeholder="Type a message…"
              style={inputStyle}
              autoFocus
            />
            <button
              onClick={send}
              disabled={pending || !input.trim()}
              aria-label="Send message"
              title="Send message"
              style={{
                ...sendBtnStyle,
                opacity: pending || !input.trim() ? 0.5 : 1,
                cursor: pending || !input.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              <ArrowUpIcon />
            </button>
          </footer>
        </div>
      )}
    </>
  );
}

function ArrowUpIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  );
}

function Bubble({ role, content }: { role: Role; content: string }) {
  const isUser = role === 'user';
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 8,
      }}
    >
      <div
        style={{
          maxWidth: '80%',
          padding: '8px 12px',
          borderRadius: 12,
          background: isUser ? '#2563eb' : '#e2e8f0',
          color: isUser ? 'white' : '#1e293b',
          fontSize: 14,
          lineHeight: 1.45,
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
        }}
      >
        {content}
      </div>
    </div>
  );
}

// Persist conversationId per site so a refresh doesn't start a new conversation.
function getOrCreateConversationId(siteId: string): string {
  const key = `wcb:conversation:${siteId}`;
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

const FONT =
  'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const PANEL_ANIMATION_MS = 220;

const widgetAnimationStyles = `
@keyframes wcb-panel-in {
  from {
    opacity: 0;
    transform: translate3d(12px, 18px, 0) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}

@keyframes wcb-panel-out {
  from {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    opacity: 0;
    transform: translate3d(12px, 18px, 0) scale(0.96);
  }
}

@media (prefers-reduced-motion: reduce) {
  [data-wcb-panel] {
    animation: none !important;
  }
}
`;

const launcherStyle: CSSProperties = {
  position: 'fixed',
  bottom: 20,
  right: 20,
  width: 60,
  height: 60,
  borderRadius: '50%',
  border: 'none',
  background: '#2563eb',
  color: 'white',
  fontSize: 28,
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  zIndex: 2147483647,
  fontFamily: FONT,
  padding: 0,
  lineHeight: 1,
};

const panelStyle: CSSProperties = {
  position: 'fixed',
  bottom: 96,
  right: 20,
  width: 380,
  height: 560,
  maxWidth: 'calc(100vw - 40px)',
  maxHeight: 'calc(100vh - 120px)',
  background: '#f8fafc',
  borderRadius: 16,
  boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  zIndex: 2147483647,
  fontFamily: FONT,
  color: '#1e293b',
  transformOrigin: 'bottom right',
};

const headerStyle: CSSProperties = {
  padding: '14px 16px',
  background: '#2563eb',
  color: 'white',
  fontSize: 15,
};

const bodyStyle: CSSProperties = {
  flex: 1,
  padding: 16,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
};

const footerStyle: CSSProperties = {
  padding: 12,
  borderTop: '1px solid #e2e8f0',
  display: 'flex',
  gap: 8,
  background: 'white',
};

const inputStyle: CSSProperties = {
  flex: 1,
  padding: '10px 12px',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  fontSize: 14,
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: FONT,
  color: '#1e293b',
  background: 'white',
};

const sendBtnStyle: CSSProperties = {
  width: 40,
  height: 40,
  padding: 0,
  background: '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: '50%',
  fontSize: 14,
  fontFamily: FONT,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};
