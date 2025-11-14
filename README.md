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
