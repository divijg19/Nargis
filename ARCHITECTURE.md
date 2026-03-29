# Architecture

## System Overview

Nargis is split into three main runtime surfaces:

- Web app: Next.js frontend for tasks, habits, journal, pomodoro, and voice UX
- Python API: FastAPI orchestrator for HTTP workflows, domain services, and AI-oriented application logic
- Go gateway: websocket and proxy layer for realtime transport and orchestration-facing routing

## Topology

```text
Browser / Client
    |
    | HTTP + WebSocket
    v
Next.js Web App
    |
    | server routes / client API calls
    +-----------------------> Go Gateway
    |                             |
    |                             | realtime / proxy
    |                             v
    +-----------------------> FastAPI Orchestrator
                                  |
                                  | services / storage / agent logic
                                  v
                           Database / Redis / External AI services
```

## Runtime Responsibilities

### Web

- Owns the UI, local state, user flows, and server-side bridge routes used by the frontend
- Polls and presents system health and warm/restart state
- Uses websocket features through the gateway rather than talking directly to every backend concern

### Python API

- Owns HTTP business flows, service-layer coordination, and most domain operations
- Hosts AI-oriented orchestration, audio processing flow, and authenticated application APIs
- Keeps routers thin and pushes reusable logic into services and shared helpers

### Go Gateway

- Owns websocket handling, stream forwarding, proxy behavior, readiness/health surfaces, and gateway-level runtime policy
- Sits between the web app and the Python backend for realtime and selected routing concerns
- Keeps transport logic separate from core application/domain logic

## Design Principles

- Polyglot by purpose: TypeScript for product UI, Python for orchestration and AI integration, Go for gateway/realtime runtime concerns
- Thin adapters: route handlers should validate, authorize, and delegate instead of hoarding business logic
- Shared contracts where useful: system status and similar cross-cutting surfaces should have one canonical type shape per layer
- Maintainability first: extract reducers/helpers/clients when runtime modules start mixing unrelated concerns
- Operational clarity: health, readiness, and environment-driven behavior should be explicit and testable

## Key Internal Patterns

### Web data access

- Shared clients and hooks for system status/actions
- Pure helpers for state/event reduction where provider code becomes too stateful
- App-local scripts and tooling optimized for fast feedback

### Python application structure

- Composition-oriented app startup
- Separate router modules for transport concerns
- Service modules for data and domain behavior
- Shared response models and ownership/access helpers for consistency

### Go gateway structure

- Small bootstrap entrypoint
- Focused files for deps/config, proxying, health, runtime helpers, and websocket handling
- Dependency structs used to make handler behavior more deterministic and testable

## Operational Docs

- Deployment runbook: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)
- Production checklist: [docs/PRODUCTION_CHECKLIST.md](./docs/PRODUCTION_CHECKLIST.md)
- Delivery status and future work: [ROADMAP.md](./ROADMAP.md)
