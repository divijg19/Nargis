# 🗂️ Nargis – 3-Sprint MVP Roadmap

---

## **🎯 Sprint 1 – Core Foundations (Weeks 1–3)**

**Goal:** Get the minimal system running end-to-end: capture voice → process → display.

**Tasks:**

* **Frontend**

  * Setup React + TS + Tailwind project (Vite/Next.js).
  * Implement WebRTC microphone capture, send audio to backend.
  * Build simple UI for task list + journal editor (basic forms).
* **Backend**

  * Go service: WebRTC signaling + audio gateway → forward chunks to STT.
  * Python FastAPI: STT orchestration (Whisper API/local).
  * Redis: deploy instance, basic Streams integration.
* **Database**

  * Setup Postgres + pgvector.
  * Define schemas: users, tasks, journals.
* **AI Layer**

  * Integrate Whisper for STT.
  * Connect transcription results → display in frontend UI in real time.

**Deliverable:**
✅ Talk to Nargis → see live transcription → view synced text in web app.

---

## **🚀 Sprint 2 – Unified Context & Smart Productivity (Weeks 4–6)**

**Goal:** Enable Nargis to act as a **real productivity companion** with tasks, journals, and habits unified.

**Tasks:**

* **Frontend**

  * WebSockets: live updates for tasks/journals/habits.
  * Expand UI: task CRUD, journal entries, habit tracker.
* **Backend**

  * Context Manager (Python): unify events from voice + UI → maintain single state.
  * Pub/Sub via Redis Streams: `task_update`, `journal_update`, `habit_update`, `voice_transcript`.
  * AI Orchestration:

    * GPT integration for insights & task suggestions.
    * Embeddings (OpenAI/HF) stored in pgvector.
* **AI Layer**

  * ElevenLabs integration (TTS) → speak back AI responses.
  * End-to-end voice conversation loop: speak → STT → LLM → TTS → voice reply.
* **Database**

  * Add habit tracker schema (streaks, consistency logs).
* **Security**

  * JWT auth for web client.
  * TLS setup (self-signed in dev).

**Deliverable:**
✅ Full **voice conversation loop** with Nargis.
✅ Unified context: voice edits + UI edits stay in sync.
✅ Basic productivity analytics (habit streaks, task completions).

---

## **🌐 Sprint 3 – Integrations & Polish (Weeks 7–9)**

**Goal:** Make Nargis **practical + impressive** for portfolio by adding integrations, privacy, and deployment.

**Tasks:**

* **Integrations**

  * Google OAuth2 login.
  * Google Sheets bi-directional sync (edit in sheet ↔ reflect in app).
  * Google Calendar two-way sync (tasks <-> events).
* **Security**

  * Client-side/E2E encryption for journals (AES, local key).
* **DevOps**

  * Dockerize all services (Go gateway, Python AI, Context Manager, Postgres, Redis).
  * Docker Compose for local dev.
  * Deploy to Fly.io / Render (public demo).
  * Setup GitHub Actions CI/CD pipeline.
* **Observability**

  * Integrate OpenTelemetry + Sentry for logs, metrics, errors.

**Deliverable:**
✅ Publicly demo-able AI productivity companion: voice chat, task/journal/habit sync, Google Sheets & Calendar integration.
✅ Secure, containerized, cloud-deployed MVP.

---

# 📅 Roadmap Recap

* **Sprint 1 (Weeks 1–3):** Foundations → voice capture + transcription + UI basics.
* **Sprint 2 (Weeks 4–6):** Unified brain → voice ↔ AI ↔ tasks/journals/habits in sync.
* **Sprint 3 (Weeks 7–9):** Integrations → Google sync, deployment, encryption, observability.

---

This way, Nargis becomes portfolio-ready in **\~9 weeks** with a clear evolution path (each sprint deliverable is demo-able).
