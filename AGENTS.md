<div align="center">

# Nargis: Architecture, Agents & Engineering Guide

_Unified reference for architecture, migration history, AI/agent roadmap, operational practices, and contribution standards._

**Last Updated:** 2025-10-01  
**Status:** Frontend agent layer complete · Backend enrichment pending · Service abstractions scaffolded

</div>

---
## 1. Core Vision
Nargis is an AI‑native productivity companion that fuses Tasks, Habits, Focus (Pomodoro), Reflection/Confessions, and (future) Voice + Recommendation surfaces into a progressively intelligent system.

Guiding principles:
- Local-first optimistic UX; enrich later.
- Event-sourced enrichment: nothing is “lost,” everything can be replayed.
- Explainable intelligence: enriched fields trace back to raw events.
- Privacy-preserving defaults; opt-in intelligence depth.

---
## 2. Migration Retrospective (Legacy Vue → Next.js / React / TypeScript)

| Legacy Feature | Modern Implementation | Location(s) | Parity | Notes |
|----------------|-----------------------|-------------|--------|-------|
| Tasks (Pinia) | `TaskContext` + components | `contexts/TaskContext`, `/tasks`, dashboard | ✅ | Now async-capable via service layer mocks |
| Habits | `HabitContext` | `/habits` | ✅ | Streak + progress derived selectors |
| Pomodoro | `PomodoroContext` | `/pomodoro` | ✅ | Auto-cycle; persistence TBD |
| Theme | `ThemeContext` | Global layout | ✅ | System + local storage |
| UI primitives | Tailwind + composable components | `components/ui` | ✅ | A11y iterative improvements |
| Analytics | Deferred | — | ⏳ | Will use enriched projections |
| Calendar | Deferred | — | ⏳ | Tied to focus + scheduling agents |
| Drag & Drop | Deferred | — | ⏳ | Accessible DnD lib later |

Legacy code removed (preserved in Git). All state domains re-homed into typed React contexts.

---
## 3. Current Frontend “Agents” (Deterministic Contexts)
Each context = domain hub: raw state + derived slices + domain actions (CRUD/state transitions). These are intentionally synchronous/local to keep UI fluid.

| Agent | File | Key Derived Values | Notable Actions | Next Evolutions |
|-------|------|-------------------|-----------------|-----------------|
| Task | `TaskContext` | today tasks, by status, completed today | add/update/delete/toggle/load | Recurrence, dependency graph, semantic tagging |
| Habit | `HabitContext` | todayProgress, totalStreaks | add/update/delete/updateCount/load | Adaptive targets, adherence risk model |
| Pomodoro | `PomodoroContext` | formattedTime, progress, sessionType | start/pause/reset/complete/load | Focus scoring, calendar block emit |
| Theme | `ThemeContext` | current theme | toggle/set | Multi-profile + contrast audit |

---
## 4. Planned Backend / AI Enrichment Agents

| Agent | Purpose | Primary Input | Output Fields / Signals | Stack Candidates |
|-------|---------|--------------|--------------------------|------------------|
| Voice Ingestion | Live speech → transcript + intent | Audio frames (WS) | partial transcript, intents | FastAPI + Whisper / Deepgram |
| Task Intelligence | Score + enrich tasks | Task create/update events | priority score, effort estimate, tags | LLM + embeddings + rules |
| Habit Insight | Predict habit lapse risk | Habit history stream | risk score, nudge suggestions | Time-series + classifier |
| Focus Scoring | Qualitative focus metrics | Session telemetry | focusScore, context switches | Rule engine + light ML |
| Recommendation | Cross-surface actions | Aggregated user model | ranked actions / suggestions | RAG + heuristics |
| Reflection Summarizer | Daily recap + planning | Day’s events & completions | structured journal & plan draft | LLM summarization + templates |

---
## 5. Interaction Topology (Target)
```
Client Contexts (optimistic)
	 ↓ events
Sync Layer (batched dispatch)
	 ↓ append
Event Log (immutable)
	 → Enrichment Agents (subscribe)
	 → Materialized Projections
	 ↓ push (WS/SSE)
Client Reconciliation (idempotent merge)
```
Properties:
- Separation of concerns: UI stays snappy, enrichment is eventual.
- Replayability: new agents can retroactively compute fields.
- Determinism at the edge; probabilistic augmentation centrally.

