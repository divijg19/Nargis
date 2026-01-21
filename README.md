# Nargis — Voice-first AI productivity companion

Nargis is a full-stack demo of a voice-first AI productivity assistant (tasks, habits, journaling) with a real-time pipeline and a dual-mode AI backend (API + local fallback).

This README is purposely concise — detailed operational and design docs live under `docs/` and the package READMEs in `apps/`.

## Quick start

Prereqs: Bun, Node-compatible shell, Go (for gateway), Python (for AI service), Docker (optional).

Clone and install:

```bash
git clone https://github.com/divijg19/Nargis.git
cd Nargis
bun install
```

Run the full local dev workflow:

```bash
# Local (all services)
bun run dev

# Hybrid: Docker backend + local frontend
bun run dev:hybrid
```

#### Workflow B: Fully Local Development (Recommended for Backend)

Runs all services locally with hot-reloading. **Ensure Docker is not running first** (`bun run dev:docker:down`).

```bash
# Start all services locally
bun run dev
```

### Available Scripts

| Command                   | Description                                                                 |
| ------------------------- | --------------------------------------------------------------------------- |
| `bun run dev`             | Starts all services locally with hot-reloading (for backend work).          |
| `bun run dev:hybrid`      | Starts the Docker backend and local frontend (for frontend work).           |
| `bun run dev:docker:up`   | Starts the Docker Compose services only.                                    |
| `bun run dev:docker:down` | Stops the Docker Compose services.                                          |
| `bun run build`           | Builds all applications in the monorepo.                                    |
| `bun run lint`            | Lints the entire monorepo with Biome.                                       |
| `bun run typecheck`       | Type-checks all TypeScript packages.                                        |

---

## 🚧 Roadmap

### Phase 1: Foundation (✅ Complete)

-   [x] Monorepo setup with modern tooling (Bun, Turborepo, Biome).
-   [x] Fully functional, polyglot backend (Go, Python).
-   [x] **Dual-Mode AI Pipeline** implemented and working.
-   [x] End-to-end, real-time voice-to-response functionality.
-   [x] Flexible hybrid and fully-local development workflows configured.

### Phase 2: Building the Agent (🔨 In Progress)
 -   [x] Implement short-term conversational memory (agent state graph scaffolding).
 -   [x] Integrate a service layer for backend logic (`apps/api-py/services/*`).
 -   [x] Define and implement core AI "Tools" (e.g., `create_task`) exposed to the agent runtime (`apps/api-py/agent/tools.py`).
 -   [x] Implement an agent orchestration layer using LangGraph (`apps/api-py/agent/graph.py`) to bind LLMs to tools and manage reasoning.
 -   [ ] Integrate a PostgreSQL database for long-term persistence (user profiles, goals).

### Phase 3: Proactive Coaching & Insights

-   [ ] Implement semantic search over journal entries (RAG).
-   [ ] Create scheduled, proactive agent triggers (e.g., "morning briefing").
-   [ ] Develop AI-powered insights and progress reports.

---

## 📚 Documentation

- [Planning & Vision](./docs/PLANNING.md)
- [Contributing](./docs/CONTRIBUTING.md)

## Agentic Architecture (Backend)

The backend has been refactored to a three-tier architecture to support agentic reasoning and safe tool use.

- **Router**: HTTP + FastAPI routers remain thin. They validate requests, enforce auth, and delegate domain work to the Service layer (`apps/api-py/routers/*`).
- **Service**: Business logic and DB access moved into `apps/api-py/services/*` (for example, `services/tasks.py`). Services accept simple Pydantic-compatible inputs and a SQLAlchemy `Session` to enable unit testing and reuse by agent tools.
- **Agent**: LangGraph-based agent lives in `apps/api-py/agent/`. Tools are defined in `agent/tools.py` (strict Pydantic `args_schema`) and bound to an LLM-driven `StateGraph` in `agent/graph.py`. The API invokes the agent for reasoning-heavy flows (e.g., voice-driven task creation).

Key files:

- `apps/api-py/services/` — service modules (DB logic, validation, idempotency helpers).
- `apps/api-py/agent/tools.py` — Pydantic-validated LangChain tools exposed to the agent.
- `apps/api-py/agent/graph.py` — LangGraph StateGraph composition and compiled `agent_app` runtime.
- `apps/api-py/main.py` — audio pipeline now delegates LLM reasoning to the agent runtime and uses legacy LLM calls as a fallback.

Environment & dependencies:

- Add `langgraph`, `langchain`, and `langchain-groq` to the Python environment used by `apps/api-py` (see `apps/api-py/pyproject.toml` and commit `apps/api-py/uv.lock` for reproducible installs).
- Configure AI keys and endpoints as usual (`GROQ_API_KEY`, `DEEPGRAM_API_KEY`, `LLM_URL`, `TTS_URL`, etc.) and add any agent-specific settings (e.g., `AGENT_MODEL`, `AGENT_TEMPERATURE`).

The refactor keeps the HTTP surface unchanged while enabling safe, testable agent tooling.

## 🤝 Contributing

This is currently a personal project, but suggestions and feedback are welcome! Please feel free to open an issue or a pull request.

---

## 👤 Author

**Divij Ganjoo**

-   Portfolio: [divijganjoo.me](https://divijganjoo.me)
-   LinkedIn: [in/divij-ganjoo](https://linkedin.com/in/divij-ganjoo)
-   GitHub: [@divijg19](https://github.com/divijg19)

*Built with ❤️ and ☕ as a demonstration of modern full-stack development with AI/ML integration.*

