# 🛠️ Tech Stack – Nargis**optimal tech stack** for Nargis, balancing **backend + AIML career goals**, **real-time performance**, and **portfolio impact**.



## Current Implementation---



### Frontend Stack

| Component | Technology | Version | Purpose || Layer                  | Choice(s)                                                                |

|-----------|-----------|---------|---------|| ---------------------- | ------------------------------------------------------------------------ |

| Framework | Next.js | 15.5.4 | React framework with App Router || **Frontend**           | TypeScript, React, Next.js, TailwindCSS, shadcn/ui                       |

| UI Library | React | 19.1.1 | Component architecture || **Backend Core**       | Go (real-time, scalability), Python (AI/ML services)                     |

| Language | TypeScript | 5.9.3 | Type safety || **AI/ML**              | Python (FastAPI/Flask), PyTorch/TensorFlow, Hugging Face, LangChain/Mojo |

| Styling | Tailwind CSS | 4.1.13 | Utility-first CSS || **Voice & Speech**     | WebRTC, Vosk/Whisper (STT), Coqui TTS / OpenAI TTS                       |

| Icons | Heroicons | 2.2.0 | SVG icon library || **Realtime Messaging** | WebSockets (native Go), Elixir optional (if scaling chat-heavy)          |

| State Management | React Context | Built-in | App-wide state || **Database**           | PostgreSQL (primary), Redis (cache/queues), DuckDB (local analytics)     |

| Date Handling | date-fns | 4.1.0 | Date utilities || **Sync Layer**         | Google Sheets API, Supabase (realtime sync/webhooks)                     |

| Class Utilities | clsx + tailwind-merge | Latest | Dynamic class names || **Data Pipeline**      | Kafka/NATS (streaming events), Temporal (optional workflows)             |

| **Auth & Security**    | OAuth2 + JWT (Keycloak/Supabase Auth)                                    |

### Backend Stack| **Deployment**         | Docker + Kubernetes, NATS/Kafka cluster, CI/CD with GitHub Actions       |

| Component | Technology | Version | Purpose || **Hosting**            | Fly.io / Railway (MVP), GCP/AWS (scalable)                               |

|-----------|-----------|---------|---------|| **Monitoring**         | Prometheus + Grafana, OpenTelemetry                                      |

| Python Framework | FastAPI | 0.116.2+ | Async REST API |

| ASGI Server | Uvicorn | 0.35.0+ | Production server |

| STT Model | Whisper (OpenAI) | Via transformers | Speech-to-text |# ⚙️ Optimal Tech Stack for Nargis

| LLM Integration | OpenAI SDK | 1.108.1+ | AI chat interface |

| ML Framework | PyTorch | 2.8.0+ | Model inference |## **1. Frontend (Web + Voice UI)**

| Transformers | Hugging Face | 4.56.1+ | Model loading |

| Go Runtime | Go | 1.25.1 | WebSocket server |* **React + TypeScript** → industry standard, portfolio-friendly.

| Go WebSocket | gorilla/websocket | 1.5.3 | WS connections |* **TailwindCSS** → rapid, clean UI.

* **WebRTC** → real-time audio streaming for voice chat.

### Development Tools* **WebSockets (or GraphQL Subscriptions)** → live sync with backend (tasks, habits, journals).

| Tool | Purpose |* **Why**: Shows strong frontend chops while keeping the system interactive and modern.

|------|---------|

| Bun | JavaScript runtime & package manager |---

| uv | Fast Python package manager |

| Turborepo | Monorepo build system |## **2. Backend (Core Services)**

| Biome | Fast linter/formatter (replaces ESLint + Prettier) |

| Concurrently | Run multiple dev servers |* **Go (Golang)** →



### Architecture Patterns  * High-concurrency for **real-time voice streaming + event bus consumers**.

- **Monorepo**: Turborepo + Bun workspaces  * Great for the **Voice Gateway** (STT/TTS pipeline orchestration).

- **State Management**: Context API with reducers (Redux-like patterns)* **Python (FastAPI)** →

- **Event System**: Custom domain event dispatcher

- **Real-time**: WebSocket with auto-reconnect  * For **AI/ML microservices** (STT, TTS, LLM prompts, analytics).

- **Feature Flags**: Simple flag system for gradual rollout  * Rich ecosystem for NLP, metrics, sentiment, personalization.

- **Optimistic Updates**: UI updates before server confirmation* **Why**: Hybrid approach → Go handles **fast, concurrent events**, Python handles **AI-heavy logic**. Aligns perfectly with your career goals (Backend + AIML).

- **Lazy Loading**: Whisper model loaded on first use

- **Type Safety**: Shared TypeScript definitions across frontend/backend---



---## **3. Event & Context Management**



## Production Roadmap* **Redis Streams / NATS** → lightweight **event bus** for real-time sync.

* **Why**: Handles updates from **voice, web, sheets**, broadcasting changes to all consumers instantly. Low-latency, easy to deploy.

### Phase 3: Data Layer

- **Database**: PostgreSQL 16+---

- **ORM**: Prisma (TypeScript) or SQLAlchemy (Python)

- **Cache**: Redis 7+## **4. Database Layer**

- **Vector DB**: pgvector extension for embeddings

- **Migrations**: Prisma Migrate or Alembic* **PostgreSQL** → structured storage (tasks, journals, habits).

* **TimescaleDB (Postgres extension)** → time-series tracking (habit streaks, productivity metrics).

### Phase 4: Enhanced AI* **Redis** → session cache + fast context lookups for AI.

- **TTS**: ElevenLabs API or Coqui TTS* **Why**: Strong SQL base (resume-friendly), plus real-time + analytics capabilities.

