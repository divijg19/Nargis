# 🌸 Nargis – An Agentic, Voice-First AI Productivity Companion

**Nargis** is a modern **AI productivity agent** that unifies task management, habit tracking, and journaling into a single, intelligent platform. It's designed to be a proactive partner that helps you achieve your goals, not just a passive tool.

This project is a **full-stack showcase** demonstrating a real-time, polyglot architecture (TypeScript + Python + Go), advanced AI integration patterns, and modern development practices.

---

## 🚀 Core Philosophy

-   **Agentic by Design:** Moves beyond simple commands to a conversational, goal-oriented workflow where the AI can understand intent, ask clarifying questions, and autonomously execute multi-step plans.
-   **Voice-First Interaction:** A low-latency, real-time voice pipeline forms the core of the user experience, making interaction natural and frictionless.
-   **API-First Performance:** Prioritizes speed and responsiveness by leveraging best-in-class external AI services, with a robust local-only fallback mode.
-   **Developer-Friendly:** A clean, type-safe, and well-documented monorepo built with modern tooling for a superior development experience.

---

## ✨ Key Features

-   **Real-Time Voice-to-Response Pipeline:** Speak a thought, and Nargis transcribes, understands, and responds in a seamless conversational flow.
-   **Dual-Mode AI Backend:**
    -   **Primary (API) Mode:** High-speed, production-grade performance using external APIs (Groq, Deepgram).
    -   **Fallback (Local) Mode:** A fully offline-capable mode using local models (Ollama, Transformers/Whisper) for privacy and zero-cost operation.
-   **Polyglot Real-Time Architecture:** Uses the best language for the job to ensure low latency and maintainability (Go for WebSockets, Python for AI).
-   **Distributed Tracing:** All requests are tagged with a unique `RequestID` from the gateway through the AI service, enabling robust logging and debugging.
-   **Unified Productivity Suite:** Seamlessly integrates tasks, habits, and a Pomodoro timer.

---

## 🛠️ Technology Stack

| Layer                 | Technology                                                               | Purpose                                                           |
| --------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| **Monorepo & Tooling**  | **Bun, Turborepo, Biome**                                                | Workspace management, task running, and code quality.             |
| **Frontend**            | **Next.js 16 (Turbopack), React, TypeScript**                            | Modern, fast, and type-safe user interface.                       |
| **Real-Time Gateway**   | **Go, Gorilla WebSocket, `air`**                                         | Handles high-concurrency WebSocket connections with hot-reloading. |
| **AI Orchestrator**     | **Python 3.12, FastAPI, `uv`**                                           | Serves business logic, the dual-mode AI system, and agent execution. |
| **Primary AI APIs**     | **Groq (`llama-3.1-8b-instant`), Deepgram**                              | For high-speed, production-grade LLM and STT services.            |
| **Local AI Fallback**   | **Ollama (`phi-3-mini`), Transformers (`whisper-base`)**                 | For offline, private, or zero-cost operation.                     |
| **Database & Cache**    | **PostgreSQL, Redis**                                                    | For long-term memory (user profiles, tasks) and session/cache management. |
| **Infrastructure**      | **Docker, Docker Compose**                                               | For containerizing services and providing a consistent environment. |
| **Deployment**          | **Vercel** (Frontend), **Fly.io** (Backend)                              | Modern platforms with generous free tiers for hosting.            |


## 🎯 Design Principles

### Architecture
- **Event-driven**: Domain events for loose coupling
- **Optimistic UI**: Instant feedback, eventual consistency
- **Feature flags**: Progressive enhancement and A/B testing
- **Type-safe**: End-to-end TypeScript contracts

### Code Quality
- **Biome**: Fast, unified linting and formatting
- **Strict TypeScript**: No implicit any, full type coverage
- **Accessibility-first**: WCAG AA compliance target
- **Modern patterns**: React 19 features, async/await, ES modules

---

## 🏗️ Project Structure

```
Nargis/
├── apps/
│   ├── web/                 # Next.js 16 Frontend
│   ├── api-py/              # FastAPI AI Orchestrator
│   └── gateway/             # Go WebSocket Gateway
├── packages/
│   └── tsconfig/            # Shared TypeScript configs
├── infra/
│   ├── docker-compose.yml   # Docker Compose for Hybrid Dev
│   └── .env.example         # Environment variables for Docker
└── package.json             # Root scripts and dependencies
```

---

## 🚀 Getting Started

### Prerequisites

