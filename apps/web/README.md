# @nargis/web

Next.js frontend for Nargis.

For repo-level context, see:
- [../../README.md](../../README.md)
- [../../ARCHITECTURE.md](../../ARCHITECTURE.md)
- [../../ROADMAP.md](../../ROADMAP.md)

## Setup

```bash
cd apps/web
bun install
cp .env.example .env.local
```

## Key Environment Variables

- `NEXT_PUBLIC_API_PY_URL`: Python API base URL
- `NEXT_PUBLIC_WS_URL`: gateway websocket URL
- `NEXT_PUBLIC_GO_URL`: gateway base URL when needed by frontend routes
- `HF_TOKEN`: server-side only token for Hugging Face control routes
- `HF_PY_SPACE`, `HF_GO_SPACE`, `PY_SPACE_URL`, `GO_SPACE_URL`: compatibility and deployment variables for system warm/restart flows

## Local Commands

```bash
bun dev
bun run check:fix
bun run lint
bun run format:check
bun run type-check
bun run test
bun run test:e2e
```