---
## 6. Data / Event Flow (Expanded)
1. User action (e.g., create task) invokes context action.
2. Context mutates local state immediately (optimistic record with provisional ID).
3. Dispatcher (future) queues outbound domain event.
4. API persists → publishes canonical event.
5. Enrichment agents consume → emit enrichment deltas.
6. Realtime channel broadcasts compact patches (JSON Patch or field subset).
7. Client resolves: merges if still matching provisional lineage; conflicts flagged.

---
## 7. Persistence & Caching Strategy

| Layer | Mechanism | Status | Notes |
|-------|----------|--------|-------|
| Frontend volatile | React state (contexts) | ✅ | Deterministic baseline |
| Frontend durable | IndexedDB (planned) | ⏳ | Offline bootstrap + queue |
| API store | Postgres (future) | ⏳ | Event store + projections |
| Realtime | WebSocket (planned) | ⏳ | Unified channel (multiplex) |
| Search/semantic | Vector index | ⏳ | Task/journal embeddings |

---
## 8. Security, Privacy & Trust Controls (Phased)

| Risk | Control (Initial) | Control (Mature) |
|------|------------------|------------------|
| Audio leakage | TLS + ephemeral buffer | On-device pre-filtering |
| Hallucinated advice | Source linking | Guardrail classifier + eval suite |
| PII exposure | Basic redaction | Entity-aware redaction + access policy |
| Model drift | Manual review | Metrics dashboard + scheduled eval jobs |
| Unauthorized enrichments | Static allowlist | Signed model manifests |

---
## 9. Roadmap Phases (Updated)

| Phase | Scope | Status | Exit |
|-------|-------|--------|------|
| P1 | Local contexts + UI parity | ✅ | All core domains migrated |
| P2 | Service layer + API persistence | ⏳ | CRUD persists + WS handshake |
| P3 | Event bus + 2 enrichment agents | ⏳ | Live deltas visible in UI |
| P4 | Recommendation surface | ⏳ | Suggestion panel w/ >3 sources |
| P5 | Reflection automation | ⏳ | Daily summary reliability >95% |
| P6 | Adaptive automation loop | ⏳ | Configurable autonomy tiers |

---
## 10. Immediate Engineering Focus
1. WebSocket client abstraction (`src/realtime/connection.ts`) with auto-retry + backoff.
2. Outbound event dispatcher stub (`src/events/dispatcher.ts`) – logs now, pluggable later.
3. Toast/notification system for CRUD, timer transitions, secret unlock.
4. Pomodoro session persistence (sessionStorage hydration) + crash recovery.
5. Introduce feature flag harness (lightweight in-memory + env override) for staged rollout.
6. API schema draft (tasks, habits, sessions) + first persistence path.
7. A11y pass: interactive components aria roles + focus outlines.

---
## 11. Open Strategic Questions
- Where to bound “task intelligence” (prediction vs strictly assistive classification)?
- Calendar: passive overlay vs active schedule synthesis?
- Scoped multi-profile (contexts or DB multi-tenant segmentation) required pre-recommendations?
- Voice session continuity: short-lived ephemeral vs persistent conversation threads?

---
## 12. Technical Debt Register

| Area | Debt | Impact | Priority | Planned Mitigation |
|------|------|--------|----------|--------------------|
| Mock service data | Inline mocks | Skews perf perceptions | High | Replace w/ API + seed fixtures |
| Timer resilience | Refresh loss | User friction | High | Persist & restore active session |
| Error surfacing | Console only | Hidden failures | High | Toast + structured envelope |
| Confession export | No import/encrypt | Data portability risk | Med | Add encrypted import/export |
| A11y coverage | Partial semantics | Inclusivity gap | Med | Audit + aria-live status zones |
| Logging strategy | Ad hoc | Debug difficulty | Med | Central structured logger |

---
## 13. Changelog
| Date | Change |
|------|--------|
| 2025-10-01 | Consolidated docs into unified guide |
| 2025-10-01 | Added service layer + async context adaptation notes |
| 2025-10-01 | Legacy Vue removal recorded |

---
## 14. Update Policy
Update when ANY of:
- A context flips from mock → real API source
- New enrichment agent emits live deltas
- Roadmap phase status changes
- New persistent domain introduced
- Security control tier upgraded

---
## 15. Developer & AI Agent Guidelines

