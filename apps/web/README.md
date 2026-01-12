# @nargis/web

The Next.js 15 frontend for Nargis.

## Features
- **Real-time Updates**: Uses WebSocket via the Gateway service.
- **AI Integration**: Voice-to-text and intelligent task management.
- **Modern Stack**: Next.js 15, Tailwind CSS, Biome, Vitest.

## Getting Started

### Prerequisites
- Node.js 20+ or Bun 1.2+
- Backend services running (API + Gateway)

### Installation

```bash
cd apps/web
bun install
```

### Configuration
Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Set the public URLs the browser should use:

- `NEXT_PUBLIC_API_URL` (HTTP) → the **Gateway** base URL (dev default `http://localhost:8080`)
- `NEXT_PUBLIC_WS_URL` (WebSocket) → the **Gateway** WS endpoint (dev default `ws://localhost:8080/ws`)
- `NEXT_PUBLIC_API_PY_URL` (HTTP) → the **api-py** base URL (dev default `http://localhost:8000`)

In production, use `https://` + `wss://`.

### Development

```bash
bun dev
```

## Testing

```bash
bun test:unit        # Run unit tests
bun test:e2e         # Run Playwright tests
```

## Linting & Formatting

We use [Biome](https://biomejs.dev/) for fast linting and formatting.

```bash
bun lint
bun format
```
