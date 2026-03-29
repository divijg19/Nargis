# Contributing

Thanks for your interest in Nargis.

## Prerequisites

- Bun
- Python 3.12
- `uv`
- Go
- Git

## Setup

```bash
git clone https://github.com/divijg19/Nargis.git
cd Nargis
bun install
cp apps/web/.env.example apps/web/.env.local
```

Start the full stack locally:

```bash
bun run dev
```

## Workflow

```bash
git checkout -b feature/your-change
```

Make changes, then use the root command contract:

```bash
bun run lint
bun run qa
```

Useful targeted commands:

```bash
bun run test:web
bun run test:api
bun run test:go
bun run smoke:local-realtime
```

## Branch Naming

- `feature/*` for features
- `fix/*` for bug fixes
- `docs/*` for documentation
- `chore/*` for maintenance

## Commit Style

Use conventional-style commit subjects when practical:

- `feat: add task filtering`
- `fix: handle websocket retry edge case`
- `docs: split roadmap from planning`
- `refactor: extract shared system client`

## Docs Map

- Product intent: [PLANNING.md](./PLANNING.md)
- System design: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Delivery status: [ROADMAP.md](./ROADMAP.md)
- Deployment/runbooks: [docs/](./docs/)
