# 📊 Compact Tech Stack Table

| Layer / Domain            | Final Choice (Optimal)                                                                                                                                   | Notes / Why Chosen                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Frontend (UI + Voice)** | React + TypeScript + Tailwind <br> WebRTC (audio) <br> WebSockets (data)                                                                                 | Familiar stack, recruiter-friendly, WebRTC for voice, WebSockets for live sync |
| **Backend (Core)**        | Go (Voice Gateway, real-time streaming) <br> Python (FastAPI microservices for AI/ML)                                                                    | Showcases both Go concurrency + Python AI/ML strength                          |
| **Event & Context**       | Redis Streams (event bus) <br> Redis (session + cache) <br> Context Manager (Python)                                                                     | Lightweight, reliable fan-out + unified brain service                          |
| **Database Layer**        | PostgreSQL (relational) <br> pgvector (embeddings) <br> TimescaleDB (optional metrics)                                                                   | Solid RDBMS, vector search, time-series support                                |
| **AI / ML Layer**         | Whisper (STT, streaming) <br> ElevenLabs (TTS, fallback: Coqui/Piper) <br> OpenAI GPT (LLM, fallback: Llama/Claude) <br> OpenAI/HF embeddings (pgvector) | Cloud-first for UX, local fallbacks for privacy demo                           |
| **Integrations**          | Google Sheets (bi-directional sync) <br> Google Calendar (two-way) <br> Notion (optional)                                                                | Practical productivity integrations, easy demo value                           |
| **Security**              | OAuth2 (Google) <br> JWT API sessions <br> TLS + KMS <br> Optional client-side/E2E encryption                                                            | Standard, portfolio-safe, privacy-first features                               |
| **DevOps & Deployment**   | Docker + Compose (dev) <br> Fly.io / Render / ECS (prod) <br> GitHub Actions CI/CD <br> OpenTelemetry + Sentry                                           | MVP → scalable growth path                                                     |
| **Optional Stretch**      | Pinecone/Weaviate (vector DB at scale) <br> Mojo (ML inference) <br> Rust (perf hotspots)                                                                | Reserved for scale/performance or advanced demos                               |

---

# ✅ Stack → Implementation Map

### **1. Frontend**

* [ ] Setup React + TS + Tailwind project (Vite/Next.js)
* [ ] Implement WebRTC microphone capture & audio streaming to Go gateway
* [ ] Implement WebSockets connection for live updates (tasks, journals, habits)
* [ ] Build basic UI: task list, journal editor, habit tracker (real-time updates)

### **2. Backend (Core)**

* [ ] Go service: WebRTC signaling + audio gateway (streaming audio → STT microservice)
* [ ] Go service: WebSocket server for pushing live updates to clients
* [ ] Python (FastAPI): AI orchestration service (STT → LLM → TTS, journaling, task mgmt logic)

### **3. Event & Context**

* [ ] Deploy Redis instance (with Streams enabled)
* [ ] Build Context Manager microservice (Python) to unify voice/web/sheets changes into single context state
* [ ] Pub/Sub events: “task\_update”, “journal\_update”, “habit\_update”, “voice\_transcript”

### **4. Database Layer**

* [ ] Setup PostgreSQL with pgvector extension
* [ ] Define schema: users, tasks, journals, habits, embeddings, sync logs
* [ ] Build basic ORM models (SQLAlchemy or Prisma if TS service joins later)

### **5. AI / ML Layer**

* [ ] Integrate Whisper (STT) with streaming chunks
* [ ] Integrate OpenAI GPT for LLM calls (journal insights, task suggestions, summaries)
* [ ] Integrate ElevenLabs for natural voice TTS (streamed back to client)
* [ ] Store embeddings in pgvector (for personalized retrieval, journaling insights)

### **6. Integrations**

* [ ] Implement Google OAuth2 flow (Sheets/Calendar access)
* [ ] Google Sheets bi-directional sync: detect edits → publish event → reflect in Postgres
* [ ] Google Calendar sync: create/update events from tasks, listen for changes

### **7. Security**

* [ ] Setup OAuth2 login (Google) + JWT issuance for frontend API calls
* [ ] Enforce TLS in all connections (use dev cert locally, Let’s Encrypt in prod)
* [ ] Add journal encryption option (e.g., AES keys derived client-side)

### **8. DevOps**

* [ ] Dockerize Go gateway, Python AI service, Context Manager, Postgres, Redis
* [ ] Write Docker Compose config for local dev
* [ ] Setup CI/CD with GitHub Actions (lint, test, build, deploy to Fly.io/Render)
* [ ] Setup observability: request logging, error tracking (Sentry), metrics export (Prometheus/OpenTelemetry)

### **9. Optional Stretch**

* [ ] Swap vector store from pgvector → Pinecone for scale demo
* [ ] Experiment with local Llama + Coqui STT/TTS for privacy/offline mode
* [ ] Profile Go service; rewrite bottlenecks in Rust if needed
