---
title: Nargis Python API
emoji: 🧠
colorFrom: purple
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Nargis Python API
This is the AI Orchestrator service for Nargis.


# api-py — Nargis Python API

This service provides STT/LLM/TTS endpoints and now includes an agent orchestration layer (LangGraph) and a dedicated service layer for domain logic.

Key architectural changes
-------------------------
- **Service Layer:** Business logic has been extracted from routers into `apps/api-py/services/` (e.g., `services/tasks.py`). Routers are now thin HTTP adapters that validate and authorize requests and delegate to services for DB operations.
- **Agent Runtime:** A LangGraph-powered agent lives in `apps/api-py/agent/`. Tools (strictly validated with Pydantic) expose safe side-effects (for example, `create_task`) and are bound to a `StateGraph` that runs an LLM and orchestrates tool calls.

Quick local build
-----------------

The default container image is lightweight and does NOT include heavy ML libraries (torch/transformers).

```pwsh
docker build -t nargis-api-py:local --build-arg BUILD_ML=0 ./apps/api-py
```

To build an ML-enabled image (requires large disk space and is slow; prefer remote builders or a dedicated GPU host):

```pwsh
docker build -t nargis-api-py:ml --build-arg BUILD_ML=1 ./apps/api-py
```

If your local Docker daemon is limited or unavailable, use Fly remote build or CI to build images:

```pwsh
flyctl deploy --remote-only -a <app-name>
```

Agent & Developer Notes
-----------------------

- Location of agent code:
	- `apps/api-py/agent/tools.py` — Tool implementations (Pydantic `args_schema`) that call service functions.
	- `apps/api-py/agent/graph.py` — LangGraph `StateGraph` composition and compiled `agent_app` runtime.
- How the audio pipeline uses the agent:
	- `apps/api-py/main.py` now invokes `agent.graph.agent_app.invoke()` with the transcribed text; the agent returns a final reply and may call tools (for example, to create tasks) as part of reasoning.
- Dependencies to add for agent development:
	- `langgraph`, `langchain`, and `langchain-groq` (add to `pyproject.toml`; commit `uv.lock` for reproducible installs).
- Testing:
	- Unit-test service functions directly (e.g., `services/tasks.py`) — this keeps DB logic easy to test without spinning up FastAPI.
	- Integration tests for the agent should run in a controlled environment (mocks for external LLM endpoints and DB).

Environment variables (new/agent-specific)
----------------------------------------
- `AGENT_MODEL` — model identifier used by LangGraph / Groq (e.g., `llama-3.1-70b-versatile`).
- `AGENT_TEMPERATURE` — numeric temperature for deterministic or exploratory behavior.
- Existing AI env vars still apply: `GROQ_API_KEY`, `DEEPGRAM_API_KEY`, `LLM_URL`, `TTS_URL`, `TTS_API_KEY`, `PRELOAD_STT`.

Run locally (dev)
-----------------

Recommended (reproducible) setup — uses `uv` (pinned) to install and lock dependencies. This is the required workflow for development, CI, and Docker builder stages.

PowerShell (Windows):

```pwsh
cd apps/api-py

# Ensure Python 3.12 is active
python -c "import sys; sys.exit(0 if sys.version_info[:3]==(3,12) else 1)" || (Write-Host 'Please use Python 3.12'; exit 1)

python -m venv .venv
.\.venv\Scripts\Activate

# Bootstrap uv (pinned) - this is the only step that uses pip directly
python -m pip install --upgrade pip
python -m pip install --no-cache-dir "uv==0.9.11"

# Install runtime + dev deps using uv only
uv pip install --no-cache-dir '.[dev]'

# Create/update lockfile for deterministic installs
uv lock create --output uv.lock

# Run the server
uvicorn main:app --reload
```

POSIX / macOS:

```bash
cd apps/api-py

# Ensure Python 3.12 is active
python -c 'import sys; sys.exit(0 if sys.version_info[:3]==(3,12) else 1)' || (echo 'Please use Python 3.12' && exit 1)

python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install --no-cache-dir "uv==0.9.11"
uv pip install --no-cache-dir '.[dev]'
uv lock create --output uv.lock
uvicorn main:app --reload
```

Bootstrap note:
- The only allowed pip usage is to install `uv` itself (bootstrapping). After that, use `uv` for all dependency operations.

Notes
- The Dockerfile is configured to use uv in the builder stage and will install dependencies using `uv`.
- Commit `uv.lock` when you create it if you want fully reproducible builds in CI or when building Docker images.
- If agent dependencies are not present, the API falls back to the previous LLM path. Add agent packages (LangGraph, LangChain, etc.) to the project extras if you need agent behaviors.

