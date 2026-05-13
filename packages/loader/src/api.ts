// The single function the chat UI uses to talk to the workflow.
//
// `VITE_API_URL` is the base URL of the workflow (or the mock during dev).
// We append /chat to it. To point at your real workflow:
//   1. Create packages/loader/.env.local
//   2. Add: VITE_API_URL=https://your-workflow.example.com
//   3. Restart `npm run dev`. The widget now hits your workflow.

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4002').replace(/\/$/, '');

export interface ChatRequest {
  siteId: string;
  conversationId: string;
  message: string;
}

export interface ChatResponse {
  conversationId: string;
  reply: string;
}

export async function sendMessage(req: ChatRequest): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as ChatResponse;
}