- **Embeddings**: OpenAI text-embedding-3 or sentence-transformers

- **Vector Search**: Semantic journal/task search---

- **RAG**: Retrieval-augmented generation for context

## **5. AI/ML Layer**

### Phase 5: Infrastructure

- **Event Bus**: Redis Streams or NATS* **STT (Speech-to-Text)**:

- **Message Queue**: BullMQ or Celery

- **Observability**: OpenTelemetry + Prometheus + Grafana  * **Whisper** (OpenAI) for accuracy.

- **Error Tracking**: Sentry  * Or **Vosk/Coqui** for local/offline mode.

- **Analytics**: PostHog or Plausible* **TTS (Text-to-Speech)**:



### Phase 6: Deployment  * **ElevenLabs API** (natural voices).

- **Hosting**: Vercel (frontend) + Fly.io/Render (backend)  * Or **Piper/Coqui** for local fallback.

- **Storage**: Cloudflare R2 or S3* **LLM Integration**:

- **CDN**: Cloudflare

- **CI/CD**: GitHub Actions  * **OpenAI GPT / Anthropic Claude** for production-ready quality.

- **Monitoring**: Uptime Robot or Better Stack  * Local option: **Llama 3 / Mistral** (for experimentation + edge deployment).

* **NLP/Analytics**: Hugging Face models (sentiment, emotion, summarization).

---* **Why**: Covers both **portfolio use (APIs)** and **deep ML skills (local models)**.



## Design Decisions---



### Why Next.js 15?## **6. Integrations**

- App Router for modern routing patterns

- React Server Components for performance* **Google Sheets API** → bi-directional task/journal/habit sync.

- Built-in API routes if needed* **Notion API** (optional) → structured notes + journal export.

- Excellent TypeScript support* **Google Calendar API** → task scheduling + reminders.

- Vercel deployment optimization* **Why**: Recruiters love to see real-world API integrations that demonstrate adaptability.



### Why FastAPI?---

- Async/await for concurrent requests

- Automatic OpenAPI documentation## **7. Security & Privacy**

- Pydantic validation

- Easy AI/ML model integration* **JWT + OAuth2** → authentication for web + API services.

- Fast performance (ASGI)* **HTTPS + TLS everywhere**.

* **End-to-End Encryption for Journals** (at rest + in transit).

### Why Go for WebSocket?* **Why**: Demonstrates security-conscious backend design.

- Excellent concurrency model (goroutines)

- Low latency for real-time streaming---

- Simple deployment (single binary)

- Demonstrates polyglot architecture## **8. DevOps & Deployment**



### Why Bun?* **Docker + Docker Compose** → containerized services (frontend, backend, AI, DB).

- Faster than npm/yarn/pnpm* **Kubernetes (later)** → scalability showcase.

- Built-in TypeScript support* **PostHog / OpenTelemetry** → observability & event tracking.

- Compatible with Node.js ecosystem* **Why**: Shows production-readiness and cloud-native thinking.

- Great developer experience

---

### Why Biome?

- 10-100x faster than ESLint## **9. Optional Stretch**

- Unified linter + formatter

- No config needed (opinionated)* **Vector DB (Pinecone / Weaviate / pgvector)** → long-term journaling + AI memory.

- Better error messages* **Mojo (later)** → optimize Python-based ML inference.

- Single tool replaces multiple* **Rust (later)** → rewrite critical performance-heavy services (e.g., TTS/STT streaming).



### Why In-Memory Storage (Current)?---

- Fast prototyping

- No DB setup needed# 🔥 Why This Stack?

- Easy to test

- Clear migration path to PostgreSQL* **Backend Career Fit** → Go (real-time systems) + Python (AI/ML).

* **AIML Focus** → Whisper, TTS, NLP, LLM integration.

---* **Recruiter Appeal** → Modern stack (React, TS, Go, Python, Postgres), real-time features, API integrations.

* **Portfolio Strength** → Demonstrates **full-stack, systems, and AI expertise** in one cohesive project.

## Technology Alternatives Considered


| Category | Chosen | Alternatives | Why Chosen |
|----------|--------|--------------|------------|
| Frontend Framework | Next.js | Remix, SvelteKit, Astro | Best React DX, mature ecosystem |
| Styling | Tailwind v4 | styled-components, Emotion | Utility-first, v4 performance |
| Backend Language | Python + Go | Node.js, Rust | Python for AI/ML, Go for RT |
| API Framework | FastAPI | Flask, Django | Async, modern, type-safe |
| State Management | Context API | Redux, Zustand, Jotai | Built-in, sufficient for scale |
| Database (future) | PostgreSQL | MySQL, MongoDB, Supabase | Mature, pgvector, ACID |
| Linter | Biome | ESLint + Prettier | Speed, simplicity |
| Package Manager | Bun | npm, yarn, pnpm | Speed, modern features |

---

## Performance Targets

### Frontend
- Lighthouse Score: > 90
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Bundle Size: < 500KB (gzipped)

### Backend
- API Response: < 100ms (p95)
- STT Latency: < 2s (first chunk)
- WebSocket Ping: < 50ms
- Memory Usage: < 512MB per service

### AI
- Whisper Inference: < 3s for 10s audio
- LLM Response: < 2s (streaming start)
- Embedding Generation: < 100ms

---

## Security Considerations

### Current
- HTTPS enforcement (production)
- Input validation (Pydantic, TypeScript)
- CORS configuration
- Environment variable management

### Planned
- OAuth2 authentication
- JWT token management
- Rate limiting
- API key rotation
- Database encryption at rest
- Audit logging

---

*Last updated: October 2025*