### Coding Patterns
- Prefer pure reducers + thin action wrappers.
- Keep enrichment speculative fields namespaced (e.g., `ai.estimatedEffort`).
- Use optimistic IDs (UUID v4) and reconcile via server-issued canonical IDs.

### Error Model (Proposed Envelope)
```json
{
	"error": {
		"code": "TASK_NOT_FOUND",
		"message": "No task with id: 123",
		"retryable": false,
		"correlationId": "...",
		"meta": { }
	}
}
```

### Event Shape (Draft)
```json
{
	"type": "task.created",
	"version": 1,
	"id": "evt_...",
	"occurredAt": "2025-10-01T12:00:00Z",
	"actor": { "type": "user", "id": "u123" },
	"data": { "taskId": "t123", "title": "Write spec" },
	"trace": { "clientProvisionalId": "temp-abc" }
}
```

### Realtime Message Multiplex (Concept)
```json
{
	"channel": "tasks",
	"op": "enrichment.patch",
	"ref": "t123",
	"patch": [ { "op": "add", "path": "/ai/priorityScore", "value": 0.82 } ]
}
```

---
## 16. Environment & Configuration (Draft Keys)
```
NEXT_PUBLIC_API_PY_URL=
NEXT_PUBLIC_WS_URL=
DATABASE_URL=
REDIS_URL=
OPENAI_API_KEY=
ELEVENLABS_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---
## 17. Folder Map (Condensed)
```
apps/
	api-go/        # Realtime transport (WS)
	api-py/        # AI + enrichment services
	web/           # Next.js frontend (contexts = agents)
docs/            # Supporting docs (this file is canonical root)
infra/           # Compose, migrations, deploy assets
packages/        # Shared configs + future libs
```

---
## 18. Future Extensions (Speculative)
- Multi-agent orchestration (planner vs executor separation)
- Temporal knowledge graph of habits + tasks
- Auto-scheduled focus blocks with conflict resolution
- Trust layer with explanation provenance (“why this suggestion?”)
- Local inference fallback for degraded connectivity

---
## 19. Quick Implementation Checklist (Current Sprint Alignment)
- [ ] Add realtime connection abstraction
- [ ] Add outbound dispatcher + logging
- [ ] Plug contexts into dispatcher (fire events)
- [ ] Introduce toast feedback system
- [ ] Persist Pomodoro active session
- [ ] Draft DB schema (tasks / habits / sessions / confessions)
- [ ] Decide patch protocol (JSON Patch vs custom minimal diff)

---
## 20. Contribution Workflow (Lightweight)
1. Branch from `testing`.
2. Implement focused change (keep diff domain-scoped).
3. Run typecheck + lint; add/update minimal tests if harness present.
4. Update `AGENTS.md` if architecture or phase changes.
5. Open PR with “Context / Change / Next Impact” template.

---
## 21. FAQ Seeds
**Q:** Why contexts instead of Zustand/MobX?  
**A:** Small domain surface + derived selectors suffice; complexity deferred until enrichment scale grows.

**Q:** Why event sourcing vs direct mutation?  
**A:** Replay + enrichment retroactivity + audit trail.

**Q:** When to introduce DB?  
**A:** At the start of Phase P2—immediately after service layer proved stable for mock flows.

---
> This document is the single source of truth for architecture & roadmap. Do NOT create parallel design docs—append or refine here.

---
## 22. Engineering & Code Quality Standards
Foundational principles for all services (frontend + Go + Python):
- Type Safety: Strict TypeScript; Python modules must include type hints (mypy-clean target later).
- Pure Logic First: Keep reducers / domain logic pure & testable (side-effects isolated to hooks/services).
- Error Envelope: All network errors return the standardized JSON error envelope (see section 15) with stable `code` values.
- Logging: Use structured logs (JSON) at edges (API ingress, WS, event dispatcher) — avoid console noise in domain code.
- Performance Budgets: Initial soft budgets—cold UI TTI < 2.5s local dev; task list render < 50ms for 200 tasks.
- Accessibility: No interactive element without an accessible name; ensure focus states and aria-live for async state changes.
- Security Hygiene: Never log secrets; redact user PII before enrichment; feature flags gate experimental models.

### Lint / Static Expectations (Target Backlog)
- ESLint + custom rule to forbid direct `fetch` outside `services/`.
- Dead code detection in CI (ts-prune / depcheck).
- Disallow implicit `any` and non-exhaustive discriminated unions.

---
## 23. API & Integration Design Patterns (Draft)
| Pattern | Rationale | Status |
|---------|-----------|--------|
| REST (CRUD cores) | Simplicity + cacheability | Planned P2 |
| WebSocket multiplex | Low-latency enrichment + patches | Planned P2/P3 |
| Event sourcing (append log) | Replay, audit, retroactive enrichment | Planned P3 |
| JSON Patch for enrichment | Compact diff semantics | Evaluating |
| Correlation IDs | Trace provisional → canonical lineage | Required |
| Idempotency-Key header | Safe retries on create endpoints | Planned |

### Endpoint Shape (Illustrative)
```
POST /v1/tasks
Headers: Idempotency-Key: <uuid>
Body: { "title": "Write spec", "description": "" }
201 → { "id": "t_canon_123", "title": "Write spec", "ai": { } }
409 (Idempotent replay) → existing representation
```

### WebSocket Framing (Concept)
```jsonc
// Client → Server
{ "op": "sub", "channels": ["tasks","habits"] }
// Server → Client enrichment delta
{ "ch": "tasks", "ref": "t_canon_123", "patch": [{"op":"add","path":"/ai/priorityScore","value":0.77}] }
```

---
## 24. Database & Storage Schema (Preliminary Sketch)
```sql
-- Core Entities
users(id uuid pk, email text unique, created_at timestamptz default now(), prefs jsonb)
tasks(id uuid pk, user_id uuid fk, title text, description text, status text, priority text, due_date date, created_at timestamptz default now(), updated_at timestamptz, ai jsonb)
habits(id uuid pk, user_id uuid fk, name text, target int, unit text, frequency text, color text, created_at timestamptz default now(), ai jsonb)
habit_entries(id uuid pk, habit_id uuid fk, date date, count int, completed boolean)
pomodoro_sessions(id uuid pk, user_id uuid fk, task_id uuid null fk, type text, duration_minutes int, started_at timestamptz, ended_at timestamptz, completed boolean)
confessions(id uuid pk, user_id uuid fk, content text, mood text, created_at timestamptz, ai jsonb)

