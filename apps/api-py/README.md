---
title: Nargis Python API
emoji: 🧠
colorFrom: purple
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# api-py

FastAPI orchestrator for Nargis.

For repo-level context, see:
- [../../README.md](../../README.md)
- [../../PLANNING.md](../../PLANNING.md)
- [../../ARCHITECTURE.md](../../ARCHITECTURE.md)
- [../../ROADMAP.md](../../ROADMAP.md)

## Responsibilities

- HTTP API and authenticated application routes
- AI/audio orchestration flow
- Service-layer domain logic
- Shared response and validation contracts for backend routes

## Local Setup

```bash
cd apps/api-py
uv sync --all-extras
uv run uvicorn main:app --reload
```

## Local Commands

```bash
uv run ruff check .
uv run ruff format .
uv run ty check .
uv run pytest
```

## Notes

- Keep router modules thin and push reusable behavior into `services/` and shared helpers
- Commit `uv.lock` when dependency changes are intentional
- See [../../docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md) for deployment details
