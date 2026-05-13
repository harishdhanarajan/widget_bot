// Vercel serverless function for the chat endpoint.
//
// Vercel auto-routes this file as POST /api/chat. No Express, no listen() —
// Vercel calls our exported handler whenever a request hits that URL.
//
// This is the production stand-in for packages/mock-server/server.js. The two
// files are parallel right now, but only this one runs on Vercel. When the
// real RAG workflow exists, replace the canned-reply logic here with a fetch
// to the workflow URL.

const { randomUUID } = require('crypto');

const CANNED = [
  "Thanks for asking! Based on Acme's policies, standard shipping takes 3-5 business days within the continental US.",
  "Great question — our return window is 30 days from the date of purchase, and items must be in original condition.",
  "We accept all major credit cards, PayPal, and Apple Pay. Payments are encrypted and never stored on our servers.",
  "Our support team is available Monday through Friday, 9am-6pm Eastern. You can also email support@acme.example.com.",
  "I'd love to help with that — could you tell me a bit more about what you're looking for?",
];

module.exports = async function handler(req, res) {
  // CORS — the widget might be installed on a different domain than the API.
  // Wide-open here for demo purposes; restrict in production.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { siteId, conversationId, message } = req.body ?? {};
  console.log(
    `[api/chat] site=${siteId} conv=${conversationId} msg=${JSON.stringify(message)}`,
  );

  // Simulate workflow latency so the loading state is visible.
  await new Promise((r) => setTimeout(r, 500 + Math.random() * 700));

  res.json({
    conversationId: conversationId ?? randomUUID(),
    reply: CANNED[Math.floor(Math.random() * CANNED.length)],
  });
};