-- Event Log (append-only)
events(id uuid pk, user_id uuid, type text, occurred_at timestamptz, payload jsonb, trace jsonb)

-- Projection / Enrichment Tracking
enrichment_runs(id uuid pk, event_id uuid fk, agent text, version int, produced_at timestamptz, delta jsonb)

-- Vector / Semantic (later)
task_embeddings(task_id uuid pk, embedding vector(1536), model text, updated_at timestamptz)
```
Notes:
- `ai` JSONB columns hold speculative enrichment (namespaced).
- Event log never mutated; projections rebuildable.
- Vector store may move to pgvector or external service depending on scale.

---
## 25. Testing Strategy (Incremental Build-Out)
| Layer | Scope | Tooling | Minimal Initial Cases |
|-------|-------|---------|-----------------------|
| Unit (frontend) | Reducers, utils | Vitest / Jest | Task toggle, habit streak calc |
| Unit (python) | STT/LLM wrappers | pytest | Transcript slice, summarizer shape |
| Unit (go) | WS frame handling | go test | Subscription + broadcast ack |
| Integration | Task create → event → enrichment patch | docker compose harness | Happy path + retry |
| E2E (later) | User flows (tasks + pomodoro) | Playwright | Create task, start focus, complete |

Quality Gates (future CI): typecheck → lint → unit tests → build → integration smoke.

---
## 26. Success Metrics & Operational KPIs
| Dimension | Target (Initial) | Stretch |
|-----------|------------------|---------|
| WS reconnect success | >98% within 5s | 99.5% |
| Task enrichment latency | <3s P95 | <1.5s |
| Pomodoro timer drift | <250ms / 25min | <100ms |
| Voice transcript latency (chunk) | <1200ms | <700ms |
| Frontend cold load (dashboard) | <2500ms local dev | <1800ms |
| Accessibility score (Lighthouse) | ≥90 | ≥95 |

User-Oriented Outcomes:
- Increased habit completion streak consistency (baseline instrumentation upcoming).
- Reduced average time-to-start focus session after page load.
- Qualitative: Clear provenance on any AI-generated suggestion (trust metric interviews).

---
## 27. Changelog Addendum
| Date | Change |
|------|--------|
| 2025-10-01 | Added engineering standards, API patterns, DB sketch, testing strategy, KPIs (sections 22–26) |