-   **Bun** (v1.2.0+)
-   **Go** (v1.25+) with `air` installed (`go install github.com/air-verse/air@latest`)
-   **Python** (~3.12) with `uv` (`pip install uv`)
-   **Docker Desktop** (for the Hybrid Workflow)
-   **(Optional)** [Ollama](https://ollama.com/) for the local AI fallback.

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/divijg19/Nargis.git
cd Nargis

# Install all dependencies across the monorepo
bun install
```

### 2. Configuration

Nargis uses a powerful dual-mode AI backend. You control it via `.env` files.

1.  **Create Local `.env` File:** For the fully local workflow.
    `cp apps/api-py/.env.example apps/api-py/.env`

2.  **Create Docker `.env` File:** For the hybrid workflow.
    `cp infra/.env.example infra/.env`

3.  **Edit the `.env` files:**
    -   To use the **high-speed APIs (Recommended)**, fill in your `DEEPGRAM_API_KEY` and `GROQ_API_KEY`.
    -   To use the **local AI models**, leave the API key values blank.

### 3. Running the Application

You have two powerful workflows to choose from, both run from the project root.

#### Workflow A: Hybrid Development (Recommended for Frontend)

Runs the backend in Docker for stability and the frontend locally for fast UI development.

```bash
# Start the backend services in Docker and the frontend locally
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

-   [ ] Implement short-term conversational memory.
-   [ ] Integrate a PostgreSQL database for long-term memory (user profiles, goals).
-   [ ] Define and implement "Tools" for the AI (e.g., `create_task`, `start_pomodoro`).
-   [ ] Integrate an agent framework (e.g., LangChain) to enable autonomous planning and tool use.

### Phase 3: Proactive Coaching & Insights

-   [ ] Implement semantic search over journal entries (RAG).
-   [ ] Create scheduled, proactive agent triggers (e.g., "morning briefing").
-   [ ] Develop AI-powered insights and progress reports.

---

## 📚 Documentation

- [Planning & Vision](./docs/PLANNING.md)
- [Contributing](./docs/CONTRIBUTING.md)

## 🤝 Contributing

This is currently a personal project, but suggestions and feedback are welcome! Please feel free to open an issue or a pull request.

---

## 📋 Recent Updates

### Architectural Refactor & Backend Polish (October 2025)

This series of updates represents a complete overhaul of the backend architecture to create a robust, production-ready, and high-performance system.

-   **✅ Refactored to a Single-Hop Pipeline**: The entire AI workflow was consolidated. The Go gateway now makes a single, efficient call to the Python API, which orchestrates the full STT -> LLM chain. This dramatically reduces latency and complexity.
-   **✅ Implemented Dual-Mode AI Backend**: The Python API now intelligently switches between high-speed external APIs (Deepgram, Groq) and a local-only fallback (Whisper, Ollama) based on environment variables, providing maximum flexibility for development and deployment.
-   **✅ Modernized Python Dependencies**: Migrated from multiple `requirements.txt` files and build arguments to a single, modern `pyproject.toml` with `uv` for dependency management and `requirements.lock` for reproducible builds.
-   **✅ Implemented Distributed Tracing**: The Go gateway now generates a unique `RequestID` for every voice request and forwards it to the Python API, enabling end-to-end traceability in the logs.
-   **✅ Stabilized Development Workflows**: Created and debugged two distinct, reliable development modes (`dev:hybrid` and `dev`) with hot-reloading for all services (Go, Python, Next.js) and cross-platform compatibility.
-   **✅ Production-Hardened Services**: Fixed numerous bugs related to timeouts, configuration loading (`.env`), and logging. Implemented graceful shutdown in the Go gateway for robust operation.

### Previous Frontend UX Improvements

-   **✅ Fixed Toast Positioning**: Moved toasts from bottom to top to prevent footer overlap.
-   **✅ Modal System**: Created accessible `Modal`, `TaskModal`, and `HabitModal` components with full keyboard navigation, ARIA roles, form validation, and backdrop-click-to-close.
-   **✅ Action Buttons Wired**: All placeholder actions were replaced with real functionality for creating tasks/habits and navigating to the Pomodoro timer.
-   **✅ Code Cleanup**: Removed all `console.log` statements and debug code from the frontend.
---

## 📄 License

This project is licensed under the MIT License.

## 👤 Author

**Divij Ganjoo**

-   Portfolio: [divijganjoo.me](https://divijganjoo.me)
-   LinkedIn: [in/divij-ganjoo](https://linkedin.com/in/divij-ganjoo)
-   GitHub: [@divijg19](https://github.com/divijg19)

*Built with ❤️ and ☕ as a demonstration of modern full-stack development with AI/ML integration.*
