// Mock workflow API.
//
// Pretends to be the real RAG workflow (n8n / Dify / Flowise / custom) so the
// chat UI can be developed end-to-end without depending on the real backend.
//
// Replace this with your real workflow URL by setting VITE_API_URL in
// packages/app/.env.local — the iframe will start hitting reality instead.

import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';

const app = express();

// Allow the iframe (served on :5173 in dev, your-app.com in prod) to call us.
// In production, restrict origin to the iframe app's domain.
app.use(cors());
app.use(express.json());

// Canned responses. The real workflow would call an LLM with RAG-retrieved
// chunks; we just round-robin through plausible-sounding answers.
const CANNED = [
  "Thanks for asking! Based on Acme's policies, standard shipping takes 3-5 business days within the continental US.",
  "Great question — our return window is 30 days from the date of purchase, and items must be in original condition.",
  "We accept all major credit cards, PayPal, and Apple Pay. Payments are encrypted and never stored on our servers.",
  "Our support team is available Monday through Friday, 9am-6pm Eastern. You can also email support@acme.example.com.",
  "I'd love to help with that — could you tell me a bit more about what you're looking for?",
];

app.post('/chat', async (req, res) => {
  const { siteId, conversationId, message } = req.body ?? {};
  console.log(
    `[mock] site=${siteId} conv=${conversationId} msg=${JSON.stringify(message)}`,
  );

  // Simulate workflow latency so the UI's loading state is visible.
  await new Promise((r) => setTimeout(r, 500 + Math.random() * 700));

  res.json({
    conversationId: conversationId ?? randomUUID(),
    reply: CANNED[Math.floor(Math.random() * CANNED.length)],
  });
});

// Liveness probe — useful when wiring CI later.
app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT ? Number(process.env.PORT) : 4002;
app.listen(PORT, () => {
  console.log(`[mock-server] listening on http://localhost:${PORT}`);
  console.log(`[mock-server] POST /chat to simulate the workflow API`);
});
