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

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, pending, open]);

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
      send();
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close chat' : 'Open chat'}
        style={launcherStyle}
      >
        {open ? '×' : '💬'}
      </button>

      {open && (
        <div style={panelStyle} role="dialog" aria-label="Chat assistant">
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
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder={pending ? 'Sending…' : 'Type a message…'}
              disabled={pending}
              style={inputStyle}
              autoFocus
            />
            <button
              onClick={send}
              disabled={pending || !input.trim()}
              style={{
                ...sendBtnStyle,
                opacity: pending || !input.trim() ? 0.5 : 1,
                cursor: pending || !input.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              Send
            </button>
          </footer>
        </div>
      )}
    </>
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
  padding: '10px 16px',
  background: '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: FONT,
};
