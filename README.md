# `Nargis`
> Voice-first AI productivity companion

`Nargis` is a full-stack demo of a voice-first AI productivity assistant (tasks, habits, journaling) with a real-time pipeline and a dual-mode AI backend (API + local fallback).

Nargis is a polyglot monorepo for a productivity assistant with a Next.js web app, a FastAPI orchestrator, and a Go gateway for realtime traffic.

## Quick Start

Prerequisites: Bun, Python 3.12, `uv`, Go, and a POSIX-compatible shell.

```bash
bun install
bun run dev
```

Local defaults:
- Web: `http://localhost:3000`
- Python API: `http://localhost:8000`
- Go gateway: `ws://localhost:8080`

## Root Scripts

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the web app, Python API, and Go gateway together |
| `bun run build` | Build the web app and Go gateway |
| `bun run lint` | Preferred cleanup/write command across the repo |
| `bun run lint:format` | Run format-only write actions |
| `bun run lint:check` | Run the full read-only validation umbrella |
| `bun run qa` | Fast one-stop validation alias |
| `bun run test` | Run all test suites |
| `bun run smoke:ws` | Run the websocket smoke client |
| `bun run smoke:local-realtime` | Run the local realtime smoke script |

Targeted escape hatches remain available:
- `dev:web`, `dev:py`, `dev:go`
- `build:web`, `build:go`
- `test:web`, `test:api`, `test:go`
- `lint:web`, `lint:api`, `lint:go`
- `lint:check:web`, `lint:check:api`, `lint:check:go`

## Repo Guide

- [PLANNING.md](./PLANNING.md): project intent, goals, and success criteria
- [ARCHITECTURE.md](./ARCHITECTURE.md): system design, boundaries, and technical decisions
- [ROADMAP.md](./ROADMAP.md): delivery phases and next work
- [CONTRIBUTING.md](./CONTRIBUTING.md): contribution workflow
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md): deployment runbook
- [docs/PRODUCTION_CHECKLIST.md](./docs/PRODUCTION_CHECKLIST.md): production readiness checklist

## Apps

- [apps/web/README.md](./apps/web/README.md): frontend-specific setup and workflow
- [apps/api-py/README.md](./apps/api-py/README.md): Python API setup and runtime notes
- [apps/core-go/README.md](./apps/core-go/README.md): Go gateway setup and runtime notes

## Author

Divij Ganjoo

- Portfolio: [divijganjoo.me](https://divijganjoo.me)
- LinkedIn: [in/divij-ganjoo](https://linkedin.com/in/divij-ganjoo)
- GitHub: [@divijg19](https://github.com/divijg19)

*Built with ❤️ and ☕ as a demonstration of modern full-stack development with AI/ML integration.*
