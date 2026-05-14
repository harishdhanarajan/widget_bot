---
name: project-widget-bot-status
description: Current milestone status and next phase for widget-chatbot — what is done, what is not, and what the M3 admin dashboard phase involves
metadata:
  type: project
---

widget-chatbot has completed M1 (embed renders floating button) and M2 (chat wired to workflow API). The project is now in a stable, deployable state on Vercel with a canned-reply serverless function standing in for a real RAG pipeline.

**Why:** The project is a product-in-progress. M1/M2 were MVP milestones to prove the embed concept works end-to-end. The real value — connecting to an actual LLM/RAG workflow — is deferred to when the workflow backend is ready.

**How to apply:** When the user asks about next steps, the answer is M3 (admin dashboard, site registration, real workflow integration, CORS lockdown in `api/chat.js`). When touching `api/chat.js`, note that it still returns canned replies and is wide-open CORS — both need to change before production.

See also: [[project-overview]] (full handoff doc at `.claude/agent-memory/track/project-overview.md`).
